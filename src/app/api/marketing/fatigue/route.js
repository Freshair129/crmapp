import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { detectCreativeFatigue } from '@/services/fatigueDetector';

/**
 * POST /api/marketing/fatigue - Trigger manual fatigue detection check
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const thresholdDays = body.thresholdDays || 30;
        const minSpend = body.minSpend || 1000;

        const fatiguedAds = await detectCreativeFatigue(thresholdDays, minSpend);

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            count: fatiguedAds.length,
            ads: fatiguedAds
        });
    } catch (error) {
        logger.error('FatigueAPI', 'POST error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
