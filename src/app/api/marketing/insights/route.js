import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

/**
 * GET /api/marketing/insights - Aggregated marketing data (ADR-024)
 */
export async function GET() {
    try {
        const insights = await marketingRepo.getMarketingInsights();

        return NextResponse.json({
            success: true,
            insights
        });
    } catch (error) {
        logger.error('MarketingAPI', 'GET insights error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

