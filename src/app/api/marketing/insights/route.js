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
        const metrics = await prisma.adDailyMetric.aggregate({
            where: {
                date: { gte: thirtyDaysAgo }
            },
            _sum: {
                spend: true,
                impressions: true,
                clicks: true,
                revenue: true,
                leads: true
            }
        });

        const insights = {
            spend: metrics._sum.spend || 0,
            impressions: metrics._sum.impressions || 0,
            clicks: metrics._sum.clicks || 0,
            revenue: metrics._sum.revenue || 0,
            reach: metrics._sum.impressions || 0, // Proxy reach as impressions for now
            leads: metrics._sum.leads || 0
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
