import { getPrisma } from '@/lib/db';
import { analyzeAdWithGemini } from '@/lib/geminiReviewService';

/**
 * Run Phase A Rules-based Checks for an Ad
 * @param {string} adId - Meta adId (matches Ad.adId)
 */
export async function runPhaseAChecks(adId) {
    try {
        const prisma = await getPrisma();
        
        // 1. Fetch Data
        const ad = await prisma.ad.findUnique({
            where: { adId },
            include: { creative: true }
        });

        if (!ad) throw new Error(`Ad not found: ${adId}`);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyMetrics = await prisma.adDailyMetric.findMany({
            where: { 
                adId,
                date: { gte: sevenDaysAgo }
            },
            orderBy: { date: 'asc' }
        });

        const checks = [];
        let score = 100;

        // --- RULE IMPLEMENTAION ---

        // 1. CREATIVE_FATIGUE: Compare CTR day 1-3 vs 4-7
        const firstHalf = dailyMetrics.slice(0, 3);
        const secondHalf = dailyMetrics.slice(3, 7);
        
        const getAvgCtr = (metrics) => {
            if (metrics.length === 0) return 0;
            const sumCtr = metrics.reduce((acc, m) => {
                const ctr = m.impressions > 0 ? (m.clicks / m.impressions) : 0;
                return acc + ctr;
            }, 0);
            return sumCtr / metrics.length;
        };

        const avgCtr1 = getAvgCtr(firstHalf);
        const avgCtr2 = getAvgCtr(secondHalf);
        const fatiguePassed = avgCtr1 === 0 || (avgCtr2 / avgCtr1) >= 0.7;
        
        checks.push({
            checkId: 'CREATIVE_FATIGUE',
            name: 'Creative Fatigue Detection',
            passed: fatiguePassed,
            severity: 'HIGH',
            detail: fatiguePassed ? 'CTR stable' : `CTR dropped > 30% (from ${(avgCtr1 * 100).toFixed(2)}% to ${(avgCtr2 * 100).toFixed(2)}%)`
        });
        if (!fatiguePassed) score -= 25;

        // Aggregate 7-day totals
        const totalSpend = dailyMetrics.reduce((acc, m) => acc + (m.spend || 0), 0);
        const totalPurchases = dailyMetrics.reduce((acc, m) => acc + (m.purchases || 0), 0);
        const totalRevenue = dailyMetrics.reduce((acc, m) => acc + (m.revenue || 0), 0);
        const avgRoas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
        
        // 2. ROAS_NEGATIVE
        const roasPassed = !(avgRoas < 1.0 && totalSpend > 500);
        checks.push({
            checkId: 'ROAS_NEGATIVE',
            name: 'Negative ROAS Check',
            passed: roasPassed,
            severity: 'HIGH',
            detail: roasPassed ? 'ROAS healthy or low spend' : `ROAS of ${avgRoas.toFixed(2)} with ${totalSpend} THB spend`
        });
        if (!roasPassed) score -= 25;

        // 3. ZERO_CONVERSION
        const zeroConvPassed = !(totalSpend > 1000 && totalPurchases === 0);
        checks.push({
            checkId: 'ZERO_CONVERSION',
            name: 'Zero Conversion Check',
            passed: zeroConvPassed,
            severity: 'HIGH',
            detail: zeroConvPassed ? 'Has conversions or low spend' : `Zero purchases despite ${totalSpend} THB spend`
        });
        if (!zeroConvPassed) score -= 25;

        // 4. HIGH_FREQUENCY
        // Note: frequency for 7 days isn't directly in dailyMetric sum, proxy via reach if daily reach is provided
        // Logic: frequency = impressions / reach. Since reach is daily, we take average daily frequency.
        const avgFreq = dailyMetrics.length > 0 
            ? dailyMetrics.reduce((acc, m) => acc + (m.reach > 0 ? m.impressions / m.reach : 1), 0) / dailyMetrics.length 
            : 1;
        const freqPassed = avgFreq <= 3.5;
        checks.push({
            checkId: 'HIGH_FREQUENCY',
            name: 'High Frequency Check',
            passed: freqPassed,
            severity: 'MEDIUM',
            detail: freqPassed ? 'Frequency stable' : `Avg daily frequency is ${avgFreq.toFixed(2)}`
        });
        if (!freqPassed) score -= 10;

        // 5. EMOJI_OVERLOAD
        const body = ad.creative?.body || '';
        const emojiRegex = /[\u{1F300}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E0}-\u{1F1FF}]/gu;
        const emojiCount = (body.match(emojiRegex) || []).length;
        const emojiPassed = emojiCount <= 7;
        checks.push({
            checkId: 'EMOJI_OVERLOAD',
            name: 'Emoji Count Check',
            passed: emojiPassed,
            severity: 'MEDIUM',
            detail: emojiPassed ? 'Normal emoji usage' : `Found ${emojiCount} emojis (limit: 7)`
        });
        if (!emojiPassed) score -= 10;

        // 6. CAPTION_TOO_LONG
        const lengthPassed = body.length <= 500;
        checks.push({
            checkId: 'CAPTION_TOO_LONG',
            name: 'Caption Length Check',
            passed: lengthPassed,
            severity: 'LOW',
            detail: lengthPassed ? 'Length OK' : `Body length ${body.length} exceeds 500 chars`
        });
        if (!lengthPassed) score -= 5;

        // 7. URGENCY_WORDS
        const urgencyRegex = /จำกัด|ด่วน|หมดแล้ว|รีบสมัคร/g;
        const urgencyPassed = !urgencyRegex.test(body);
        checks.push({
            checkId: 'URGENCY_WORDS',
            name: 'Urgency Words Check',
            passed: urgencyPassed,
            severity: 'LOW',
            detail: urgencyPassed ? 'No aggressive urgency words' : 'Found aggressive urgency words (จำกัด/ด่วน/หมดแล้ว/รีบสมัคร)'
        });
        if (!urgencyPassed) score -= 5;

        // Final score normalization
        const finalScore = Math.max(0, score);
        let riskLevel = 'LOW';
        if (finalScore < 40) riskLevel = 'CRITICAL';
        else if (finalScore < 60) riskLevel = 'HIGH';
        else if (finalScore < 80) riskLevel = 'MEDIUM';

        return {
            checks,
            score: finalScore,
            riskLevel
        };

    } catch (error) {
        console.error('[adReviewRepo] runPhaseAChecks failed', error);
        throw error;
    }
}

