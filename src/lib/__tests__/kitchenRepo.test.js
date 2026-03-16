import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    getAllIngredients,
    calculateStockNeeded,
    createLot,
    getAllLots,
    getExpiringLots
} from '../repositories/kitchenRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

describe('kitchenRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-03-15'));
        vi.clearAllMocks();
        mockPrisma = {
            ingredient:      { findMany: vi.fn(), update: vi.fn() },
            courseMenu:      { findMany: vi.fn() },
            courseSchedule:  { findUnique: vi.fn() },
            purchaseRequest: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn() },
            purchaseRequestItem: { createMany: vi.fn() },
            ingredientLot:   { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
            $transaction:    vi.fn(cb => cb(mockPrisma))
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    afterEach(() => { vi.useRealTimers(); });

    // ─── getAllIngredients ───────────────────────────────────────────
    describe('getAllIngredients', () => {
        it('filters low-stock in application layer when lowStockOnly=true', async () => {
            mockPrisma.ingredient.findMany.mockResolvedValue([
                { id: '1', name: 'Salt',  currentStock: 10, minStock: 5 },
                { id: '2', name: 'Sugar', currentStock: 2,  minStock: 5 } // low
            ]);
            const result = await getAllIngredients({ lowStockOnly: true });
            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Sugar');
        });

        it('passes category + search to Prisma where clause', async () => {
            mockPrisma.ingredient.findMany.mockResolvedValue([]);
            await getAllIngredients({ category: 'PROTEIN', search: 'Pork' });
            expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ category: 'PROTEIN' })
                })
            );
        });
    });

    // ─── calculateStockNeeded ────────────────────────────────────────
    describe('calculateStockNeeded', () => {
        it('aggregates RecipeIngredient via CourseMenu and calculates qty fields', async () => {
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({
                id: 's1', productId: 'p1', confirmedStudents: 20
            });
            mockPrisma.courseMenu.findMany.mockResolvedValue([{
                recipe: {
                    ingredients: [{
                        ingredientId: 'i1',
                        qtyPerPerson: 2,
                        conversionFactor: 1,
                        ingredient: { id: 'i1', currentStock: 30, unit: 'kg' }
                    }]
                }
            }]);

            const result = await calculateStockNeeded('s1');
            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                qtyNeeded: 40,      // 2 × 1 × 20
                qtyInStock: 30,
                qtyToBuy: 10,
                isSufficient: false
            });
        });

        it('applies conversionFactor: qtyPerPerson × factor × students', async () => {
            mockPrisma.courseSchedule.findUnique.mockResolvedValue({
                id: 's1', productId: 'p1', confirmedStudents: 20
            });
            mockPrisma.courseMenu.findMany.mockResolvedValue([{
                recipe: {
                    ingredients: [{
                        ingredientId: 'i1',
                        qtyPerPerson: 0.5,
                        conversionFactor: 2,
                        ingredient: { id: 'i1', currentStock: 50, unit: 'kg' }
                    }]
                }
            }]);

            const result = await calculateStockNeeded('s1');
            expect(result[0].qtyNeeded).toBe(20); // 0.5 × 2 × 20 = 20
            expect(result[0].isSufficient).toBe(true);
        });

        it('throws "Schedule not found" when schedule is null', async () => {
            mockPrisma.courseSchedule.findUnique.mockResolvedValue(null);
            await expect(calculateStockNeeded('missing')).rejects.toThrow('Schedule not found');
        });
    });

    // ─── createLot ────────────────────────────────────────────────────
    describe('createLot', () => {
        it('generates LOT-YYYYMMDD-001 when no previous lot exists today', async () => {
            mockPrisma.ingredientLot.findFirst.mockResolvedValue(null);
            mockPrisma.ingredientLot.create.mockImplementation(({ data }) => ({
                ...data,
                id: 'lot-uuid-1',
                ingredient: { name: 'Flour', unit: 'kg' }
            }));

            const result = await createLot({
                ingredientId: 'i1', receivedQty: 100, unit: 'kg'
            });

            expect(result.lotId).toBe('LOT-20260315-001');
            expect(result.remainingQty).toBe(100);
            expect(mockPrisma.ingredientLot.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        lotId: 'LOT-20260315-001',
                        receivedQty: 100,
                        remainingQty: 100,
                        status: 'ACTIVE'
                    })
                })
            );
        });

        it('increments serial when a lot exists today (003 → 004)', async () => {
            mockPrisma.ingredientLot.findFirst.mockResolvedValue({ lotId: 'LOT-20260315-003' });
            mockPrisma.ingredientLot.create.mockImplementation(({ data }) => ({
                ...data,
                ingredient: { name: 'Sugar', unit: 'kg' }
            }));

            const result = await createLot({ ingredientId: 'i1', receivedQty: 50, unit: 'kg' });
            expect(result.lotId).toBe('LOT-20260315-004');
        });
    });

    // ─── getAllLots ───────────────────────────────────────────────────
    describe('getAllLots', () => {
        it('calls findMany with empty where when no filter', async () => {
            mockPrisma.ingredientLot.findMany.mockResolvedValue([]);
            await getAllLots({});
            expect(mockPrisma.ingredientLot.findMany).toHaveBeenCalledWith(
                expect.objectContaining({ where: {} })
            );
        });

        it('includes status in where clause when provided', async () => {
            mockPrisma.ingredientLot.findMany.mockResolvedValue([]);
            await getAllLots({ status: 'ACTIVE' });
            expect(mockPrisma.ingredientLot.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ status: 'ACTIVE' })
                })
            );
        });
    });

    // ─── getExpiringLots ─────────────────────────────────────────────
    describe('getExpiringLots', () => {
        it('queries ACTIVE lots with expiresAt ≤ cutoff date', async () => {
            mockPrisma.ingredientLot.findMany.mockResolvedValue([]);
            await getExpiringLots(7);
            expect(mockPrisma.ingredientLot.findMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({
                        status: 'ACTIVE',
                        expiresAt: expect.objectContaining({ lte: expect.any(Date) })
                    })
                })
            );
        });

        it('defaults to 30-day window when called without argument', async () => {
            mockPrisma.ingredientLot.findMany.mockResolvedValue([]);
            await getExpiringLots();
            const call = mockPrisma.ingredientLot.findMany.mock.calls[0][0];
            const cutoff = call.where.expiresAt.lte;
            const diffDays = Math.round((cutoff - new Date('2026-03-15')) / 86400000);
            expect(diffDays).toBe(30);
        });
    });
});
