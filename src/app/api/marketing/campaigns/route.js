import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

function getRangeFilter(range) {
    const now = new Date();
    if (range === 'today') return { gte: new Date(now.setUTCHours(0, 0, 0, 0)) };
    if (range === 'last_7d') return { gte: new Date(Date.now() - 7 * 86400000) };
    if (range === 'last_30d') return { gte: new Date(Date.now() - 30 * 86400000) };
    if (range === 'this_month') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        return { gte: start };
    }
    if (range === 'last_month') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        return { gte: start, lte: end };
    }
    return undefined;
}

/**
 * GET /api/marketing/campaigns
 * Returns { success, data, lastSync }
 * Query: range=today|last_7d|last_30d|this_month|last_month, status=ACTIVE|PAUSED|...
 */
export async function GET(request) {
    try {
        const prisma = await getPrisma();
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || undefined;
        const status = searchParams.get('status') || undefined;
        const rangeFilter = getRangeFilter(range);

        const campaigns = await prisma.campaign.findMany({
            where: {
                AND: [
                    status ? { status } : {},
                    rangeFilter ? { createdAt: rangeFilter } : {},
                ],
            },
            include: {
                adSets: {
                    include: { ads: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const data = campaigns.map((campaign) => {
            let cSpend = 0, cImpressions = 0, cClicks = 0, cRevenue = 0;

            const adSets = campaign.adSets.map((adSet) => {
                const metrics = adSet.ads.reduce((acc, ad) => ({
                    spend: acc.spend + (ad.spend || 0),
                    impressions: acc.impressions + (ad.impressions || 0),
                    clicks: acc.clicks + (ad.clicks || 0),
                    revenue: acc.revenue + (ad.revenue || 0),
                }), { spend: 0, impressions: 0, clicks: 0, revenue: 0 });

                cSpend += metrics.spend;
                cImpressions += metrics.impressions;
                cClicks += metrics.clicks;
                cRevenue += metrics.revenue;

                return { ...adSet, metrics };
            });

            return {
                ...campaign,
                adSets,
                spend: cSpend,
                impressions: cImpressions,
                clicks: cClicks,
                revenue: cRevenue,
                roas: cSpend > 0 ? cRevenue / cSpend : 0,
                metrics: {
                    spend: cSpend,
                    impressions: cImpressions,
                    clicks: cClicks,
                    revenue: cRevenue,
                    roas: cSpend > 0 ? cRevenue / cSpend : 0,
                },
            };
        });

        // lastSync = latest updatedAt across all campaigns
        const lastSync = data.length > 0
            ? data.reduce((latest, c) => (c.updatedAt > latest ? c.updatedAt : latest), data[0].updatedAt)
            : null;

        return NextResponse.json({ success: true, data, lastSync });
    } catch (error) {
        logger.error('CampaignAPI', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
