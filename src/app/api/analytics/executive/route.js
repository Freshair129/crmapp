import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { getDateRange } from '@/lib/timeframes';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'this_month';
    const prisma = await getPrisma();

    const { current: dateFilter, prev: prevFilter } = getDateRange(timeframe);

    const [orders, prevOrders, activeSessions] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: 'CLOSED',
          ...(dateFilter ? { date: dateFilter } : {})
        },
        select: { totalAmount: true, conversationId: true }
      }),
      prevFilter ? prisma.order.findMany({
        where: {
          status: 'CLOSED',
          date: prevFilter
        },
        select: { totalAmount: true, conversationId: true }
      }) : Promise.resolve([]),
      prisma.conversation.count({
        where: { status: 'OPEN' }
      })
    ]);

    const revenueAds = orders.filter(o => o.conversationId).reduce((sum, o) => sum + o.totalAmount, 0);
    const revenueStore = orders.filter(o => !o.conversationId).reduce((sum, o) => sum + o.totalAmount, 0);
    const totalRevenue = revenueAds + revenueStore;
    const ordersCount = orders.length;
    const avgTicket = ordersCount > 0 ? totalRevenue / ordersCount : 0;

    const prevRevenueAds = prevOrders.filter(o => o.conversationId).reduce((sum, o) => sum + o.totalAmount, 0);
    const prevRevenueStore = prevOrders.filter(o => !o.conversationId).reduce((sum, o) => sum + o.totalAmount, 0);
    const prevTotalRevenue = prevRevenueAds + prevRevenueStore;

    const revenueChange = prevTotalRevenue > 0 ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue * 100) : 0;
    const revenueAdsChange = prevRevenueAds > 0 ? ((revenueAds - prevRevenueAds) / prevRevenueAds * 100) : 0;
    const revenueStoreChange = prevRevenueStore > 0 ? ((revenueStore - prevRevenueStore) / prevRevenueStore * 100) : 0;
    
    const conversionRate = activeSessions > 0 ? (ordersCount / activeSessions * 100) : 0;

    return NextResponse.json({
      totalRevenue,
      revenueAds,
      revenueStore,
      ordersCount,
      avgTicket,
      activeSessions,
      conversionRate,
      revenueChange: Math.round(revenueChange * 10) / 10,
      revenueAdsChange: Math.round(revenueAdsChange * 10) / 10,
      revenueStoreChange: Math.round(revenueStoreChange * 10) / 10
    });
  } catch (error) {
    logger.error('[ExecutiveAnalytics]', 'GET error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
