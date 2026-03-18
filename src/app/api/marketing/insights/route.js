import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

/**
 * GET /api/marketing/insights - Aggregated marketing data (ADR-024)
 */
export async function GET() {
    try {
        const prisma = await getPrisma();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

        // Fetch metrics aggregated from AdDailyMetric for the last 30 days
        const [metrics, allTime, totalCustomers, engagedCustomers, crmRevenueAgg, activeStudentsCount, churnedCount, crmOrderAgg] = await Promise.all([
            prisma.adDailyMetric.aggregate({
                where: { date: { gte: thirtyDaysAgo } },
                _sum: { spend: true, impressions: true, clicks: true, revenue: true, leads: true }
            }),
            // All-time revenue + purchases for LTV calculation (from marketing metrics)
            prisma.adDailyMetric.aggregate({
                _sum: { revenue: true, purchases: true }
            }),
            // Total customers in DB (Total Contacts/Leads)
            prisma.customer.count(),
            // Engaged: distinct customers with at least 1 conversation
            prisma.conversation.groupBy({
                by: ['customerId'],
                _count: { customerId: true }
            }).then(rows => rows.length),
            // CRM Total Revenue: Aggregate all closed orders
            prisma.order.aggregate({
                where: { status: { in: ['closed', 'CLOSED'] } },
                _sum: { totalAmount: true }
            }),
            // Active Students: Customers who have at least one closed order and are not churned
            prisma.customer.count({
                where: {
                    orders: { some: { status: { in: ['closed', 'CLOSED'] } } },
                    NOT: { status: { in: ['Inactive', 'Churned'] } }
                }
            }),
            // Churned customers count (from DB — not paginated customers array)
            prisma.customer.count({
                where: { status: { in: ['Inactive', 'Churned'] } }
            }),
            // Total closed orders count + revenue for LTV (from CRM orders, not ad metrics)
            prisma.order.aggregate({
                where: { status: { in: ['closed', 'CLOSED'] } },
                _sum: { totalAmount: true },
                _count: { id: true }
            })
        ]);

        // LTV = CRM order revenue ÷ paid order count (more accurate than ad metric purchases)
        const crmOrderRevenue = Number(crmOrderAgg._sum.totalAmount || 0);
        const crmOrderCount   = Number(crmOrderAgg._count.id || 0);
        const avgLTV = crmOrderCount > 0
            ? Math.round(crmOrderRevenue / crmOrderCount)
            : totalCustomers > 0
                ? Math.round(Number(crmRevenueAgg._sum.totalAmount || 0) / totalCustomers)
                : 0;

        // Churn rate capped [0, 100] — no negative values
        const churnedCustomers = churnedCount;
        const churnRate = totalCustomers > 0
            ? Math.min(100, Math.max(0, Math.round((churnedCustomers / totalCustomers) * 100)))
            : 0;

        const insights = {
            spend: metrics._sum.spend || 0,
            impressions: metrics._sum.impressions || 0,
            clicks: metrics._sum.clicks || 0,
            revenue: metrics._sum.revenue || 0,
            reach: metrics._sum.impressions || 0,
            leads: metrics._sum.leads || 0,
            allTimeRevenue: Number(allTime._sum.revenue || 0),
            allTimePurchases: Number(allTime._sum.purchases || 0),
            totalCustomers,
            engagedCustomers,
            churnedCustomers,
            churnRate,
            avgLTV,
            crmTotalRevenue: Number(crmRevenueAgg._sum.totalAmount || 0),
            activeStudents: activeStudentsCount
        };

        return NextResponse.json({
            success: true,
            insights
        });
    } catch (error) {
        logger.error('MarketingAPI', 'GET insights error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
