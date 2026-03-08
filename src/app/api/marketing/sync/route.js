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
            fields: `id,name,status,delivery_status,adset_id,creative{id}`,
            limit: '100',
        });

        const insightFields = 'spend,impressions,clicks,revenue,actions';
        let adsUpdated = 0;

        for (const ad of fbAds) {
            const adSet = await prisma.adSet.findUnique({ where: { adSetId: ad.adset_id } });
            if (!adSet) continue;

            let spend = 0, impressions = 0, clicks = 0, revenue = 0;
            try {
                const insights = await graphGet(`/${ad.id}/insights`, {
                    fields: insightFields,
                    time_range: JSON.stringify({ since, until: new Date().toISOString().split('T')[0] }),
                });
                const i = (insights.data || [])[0];
                if (i) {
                    spend = parseFloat(i.spend || 0);
                    impressions = parseInt(i.impressions || 0, 10);
                    clicks = parseInt(i.clicks || 0, 10);
                    const purchaseAction = (i.actions || []).find((a) => a.action_type === 'purchase');
                    revenue = purchaseAction ? parseFloat(purchaseAction.value || 0) : 0;
                }
            } catch (err) {
                logger.error('[MarketingSync]', `Insights fetch failed for ad ${ad.id}`, err);
            }

            await prisma.ad.upsert({
                where: { adId: ad.id },
                update: {
                    name: ad.name,
                    status: ad.status,
                    deliveryStatus: ad.delivery_status,
                    spend,
                    impressions,
                    clicks,
                    revenue,
                    roas: spend > 0 ? revenue / spend : 0,
                    creativeId: ad.creative?.id,
                },
                create: {
                    adId: ad.id,
                    name: ad.name,
                    status: ad.status,
                    deliveryStatus: ad.delivery_status,
                    adSetId: adSet.id,
                    spend,
                    impressions,
                    clicks,
                    revenue,
                    roas: spend > 0 ? revenue / spend : 0,
                    creativeId: ad.creative?.id,
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
