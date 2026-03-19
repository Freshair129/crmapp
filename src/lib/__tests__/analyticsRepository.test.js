import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsRepository } from '@/lib/repositories/analyticsRepository';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

describe('analyticsRepository', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            order: { findMany: vi.fn() },
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('getRevenueHistory', () => {
        it('should classify revenue correctly between ads and store', async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            mockPrisma.order.findMany.mockResolvedValue([
                { date: today, totalAmount: 1000, conversationId: 't_ads' }, // Ads
                { date: today, totalAmount: 500, conversationId: null },      // Store
            ]);

            const result = await analyticsRepository.getRevenueHistory(1); // 1 day range for simplicity
            
            // Expected: 2 entries in history (today and 1 day ago)
            expect(result.revenueHistory).toHaveLength(2);
            
            const todayEntry = result.revenueHistory[result.revenueHistory.length - 1];
            expect(todayEntry.adsRevenue).toBe(1000);
            expect(todayEntry.storeRevenue).toBe(500);
            
            const countEntry = result.dailyOrders[result.dailyOrders.length - 1];
            expect(countEntry.adsCount).toBe(1);
            expect(countEntry.storeCount).toBe(1);
        });

        it('should initialize empty days correctly', async () => {
            mockPrisma.order.findMany.mockResolvedValue([]);
            const result = await analyticsRepository.getRevenueHistory(7);
            expect(result.revenueHistory).toHaveLength(8); // 0..7 = 8 days
            result.revenueHistory.forEach(day => {
                expect(day.adsRevenue).toBe(0);
                expect(day.storeRevenue).toBe(0);
            });
        });
    });
});
