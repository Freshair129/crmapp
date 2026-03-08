/**
 * Creative Fatigue Detector (Phase 3)
 * Identifies ads that have been running too long without creative refresh.
 *
 * Fatigue criteria: status=ACTIVE AND ageDays >= thresholdDays AND spend > minSpend
 * Used by instrumentation.js cron job for daily LINE alerts.
 */

import { getPrisma } from '../lib/db.js';

/**
 * Detects ads showing signs of creative fatigue.
 *
 * @param {number} [thresholdDays=30] - Minimum age in days to flag as fatigued
 * @param {number} [minSpend=1000]    - Minimum total spend (THB) to include in results
 * @returns {Promise<Array<{ adId, adName, adSetName, campaignName, ageDays, totalSpend, roas }>>}
 *          Sorted by ageDays descending (most fatigued first). Empty array if none.
 */
async function detectCreativeFatigue(thresholdDays = 30, minSpend = 1000) {
  const prisma = await getPrisma();

  const ads = await prisma.ad.findMany({
    where: {
      status: 'ACTIVE',
      spend: { gt: minSpend },
    },
    include: {
      adSet: {
        include: { campaign: true },
      },
    },
  });

  const now = Date.now();

  return ads
    .map((ad) => ({
      adId: ad.adId,
      adName: ad.name,
      adSetName: ad.adSet.name,
      campaignName: ad.adSet.campaign.name,
      ageDays: Math.floor((now - ad.createdAt.getTime()) / 86_400_000),
      totalSpend: ad.spend,
      roas: ad.roas,
    }))
    .filter((ad) => ad.ageDays >= thresholdDays)
    .sort((a, b) => b.ageDays - a.ageDays);
}

export { detectCreativeFatigue };
