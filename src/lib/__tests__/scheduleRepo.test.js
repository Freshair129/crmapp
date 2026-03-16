import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { completeSessionWithStockDeduction } from '../repositories/scheduleRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

// ── helpers ─────────────────────────────────────────────────────────

/** Minimal valid schedule for completeSessionWithStockDeduction */
function makeSchedule({ status = 'OPEN', confirmedStudents = 10, ingredients = [], equipment = [] } = {}) {
    return {
        id: 's1',
        scheduleId: 'SCH-20260315-001',
        status,
        confirmedStudents,
        product: {
            courseMenus: [{
                recipe: {
                    ingredients: ingredients.map(i => ({
                        ingredientId: i.id,
                        qtyPerPerson: i.qtyPerPerson ?? 2,
                        conversionFactor: i.conversionFactor ?? 1,
                        ingredient: { name: i.name ?? 'Ingredient' }
                    })),
                    equipment: equipment.map(e => ({
                        id: e.id,
                        name: e.name ?? 'Equipment',
                        unit: e.unit ?? 'piece',
                        qtyRequired: e.qtyRequired ?? 1
                    }))
                }
            }]
        }
    };
}

/** Updated schedule returned by courseSchedule.update */
const COMPLETED_SCHEDULE = {
    id: 's1',
    scheduleId: 'SCH-20260315-001',
    status: 'COMPLETED',
    product: { name: 'Test Course' },
    instructor: { nickName: 'Aoi' }
};

