// FILE: src/lib/__tests__/kitchenRepo.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    calculateStockNeeded,
    getAllIngredients,
    createPurchaseRequest
} from '../repositories/kitchenRepo';
import { getPrisma } from '@/lib/db';

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

describe('kitchenRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            $transaction: vi.fn(cb => cb(mockPrisma)),
            courseSchedule: { findUnique: vi.fn() },
            // courseBOM (NOT productBOM) — matches actual Prisma model name
            courseBOM: { findMany: vi.fn(), upsert: vi.fn() },
            ingredient: {
                findMany: vi.fn(),
                update: vi.fn(),
                upsert: vi.fn()
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

    // ─────────────────────────────────────────────────
    // calculateStockNeeded
    // ─────────────────────────────────────────────────
    describe('calculateStockNeeded', () => {
        it('should calculate qtyNeeded correctly from confirmedStudents', async () => {
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({
                id: 'sch-1',
                confirmedStudents: 5,
                maxStudents: 10,
                productId: 'prod-1',
                product: { name: 'Ramen' }
            });
            mockPrisma.courseBOM.findMany.mockResolvedValue([
                {
                    qtyPerPerson: 0.2,
                    unit: 'kg',
                    ingredient: { id: 'ing-1', name: 'Sugar', currentStock: 0.5 }
                }
            ]);

            const result = await calculateStockNeeded('sch-1');

            expect(result[0].qtyNeeded).toBeCloseTo(1.0);
            expect(result[0].qtyInStock).toBe(0.5);
            expect(result[0].qtyToBuy).toBeCloseTo(0.5);
            expect(result[0].isSufficient).toBe(false);
        });

        it('should fallback to maxStudents when confirmedStudents is 0', async () => {
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({
                id: 'sch-1',
                confirmedStudents: 0,
                maxStudents: 8,
                productId: 'prod-1',
                product: { name: 'Soba' }
            });
            mockPrisma.courseBOM.findMany.mockResolvedValue([
                {
                    qtyPerPerson: 1,
                    unit: 'unit',
                    ingredient: { id: 'ing-1', name: 'Salt', currentStock: 10 }
                }
            ]);

            const result = await calculateStockNeeded('sch-1');

            expect(result[0].qtyNeeded).toBe(8);
            expect(result[0].qtyToBuy).toBe(0);
            expect(result[0].isSufficient).toBe(true);
        });

        it('should set qtyToBuy=0 when stock is sufficient', async () => {
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({
                id: 'sch-1',
                confirmedStudents: 5,
                maxStudents: 10,
                productId: 'prod-1',
                product: { name: 'Udon' }
            });
            mockPrisma.courseBOM.findMany.mockResolvedValue([
                {
                    qtyPerPerson: 1,
                    unit: 'unit',
                    ingredient: { id: 'ing-1', name: 'Water', currentStock: 10 }
                }
            ]);

            const result = await calculateStockNeeded('sch-1');

            // Math.max(0, 5 - 10) = 0
            expect(result[0].qtyToBuy).toBe(0);
        });

        it('should throw if schedule not found', async () => {
            mockPrisma.courseSchedule.findUnique.mockResolvedValue(null);

            await expect(calculateStockNeeded('invalid'))
                .rejects.toThrow('Schedule not found: invalid');
        });
    });

    // ─────────────────────────────────────────────────
    // getAllIngredients — lowStockOnly filter is in JS (not DB)
    // ─────────────────────────────────────────────────
    describe('getAllIngredients', () => {
        it('should return only low stock items when lowStockOnly=true', async () => {
            const ingredients = [
                { id: '1', name: 'A', currentStock: 5, minStock: 10 },   // low ✓
                { id: '2', name: 'B', currentStock: 15, minStock: 10 },  // ok
                { id: '3', name: 'C', currentStock: 10, minStock: 10 }   // low ✓ (equal = low)
            ];
            mockPrisma.ingredient.findMany.mockResolvedValue(ingredients);

            // Correct call signature: opts object with lowStockOnly key
            const result = await getAllIngredients({ lowStockOnly: true });

            expect(result).toHaveLength(2);
            expect(result.find(i => i.id === '1')).toBeDefined();
            expect(result.find(i => i.id === '3')).toBeDefined();
            expect(result.find(i => i.id === '2')).toBeUndefined();
        });

        it('should return all ingredients when lowStockOnly=false', async () => {
            const ingredients = [
                { id: '1', name: 'A', currentStock: 5, minStock: 10 },
                { id: '2', name: 'B', currentStock: 15, minStock: 10 }
            ];
            mockPrisma.ingredient.findMany.mockResolvedValue(ingredients);

            const result = await getAllIngredients({ lowStockOnly: false });

            expect(result).toHaveLength(2);
        });
    });

    // ─────────────────────────────────────────────────
    // createPurchaseRequest
    // Mocked at DB level — calculateStockNeeded is called internally
    // ─────────────────────────────────────────────────
    describe('createPurchaseRequest', () => {
        it('should return { alreadySufficient: true } when all stock is sufficient', async () => {
            // calculateStockNeeded uses: courseSchedule.findUnique + courseBOM.findMany
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({
                id: 'sch-1',
                confirmedStudents: 2,
                maxStudents: 5,
                productId: 'prod-1',
                product: { name: 'Test' }
            });
            mockPrisma.courseBOM.findMany.mockResolvedValue([
                {
                    qtyPerPerson: 1,
                    unit: 'unit',
                    ingredient: { id: 'ing-1', name: 'Water', currentStock: 100 }
                }
            ]);
            // All qtyToBuy=0 → no purchase needed

            const result = await createPurchaseRequest('sch-1');

            expect(result.alreadySufficient).toBe(true);
            // $transaction should NOT be called
            expect(mockPrisma.$transaction).not.toHaveBeenCalled();
        });

        it('should generate PR-YYYYMMDD-NNN format ID', async () => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date('2026-03-15T00:00:00.000Z'));

            // Insufficient stock → qtyToBuy > 0
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({
                id: 'sch-1',
                confirmedStudents: 5,
                maxStudents: 10,
                productId: 'prod-1',
                product: { name: 'Ramen' }
            });
            mockPrisma.courseBOM.findMany.mockResolvedValue([
                {
                    qtyPerPerson: 2,
                    unit: 'kg',
                    ingredient: { id: 'ing-1', name: 'Flour', currentStock: 1, costPerUnit: 50 }
                }
            ]);

            // generatePurchaseRequestId → findFirst for serial
            mockPrisma.purchaseRequest.findFirst.mockResolvedValue(null);
            mockPrisma.purchaseRequest.create.mockResolvedValue({ id: 'pr-uuid-1', requestId: 'PR-20260315-001' });
            mockPrisma.purchaseRequestItem.createMany.mockResolvedValue({ count: 1 });
            mockPrisma.purchaseRequest.findUnique.mockResolvedValue({
                id: 'pr-uuid-1',
                requestId: 'PR-20260315-001',
                items: []
            });

            await createPurchaseRequest('sch-1', 'test notes');

            expect(mockPrisma.purchaseRequest.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        requestId: 'PR-20260315-001'
                    })
                })
            );
        });
    });
});
