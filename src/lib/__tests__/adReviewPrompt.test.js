import { describe, it, expect } from 'vitest';
import { buildReviewPrompt } from '@/lib/adReviewPrompt';

describe('buildReviewPrompt', () => {
    it('should include ad context in the prompt', () => {
        const ad = {
            creative: { headline: 'Test Headline', body: 'Test Body', callToAction: 'LEARN_MORE' },
            adSet: { name: 'Campaign A' },
        };
        const prompt = buildReviewPrompt(ad, []);

        expect(prompt).toContain('Test Headline');
        expect(prompt).toContain('Test Body');
        expect(prompt).toContain('LEARN_MORE');
        expect(prompt).toContain('Campaign A');
    });

    it('should include failed phase A checks', () => {
        const ad = { creative: {}, adSet: {} };
        const checks = [
            { name: 'Text Length', passed: true, detail: 'OK' },
            { name: 'CTA Check', passed: false, detail: 'Missing CTA' },
            { name: 'Image Check', passed: false, detail: 'Low resolution' },
        ];

        const prompt = buildReviewPrompt(ad, checks);

        expect(prompt).toContain('CTA Check: Missing CTA');
        expect(prompt).toContain('Image Check: Low resolution');
        expect(prompt).not.toContain('Text Length: OK');
    });

    it('should handle missing creative and adSet gracefully', () => {
        const ad = {};
        const prompt = buildReviewPrompt(ad, []);

        expect(prompt).toContain('N/A');
        expect(prompt).toContain('No automated issues found.');
    });

    it('should request strict JSON output', () => {
        const prompt = buildReviewPrompt({ creative: {}, adSet: {} }, []);
        expect(prompt).toContain('creativeScore');
        expect(prompt).toContain('policyRisk');
        expect(prompt).toContain('audienceFit');
        expect(prompt).toContain('rewriteSuggestion');
        expect(prompt).toContain('STRICT JSON OUTPUT FORMAT');
    });
});
