import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

function getDateFilter(timeframe) {
    const now = new Date();
    if (timeframe === 'today') {
        const start = new Date(now);
        start.setUTCHours(0, 0, 0, 0);
        return { gte: start };
    }
    if (timeframe === 'week') return { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
    if (timeframe === 'month') return { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
    return undefined; // lifetime
}

/**
 * GET /api/analytics/admin-performance?timeframe=today|week|month|lifetime
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || 'month';
        const dateFilter = getDateFilter(timeframe);

        const employees = await prisma.employee.findMany({
            include: {
                closedOrders: dateFilter
                    ? { where: { createdAt: dateFilter }, select: { totalAmount: true } }
                    : { select: { totalAmount: true } },
                assignedConversations: dateFilter
                    ? {
                          where: { createdAt: dateFilter },
                          select: {
                              id: true,
                              messages: {
                                  orderBy: { createdAt: 'asc' },
                                  take: 2,
                                  select: { respondedById: true, createdAt: true },
                              },
                          },
                      }
                    : {
                          select: {
                              id: true,
                              messages: {
                                  orderBy: { createdAt: 'asc' },
                                  take: 2,
                                  select: { respondedById: true, createdAt: true },
                              },
                          },
                      },
            },
        });

        const data = employees.map((emp) => {
            const ordersCount = emp.closedOrders.length;
            const totalRevenue = emp.closedOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
            const avgOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;
            const conversationsCount = emp.assignedConversations.length;

            let totalResponseMs = 0;
            let responseCount = 0;
            for (const conv of emp.assignedConversations) {
                const msgs = conv.messages || [];
                const firstCustomer = msgs.find((m) => !m.respondedById);
                const firstReply = msgs.find((m) => m.respondedById === emp.id);
                if (firstCustomer && firstReply) {
                    const diff = new Date(firstReply.createdAt) - new Date(firstCustomer.createdAt);
                    if (diff > 0) { totalResponseMs += diff; responseCount++; }
                }
            }
            const avgResponseTimeMinutes = responseCount > 0
                ? Math.round(totalResponseMs / responseCount / 60000)
                : 0;

            return {
                id: emp.id,
                employeeId: emp.employeeId,
                firstName: emp.firstName,
                lastName: emp.lastName,
                nickName: emp.nickName,
                role: emp.role,
                department: emp.department,
                status: emp.status,
                stats: { ordersCount, totalRevenue, avgOrderValue, conversationsCount, avgResponseTimeMinutes },
            };
        });

        const summary = {
            totalEmployees: data.length,
            totalOrders: data.reduce((s, e) => s + e.stats.ordersCount, 0),
            totalRevenue: data.reduce((s, e) => s + e.stats.totalRevenue, 0),
            avgOrderValue: data.reduce((s, e) => s + e.stats.ordersCount, 0) > 0
                ? data.reduce((s, e) => s + e.stats.totalRevenue, 0) / data.reduce((s, e) => s + e.stats.ordersCount, 0)
                : 0,
        };

        return NextResponse.json({ success: true, data, summary });
    } catch (error) {
        logger.error('[AnalyticsAdminPerf]', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
