// FILE: src/lib/__tests__/kitchenRepo.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
    getAllIngredients, 
    calculateStockNeeded, 
    createPurchaseRequest 
} from '../repositories/kitchenRepo';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn()
}));

vi.mock('@/lib/logger', () => ({
    logger: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn()
    }
}));

/**
 * ## Pre-flight Checklist: kitchenRepo.js
 * 
 * 1. Source Analysis:
 *    - getAllIngredients(opts = {}): Uses object parameter (category, search, lowStockOnly).
 *    - calculateStockNeeded(scheduleId): Uses positional parameter.
 *    - createPurchaseRequest(scheduleId, notes): Uses positional parameters.
 *    - Internal call: createPurchaseRequest calls calculateStockNeeded.
 *    - Internal call: calculateStockNeeded calls getBOMForProduct.
 *    - Internal call: generatePurchaseRequestId uses prisma.purchaseRequest.findFirst.
 * 
 * 2. Mock Inventory:
 *    - prisma.ingredient: findMany
 *    - prisma.courseBOM: findMany
 *    - prisma.courseSchedule: findUnique
 *    - prisma.purchaseRequest: findFirst, create, findUnique
 *    - prisma.purchaseRequestItem: createMany
 *    - prisma.$transaction: Used in createPurchaseRequest.
 */

describe('kitchenRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            ingredient: {
                findMany: vi.fn()
            },
            courseBOM: {
                findMany: vi.fn()
            },
            courseSchedule: {
                findUnique: vi.fn()
            },
            purchaseRequest: {
                findFirst: vi.fn(),
                create: vi.fn(),
                findUnique: vi.fn()
            },
            purchaseRequestItem: {
                createMany: vi.fn()
            },
            $transaction: vi.fn(cb => cb(mockPrisma))
        };
        getPrisma.mockResolvedValue(mockPrisma);

        // Mock Date for ID generation: 2026-03-15
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-15'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('getAllIngredients', () => {
        it('should filter low stock items when lowStockOnly is true', async () => {
            const mockData = [
                { id: '1', name: 'Salt', currentStock: 10, minStock: 5 },
                { id: '2', name: 'Sugar', currentStock: 2, minStock: 5 } // Low Stock
            ];
            mockPrisma.ingredient.findMany.mockResolvedValue(mockData);

            const result = await getAllIngredients({ lowStockOnly: true });

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Sugar');
            expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {}
            }));
        });

        it('should pass category and search to prisma where clause', async () => {
            mockPrisma.ingredient.findMany.mockResolvedValue([]);
            await getAllIngredients({ category: 'PROTEIN', search: 'Pork' });

            expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: {
                    category: 'PROTEIN',
                    OR: [
                        { name: { contains: 'Pork', mode: 'insensitive' } },
                        { ingredientId: { contains: 'Pork', mode: 'insensitive' } }
                    ]
                }
            }));
        });
    });

    describe('calculateStockNeeded', () => {
        it('should calculate required quantity and sufficiency correctly', async () => {
            // Mock Schedule: 20 students
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({
                id: 'sched-1',
                productId: 'prod-1',
                confirmedStudents: 20
            });

            // Mock BOM: 2 items
            mockPrisma.courseBOM.findMany.mockResolvedValue([
                {
                    ingredientId: 'ing-1',
                    qtyPerPerson: 2,
                    unit: 'kg',
                    ingredient: { id: 'ing-1', currentStock: 30 } // Needed: 40, Stock: 30 -> Buy 10
                },
                {
                    ingredientId: 'ing-2',
                    qtyPerPerson: 0.5,
                    unit: 'L',
                    ingredient: { id: 'ing-2', currentStock: 15 } // Needed: 10, Stock: 15 -> Buy 0
                }
            ]);

            const result = await calculateStockNeeded('sched-1');

            expect(result).toHaveLength(2);
            expect(result[0].qtyNeeded).toBe(40);
            expect(result[0].qtyToBuy).toBe(10);
            expect(result[0].isSufficient).toBe(false);
            
            expect(result[1].qtyNeeded).toBe(10);
            expect(result[1].qtyToBuy).toBe(0);
            expect(result[1].isSufficient).toBe(true);
        });

        it('should throw error if schedule not found', async () => {
            mockPrisma.courseSchedule.findUnique.mockResolvedValue(null);
            await expect(calculateStockNeeded('missing')).rejects.toThrow('Schedule not found');
        });
    });

    describe('createPurchaseRequest', () => {
        it('should return alreadySufficient if no items need buying', async () => {
            // Mock calculateStockNeeded results via its dependencies
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({ id: 's1', productId: 'p1', confirmedStudents: 1 });
            mockPrisma.courseBOM.findMany.mockResolvedValue([
                { qtyPerPerson: 1, ingredient: { currentStock: 10 } }
            ]);

            const result = await createPurchaseRequest('s1', 'Note');
            expect(result.alreadySufficient).toBe(true);
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it('should create PR with correct serial ID and items', async () => {
            // Mock deps for calculateStockNeeded
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({ id: 's1', productId: 'p1', confirmedStudents: 10 });
            mockPrisma.courseBOM.findMany.mockResolvedValue([
                { qtyPerPerson: 1, unit: 'pcs', ingredient: { id: 'ing-1', currentStock: 0, costPerUnit: 5 } }
            ]); // Needs 10, buy 10, cost 50

            // Mock PR ID generation
            mockPrisma.purchaseRequest.findFirst.mockResolvedValue({ requestId: 'PR-20260315-004' }); // Next: 005

            // Mock creation
            mockPrisma.purchaseRequest.create.mockResolvedValue({ id: 'pr-uid-1', requestId: 'PR-20260315-005' });
            
            // Mock final findUnique
            mockPrisma.purchaseRequest.findUnique.mockResolvedValue({
                id: 'pr-uid-1',
                requestId: 'PR-20260315-005',
                items: [{ ingredientId: 'ing-1', qtyToBuy: 10 }]
            });

            const result = await createPurchaseRequest('s1', 'Test PR');

            expect(result.requestId).toBe('PR-20260315-005');
            expect(mockPrisma.purchaseRequest.create).toHaveBeenCalledWith({
                data: {
                    requestId: 'PR-20260315-005',
                    scheduleId: 's1',
                    notes: 'Test PR',
                    status: 'DRAFT'
                }
            });
            expect(mockPrisma.purchaseRequestItem.createMany).toHaveBeenCalledWith({
                data: [expect.objectContaining({
                    ingredientId: 'ing-1',
                    qtyToBuy: 10,
                    estimatedCost: 50
                })]
            });
        });
    });
});