describe('scheduleRepo — completeSessionWithStockDeduction', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            courseSchedule:   { findUnique: vi.fn(), update: vi.fn().mockResolvedValue(COMPLETED_SCHEDULE) },
            ingredient:       { update: vi.fn() },
            recipeEquipment:  { update: vi.fn() },
            ingredientLot:    { findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
            stockDeductionLog:{ createMany: vi.fn() },
            $transaction:     vi.fn(cb => cb(mockPrisma))
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    // ── Guard conditions ─────────────────────────────────────────────
    it('throws "Schedule not found" when schedule does not exist', async () => {
        mockPrisma.courseSchedule.findUnique.mockResolvedValue(null);
        await expect(completeSessionWithStockDeduction('s1', 5)).rejects.toThrow('Schedule not found');
    });

    it('throws "Session already completed" when status is COMPLETED', async () => {
        mockPrisma.courseSchedule.findUnique.mockResolvedValue(makeSchedule({ status: 'COMPLETED' }));
        await expect(completeSessionWithStockDeduction('s1', 5)).rejects.toThrow('Session already completed');
    });

    it('throws "Cannot complete a cancelled session" when status is CANCELLED', async () => {
        mockPrisma.courseSchedule.findUnique.mockResolvedValue(makeSchedule({ status: 'CANCELLED' }));
        await expect(completeSessionWithStockDeduction('s1', 5)).rejects.toThrow('Cannot complete a cancelled session');
    });

    // ── Stock deduction ──────────────────────────────────────────────
    it('decrements Ingredient.currentStock by qtyPerPerson × students × conversionFactor', async () => {
        mockPrisma.courseSchedule.findUnique.mockResolvedValue(
            makeSchedule({ ingredients: [{ id: 'i1', qtyPerPerson: 2, conversionFactor: 1 }] })
        );
        await completeSessionWithStockDeduction('s1', 10);
        expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({
            where: { id: 'i1' },
            data: { currentStock: { decrement: 20 } }
        });
    });

    it('applies conversionFactor correctly (0.5 × 2.0 × 10 = 10)', async () => {
        mockPrisma.courseSchedule.findUnique.mockResolvedValue(
            makeSchedule({ ingredients: [{ id: 'i1', qtyPerPerson: 0.5, conversionFactor: 2.0 }] })
        );
        await completeSessionWithStockDeduction('s1', 10);
        expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({
            where: { id: 'i1' },
            data: { currentStock: { decrement: 10 } }
        });
    });

    it('deducts equipment stock by qtyRequired per session (not per student)', async () => {
        mockPrisma.courseSchedule.findUnique.mockResolvedValue(
            makeSchedule({ equipment: [{ id: 'eq1', qtyRequired: 3 }] })
        );
        await completeSessionWithStockDeduction('s1', 20); // studentCount shouldn't affect equipment
        expect(mockPrisma.recipeEquipment.update).toHaveBeenCalledWith({
            where: { id: 'eq1' },
            data: { currentStock: { decrement: 3 } }
        });
    });

    // ── FEFO lot deduction ───────────────────────────────────────────
    it('creates StockDeductionLog without lotId when no lots are registered', async () => {
        mockPrisma.courseSchedule.findUnique.mockResolvedValue(
            makeSchedule({ ingredients: [{ id: 'i1' }] })
        );
        mockPrisma.ingredientLot.findMany.mockResolvedValue([]);

        await completeSessionWithStockDeduction('s1', 10);

        const logCall = mockPrisma.stockDeductionLog.createMany.mock.calls[0][0];
        const ingEntry = logCall.data.find(e => e.ingredientId === 'i1');
        expect(ingEntry.qtyDeducted).toBe(20);
        expect(ingEntry.lotId).toBeUndefined();
    });

    it('FEFO: deducts from lot with earliest expiresAt first', async () => {
        // qtyNeeded = 2 × 1 × 5 = 10
        mockPrisma.courseSchedule.findUnique.mockResolvedValue(
            makeSchedule({ confirmedStudents: 5, ingredients: [{ id: 'i1' }] })
        );
        mockPrisma.ingredientLot.findMany.mockResolvedValue([
            { id: 'lot1', lotId: 'LOT-A', remainingQty: 15, expiresAt: new Date('2026-03-20') }, // earlier
            { id: 'lot2', lotId: 'LOT-B', remainingQty: 5,  expiresAt: new Date('2026-04-01') }
        ]);

        await completeSessionWithStockDeduction('s1', 5);

        // lot1 (LOT-A) should be consumed first for qty=10
        expect(mockPrisma.ingredientLot.update).toHaveBeenCalledWith({
            where: { id: 'lot1' },
            data: { remainingQty: 5, status: 'ACTIVE' }  // 15 - 10 = 5
        });
        // lot2 should not be touched
        expect(mockPrisma.ingredientLot.update).not.toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 'lot2' } })
        );

        const logCall = mockPrisma.stockDeductionLog.createMany.mock.calls[0][0];
        const ingEntry = logCall.data.find(e => e.lotId === 'LOT-A');
        expect(ingEntry).toBeDefined();
        expect(ingEntry.qtyDeducted).toBe(10);
    });

    it('FEFO: splits across 2 lots when first lot is insufficient', async () => {
        // qtyNeeded = 2 × 1 × 5 = 10
        mockPrisma.courseSchedule.findUnique.mockResolvedValue(
            makeSchedule({ confirmedStudents: 5, ingredients: [{ id: 'i1' }] })
        );
        mockPrisma.ingredientLot.findMany.mockResolvedValue([
            { id: 'lot1', lotId: 'LOT-A', remainingQty: 6,  expiresAt: new Date('2026-03-20') },
            { id: 'lot2', lotId: 'LOT-B', remainingQty: 14, expiresAt: new Date('2026-04-01') }
        ]);

        await completeSessionWithStockDeduction('s1', 5);

        // lot1 exhausted (6 → 0, CONSUMED)
        expect(mockPrisma.ingredientLot.update).toHaveBeenCalledWith({
            where: { id: 'lot1' },
            data: { remainingQty: 0, status: 'CONSUMED' }
        });
        // lot2 takes remaining 4
        expect(mockPrisma.ingredientLot.update).toHaveBeenCalledWith({
            where: { id: 'lot2' },
            data: { remainingQty: 10, status: 'ACTIVE' }  // 14 - 4 = 10
        });

        // Two log entries, one per lot
        const logData = mockPrisma.stockDeductionLog.createMany.mock.calls[0][0].data;
        expect(logData.filter(e => e.ingredientId === 'i1')).toHaveLength(2);
        expect(logData.find(e => e.lotId === 'LOT-A').qtyDeducted).toBe(6);
        expect(logData.find(e => e.lotId === 'LOT-B').qtyDeducted).toBe(4);
    });

    // ── Final state ──────────────────────────────────────────────────
    it('marks schedule as COMPLETED and returns summary', async () => {
        mockPrisma.courseSchedule.findUnique.mockResolvedValue(makeSchedule());
        const result = await completeSessionWithStockDeduction('s1', 10);

        expect(mockPrisma.courseSchedule.update).toHaveBeenCalledWith(
            expect.objectContaining({ where: { id: 's1' }, data: { status: 'COMPLETED' } })
        );
        expect(result.schedule.status).toBe('COMPLETED');
        expect(result.studentCount).toBe(10);
    });
});
