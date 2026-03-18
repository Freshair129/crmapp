import { buildReviewPrompt } from './adReviewPrompt.js';

/**
 * Analyze ad using Gemini 2.0 Flash model via HTTPS
 * @param {object} ad - Ad model with inclusions
 * @param {Array} phaseAChecks - Phase A results
 * @returns {Promise<object|null>} Structured AI analysis or null if failed
 */
export async function analyzeAdWithGemini(ad, phaseAChecks) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('[geminiReviewService] GEMINI_API_KEY missing in environment');
        return null;
    }

    const prompt = buildReviewPrompt(ad, phaseAChecks);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    response_mime_type: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[geminiReviewService] API call failed', errorText);
            return null;
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            console.warn('[geminiReviewService] Empty response from Gemini');
            return null;
        }

        try {
            const result = JSON.parse(textResponse);
            
            // Basic validation
            const requiredKeys = ['creativeScore', 'policyRisk', 'issues', 'audienceFit', 'summary'];
            const hasAllKeys = requiredKeys.every(key => key in result);

            if (!hasAllKeys) {
                console.warn('[geminiReviewService] Missing keys in Gemini JSON response');
                return null;
            }

            return result;
        } catch (parseError) {
            console.warn('[geminiReviewService] Failed to parse Gemini response as JSON', textResponse);
            return null;
        }
    } catch (error) {
        console.error('[geminiReviewService] Fetch error', error);
        return null;
    }
}
