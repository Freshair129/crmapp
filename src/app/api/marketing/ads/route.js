import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

/**
 * GET /api/marketing/ads
 * Returns { success, data }
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || undefined;
        const status = searchParams.get('status') || undefined;

        const data = await marketingRepo.getAdsWithMetrics({ range, status });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        logger.error('AdsAPI', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
