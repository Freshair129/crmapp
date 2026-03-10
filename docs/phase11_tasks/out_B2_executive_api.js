Loaded cached credentials.
```javascript
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe');
    const prisma = await getPrisma();
    const now = new Date();

    let dateFilter = null;
    let prevFilter = null;

    if (timeframe === 'today') {
      const startOfToday = new Date(now);
      startOfToday.setUTCHours(0, 0, 0, 0);
      dateFilter = { gte: startOfToday };

      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setUTCDate(startOfYesterday.getUTCDate() - 1);
      prevFilter = { gte: startOfYesterday, lt: startOfToday };
    } else if (timeframe === 'week') {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
      dateFilter = { gte: sevenDaysAgo };

      const fourteenDaysAgo = new Date(now);
      fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14);
      prevFilter = { gte: fourteenDaysAgo, lt: sevenDaysAgo };
    } else if (timeframe === 'month') {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
      dateFilter = { gte: thirtyDaysAgo };

      const sixtyDaysAgo = new Date(now);
      sixtyDaysAgo.setUTCDate(sixtyDaysAgo.getUTCDate() - 60);
      prevFilter = { gte: sixtyDaysAgo, lt: thirtyDaysAgo };
    }

    const [orders, prevOrders, activeSessions] = await Promise.all([
      prisma.order.findMany({
        where: {
          status: 'CLOSED',
          ...(dateFilter ? { date: dateFilter } : {})
        },
        select: { totalAmount: true }
      }),
      prevFilter ? prisma.order.findMany({
        where: {
          status: 'CLOSED',
          date: prevFilter
        },
        select: { totalAmount: true }
      }) : Promise.resolve([]),
      prisma.conversation.count({
        where: { status: 'OPEN' }
      })
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
    const ordersCount = orders.length;
    const avgTicket = ordersCount > 0 ? totalRevenue / ordersCount : 0;

    const prevRevenue = prevOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue * 100) : 0;
    const conversionRate = activeSessions > 0 ? (ordersCount / activeSessions * 100) : 0;

    return NextResponse.json({
      totalRevenue,
      ordersCount,
      avgTicket,
      activeSessions,
      conversionRate,
      revenueChange: Math.round(revenueChange * 10) / 10
    });
  } catch (error) {
    logger.error('[ExecutiveAnalytics]', 'GET error', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
```
