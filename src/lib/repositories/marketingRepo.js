import { getPrisma } from '@/lib/db';
import { cache as redis } from '@/lib/redis';
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
 * @param {string} campaignId
 */
export async function getCampaignByFBId(campaignId) {
    const prisma = await getPrisma();
    return prisma.campaign.findUnique({
        where: { campaignId }
    });
}

/**
 * Gets a map of all AdSet FB IDs to their local internal IDs.
 */
export async function getAllAdSetFBIds() {
    const prisma = await getPrisma();
    const rows = await prisma.adSet.findMany({
        select: { id: true, adSetId: true }
    });
    return new Map(rows.map(r => [r.adSetId, r.id]));
}

/**
 * Gets a map of all Creative FB IDs to their local internal IDs.
 */
export async function getAllCreativeFBIds() {
    const prisma = await getPrisma();
    const rows = await prisma.adCreative.findMany({
        select: { id: true, creativeId: true }
    });
    return new Map(rows.map(r => [r.creativeId, r.id]));
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
export async function upsertCampaign(campaignId, data) {
    const prisma = await getPrisma();
    return prisma.campaign.upsert({
        where: { campaignId },
        update: data,
        create: {
            ...data,
            campaignId
        }
    });
}

/**
 * @param {string} id - Internal local ID
 * @param {any} data
 */
export async function updateCampaign(id, data) {
    const prisma = await getPrisma();
    return prisma.campaign.update({
        where: { id },
        data
    });
}

/**
 * @param {string} adSetId
 * @param {any} data
 */
export async function upsertAdSet(adSetId, data) {
    const prisma = await getPrisma();
    return prisma.adSet.upsert({
        where: { adSetId },
        update: data,
        create: {
            ...data,
            adSetId
        }
    });
}

/**
 * @param {string} adId
 * @param {any} data
 */
export async function upsertAd(adId, data) {
    const prisma = await getPrisma();
    return prisma.ad.upsert({
        where: { adId },
        update: data,
        create: {
            ...data,
            adId
        }
    });
}

/**
 * @param {string} creativeId
 * @param {any} data
 */
export async function upsertAdCreative(creativeId, data) {
    const prisma = await getPrisma();
    return prisma.adCreative.upsert({
        where: { creativeId },
        update: data,
        create: {
            ...data,
            creativeId
        }
    });
}

/**
 * Bulk upserts daily metrics using a transaction.
 * @param {any[]} dailyRows
 */
export async function bulkUpsertDailyMetrics(dailyRows) {
    const prisma = await getPrisma();
    return prisma.$transaction([
        prisma.adDailyMetric.createMany({ data: dailyRows, skipDuplicates: true }),
        ...dailyRows.map(row => prisma.adDailyMetric.updateMany({
            where: { adId: row.adId, date: row.date },
            data: {
                spend: row.spend,
                impressions: row.impressions,
                clicks: row.clicks,
                reach: row.reach,
                revenue: row.revenue,
                leads: row.leads,
                purchases: row.purchases,
                roas: row.roas
            },
        })),
    ]);
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

/**
 * Gets aggregated marketing insights for the last 30 days and all-time.
 * Composite view of Ad Metrics, Customers, and Orders.
 */
export async function getMarketingInsights() {
    const prisma = await getPrisma();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

    const [
        metrics, 
        allTime, 
        totalCustomers, 
        engagedCustomersRows, 
        crmRevenueAgg, 
        activeStudentsCount, 
        churnedCount, 
        crmOrderAgg
    ] = await Promise.all([
        prisma.adDailyMetric.aggregate({
            where: { date: { gte: thirtyDaysAgo } },
            _sum: { spend: true, impressions: true, clicks: true, revenue: true, leads: true }
        }),
        prisma.adDailyMetric.aggregate({
            _sum: { revenue: true, purchases: true }
        }),
        prisma.customer.count(),
        prisma.conversation.groupBy({
            by: ['customerId'],
            _count: { customerId: true }
        }),
        prisma.order.aggregate({
            where: { status: { in: ['closed', 'CLOSED'] } },
            _sum: { totalAmount: true }
        }),
        prisma.customer.count({
            where: {
                orders: { some: { status: { in: ['closed', 'CLOSED'] } } },
                NOT: { status: { in: ['Inactive', 'Churned'] } }
            }
        }),
        prisma.customer.count({
            where: { status: { in: ['Inactive', 'Churned'] } }
        }),
        prisma.order.aggregate({
            where: { status: { in: ['closed', 'CLOSED'] } },
            _sum: { totalAmount: true },
            _count: { id: true }
        })
    ]);

    const engagedCustomers = engagedCustomersRows.length;
    const crmOrderRevenue = Number(crmOrderAgg._sum.totalAmount || 0);
    const crmOrderCount = Number(crmOrderAgg._count.id || 0);

    const avgLTV = crmOrderCount > 0
        ? Math.round(crmOrderRevenue / crmOrderCount)
        : totalCustomers > 0
            ? Math.round(Number(crmRevenueAgg._sum.totalAmount || 0) / totalCustomers)
            : 0;

    const churnedCustomers = churnedCount;
    const churnRate = totalCustomers > 0
        ? Math.min(100, Math.max(0, Math.round((churnedCustomers / totalCustomers) * 100)))
        : 0;

    return {
        spend: metrics._sum.spend || 0,
        impressions: metrics._sum.impressions || 0,
        clicks: metrics._sum.clicks || 0,
        revenue: metrics._sum.revenue || 0,
        reach: metrics._sum.impressions || 0,
        leads: metrics._sum.leads || 0,
        allTimeRevenue: Number(allTime._sum.revenue || 0),
        allTimePurchases: Number(allTime._sum.purchases || 0),
        totalCustomers,
        engagedCustomers,
        churnedCustomers,
        churnRate,
        avgLTV,
        crmTotalRevenue: Number(crmRevenueAgg._sum.totalAmount || 0),
        activeStudents: activeStudentsCount
    };
}

/**
 * Gets aggregated metrics for a specific campaign over a date range.
 * @param {string} campaignId - FB Campaign ID
 * @param {string|Date} since
 * @param {string|Date} until
 */
export async function getCampaignAggregateMetrics(campaignId, since, until) {
    const prisma = await getPrisma();
    return prisma.adDailyMetric.aggregate({
        where: {
            date: { gte: new Date(since), lte: new Date(until) },
            ad: { adSet: { campaignId: campaignId } }
        },
        _sum: {
            spend: true,
            clicks: true,
            leads: true,
            revenue: true
        }
    });
}

/**
 * Creates a general system audit log entry.
 * @param {any} data
 */
export async function createAuditLog(data) {
    const prisma = await getPrisma();
    return prisma.auditLog.create({ data });
}

/**
 * Gets daily aggregated metrics from AdDailyMetric.
 * @param {Date|string} since
 */
export async function getDailyAggregatedMetrics(since) {
    const prisma = await getPrisma();
    const metrics = await prisma.adDailyMetric.findMany({
        where: { date: { gte: new Date(since) } },
        orderBy: { date: 'desc' },
        include: { ad: { select: { name: true, adId: true } } },
    });

    // Group by date and aggregate
    const byDate = {};
    for (const m of metrics) {
        const key = m.date.toISOString().split('T')[0];
        if (!byDate[key]) {
            byDate[key] = { date: key, spend: 0, impressions: 0, clicks: 0, reach: 0, leads: 0, purchases: 0, revenue: 0 };
        }
        byDate[key].spend       += m.spend       || 0;
        byDate[key].impressions += m.impressions || 0;
        byDate[key].clicks      += m.clicks      || 0;
        byDate[key].reach       += m.reach       || 0;
        byDate[key].leads       += m.leads       || 0;
        byDate[key].purchases   += m.purchases   || 0;
        byDate[key].revenue     += m.revenue     || 0;
    }

    return Object.values(byDate)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(d => ({
            ...d,
            ctr: d.impressions > 0 ? d.clicks / d.impressions * 100 : 0,
            cpc: d.clicks      > 0 ? d.spend  / d.clicks            : 0,
            roas: d.spend      > 0 ? d.revenue / d.spend            : 0,
        }));
}

/**
 * Gets hourly aggregated metrics from AdHourlyMetric.
 * @param {Date|string} date
 */
export async function getHourlyAggregatedMetrics(date) {
    const prisma = await getPrisma();
    const normalizedDate = new Date(date);
    normalizedDate.setUTCHours(0,0,0,0);

    const hourlyMetrics = await prisma.adHourlyMetric.findMany({
        where: { date: normalizedDate },
        orderBy: { hour: 'asc' },
    });

    // Aggregate metrics by hour (24 slots)
    const aggregated = Array.from({ length: 24 }, (_, i) => {
        const hourStr = i.toString().padStart(2, '0');
        const hourMetrics = hourlyMetrics.filter(m => m.hour === i);
        
        const spend = hourMetrics.reduce((sum, m) => sum + m.spend, 0);
        const impressions = hourMetrics.reduce((sum, m) => sum + m.impressions, 0);
        const clicks = hourMetrics.reduce((sum, m) => sum + m.clicks, 0);
        const leads = hourMetrics.reduce((sum, m) => sum + m.leads, 0);
        const purchases = hourMetrics.reduce((sum, m) => sum + m.purchases, 0);
        const revenue = hourMetrics.reduce((sum, m) => sum + m.revenue, 0);

        // Mocking actions and action_values for compatibility with UI
        const actions = [
            { action_type: 'link_click', value: clicks },
            { action_type: 'lead', value: leads },
            { action_type: 'purchase', value: purchases }
        ];

        const action_values = [
            { action_type: 'purchase', value: revenue }
        ];

        return {
            hour: hourStr,
            spend,
            impressions,
            clicks,
            actions,
            action_values,
            leads,
            purchases,
            revenue
        };
    });

    return aggregated;
}

/**
 * Gets historical daily metrics for a specific ad.
 * @param {string} adId
 * @param {Date|string} [since]
 */
export async function getAdHistoricalInsights(adId, since) {
    const prisma = await getPrisma();
    const metrics = await prisma.adDailyMetric.findMany({
        where: {
            adId,
            ...(since ? { date: { gte: new Date(since) } } : {}),
        },
        orderBy: { date: 'asc' },
    });

    return metrics.map(m => ({
        date: m.date.toISOString().split('T')[0],
        spend: m.spend,
        impressions: m.impressions,
        clicks: m.clicks,
        leads: m.leads,
        purchases: m.purchases,
        revenue: m.revenue,
        ctr: m.impressions > 0 ? (m.clicks / m.impressions) * 100 : 0,
        roas: m.spend > 0 ? m.revenue / m.spend : 0,
    }));
}

/**
 * Gets aggregated ad data for calendar view.
 * @param {Date|string} since
 * @param {Date|string} until
 */
export async function getAdsCalendar(since, until) {
    const prisma = await getPrisma();
    const metrics = await prisma.adDailyMetric.findMany({
        where: {
            date: { gte: new Date(since), lte: new Date(until) },
            spend: { gt: 0 },
        },
        include: {
            ad: { select: { adId: true, name: true, status: true, deliveryStatus: true } },
        },
        orderBy: { date: 'asc' },
    });

    const adsMap = {};
    for (const m of metrics) {
        const id = m.adId;
        if (!adsMap[id]) {
            adsMap[id] = {
                ad_id: id,
                name: m.ad?.name || 'Unknown',
                status: m.ad?.status || 'UNKNOWN',
                deliveryStatus: m.ad?.deliveryStatus || null,
                totalSpend: 0,
                totalImpressions: 0,
                totalClicks: 0,
                days: [],
            };
        }
        adsMap[id].totalSpend += Number(m.spend) || 0;
        adsMap[id].totalImpressions += Number(m.impressions) || 0;
        adsMap[id].totalClicks += Number(m.clicks) || 0;
        adsMap[id].days.push({
            date: m.date,
            spend: Number(m.spend) || 0,
            impressions: Number(m.impressions) || 0,
            clicks: Number(m.clicks) || 0,
        });
    }

    return Object.values(adsMap);
}

/**
 * Gets active ads (for sync tasks).
 */
export async function getActiveAds() {
    const prisma = await getPrisma();
    return prisma.ad.findMany({
        where: { status: 'ACTIVE' },
        select: { adId: true }
    });
}

const SYNC_STATUS_KEY = 'meta:last_sync';

/**
 * Gets the last sync timestamp from Redis.
 */
export async function getSyncStatus() {
    return await redis.get(SYNC_STATUS_KEY);
}

/**
 * Updates the last sync timestamp in Redis.
 */
export async function updateSyncStatus(value) {
    await redis.set(SYNC_STATUS_KEY, value);
}





