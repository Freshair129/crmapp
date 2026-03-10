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
    if (timeframe === 'week') {
        return { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
    }
    return undefined; // lifetime
}

/**
 * GET /api/analytics/team?timeframe=today|week|lifetime
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || 'lifetime';
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
                              messages: {
                                  orderBy: { createdAt: 'asc' },
                                  take: 2,
                                  select: { fromId: true, createdAt: true, responderId: true },
                              },
                          },
                      }
                    : {
                          select: {
                              messages: {
                                  orderBy: { createdAt: 'asc' },
                                  take: 2,
                                  select: { fromId: true, createdAt: true, responderId: true },
                              },
                          },
                      },
            },
        });

        const employeeStats = employees.map((emp) => {
            const ordersCount = emp.closedOrders.length;
            const totalRevenue = emp.closedOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
            const conversationsCount = emp.assignedConversations.length;

            // Avg response time: diff between first customer msg and first employee reply
            let totalResponseMs = 0;
            let responseCount = 0;
            for (const conv of emp.assignedConversations) {
                const msgs = conv.messages || [];
                const firstCustomer = msgs.find((m) => !m.responderId);
                const firstReply = msgs.find((m) => m.responderId === emp.id);
                if (firstCustomer && firstReply) {
                    const diff = new Date(firstReply.createdAt) - new Date(firstCustomer.createdAt);
                    if (diff > 0) {
                        totalResponseMs += diff;
                        responseCount++;
                    }
                }
            }
            const avgResponseTimeMinutes = responseCount > 0
                ? Math.round(totalResponseMs / responseCount / 60000)
                : 0;

            return {
                employeeId: emp.employeeId,
                firstName: emp.firstName,
                lastName: emp.lastName,
                nickName: emp.nickName,
                role: emp.role,
                department: emp.department,
                stats: { ordersCount, totalRevenue, conversationsCount, avgResponseTimeMinutes },
            };
        });

        const topClosers = [...employeeStats]
            .sort((a, b) => b.stats.ordersCount - a.stats.ordersCount)
            .slice(0, 5);

        return NextResponse.json({ success: true, employees: employeeStats, topClosers });
    } catch (error) {
        logger.error('[AnalyticsTeam]', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
