import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

import { getDateRange } from '@/lib/timeframes';

/**
 * GET /api/analytics/admin-performance?timeframe=today|this_week|this_month|last_month|all_time
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || 'this_month';
        const { current: dateFilter } = getDateRange(timeframe);

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
                                  select: { responderId: true, createdAt: true },
                              },
                          },
                      }
                    : {
                          select: {
                              id: true,
                              messages: {
                                  orderBy: { createdAt: 'asc' },
                                  take: 2,
                                  select: { responderId: true, createdAt: true },
                              },
                          },
                      },
            },
        });

        const data = employees.map((emp) => {
            const ordersCount = emp.closedOrders.length;
            const totalRevenue = emp.closedOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
            const avgOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0;
            const conversationsCount = emp.assignedConversations.length;

            let totalResponseMs = 0;
            let responseCount = 0;
            for (const conv of emp.assignedConversations) {
                const msgs = conv.messages || [];
                const firstCustomer = msgs.find((m) => !m.responderId);
                const firstReply = msgs.find((m) => m.responderId === emp.id);
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
                name: emp.nickName || emp.firstName,
                fullName: `${emp.firstName} ${emp.lastName}`,
                firstName: emp.firstName,
                lastName: emp.lastName,
                nickName: emp.nickName,
                role: emp.role,
                department: emp.department,
                status: emp.status,
                stats: { 
                    ordersCount, 
                    totalRevenue, 
                    avgOrderValue, 
                    conversationsCount, 
                    avgResponseTimeMinutes,
                    messages: conversationsCount, // Proxy
                    conversationsHandled: conversationsCount // Proxy
                },
            };
        });

        const combinedStats = data.reduce((acc, e) => {
            acc.totalMessages += e.stats.conversationsCount || 0; // Using conversationsCount as proxy for now
            acc.totalConversations += e.stats.conversationsCount || 0;
            acc.totalResponseMs += (e.stats.avgResponseTimeMinutes || 0) * 60000;
            acc.responseCount += e.stats.avgResponseTimeMinutes > 0 ? 1 : 0;
            return acc;
        }, { totalMessages: 0, totalConversations: 0, totalResponseMs: 0, responseCount: 0 });

        const summary = {
            totalEmployees: data.length,
            totalOrders: data.reduce((s, e) => s + e.stats.ordersCount, 0),
            totalRevenue: data.reduce((s, e) => s + e.stats.totalRevenue, 0),
            totalMessages: combinedStats.totalMessages,
            totalConversations: combinedStats.totalConversations,
            avgResponseTimeMinutes: combinedStats.responseCount > 0 ? (combinedStats.totalResponseMs / combinedStats.responseCount / 60000) : 0,
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
