import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateTier, calcVPoints, awardVPoints } from '@/lib/repositories/customerRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
  getPrisma: vi.fn(),
}));

vi.mock('@/lib/systemConfig', () => ({
  getTiers: vi.fn(() => [
    { code: 'MEMBER', label: 'Member', min_spend: 0, min_hours: 0, color: 'gray', badge: '🥉' },
    { code: 'SILVER', label: 'Silver', min_spend: 5000, min_hours: 10, color: 'silver', badge: '🥈' },
    { code: 'GOLD', label: 'Gold', min_spend: 20000, min_hours: 30, color: 'gold', badge: '🥇' },
  ]),
  getVpRate: vi.fn(() => ({ points_per_unit: 1, spend_per_unit: 100 }))
}));

describe('customerRepo', () => {
  describe('calculateTier', () => {
    it('should return MEMBER tier for zero spend and hours', () => {
      const result = calculateTier(0, 0);
      expect(result.tier).toBe('MEMBER');
      expect(result.label).toBe('Member');
      expect(result.nextTier.tier).toBe('SILVER');
      expect(result.progressSpend).toBe(0);
      expect(result.progressHours).toBe(0);
    });

    it('should upgrade to SILVER if both spend and hours meet threshold', () => {
      const result = calculateTier(5000, 10);
      expect(result.tier).toBe('SILVER');
      expect(result.nextTier.tier).toBe('GOLD');
    });

    it('should stay MEMBER if only spend meets SILVER threshold', () => {
      const result = calculateTier(5000, 5);
      expect(result.tier).toBe('MEMBER');
      expect(result.progressSpend).toBe(100);
      expect(result.progressHours).toBe(50);
    });

    it('should stay MEMBER if only hours meets SILVER threshold', () => {
      const result = calculateTier(1000, 10);
      expect(result.tier).toBe('MEMBER');
      expect(result.progressSpend).toBe(20);
      expect(result.progressHours).toBe(100);
    });

    it('should calculate progress correctly (halfway to silver)', () => {
      const result = calculateTier(2500, 5);
      expect(result.progressSpend).toBe(50);
      expect(result.progressHours).toBe(50);
    });

    it('should cap progress at 100 and set 100 if no next tier', () => {
      const result = calculateTier(30000, 50);
      expect(result.tier).toBe('GOLD');
      expect(result.nextTier).toBeNull();
      expect(result.progressSpend).toBe(100);
      expect(result.progressHours).toBe(100);
    });
  });

  describe('calcVPoints', () => {
    it('should calculate points correctly based on VP_RATE', () => {
      expect(calcVPoints(250)).toBe(2);
      expect(calcVPoints(99)).toBe(0);
      expect(calcVPoints(1000)).toBe(10);
    });
  });

  describe('awardVPoints', () => {
    let mockPrisma;

    beforeEach(() => {
      vi.clearAllMocks();
      mockPrisma = {
        customer: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
      };
      getPrisma.mockResolvedValue(mockPrisma);
    });

    it('should return null if customerId is falsy', async () => {
      expect(await awardVPoints(null, 1000)).toBeNull();
      expect(await awardVPoints('', 1000)).toBeNull();
    });

    it('should return null if customerId is guest ID', async () => {
      const guestId = 'guest-customer-00000000-0000-0000-0000-000000000000';
      expect(await awardVPoints(guestId, 1000)).toBeNull();
    });

    it('should return null if customer not found', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      expect(await awardVPoints('cust-123', 1000)).toBeNull();
    });

    it('should update customer points, spend and tier correctly', async () => {
      const customerId = 'cust-123';
      const orderAmount = 5000;
      const totalHours = 10;

      mockPrisma.customer.findUnique.mockResolvedValue({
        id: customerId,
        totalSpend: 0,
        vpPoints: 0,
        totalVpEarned: 0
      });
      mockPrisma.customer.update.mockResolvedValue({ id: customerId, membershipTier: 'SILVER' });

      const result = await awardVPoints(customerId, orderAmount, totalHours);

      expect(mockPrisma.customer.update).toHaveBeenCalledWith({
        where: { id: customerId },
        data: {
          vpPoints: { increment: 50 },
          totalVpEarned: { increment: 50 },
          totalSpend: { increment: 5000 },
          membershipTier: 'SILVER',
        }
      });
      expect(result.membershipTier).toBe('SILVER');
    });
  });
});
