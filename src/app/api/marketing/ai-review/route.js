import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { 
    getReviewSummary, 
    runPhaseAChecks, 
    saveReviewResult 
} from '@/lib/repositories/adReviewRepo';

/**
 * GET /api/marketing/ai-review - Aggregate review summary
 */
export async function GET() {
    try {
        const summary = await getReviewSummary();
        return NextResponse.json({
            success: true,
            summary
        });
    } catch (error) {
        logger.error('AdReviewAPI', 'GET summary error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

/**
 * POST /api/marketing/ai-review - Bulk process Phase A checks
 * Body: { adIds: string[] }
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { adIds } = body;

        if (!adIds || !Array.isArray(adIds)) {
            return NextResponse.json({ success: false, error: 'adIds array is required' }, { status: 400 });
        }

        const results = [];
        for (const adId of adIds) {
            try {
                const checkResult = await runPhaseAChecks(adId);
                const saved = await saveReviewResult(adId, checkResult);
                results.push(saved);
            } catch (adError) {
                logger.error('AdReviewAPI', `Failed to process adId: ${adId}`, adError);
                // Continue with other ads
            }
        }

        return NextResponse.json({
            success: true,
            processed: results.length,
            results
        });
    } catch (error) {
        logger.error('AdReviewAPI', 'POST bulk review error', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
