import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

function getRangeFilter(range) {
    const now = new Date();
    if (range === 'today') return { gte: new Date(new Date().setUTCHours(0, 0, 0, 0)) };
    if (range === 'last_7d') return { gte: new Date(Date.now() - 7 * 86400000) };
    if (range === 'last_30d') return { gte: new Date(Date.now() - 30 * 86400000) };
    if (range === 'this_month') return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    if (range === 'last_month') {
        return {
            gte: new Date(now.getFullYear(), now.getMonth() - 1, 1),
            lte: new Date(now.getFullYear(), now.getMonth(), 0),
        };
    }
    return undefined;
}

/**
 * GET /api/marketing/adsets
 * Returns { success, data } — AdSets with aggregated ad metrics (Bottom-Up, ADR-024)
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || undefined;
        const status = searchParams.get('status') || undefined;
        const rangeFilter = getRangeFilter(range);

        const adSets = await prisma.adSet.findMany({
            where: {
                AND: [
                    status ? { status } : {},
                    rangeFilter ? { createdAt: rangeFilter } : {},
                ],
            },
            include: { ads: { select: { spend: true, impressions: true, clicks: true, revenue: true, roas: true } } },
            orderBy: { createdAt: 'desc' },
        });

        const data = adSets.map((adSet) => {
            const metrics = adSet.ads.reduce((acc, ad) => ({
                spend: acc.spend + (ad.spend || 0),
                impressions: acc.impressions + (ad.impressions || 0),
                clicks: acc.clicks + (ad.clicks || 0),
                revenue: acc.revenue + (ad.revenue || 0),
            }), { spend: 0, impressions: 0, clicks: 0, revenue: 0 });

            return {
                ...adSet,
                metrics: {
                    ...metrics,
                    roas: metrics.spend > 0 ? metrics.revenue / metrics.spend : 0,
                },
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        logger.error('AdSetsAPI', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
