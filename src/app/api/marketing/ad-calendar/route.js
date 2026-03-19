import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const since = searchParams.get('since'); // YYYY-MM-DD
        const until = searchParams.get('until'); // YYYY-MM-DD

        if (!since || !until) {
            return NextResponse.json({ success: false, error: 'since and until params required' }, { status: 400 });
        }

        const data = await marketingRepo.getAdsCalendar(since, until);

        return NextResponse.json({
            success: true,
            since,
            until,
            data,
        });
    } catch (error) {
        logger.error('[ad-calendar]', 'GET error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