/**
 * Save or Update Review Result
 */
export async function saveReviewResult(adId, phaseAResult) {
    try {
        const prisma = await getPrisma();
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        // Find if already reviewed today
        const existing = await prisma.adReviewResult.findFirst({
            where: {
                adId,
                reviewedAt: {
                    gte: today
                }
            }
        });

        if (existing) {
            return prisma.adReviewResult.update({
                where: { id: existing.id },
                data: {
                    phaseA: phaseAResult.checks,
                    overallScore: phaseAResult.score,
                    riskLevel: phaseAResult.riskLevel,
                    status: 'done',
                    reviewedAt: new Date()
                }
            });
        }

        return prisma.adReviewResult.create({
            data: {
                adId,
                phaseA: phaseAResult.checks,
                overallScore: phaseAResult.score,
                riskLevel: phaseAResult.riskLevel,
                status: 'done'
            }
        });
    } catch (error) {
        console.error('[adReviewRepo] saveReviewResult failed', error);
        throw error;
    }
}

/**
 * Get latest review Result
 */
export async function getReviewResult(adId) {
    try {
        const prisma = await getPrisma();
        return prisma.adReviewResult.findFirst({
            where: { adId },
            orderBy: { reviewedAt: 'desc' }
        });
    } catch (error) {
        console.error('[adReviewRepo] getReviewResult failed', error);
        throw error;
    }
}

/**
 * Get overall summary
 */
export async function getReviewSummary() {
    try {
        const prisma = await getPrisma();

        const [grouped, aggregate] = await Promise.all([
            prisma.adReviewResult.groupBy({
                by: ['riskLevel'],
                where: { status: { not: 'stale' } },
                _count: { riskLevel: true }
            }),
            prisma.adReviewResult.aggregate({
                where: { status: { not: 'stale' } },
                _count: { id: true },
                _avg: { overallScore: true }
            })
        ]);

        const counts = Object.fromEntries(grouped.map(g => [g.riskLevel, g._count.riskLevel]));

        return {
            total: aggregate._count.id,
            critical: counts['CRITICAL'] ?? 0,
            high: counts['HIGH'] ?? 0,
            medium: counts['MEDIUM'] ?? 0,
            low: counts['LOW'] ?? 0,
            avgScore: Math.round(aggregate._avg.overallScore ?? 100)
        };
    } catch (error) {
        console.error('[adReviewRepo] getReviewSummary failed', error);
        throw error;
    }
}

/**
 * Run Phase B AI Analysis for an Ad
 * @param {string} adId - Meta adId
 * @param {object} phaseAResult - Already completed phase A checks and score
 */
export async function runPhaseBAnalysis(adId, phaseAResult) {
    try {
        const prisma = await getPrisma();
        
        const ad = await prisma.ad.findUnique({
            where: { adId },
            include: { 
                creative: true,
                adSet: { select: { name: true } }
            }
        });

        if (!ad) {
            console.warn('[adReviewRepo] runPhaseBAnalysis: Ad not found', adId);
            return null;
        }

        const phaseBResult = await analyzeAdWithGemini(ad, phaseAResult.checks);

        if (phaseBResult) {
            // Update only the latest record — find its id first to avoid overwriting older results
            const latest = await prisma.adReviewResult.findFirst({
                where: { adId },
                orderBy: { reviewedAt: 'desc' },
                select: { id: true }
            });
            if (latest) {
                await prisma.adReviewResult.update({
                    where: { id: latest.id },
                    data: { phaseB: phaseBResult }
                });
            }
            return phaseBResult;
        }
        
        return null;
    } catch (error) {
        console.error('[adReviewRepo] runPhaseBAnalysis failed', error);
        return null;
    }
}
