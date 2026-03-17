import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { cache } from '@/lib/redis';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

/**
 * GET /api/marketing/campaigns
 * Returns { success, data, lastSync }
 * Query: range=today|last_7d|last_30d|this_month|last_month, status=ACTIVE|PAUSED|...
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || undefined;
        const status = searchParams.get('status') || undefined;

        const cacheKey = `marketing:campaigns:${range || 'all'}:${status || 'all'}`;

        const payload = await cache.getOrSet(cacheKey, async () => {
            const result = await marketingRepo.getCampaignsWithAggregatedMetrics({ range, status });
            return { success: true, ...result };
        }, 300); // 5 min TTL

        return NextResponse.json(payload);
    } catch (error) {
        logger.error('CampaignAPI', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
