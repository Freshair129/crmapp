import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function graphGet(path, params = {}, retries = 4) {
    const url = new URL(`${GRAPH_API}${path}`);
    url.searchParams.set('access_token', ACCESS_TOKEN);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(url.toString());
        const data = await res.json().catch(() => ({}));
        if (data.error) {
            const code = data.error.code;
            const msg  = data.error.message || '';
            // Rate limit codes: 4, 17, 32, 613 + "limit" in message
            const isRateLimit = [4, 17, 32, 613].includes(code) || msg.toLowerCase().includes('limit');
            if (isRateLimit && attempt < retries) {
                const wait = Math.pow(2, attempt + 1) * 30000; // 60s, 120s, 240s, 480s
                logger.warn('[MarketingSync]', `Rate limit (code ${code}) — waiting ${wait/1000}s (attempt ${attempt+1}/${retries})`);
                await sleep(wait);
                continue;
            }
            throw new Error(data.error.message || `Graph API error ${code}`);
        }
        return data;
    }
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

        // 3. Sync Ads with insights — Batch API (50 ads/batch, ~10× faster)
        const fbAds = await paginate(`/${AD_ACCOUNT_ID}/ads`, {
            fields: `id,name,status,effective_status,adset_id,creative{id}`,
            limit: '100',
        });

        const insightFields = 'spend,impressions,clicks,actions,action_values';
        const until = new Date().toISOString().split('T')[0];
        const BATCH_SIZE = 50;
        const BATCH_DELAY = 1500; // ms between batches
        let adsUpdated = 0;
        let insightErrors = 0;

        // Build adSet lookup map (avoid N+1 DB queries)
        const adSetRows = await prisma.adSet.findMany({ select: { id: true, adSetId: true } });
        const adSetMap = new Map(adSetRows.map(a => [a.adSetId, a.id]));

        // Build creative upsert helper (batch later)
        const creativeIds = [...new Set(fbAds.map(a => a.creative?.id).filter(Boolean))];
        for (const cid of creativeIds) {
            await prisma.adCreative.upsert({
                where: { creativeId: cid },
                update: {},
                create: { creativeId: cid, name: `Creative ${cid}` }
            });
        }
        const creativeRows = await prisma.adCreative.findMany({ select: { id: true, creativeId: true } });
        const creativeMap = new Map(creativeRows.map(c => [c.creativeId, c.id]));

        // Fetch insights in batches of 50
        const insightMap = new Map(); // adId → { spend, impressions, clicks, revenue, dailyRows[] }
        for (let i = 0; i < fbAds.length; i += BATCH_SIZE) {
            const chunk = fbAds.slice(i, i + BATCH_SIZE);
            const batchReqs = chunk.map(ad => ({
                method: 'GET',
                relative_url: `${ad.id}/insights?fields=${insightFields}&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}&time_increment=1&limit=100`,
            }));

            try {
                const body = new URLSearchParams();
                body.set('access_token', ACCESS_TOKEN);
                body.set('batch', JSON.stringify(batchReqs));
                body.set('include_headers', 'false');
                const res = await fetch(`${GRAPH_API}/`, { method: 'POST', body });
                const results = await res.json();

                if (!Array.isArray(results)) { insightErrors += chunk.length; continue; }

                for (let j = 0; j < chunk.length; j++) {
                    const r = results[j];
                    const ad = chunk[j];
                    if (!r || r.code !== 200) { insightErrors++; continue; }

                    const parsed = JSON.parse(r.body);
                    const days = parsed.data || [];
                    let spend = 0, impressions = 0, clicks = 0, revenue = 0;
                    const dailyRows = [];

                    for (const day of days) {
                        const dSpend       = parseFloat(day.spend || 0);
                        const dImpressions = parseInt(day.impressions || 0, 10);
                        const dClicks      = parseInt(day.clicks || 0, 10);
                        const dRevenue     = (day.action_values || [])
                            .filter(a => ['purchase', 'onsite_conversion.purchase'].includes(a.action_type))
                            .reduce((s, a) => s + parseFloat(a.value || 0), 0);
                        const dPurchases   = (day.actions || [])
                            .filter(a => ['purchase', 'onsite_conversion.purchase'].includes(a.action_type))
                            .reduce((s, a) => s + parseInt(a.value || 0), 0);
                        const dLeads       = (day.actions || [])
                            .filter(a => a.action_type === 'lead')
                            .reduce((s, a) => s + parseInt(a.value || 0), 0);

                        spend += dSpend; impressions += dImpressions;
                        clicks += dClicks; revenue += dRevenue;

                        dailyRows.push({
                            adId: ad.id, date: new Date(day.date_start),
                            spend: dSpend, impressions: dImpressions, clicks: dClicks,
                            revenue: dRevenue, leads: dLeads, purchases: dPurchases,
                            roas: dSpend > 0 ? dRevenue / dSpend : 0,
                        });
                    }
                    insightMap.set(ad.id, { spend, impressions, clicks, revenue, dailyRows });
                }
            } catch (err) {
                logger.error('[MarketingSync]', `Batch insights error at chunk ${i}`, err);
                insightErrors += chunk.length;
            }

            if (i + BATCH_SIZE < fbAds.length) await new Promise(r => setTimeout(r, BATCH_DELAY));
            logger.info('[MarketingSync]', `Insights batch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(fbAds.length/BATCH_SIZE)} done`);
        }

        // Upsert ads + daily metrics
        for (const ad of fbAds) {
            const adSetDbId = adSetMap.get(ad.adset_id);
            if (!adSetDbId) continue;

            const ins = insightMap.get(ad.id) || { spend: 0, impressions: 0, clicks: 0, revenue: 0, dailyRows: [] };

            await prisma.ad.upsert({
                where: { adId: ad.id },
                update: {
                    name: ad.name, status: ad.status,
                    deliveryStatus: ad.effective_status ?? null,
                    spend: ins.spend, impressions: ins.impressions,
                    clicks: ins.clicks, revenue: ins.revenue,
                    roas: ins.spend > 0 ? ins.revenue / ins.spend : 0,
                    creativeId: creativeMap.get(ad.creative?.id) ?? null,
                },
                create: {
                    adId: ad.id, name: ad.name, status: ad.status,
                    deliveryStatus: ad.effective_status ?? null,
                    adSetId: adSetDbId,
                    spend: ins.spend, impressions: ins.impressions,
                    clicks: ins.clicks, revenue: ins.revenue,
                    roas: ins.spend > 0 ? ins.revenue / ins.spend : 0,
                    creativeId: creativeMap.get(ad.creative?.id) ?? null,
                },
            });

            // Upsert daily metrics
            for (const row of ins.dailyRows) {
                await prisma.adDailyMetric.upsert({
                    where: { adId_date: { adId: ad.id, date: row.date } },
                    update: { spend: row.spend, impressions: row.impressions, clicks: row.clicks, revenue: row.revenue, leads: row.leads, purchases: row.purchases, roas: row.roas },
                    create: row,
                });
            }
            adsUpdated++;
        }

        return NextResponse.json({
            success: true,
            synced: {
                campaigns: fbCampaigns.length,
                adSets: fbAdSets.length,
                ads: adsUpdated,
                insightErrors,
            },
            syncedAt: new Date().toISOString(),
        });
    } catch (error) {
        logger.error('[MarketingSync]', 'Sync failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
