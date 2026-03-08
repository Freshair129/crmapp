/**
 * Marketing Aggregator (Phase 5 — ADR-024 D2)
 * Bottom-Up Hierarchical Aggregation: Ad → AdSet → Campaign
 * All campaign/adset metrics are computed here, never pulled directly from Meta API.
 */

import { getPrisma } from '../lib/db.js';
import { logger } from '../lib/logger.js';

/**
 * Aggregates Ad metrics bottom-up into AdSet and Campaign totals.
 *
 * @param {Date} syncDate - Reference date (used for logging only)
 * @returns {Promise<{
 *   adsets:   Array<{ adSetId: string, spend: number, impressions: number, clicks: number }>,
 *   campaigns: Array<{ campaignId: string, spend: number, impressions: number, clicks: number }>
 * }>}
 */
async function aggregateHierarchy(syncDate) {
  const prisma = await getPrisma();

  // L1→L2: group Ads by AdSet
  const adsetAggregates = await prisma.ad.groupBy({
    by: ['adSetId'],
    _sum: { spend: true, impressions: true, clicks: true },
  });

  const adsets = adsetAggregates.map((item) => ({
    adSetId: item.adSetId,
    spend: item._sum.spend ?? 0,
    impressions: item._sum.impressions ?? 0,
    clicks: item._sum.clicks ?? 0,
  }));

  // Fetch AdSet → Campaign mapping
  const adSetRows = await prisma.adSet.findMany({
    select: { id: true, campaignId: true },
  });
  const adSetToCampaign = new Map(adSetRows.map((r) => [r.id, r.campaignId]));

  // L2→L3: sum AdSet totals by Campaign
  const campaignMap = {};
  for (const adset of adsets) {
    const campaignId = adSetToCampaign.get(adset.adSetId);
    if (!campaignId) continue;

    if (!campaignMap[campaignId]) {
      campaignMap[campaignId] = { campaignId, spend: 0, impressions: 0, clicks: 0 };
    }
    campaignMap[campaignId].spend += adset.spend;
    campaignMap[campaignId].impressions += adset.impressions;
    campaignMap[campaignId].clicks += adset.clicks;
  }

  const result = { adsets, campaigns: Object.values(campaignMap) };

  logger.info('aggregator', 'Aggregation complete', {
    syncDate: syncDate?.toISOString(),
    adsets: result.adsets.length,
    campaigns: result.campaigns.length,
  });

  return result;
}

export { aggregateHierarchy };
