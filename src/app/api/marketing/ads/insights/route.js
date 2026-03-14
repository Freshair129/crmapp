import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const adId = searchParams.get('ad_id');
        
        if (!adId) {
            return NextResponse.json({ error: 'ad_id parameter is required' }, { status: 400 });
        }

        const prisma = await getPrisma();

        // Fetch last 30 days of daily metrics for the specific ad
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyMetrics = await prisma.adDailyMetric.findMany({
            where: {
                adId: adId,
                date: {
                    gte: thirtyDaysAgo
                }
            },
            orderBy: {
                date: 'asc'
            }
        });

        // Format date and ensure all required metrics are present for the chart
        const formattedData = dailyMetrics.map(m => ({
            date: m.date.toISOString().split('T')[0],
            spend: m.spend,
            impressions: m.impressions,
            clicks: m.clicks,
            leads: m.leads,
            purchases: m.purchases,
            revenue: m.revenue,
            ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
            roas: m.spend > 0 ? (m.revenue / m.spend) : 0
        }));

        return NextResponse.json({ success: true, data: formattedData });
    } catch (error) {
        logger.error('[AdInsights]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
