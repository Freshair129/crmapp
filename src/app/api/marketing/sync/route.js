import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

async function graphGet(path, params = {}) {
    const url = new URL(`${GRAPH_API}${path}`);
    url.searchParams.set('access_token', ACCESS_TOKEN);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    const res = await fetch(url.toString());
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Graph API ${res.status}`);
    }
    return res.json();
}

async function paginate(path, params) {
    const results = [];
    let data = await graphGet(path, params);
    results.push(...(data.data || []));
    while (data.paging?.next) {
        const res = await fetch(data.paging.next);
        data = await res.json();
        results.push(...(data.data || []));
    }
    return results;
}

/**
 * GET /api/marketing/sync?months=1
 * Pulls campaigns, adsets, ads from Meta Graph API and upserts into DB.
 */
export async function GET(request) {
    try {
        if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
            return NextResponse.json({ success: false, error: 'FB credentials not configured' }, { status: 503 });
        }

        const { searchParams } = new URL(request.url);
        const months = parseInt(searchParams.get('months') || '1', 10);
        const since = new Date(Date.now() - months * 30 * 86400000).toISOString().split('T')[0];

        const prisma = await getPrisma();

        // 1. Sync Campaigns
        const fbCampaigns = await paginate(`/${AD_ACCOUNT_ID}/campaigns`, {
            fields: 'id,name,status,objective,start_time,stop_time',
            limit: '100',
        });

        for (const c of fbCampaigns) {
            await prisma.campaign.upsert({
                where: { campaignId: c.id },
                update: {
                    name: c.name,
                    status: c.status,
                    objective: c.objective,
                    startDate: c.start_time ? new Date(c.start_time) : undefined,
                    endDate: c.stop_time ? new Date(c.stop_time) : undefined,
                    rawData: c,
                },
                create: {
                    campaignId: c.id,
                    name: c.name,
                    status: c.status,
                    objective: c.objective,
                    startDate: c.start_time ? new Date(c.start_time) : undefined,
                    endDate: c.stop_time ? new Date(c.stop_time) : undefined,
                    rawData: c,
                },
            });
        }

        // 2. Sync AdSets
        const fbAdSets = await paginate(`/${AD_ACCOUNT_ID}/adsets`, {
            fields: 'id,name,status,campaign_id,daily_budget,targeting',
            limit: '100',
        });

        for (const s of fbAdSets) {
            const campaign = await prisma.campaign.findUnique({ where: { campaignId: s.campaign_id } });
            if (!campaign) continue;

            await prisma.adSet.upsert({
                where: { adSetId: s.id },
                update: {
                    name: s.name,
                    status: s.status,
                    dailyBudget: s.daily_budget ? parseFloat(s.daily_budget) / 100 : undefined,
                    targeting: s.targeting || {},
                },
                create: {
                    adSetId: s.id,
                    name: s.name,
                    status: s.status,
                    campaignId: campaign.id,
                    dailyBudget: s.daily_budget ? parseFloat(s.daily_budget) / 100 : undefined,
                    targeting: s.targeting || {},
                },
            });
        }

        // 3. Sync Ads with insights
        const fbAds = await paginate(`/${AD_ACCOUNT_ID}/ads`, {
            fields: `id,name,status,effective_status,adset_id,creative{id}`,
            limit: '100',
        });

        const insightFields = 'spend,impressions,clicks,actions,action_values';
        let adsUpdated = 0;

        for (const ad of fbAds) {
            const adSet = await prisma.adSet.findUnique({ where: { adSetId: ad.adset_id } });
            if (!adSet) continue;

            let spend = 0, impressions = 0, clicks = 0, revenue = 0;
            try {
                const insights = await graphGet(`/${ad.id}/insights`, {
                    fields: insightFields,
                    time_range: JSON.stringify({ since, until: new Date().toISOString().split('T')[0] }),
                    time_increment: 1,
                });

                for (const day of (insights.data || [])) {
                    const dSpend = parseFloat(day.spend || 0);
                    const dImpressions = parseInt(day.impressions || 0, 10);
                    const dClicks = parseInt(day.clicks || 0, 10);
                    
                    const purchaseValue = (day.action_values || []).find(a => ['purchase', 'onsite_conversion.purchase'].includes(a.action_type));
                    const dRevenue = purchaseValue ? parseFloat(purchaseValue.value || 0) : 0;
                    
                    const purchaseAction = (day.actions || []).find(a => ['purchase', 'onsite_conversion.purchase'].includes(a.action_type));
                    const dPurchases = purchaseAction ? parseInt(purchaseAction.value || 0) : 0;
                    
                    const leadAction = (day.actions || []).find(a => a.action_type === 'lead');
                    const dLeads = leadAction ? parseInt(leadAction.value || 0) : 0;

                    spend += dSpend;
                    impressions += dImpressions;
                    clicks += dClicks;
                    revenue += dRevenue;

                    await prisma.adDailyMetric.upsert({
                        where: { adId_date: { adId: ad.id, date: new Date(day.date_start) } },
                        update: {
                            spend: dSpend,
                            impressions: dImpressions,
                            clicks: dClicks,
                            revenue: dRevenue,
                            leads: dLeads,
                            purchases: dPurchases,
                            roas: dSpend > 0 ? dRevenue / dSpend : 0,
                        },
                        create: {
                            adId: ad.id,
                            date: new Date(day.date_start),
                            spend: dSpend,
                            impressions: dImpressions,
                            clicks: dClicks,
                            revenue: dRevenue,
                            leads: dLeads,
                            purchases: dPurchases,
                            roas: dSpend > 0 ? dRevenue / dSpend : 0,
                        },
                    });
                }
            } catch (err) {
                logger.error('[MarketingSync]', `Insights fetch failed for ad ${ad.id}`, err);
            }

            let creativeDbId = null;
            if (ad.creative?.id) {
                const creative = await prisma.adCreative.upsert({
                    where: { creativeId: ad.creative.id },
                    update: {},
                    create: {
                        creativeId: ad.creative.id,
                        name: `Creative ${ad.creative.id}`,
                    }
                });
                creativeDbId = creative.id;
            }

            await prisma.ad.upsert({
                where: { adId: ad.id },
                update: {
                    name: ad.name,
                    status: ad.status,
                    deliveryStatus: ad.effective_status ?? null,
                    spend,
                    impressions,
                    clicks,
                    revenue,
                    roas: spend > 0 ? revenue / spend : 0,
                    creativeId: creativeDbId,
                },
                create: {
                    adId: ad.id,
                    name: ad.name,
                    status: ad.status,
                    deliveryStatus: ad.effective_status ?? null,
                    adSetId: adSet.id,
                    spend,
                    impressions,
                    clicks,
                    revenue,
                    roas: spend > 0 ? revenue / spend : 0,
                    creativeId: creativeDbId,
                },
            });
            adsUpdated++;
        }

        return NextResponse.json({
            success: true,
            synced: {
                campaigns: fbCampaigns.length,
                adSets: fbAdSets.length,
                ads: adsUpdated,
            },
            syncedAt: new Date().toISOString(),
        });
    } catch (error) {
        logger.error('[MarketingSync]', 'Sync failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
