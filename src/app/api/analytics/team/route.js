import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

import { getDateRange } from '@/lib/timeframes';

/**
 * GET /api/analytics/team?timeframe=today|this_week|this_month|last_month|all_time
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);
        const timeframe = searchParams.get('timeframe') || 'all_time';
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
            const totalRevenue = emp.closedOrders.reduce((s, o) => s + Number(o.totalAmount || 0), 0);
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
                id: emp.id,
                employeeId: emp.employeeId,
                name: emp.nickName || emp.firstName,
                fullName: `${emp.firstName} ${emp.lastName}`,
                firstName: emp.firstName,
                facebookName: emp.facebookName,
                role: emp.role,
                department: emp.department,
                revenue: totalRevenue,
                customers: ordersCount,
                leads: conversationsCount,
                avgResponseTime: avgResponseTimeMinutes,
                conversionRate: conversationsCount > 0 ? (ordersCount / conversationsCount) * 100 : 0,
                avgOrderValue: ordersCount > 0 ? totalRevenue / ordersCount : 0
            };
        });

        // Calculate Global Summary
        const summary = {
            totalRevenue: employeeStats.reduce((s, e) => s + e.revenue, 0),
            totalLeads: employeeStats.reduce((s, e) => s + e.leads, 0),
            totalCustomers: employeeStats.reduce((s, e) => s + e.customers, 0),
            marketingSpend: 15000, // Mock or fetch from Ads API if available
            marketingRevenue: 0,
            marketingPurchases: 0,
            marketingLeads: 0
        };

        const topClosers = [...employeeStats]
            .sort((a, b) => b.customers - a.customers)
            .slice(0, 5);

        return NextResponse.json({ success: true, data: employeeStats, summary, topClosers });
    } catch (error) {
        logger.error('[AnalyticsTeam]', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
