import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const adId = searchParams.get('ad_id');
        
        if (!adId) {
            return NextResponse.json({ error: 'ad_id parameter is required' }, { status: 400 });
        }

        const data = await marketingRepo.getAdHistoricalInsights(adId);

        return NextResponse.json({ success: true, data });
    } catch (error) {
        logger.error('[AdInsights]', 'GET error', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
