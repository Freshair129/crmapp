import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const dateStr = searchParams.get('date');
        
        if (!dateStr) {
            return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
        }

        const data = await marketingRepo.getHourlyAggregatedMetrics(dateStr);

        return NextResponse.json({ success: true, data });
    } catch (error) {
        logger.error('[MarketingHourly]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
