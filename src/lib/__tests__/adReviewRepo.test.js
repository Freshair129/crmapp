import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as adReviewRepo from '@/lib/repositories/adReviewRepo';
import { getPrisma } from '@/lib/db';

vi.mock('@/lib/db', () => ({
    getPrisma: vi.fn(),
}));

describe('adReviewRepo', () => {
    let mockPrisma;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPrisma = {
            ad: { findUnique: vi.fn() },
            adDailyMetric: { findMany: vi.fn() },
            adReviewResult: { 
                findFirst: vi.fn(), 
                create: vi.fn(), 
                update: vi.fn(),
                groupBy: vi.fn(),
                aggregate: vi.fn()
            },
        };
        getPrisma.mockResolvedValue(mockPrisma);
    });

    describe('runPhaseAChecks', () => {
        it('should pass all checks for a healthy ad', async () => {
            const adId = 'ad-123';
            mockPrisma.ad.findUnique.mockResolvedValue({ 
                adId, 
                creative: { body: 'Check out our new course! 🚀' } 
            });
            
            // Healthy metrics: 1% CTR stable, ROAS 2.0
            const metrics = Array(7).fill(null).map((_, i) => ({
                date: new Date(Date.now() - i * 86400000),
                impressions: 1000,
                clicks: 10,
                spend: 100,
                revenue: 200,
                reach: 500,
                purchases: 5
            }));
            mockPrisma.adDailyMetric.findMany.mockResolvedValue(metrics);

            const result = await adReviewRepo.runPhaseAChecks(adId);

            expect(result.score).toBe(100);
            expect(result.riskLevel).toBe('LOW');
            result.checks.forEach(c => expect(c.passed).toBe(true));
        });

        it('should detect CREATIVE_FATIGUE when CTR drops', async () => {
            const adId = 'ad-fatigue';
            mockPrisma.ad.findUnique.mockResolvedValue({ adId, creative: { body: 'test' } });
            
            // Metrics: High CTR initially, then massive drop
            const metrics = [
                { impressions: 1000, clicks: 50, spend: 100, reach: 500 }, // Day 1: 5%
                { impressions: 1000, clicks: 50, spend: 100, reach: 500 }, // Day 2: 5%
                { impressions: 1000, clicks: 50, spend: 100, reach: 500 }, // Day 3: 5%
                { impressions: 1000, clicks: 1, spend: 100, reach: 500 },  // Day 4: 0.1% (Drop!)
                { impressions: 1000, clicks: 1, spend: 100, reach: 500 },
                { impressions: 1000, clicks: 1, spend: 100, reach: 500 },
                { impressions: 1000, clicks: 1, spend: 100, reach: 500 },
            ];
            mockPrisma.adDailyMetric.findMany.mockResolvedValue(metrics);

            const result = await adReviewRepo.runPhaseAChecks(adId);
            const fatigueCheck = result.checks.find(c => c.checkId === 'CREATIVE_FATIGUE');
            
            expect(fatigueCheck.passed).toBe(false);
            expect(result.score).toBeLessThan(100);
        });

        it('should detect EMOJI_OVERLOAD', async () => {
            const adId = 'ad-emoji';
            mockPrisma.ad.findUnique.mockResolvedValue({ 
                adId, 
                creative: { body: '🍎🍊🍓🍇🍉🍌🍒🥝🍐🍍' } // 10 emojis > 7
            });
            mockPrisma.adDailyMetric.findMany.mockResolvedValue([]);

            const result = await adReviewRepo.runPhaseAChecks(adId);
            const emojiCheck = result.checks.find(c => c.checkId === 'EMOJI_OVERLOAD');
            expect(emojiCheck.passed).toBe(false);
            expect(emojiCheck.detail).toContain('Found 10 emojis');
        });

        it('should detect URGENCY_WORDS', async () => {
            const adId = 'ad-urgency';
            mockPrisma.ad.findUnique.mockResolvedValue({ 
                adId, 
                creative: { body: 'ด่วน! สินค้ามีจำนวนจำกัด' } 
            });
            mockPrisma.adDailyMetric.findMany.mockResolvedValue([]);

            const result = await adReviewRepo.runPhaseAChecks(adId);
            const urgencyCheck = result.checks.find(c => c.checkId === 'URGENCY_WORDS');
            expect(urgencyCheck.passed).toBe(false);
        });
    });

    describe('saveReviewResult', () => {
        it('should create new result if none exists for today', async () => {
            mockPrisma.adReviewResult.findFirst.mockResolvedValue(null);
            const phaseA = { checks: [], score: 80, riskLevel: 'MEDIUM' };
            
            await adReviewRepo.saveReviewResult('ad-1', phaseA);
            
            expect(mockPrisma.adReviewResult.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ adId: 'ad-1', overallScore: 80 })
            }));
        });
    });

    describe('getReviewSummary', () => {
        it('should calculate summary from grouped results', async () => {
            mockPrisma.adReviewResult.groupBy.mockResolvedValue([
                { riskLevel: 'LOW', _count: { riskLevel: 5 } },
                { riskLevel: 'HIGH', _count: { riskLevel: 2 } }
            ]);
            mockPrisma.adReviewResult.aggregate.mockResolvedValue({
                _count: { id: 7 },
                _avg: { overallScore: 85 }
            });

            const summary = await adReviewRepo.getReviewSummary();
            
            expect(summary.total).toBe(7);
            expect(summary.low).toBe(5);
            expect(summary.high).toBe(2);
            expect(summary.avgScore).toBe(85);
        });
    });
});
