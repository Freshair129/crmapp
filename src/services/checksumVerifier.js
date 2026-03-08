/**
 * Checksum Verifier (Phase 5 — ADR-024 D3)
 * Verifies that Sum(Ads.spend) ≈ Campaign.rawData.spend (from Meta API).
 * Tolerance ±1% by default. Logs warning on mismatch — does NOT block sync.
 */

import { getPrisma } from '../lib/db.js';
import { logger } from '../lib/logger.js';

/**
 * Verifies spend checksum for a campaign against Meta API total.
 *
 * @param {string} campaignId   Business key (Campaign.campaignId)
 * @param {number} [tolerance]  Max allowed relative delta (default 0.01 = 1%)
 * @returns {Promise<{ passed: boolean, campaignId: string, metaTotal: number, calculatedTotal: number, delta: number }>}
 */
async function verifyChecksum(campaignId, tolerance = 0.01) {
  const prisma = await getPrisma();

  const campaign = await prisma.campaign.findUnique({
    where: { campaignId },
    select: { rawData: true },
  });

  // rawData.spend = Meta API campaign-level total (source of truth for comparison)
  const metaTotal = campaign?.rawData?.spend ?? 0;

  // Bottom-Up sum of all Ads under this Campaign
  const aggregate = await prisma.ad.aggregate({
    where: { adSet: { campaign: { campaignId } } },
    _sum: { spend: true },
  });

  const calculatedTotal = aggregate._sum.spend ?? 0;
  const delta = metaTotal - calculatedTotal;
  const passed = metaTotal === 0 || Math.abs(delta / metaTotal) <= tolerance;

  if (!passed) {
    logger.warn('checksum', 'Spend checksum mismatch', {
      campaignId,
      metaTotal,
      calculatedTotal,
      delta: delta.toFixed(2),
      pct: ((Math.abs(delta) / metaTotal) * 100).toFixed(2) + '%',
    });
  }

  return { passed, campaignId, metaTotal, calculatedTotal, delta };
}

export { verifyChecksum };
