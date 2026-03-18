/**
 * Build a structured prompt for Gemini AI to analyze an ad's creative and policy risk.
 * @param {object} ad - The ad object with creative and adset details
 * @param {Array} phaseAChecks - Failed checks from Phase A
 * @returns {string} The prompt string
 */
export function buildReviewPrompt(ad, phaseAChecks) {
    const failedChecks = phaseAChecks
        .filter(c => !c.passed)
        .map(c => `- ${c.name}: ${c.detail}`)
        .join('\n');

    const creative = ad.creative || {};
    const adSet = ad.adSet || {};

    return `You are an expert Meta Advertising Policy auditor and creative strategist.
Analyze the following Facebook Ad data and provide a rigorous review in JSON format.

AD CONTEXT:
- Ad Set Name: ${adSet.name || 'N/A'}
- Headline: ${creative.headline || 'N/A'}
- Body Caption: ${creative.body || 'N/A'}
- Call to Action: ${creative.callToAction || 'N/A'}

AUTOMATED AUDIT (Phase A) FOUND THESE ISSUES:
${failedChecks || 'No automated issues found.'}

YOUR TASK:
1. Evaluate creative quality and "scroll-stop" ability (creativeScore 0-100).
2. Assess Meta Advertising Policy risk (LOW/MEDIUM/HIGH). Focus on sensitive topics, aggressive claims, or misleading formatting for the Thai market.
3. Identify specific audience fit based on the tone and content (POOR/FAIR/GOOD).
4. If policyRisk is HIGH, provide a "rewriteSuggestion" in Thai that fixes the violations while maintaining intent. Otherwise, return null.
5. Provide a "summary" in 1-2 Thai sentences explaining the overall ad health.

STRICT JSON OUTPUT FORMAT (No markdown, no preamble):
{
  "creativeScore": number,
  "policyRisk": "LOW" | "MEDIUM" | "HIGH",
  "issues": [{ "type": string, "detail": string }],
  "audienceFit": "POOR" | "FAIR" | "GOOD",
  "rewriteSuggestion": string | null,
  "summary": string
}`;
}
