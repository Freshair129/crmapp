// FILE: src/lib/__tests__/kitchenRepo.test.js
/**
 * ## Pre-flight: kitchenRepo.js
 * Models used:
 *   - prisma.ingredient (findMany, upsert, update, findUnique)
 *   - prisma.courseBOM (findMany, upsert)
 *   - prisma.courseSchedule (findUnique)
 *   - prisma.purchaseRequest (findFirst, create, findUnique)
 *   - prisma.purchaseRequestItem (createMany)
 * Internal calls:
 *   - createPurchaseRequest() calls calculateStockNeeded() → mock at DB level (prisma.courseSchedule, prisma.courseBOM)
 *   - generatePurchaseRequestId() called inside createPurchaseRequest() → mock prisma.purchaseRequest.findFirst
 * Function signatures:
 *   - getAllIngredients(opts = {}) { category, search, lowStockOnly }
 *   - calculateStockNeeded(scheduleId)
 *   - createPurchaseRequest(scheduleId, notes)
 * Potential mock gaps: costPerUnit calculation in PR items.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
    getAllIngredients, 
    calculateStockNeeded, 
    createPurchaseRequest 
} from '../repositories/kitchenRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));
vi.mock('@/lib/logger', () => ({
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
}));

describe('kitchenRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            $transaction: vi.fn(cb => cb(mockPrisma)),
            ingredient: {
                findMany: vi.fn(),
                findUnique: vi.fn()
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
            }
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('getAllIngredientsScan', () => {
        it('should filter low stock items in JS layer correctly', async () => {
            const mockData = [
                { id: 'i1', name: 'A', currentStock: 5, minStock: 10 },
                { id: 'i2', name: 'B', currentStock: 20, minStock: 10 }
            ];
            mockPrisma.ingredient.findMany.mockResolvedValue(mockData);

            const result = await getAllIngredients({ lowStockOnly: true });

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('i1');
        });
    });

    describe('calculateStockNeeded', () => {
        it('should use confirmedStudents if available', async () => {
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({ 
                productId: 'p1', 
                confirmedStudents: 5, 
                maxStudents: 10 
            });
            mockPrisma.courseBOM.findMany.mockResolvedValue([
                { qtyPerPerson: 2, unit: 'kg', ingredient: { currentStock: 4 } }
            ]);

            const result = await calculateStockNeeded('sch-1');

            expect(result[0].qtyNeeded).toBe(10); // 5 * 2
            expect(result[0].qtyToBuy).toBe(6);  // 10 - 4
            expect(result[0].isSufficient).toBe(false);
        });

        it('should fallback to maxStudents if confirmed is 0/null', async () => {
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({ 
                productId: 'p1', 
                confirmedStudents: 0, 
                maxStudents: 8 
            });
            mockPrisma.courseBOM.findMany.mockResolvedValue([
                { qtyPerPerson: 1, unit: 'pcs', ingredient: { currentStock: 10 } }
            ]);

            const result = await calculateStockNeeded('sch-1');
            expect(result[0].qtyNeeded).toBe(8);
            expect(result[0].isSufficient).toBe(true);
        });
    });

    describe('createPurchaseRequest', () => {
        it('should return alreadySufficient if all qtyToBuy are 0', async () => {
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({ confirmedStudents: 1, productId: 'p1' });
            mockPrisma.courseBOM.findMany.mockResolvedValue([
                { qtyPerPerson: 1, ingredient: { currentStock: 10 } }
            ]);

            const result = await createPurchaseRequest('sch-1');
            expect(result.alreadySufficient).toBe(true);
            expect(mockPrisma.purchaseRequest.create).not.toHaveBeenCalled();
        });

        it('should generate PR ID and create request with items', async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-03-15'));
            
            // Step 1: calculateStockNeeded mock
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({ confirmedStudents: 10, productId: 'p1' });
            mockPrisma.courseBOM.findMany.mockResolvedValue([
                { 
                    qtyPerPerson: 1, unit: 'kg', 
                    ingredient: { id: 'ing-1', currentStock: 5, costPerUnit: 100 } 
                }
            ]);

            // Step 2: generatePurchaseRequestId mock
            mockPrisma.purchaseRequest.findFirst.mockResolvedValue(null);

            // Step 3: Transaction mocks
            mockPrisma.purchaseRequest.create.mockResolvedValue({ id: 'pr-1' });
            mockPrisma.purchaseRequest.findUnique.mockResolvedValue({ id: 'pr-1', items: [] });

            await createPurchaseRequest('sch-1', 'Urgently needed');

            expect(mockPrisma.purchaseRequest.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    requestId: 'PR-20260315-001',
                    notes: 'Urgently needed'
                })
            }));

            expect(mockPrisma.purchaseRequestItem.createMany).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.arrayContaining([
                    expect.objectContaining({
                        qtyToBuy: 5,
                        estimatedCost: 500 // 5 * 100
                    })
                ])
            }));
        });
    });
});
