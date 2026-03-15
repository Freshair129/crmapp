import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { cache } from '@/lib/redis';

/**
 * GET /api/marketing/daily
 * Returns { success, data } — last 30 days of AdDailyMetric, grouped by date
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date') || undefined;

        const cacheKey = `marketing:daily:${date || 'latest'}`;

        const payload = await cache.getOrSet(cacheKey, async () => {
            const prisma = await getPrisma();

            const since = new Date(Date.now() - 90 * 86400000);

            const metrics = await prisma.adDailyMetric.findMany({
                where: { date: { gte: since } },
                orderBy: { date: 'desc' },
                include: { ad: { select: { name: true, adId: true } } },
            });

            // Group by date and aggregate
            const byDate = {};
            for (const m of metrics) {
                const key = m.date.toISOString().split('T')[0];
                if (!byDate[key]) {
                    byDate[key] = { date: key, spend: 0, impressions: 0, clicks: 0, leads: 0, purchases: 0, revenue: 0 };
                }
                byDate[key].spend += m.spend || 0;
                byDate[key].impressions += m.impressions || 0;
                byDate[key].clicks += m.clicks || 0;
                byDate[key].leads += m.leads || 0;
                byDate[key].purchases += m.purchases || 0;
                byDate[key].revenue += m.revenue || 0;
            }

            const data = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));

            return { success: true, data };
        }, 300); // 5 min TTL

        return NextResponse.json(payload);
    } catch (error) {
        logger.error('DailyMetricsAPI', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
