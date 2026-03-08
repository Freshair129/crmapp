import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

/**
 * GET /api/marketing/insights - Aggregated marketing data (ADR-024)
 */
export async function GET() {
    try {
        const prisma = await getPrisma();

        // Bottom-Up Aggregation as per Phase 5 / Level 3
        const ads = await prisma.ad.findMany({
            where: { status: 'ACTIVE' },
            select: {
                spend: true,
                impressions: true,
                clicks: true,
                revenue: true
            }
        });

        const insights = ads.reduce((acc, ad) => ({
            spend: acc.spend + (ad.spend || 0),
            impressions: acc.impressions + (ad.impressions || 0),
            clicks: acc.clicks + (ad.clicks || 0),
            revenue: acc.revenue + (ad.revenue || 0)
        }), { spend: 0, impressions: 0, clicks: 0, revenue: 0 });

        return NextResponse.json({
            success: true,
            insights
        });
    } catch (error) {
        logger.error('MarketingAPI', 'GET insights error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
