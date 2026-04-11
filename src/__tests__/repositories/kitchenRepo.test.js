import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateStock, calculateStockNeeded, getBOMForProduct } from '@/lib/repositories/kitchenRepo';
import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

vi.mock('@/lib/db', () => ({ getPrisma: vi.fn() }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn(), info: vi.fn() } }));

describe('kitchenRepo', () => {
  const mockPrisma = {
    ingredient: { update: vi.fn() },
    courseSchedule: { findUnique: vi.fn() },
    courseMenu: { findMany: vi.fn() },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getPrisma.mockResolvedValue(mockPrisma);
  });

  describe('updateStock', () => {
    it('should update stock and return updated ingredient', async () => {
      const mockIngredient = { ingredientId: 'ING-001', currentStock: 50, unit: 'kg' };
      mockPrisma.ingredient.update.mockResolvedValue(mockIngredient);

      const result = await updateStock('ING-001', 50);

      expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({
        where: { ingredientId: 'ING-001' },
        data: { currentStock: 50 },
      });
      expect(logger.info).toHaveBeenCalled();
      expect(result).toEqual(mockIngredient);
    });

    it('should throw and log error on DB failure', async () => {
      mockPrisma.ingredient.update.mockRejectedValue(new Error('DB Error'));
      await expect(updateStock('ING-001', 50)).rejects.toThrow('DB Error');
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('getBOMForProduct', () => {
    it('should aggregate ingredients across menus with conversion factors', async () => {
      mockPrisma.courseMenu.findMany.mockResolvedValue([
        {
          recipe: {
            ingredients: [
              { ingredientId: 'ING-1', qtyPerPerson: 10, conversionFactor: 1, ingredient: { ingredientId: 'ING-1', unit: 'g' } },
              { ingredientId: 'ING-2', qtyPerPerson: 5,  conversionFactor: 2, ingredient: { ingredientId: 'ING-2', unit: 'ml' } },
            ],
          },
        },
        {
          recipe: {
            ingredients: [
              { ingredientId: 'ING-1', qtyPerPerson: 5, conversionFactor: 1, ingredient: { ingredientId: 'ING-1', unit: 'g' } },
            ],
          },
        },
      ]);

      const result = await getBOMForProduct('PROD-001');

      expect(result).toHaveLength(2);
      const ing1 = result.find(r => r.ingredientId === 'ING-1');
      const ing2 = result.find(r => r.ingredientId === 'ING-2');
      expect(ing1.qtyPerPerson).toBe(15);  // 10+5
      expect(ing2.qtyPerPerson).toBe(10);  // 5 * conversionFactor 2
    });
  });

  describe('calculateStockNeeded', () => {
    it('should throw if schedule not found', async () => {
      mockPrisma.courseSchedule.findUnique.mockResolvedValue(null);
      await expect(calculateStockNeeded('SCH-001')).rejects.toThrow('Schedule not found');
    });

    it('should calculate qtyNeeded using yieldPercent and confirmedStudents', async () => {
      mockPrisma.courseSchedule.findUnique.mockResolvedValue({
        id: 'SCH-001', productId: 'P1', confirmedStudents: 10, maxStudents: 20
      });
      mockPrisma.courseMenu.findMany.mockResolvedValue([{
        recipe: { ingredients: [{
          ingredientId: 'ING-1', qtyPerPerson: 100, conversionFactor: 1,
          ingredient: { yieldPercent: 80, currentStock: 1000, unit: 'g' }
        }]}
      }]);

      const result = await calculateStockNeeded('SCH-001');

      // qtyNeeded = 100 * 10 * (100/80) = 1250
      expect(result[0].qtyNeeded).toBe(1250);
      expect(result[0].qtyToBuy).toBe(250);
      expect(result[0].isSufficient).toBe(false);
    });

    it('should fallback to maxStudents if confirmedStudents is null', async () => {
      mockPrisma.courseSchedule.findUnique.mockResolvedValue({
        id: 'SCH-002', productId: 'P1', confirmedStudents: null, maxStudents: 5
      });
      mockPrisma.courseMenu.findMany.mockResolvedValue([{
        recipe: { ingredients: [{
          ingredientId: 'ING-1', qtyPerPerson: 10, conversionFactor: 1,
          ingredient: { yieldPercent: 100, currentStock: 100, unit: 'g' }
        }]}
      }]);

      const result = await calculateStockNeeded('SCH-002');
      // qtyNeeded = 10 * 5 * 1 = 50
      expect(result[0].qtyNeeded).toBe(50);
      expect(result[0].isSufficient).toBe(true);
    });

    it('should round results to 3 decimal places', async () => {
      mockPrisma.courseSchedule.findUnique.mockResolvedValue({
        id: 'SCH-003', productId: 'P1', confirmedStudents: 3
      });
      mockPrisma.courseMenu.findMany.mockResolvedValue([{
        recipe: { ingredients: [{
          ingredientId: 'ING-1', qtyPerPerson: 0.3333, conversionFactor: 1,
          ingredient: { yieldPercent: 100, currentStock: 0, unit: 'kg' }
        }]}
      }]);

      const result = await calculateStockNeeded('SCH-003');
      // 0.3333 * 3 = 0.9999 → rounds to 1
      expect(result[0].qtyNeeded).toBe(1);
    });
  });
});
