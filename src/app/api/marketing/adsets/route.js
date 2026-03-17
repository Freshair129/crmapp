import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

/**
 * GET /api/marketing/adsets
 * Returns { success, data } — AdSets with aggregated ad metrics (Bottom-Up, ADR-024)
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || undefined;
        const status = searchParams.get('status') || undefined;

        const data = await marketingRepo.getAdSetsWithAggregatedMetrics({ range, status });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        logger.error('AdSetsAPI', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
