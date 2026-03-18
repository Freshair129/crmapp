// Build-ID: 2026-03-18-0209-FINAL-FIX
import { getPrisma } from '@/lib/db';
import { getMarketingRangeFilter } from '../dateFilters';

/**
 * @param {string} campaignId
 */
export async function getCampaignWithMetrics(campaignId) {
    const prisma = await getPrisma();
    return prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
            adSets: {
                include: {
                    ads: true
                }
            }
        }
    });
}

/**
 * @param {string} adId
 * @param {number} [days=30]
 */
export async function getAdDailyMetrics(adId, days = 30) {
    const prisma = await getPrisma();
    return prisma.adDailyMetric.findMany({
        where: { adId },
        take: days,
        orderBy: { date: 'desc' }
    });
}

/**
 * @param {string} adId
 * @param {Date} date
 * @param {any} data
 */
export async function upsertAdDailyMetric(adId, date, data) {
    const prisma = await getPrisma();
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    return prisma.adDailyMetric.upsert({
        where: {
            adId_date: {
                adId,
                date: normalizedDate
            }
        },
        update: data,
        create: {
            ...data,
            adId,
            date: normalizedDate
        }
    });
}

/**
 * @param {string} adId
 * @param {Date|string} date
 * @param {number} hour
 * @param {any} data
 */
export async function upsertAdHourlyMetric(adId, date, hour, data) {
    const prisma = await getPrisma();
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    return prisma.adHourlyMetric.upsert({
        where: {
            adId_date_hour: {
                adId,
                date: normalizedDate,
                hour
            }
        },
        update: data,
        create: {
            ...data,
            adId,
            date: normalizedDate,
            hour
        }
    });
}

/**
 * ADR-024 D4: Delta-only ledger.
 * @param {string} adId
 * @param {Date|string} date
 * @param {number} hour
 * @param {any} metrics
 */
export async function appendHourlyLedgerIfChanged(adId, date, hour, metrics) {
    const prisma = await getPrisma();
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0, 0, 0, 0);

    const lastEntry = await prisma.adHourlyLedger.findFirst({
        where: { adId, date: normalizedDate, hour },
        orderBy: { createdAt: 'desc' }
    });

    const isDifferent = !lastEntry ||
        lastEntry.spend !== metrics.spend ||
        lastEntry.impressions !== metrics.impressions ||
        lastEntry.clicks !== metrics.clicks ||
        lastEntry.leads !== (metrics.leads || 0) ||
        lastEntry.purchases !== (metrics.purchases || 0) ||
        lastEntry.revenue !== (metrics.revenue || 0);

    if (isDifferent) {
        return prisma.adHourlyLedger.create({
            data: {
                ...metrics,
                adId,
                date: normalizedDate,
                hour,
                roas: metrics.spend > 0 ? (metrics.revenue || 0) / metrics.spend : 0
            }
        });
    }
    return null;
}

/**
 * @param {string} campaignId
 * @param {any} data
 */
export async function updateCampaignAuditSnapshot(campaignId, data) {
    const prisma = await getPrisma();
    return prisma.campaign.update({
        where: { campaignId },
        data: {
            fbSpend: data.spend,
            fbClicks: data.clicks,
            fbLeads: data.leads,
            fbRevenue: data.revenue,
            fbSnapshotAt: new Date()
        }
    });
}

/**
 * ADR-024: Bottom-up aggregation for campaigns.
 * @param {object} filters
 * @param {string} [filters.range]
 * @param {string} [filters.status]
 */
export async function getCampaignsWithAggregatedMetrics({ range, status }) {
    const prisma = await getPrisma();
    const rangeFilter = getMarketingRangeFilter(range);

    const campaigns = await prisma.campaign.findMany({
        where: {
            AND: [
                status ? { status } : {},
                rangeFilter ? { createdAt: rangeFilter } : {},
            ],
        },
        include: {
            adSets: {
                include: { ads: true },
            },
        },
        orderBy: { createdAt: 'desc' },
    });

    const data = campaigns.map((campaign) => {
        let cSpend = 0, cImpressions = 0, cClicks = 0, cRevenue = 0;

        const adSets = campaign.adSets.map((adSet) => {
            const metrics = adSet.ads.reduce((acc, ad) => ({
                spend: acc.spend + (ad.spend || 0),
                impressions: acc.impressions + (ad.impressions || 0),
                clicks: acc.clicks + (ad.clicks || 0),
                revenue: acc.revenue + (ad.revenue || 0),
            }), { spend: 0, impressions: 0, clicks: 0, revenue: 0 });

            cSpend += metrics.spend;
            cImpressions += metrics.impressions;
            cClicks += metrics.clicks;
            cRevenue += metrics.revenue;

            return { ...adSet, metrics };
        });

        return {
            ...campaign,
            adSets,
            spend: cSpend,
            impressions: cImpressions,
            clicks: cClicks,
            revenue: cRevenue,
            roas: cSpend > 0 ? cRevenue / cSpend : 0,
            metrics: {
                spend: cSpend,
                impressions: cImpressions,
                clicks: cClicks,
                revenue: cRevenue,
                roas: cSpend > 0 ? cRevenue / cSpend : 0,
            },
        };
    });

    // lastSync = latest updatedAt across all campaigns
    const lastSync = data.length > 0
        ? data.reduce((latest, c) => (c.updatedAt > latest ? c.updatedAt : latest), data[0].updatedAt)
        : null;

    return { data, lastSync };
}

/**
 * Get AdSets with aggregated metrics.
 */
export async function getAdSetsWithAggregatedMetrics({ range, status }) {
    const prisma = await getPrisma();
    const rangeFilter = getMarketingRangeFilter(range);

    const adSets = await prisma.adSet.findMany({
        where: {
            AND: [
                status ? { status } : {},
                rangeFilter ? { createdAt: rangeFilter } : {},
            ],
        },
        include: { ads: { select: { spend: true, impressions: true, clicks: true, revenue: true, roas: true } } },
        orderBy: { createdAt: 'desc' },
    });

    return adSets.map((adSet) => {
        const metrics = adSet.ads.reduce((acc, ad) => ({
            spend: acc.spend + (ad.spend || 0),
            impressions: acc.impressions + (ad.impressions || 0),
            clicks: acc.clicks + (ad.clicks || 0),
            revenue: acc.revenue + (ad.revenue || 0),
        }), { spend: 0, impressions: 0, clicks: 0, revenue: 0 });

        return {
            ...adSet,
            metrics: {
                ...metrics,
                roas: metrics.spend > 0 ? metrics.revenue / metrics.spend : 0,
            },
        };
    });
}

/**
 * Get Ads with metrics.
 */
export async function getAdsWithMetrics({ range, status }) {
    const prisma = await getPrisma();
    const rangeFilter = getMarketingRangeFilter(range);

    return prisma.ad.findMany({
        where: {
            AND: [
                status ? { status } : {},
                rangeFilter ? { createdAt: rangeFilter } : {},
            ],
        },
        include: {
            adSet: { select: { name: true, campaignId: true } },
        },
        orderBy: { spend: 'desc' },
    });
}

