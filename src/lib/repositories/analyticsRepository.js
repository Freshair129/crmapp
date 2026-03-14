import { getPrisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export const analyticsRepository = {
    async getRevenueHistory(days = 30) {
        try {
            const prisma = await getPrisma();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            startDate.setHours(0, 0, 0, 0);

            const orders = await prisma.order.findMany({
                where: {
                    date: { gte: startDate },
                    status: { in: ['closed', 'CLOSED'] }
                },
                orderBy: { date: 'asc' },
                select: {
                    date: true,
                    totalAmount: true,
                    conversationId: true
                }
            });

            const historyMap = {};

            // Initialize map with all dates in range
            for (let i = 0; i <= days; i++) {
                const d = new Date(startDate);
                d.setDate(d.getDate() + i);
                const isoDate = d.toISOString().split('T')[0];
                const label = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                historyMap[isoDate] = { 
                    dateLabel: label, 
                    adsRevenue: 0, 
                    storeRevenue: 0,
                    adsCount: 0,
                    storeCount: 0
                };
            }

            // Aggregate orders
            orders.forEach(order => {
                const isoDate = order.date.toISOString().split('T')[0];
                if (historyMap[isoDate]) {
                    if (order.conversationId) {
                        historyMap[isoDate].adsRevenue += order.totalAmount;
                        historyMap[isoDate].adsCount += 1;
                    } else {
                        historyMap[isoDate].storeRevenue += order.totalAmount;
                        historyMap[isoDate].storeCount += 1;
                    }
                }
            });

            const result = Object.values(historyMap);

            return {
                revenueHistory: result.map(({ dateLabel, adsRevenue, storeRevenue }) => ({ 
                    dateLabel, 
                    adsRevenue: Math.round(adsRevenue), 
                    storeRevenue: Math.round(storeRevenue) 
                })),
                dailyOrders: result.map(({ dateLabel, adsCount, storeCount }) => ({ 
                    dateLabel, 
                    adsCount, 
                    storeCount 
                }))
            };
        } catch (error) {
            logger.error('[AnalyticsRepository]', 'getRevenueHistory failed', error);
            throw error;
        }
    }
};
