import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { 
    getReviewResult, 
    runPhaseAChecks, 
    saveReviewResult,
    runPhaseBAnalysis
} from '@/lib/repositories/adReviewRepo';

/**
 * GET /api/marketing/ai-review/[adId] - Individual result (with auto-refresh)
 */
export async function GET(request, { params }) {
    const { adId } = params;

    try {
        let result = await getReviewResult(adId);

        const shouldRefresh = !result || 
            (new Date() - new Date(result.reviewedAt) > 24 * 60 * 60 * 1000);

        if (shouldRefresh) {
            const checkResult = await runPhaseAChecks(adId);
            result = await saveReviewResult(adId, checkResult);

            // Phase B: AI Analysis (Background process if score < 60)
            if (checkResult.score < 60) {
                runPhaseBAnalysis(adId, checkResult).catch(err => 
                    console.error('[ai-review] Phase B background execution failed', err)
                );
            }
        }

        return NextResponse.json({
            adId: result.adId,
            overallScore: result.overallScore,
            riskLevel: result.riskLevel,
            checks: result.phaseA,
            phaseB: result.phaseB ?? null,
            reviewedAt: result.reviewedAt
        });
    } catch (error) {
        logger.error('AdReviewAPI', `GET individual result error for adId: ${adId}`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
