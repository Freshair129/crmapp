import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { getDateRange } from '@/lib/timeframes';
import { cache } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'this_month';
    const cacheKey = `analytics:executive:${timeframe}`;

    const result = await cache.getOrSet(cacheKey, async () => {
        const prisma = await getPrisma();
        const { current: dateFilter, prev: prevFilter } = getDateRange(timeframe);

        const [orders, prevOrders, marketingData, prevMarketingData, periodConvTotal, periodConvClosed] = await Promise.all([
          prisma.order.findMany({
            where: {
              status: { in: ['closed', 'CLOSED'] },
              ...(dateFilter ? { date: dateFilter } : {})
            },
            select: { totalAmount: true, conversationId: true, date: true }
          }),
          prevFilter ? prisma.order.findMany({
            where: {
              status: { in: ['closed', 'CLOSED'] },
              date: prevFilter
            },
            select: { totalAmount: true, conversationId: true }
          }) : Promise.resolve([]),
          prisma.adDailyMetric.findMany({
            where: {
              ...(dateFilter ? { date: dateFilter } : {})
            },
            select: { revenue: true, date: true }
          }),
          prevFilter ? prisma.adDailyMetric.aggregate({
            where: {
              date: prevFilter
            },
            _sum: { revenue: true, purchases: true }
          }) : Promise.resolve({ _sum: { revenue: 0, purchases: 0 } }),
          // total conversations in period
          prisma.conversation.count({
            where: {
              ...(dateFilter ? { createdAt: dateFilter } : {})
            }
          }),
          // closed conversations in period
          prisma.conversation.count({
            where: {
              status: { in: ['closed', 'CLOSED'] },
              ...(dateFilter ? { createdAt: dateFilter } : {})
            }
          })
        ]);

        // Handle marketing aggregation
        const marketingStats = marketingData.reduce((acc, curr) => {
            acc.revenue += (curr.revenue || 0);
            return acc;
        }, { revenue: 0 });

        const marketingRevenue = marketingStats.revenue;
        const prevMarketingRevenue = prevMarketingData._sum ? (prevMarketingData._sum.revenue || 0) : 0;

        const revenueAds = (orders.filter(o => o.conversationId).reduce((sum, o) => sum + o.totalAmount, 0)) + marketingRevenue;
        const revenueStore = orders.filter(o => !o.conversationId).reduce((sum, o) => sum + o.totalAmount, 0);
        const totalRevenue = revenueAds + revenueStore;
        const ordersCount = orders.length;
        const avgTicket = ordersCount > 0 ? totalRevenue / ordersCount : 0;

        const prevRevenueAds = (prevOrders.filter(o => o.conversationId).reduce((sum, o) => sum + o.totalAmount, 0)) + prevMarketingRevenue;
        const prevRevenueStore = prevOrders.filter(o => !o.conversationId).reduce((sum, o) => sum + o.totalAmount, 0);
        const prevTotalRevenue = prevRevenueAds + prevRevenueStore;

        const pctChange = (curr, prev) => prev > 0 ? Math.round((curr - prev) / prev * 1000) / 10 : null;

        const revenueChange     = pctChange(totalRevenue,  prevTotalRevenue);
        const revenueAdsChange  = pctChange(revenueAds,    prevRevenueAds);
        const revenueStoreChange= pctChange(revenueStore,  prevRevenueStore);

        const conversionRate = periodConvTotal > 0 ? Math.round(periodConvClosed / periodConvTotal * 1000) / 10 : 0;
        const activeSessions = periodConvTotal;

        // Trend Aggregation (Daily)
        const trendMap = {};
        
        // Seed trendMap from orders
        orders.forEach(o => {
            const d = new Date(o.date).toISOString().split('T')[0];
            trendMap[d] = (trendMap[d] || 0) + o.totalAmount;
        });

        // Seed trendMap from marketing
        marketingData.forEach(m => {
            const d = new Date(m.date).toISOString().split('T')[0];
            trendMap[d] = (trendMap[d] || 0) + (m.revenue || 0);
        });

        const trends = Object.entries(trendMap)
            .map(([date, revenue]) => ({ date, revenue }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return {
          totalRevenue,
          revenueAds,
          revenueStore,
          ordersCount,
          avgTicket,
          activeSessions,
          conversionRate,
          revenueChange,
          revenueAdsChange,
          revenueStoreChange,
          trends
        };
    }, 300); // 5 minutes TTL

    return NextResponse.json(result);
  } catch (error) {
    logger.error('[ExecutiveAnalytics]', 'GET error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
