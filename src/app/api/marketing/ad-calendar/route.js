import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const since = searchParams.get('since'); // YYYY-MM-DD
        const until = searchParams.get('until'); // YYYY-MM-DD

        if (!since || !until) {
            return NextResponse.json({ success: false, error: 'since and until params required' }, { status: 400 });
        }

        const prisma = await getPrisma();

        const metrics = await prisma.adDailyMetric.findMany({
            where: {
                date: {
                    gte: new Date(since),
                    lte: new Date(until),
                },
                spend: { gt: 0 },
            },
            include: {
                ad: {
                    select: { adId: true, name: true, status: true, deliveryStatus: true },
                },
            },
            orderBy: { date: 'asc' },
        });

        // Group by adId
        const adsMap = {};
        for (const m of metrics) {
            const adId = m.adId;
            if (!adsMap[adId]) {
                adsMap[adId] = {
                    ad_id: adId,
                    name: m.ad?.name || 'Unknown',
                    status: m.ad?.status || 'UNKNOWN',
                    deliveryStatus: m.ad?.deliveryStatus || null,
                    totalSpend: 0,
                    totalImpressions: 0,
                    totalClicks: 0,
                    days: [],
                };
            }
            adsMap[adId].totalSpend += Number(m.spend) || 0;
            adsMap[adId].totalImpressions += Number(m.impressions) || 0;
            adsMap[adId].totalClicks += Number(m.clicks) || 0;
            adsMap[adId].days.push({
                date: m.date,
                spend: Number(m.spend) || 0,
                impressions: Number(m.impressions) || 0,
                clicks: Number(m.clicks) || 0,
            });
        }

        return NextResponse.json({
            success: true,
            since,
            until,
            data: Object.values(adsMap),
        });
    } catch (error) {
        console.error('[ad-calendar] GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
