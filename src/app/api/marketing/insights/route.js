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
        const [metrics, allTime, customerStats] = await Promise.all([
            prisma.adDailyMetric.aggregate({
                where: { date: { gte: thirtyDaysAgo } },
                _sum: { spend: true, impressions: true, clicks: true, revenue: true, leads: true }
            }),
            // All-time revenue + purchases for LTV calculation
            prisma.adDailyMetric.aggregate({
                _sum: { revenue: true, purchases: true }
            }),
            // Engagement heuristic: customers with at least 1 conversation
            prisma.conversation.groupBy({
                by: ['customerId'],
                _count: { customerId: true }
            }).then(rows => rows.length)
        ]);

        const insights = {
            spend: metrics._sum.spend || 0,
            impressions: metrics._sum.impressions || 0,
            clicks: metrics._sum.clicks || 0,
            revenue: metrics._sum.revenue || 0,
            reach: metrics._sum.impressions || 0,
            leads: metrics._sum.leads || 0,
            allTimeRevenue: Number(allTime._sum.revenue || 0),
            allTimePurchases: Number(allTime._sum.purchases || 0),
            engagedCustomers: customerStats
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
