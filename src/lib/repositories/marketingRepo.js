import { getPrisma } from '@/lib/db';

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
