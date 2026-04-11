import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeAdWithGemini } from '@/lib/geminiReviewService';

vi.mock('@/lib/adReviewPrompt.js', () => ({
    buildReviewPrompt: vi.fn().mockReturnValue('test prompt'),
}));

describe('geminiReviewService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubEnv('GEMINI_API_KEY', 'test-key');
    });

    it('should return null when no API key', async () => {
        vi.stubEnv('GEMINI_API_KEY', '');
        const result = await analyzeAdWithGemini({}, []);
        expect(result).toBeNull();
    });

    it('should return structured analysis on success', async () => {
        const mockResult = {
            creativeScore: 85,
            policyRisk: 'LOW',
            issues: [],
            audienceFit: 'GOOD',
            rewriteSuggestion: null,
            summary: 'Great ad',
        };

        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                candidates: [{ content: { parts: [{ text: JSON.stringify(mockResult) }] } }],
            }),
        });

        const result = await analyzeAdWithGemini({ creative: {}, adSet: {} }, []);
        expect(result).toEqual(mockResult);
    });

    it('should return null on API error', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: false,
            text: () => Promise.resolve('API error'),
        });

        const result = await analyzeAdWithGemini({ creative: {}, adSet: {} }, []);
        expect(result).toBeNull();
    });

    it('should return null on empty response', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ candidates: [{ content: { parts: [{}] } }] }),
        });

        const result = await analyzeAdWithGemini({}, []);
        expect(result).toBeNull();
    });

    it('should return null when JSON response is missing required keys', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                candidates: [{ content: { parts: [{ text: '{"creativeScore": 50}' }] } }],
            }),
        });

        const result = await analyzeAdWithGemini({}, []);
        expect(result).toBeNull();
    });

    it('should return null on invalid JSON from Gemini', async () => {
        global.fetch = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({
                candidates: [{ content: { parts: [{ text: 'not json' }] } }],
            }),
        });

        const result = await analyzeAdWithGemini({}, []);
        expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
        global.fetch = vi.fn().mockRejectedValue(new Error('Network'));
        const result = await analyzeAdWithGemini({}, []);
        expect(result).toBeNull();
    });
});
