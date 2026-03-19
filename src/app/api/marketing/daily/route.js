import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import * as marketingRepo from '@/lib/repositories/marketingRepo';
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
            const since = new Date(Date.now() - 90 * 86400000);
            const data = await marketingRepo.getDailyAggregatedMetrics(since);
            return { success: true, data };
        }, 300); // 5 min TTL

        return NextResponse.json(payload);
    } catch (error) {
        logger.error('DailyMetricsAPI', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
