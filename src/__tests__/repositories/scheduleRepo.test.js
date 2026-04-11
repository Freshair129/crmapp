import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateScheduleStatus, completeSessionWithStockDeduction } from '@/lib/repositories/scheduleRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));
vi.mock('@/lib/systemConfig', () => ({
  getScheduleStatuses: vi.fn(() => ['OPEN', 'FULL', 'CANCELLED', 'COMPLETED', 'POSTPONED'])
}));

describe('scheduleRepo', () => {
  const mockPrisma = {
    courseSchedule: { update: vi.fn(), findUnique: vi.fn() },
    ingredientLot: { findMany: vi.fn(), update: vi.fn() },
    ingredient: { update: vi.fn() },
    stockDeductionLog: { createMany: vi.fn() },
    $transaction: vi.fn(cb => cb(mockPrisma))
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getPrisma.mockResolvedValue(mockPrisma);
  });

  describe('updateScheduleStatus', () => {
    it('throws Error for invalid status', async () => {
      await expect(updateScheduleStatus('sch_1', 'INVALID_STATUS'))
        .rejects.toThrow('Invalid status: INVALID_STATUS');
    });

    it('updates status for each valid status', async () => {
      const validStatuses = ['OPEN', 'FULL', 'CANCELLED', 'COMPLETED', 'POSTPONED'];
      for (const status of validStatuses) {
        mockPrisma.courseSchedule.update.mockResolvedValue({ id: 'sch_1', status });
        const result = await updateScheduleStatus('sch_1', status);
        expect(result.status).toBe(status);
      }
    });

    it('calls prisma.courseSchedule.update with correct args', async () => {
      mockPrisma.courseSchedule.update.mockResolvedValue({ id: 'sch_1', status: 'CANCELLED' });
      await updateScheduleStatus('sch_1', 'CANCELLED');
      expect(mockPrisma.courseSchedule.update).toHaveBeenCalledWith({
        where: { id: 'sch_1' },
        data: { status: 'CANCELLED' }
      });
    });
  });

  describe('FEFO deduction (via completeSessionWithStockDeduction)', () => {
    const mockSchedule = {
      id: 'sch_1',
      scheduleId: 'TVS-SCH-001',
      status: 'OPEN',
      confirmedStudents: 2,
      product: {
        courseMenus: [{
          recipe: {
            ingredients: [{
              ingredientId: 'ing_1',
              qtyPerPerson: 10,
              conversionFactor: 1,
              ingredient: { name: 'Ingredient A' }
            }],
            equipment: []
          }
        }]
      }
    };

    it('deducts from lots using FEFO order (expiresAt ASC, nulls last)', async () => {
      mockPrisma.courseSchedule.findUnique.mockResolvedValue(mockSchedule);
      mockPrisma.courseSchedule.update.mockResolvedValue({ ...mockSchedule, status: 'COMPLETED' });
      mockPrisma.ingredientLot.findMany.mockResolvedValue([
        { id: 'lot_1', lotId: 'L1', remainingQty: 5, expiresAt: new Date('2026-04-01') },
        { id: 'lot_2', lotId: 'L2', remainingQty: 20, expiresAt: new Date('2026-05-01') },
        { id: 'lot_3', lotId: 'L3', remainingQty: 10, expiresAt: null }
      ]);

      await completeSessionWithStockDeduction('sch_1', 2);

      expect(mockPrisma.ingredientLot.findMany).toHaveBeenCalledWith(expect.objectContaining({
        orderBy: [
          { expiresAt: { sort: 'asc', nulls: 'last' } },
          { receivedAt: 'asc' }
        ]
      }));

      // lot_1: fully consumed (5 of 5)
      expect(mockPrisma.ingredientLot.update).toHaveBeenCalledWith({
        where: { id: 'lot_1' },
        data: { remainingQty: 0, status: 'CONSUMED' }
      });

      // lot_2: partially consumed (15 of 20)
      expect(mockPrisma.ingredientLot.update).toHaveBeenCalledWith({
        where: { id: 'lot_2' },
        data: { remainingQty: 5, status: 'ACTIVE' }
      });

      // lot_3: not touched (FEFO order — null expiry used last)
      expect(mockPrisma.ingredientLot.update).not.toHaveBeenCalledWith({
        where: { id: 'lot_3' },
        data: expect.anything()
      });
    });

    it('does not throw if qtyNeeded > total available', async () => {
      mockPrisma.courseSchedule.findUnique.mockResolvedValue(mockSchedule);
      mockPrisma.courseSchedule.update.mockResolvedValue({ ...mockSchedule, status: 'COMPLETED' });
      mockPrisma.ingredientLot.findMany.mockResolvedValue([
        { id: 'lot_1', lotId: 'L1', remainingQty: 5, expiresAt: new Date('2026-04-01') }
      ]);

      // totalQty = 20, only 5 available
      await expect(completeSessionWithStockDeduction('sch_1', 2)).resolves.not.toThrow();

      expect(mockPrisma.ingredientLot.update).toHaveBeenCalledWith({
        where: { id: 'lot_1' },
        data: { remainingQty: 0, status: 'CONSUMED' }
      });
    });
  });
});
