import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { uploadAdImage } from '@/lib/supabaseStorage';

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// Custom error class so caller can detect rate limit without re-parsing
class RateLimitError extends Error {
    constructor(msg, code) {
        super(msg);
        this.name = 'RateLimitError';
        this.fbCode = code;
    }
}

async function graphGet(path, params = {}) {
    const url = new URL(`${GRAPH_API}${path}`);
    url.searchParams.set('access_token', ACCESS_TOKEN);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    // Single attempt — fail fast on rate limit, let cron retry later
    const res = await fetch(url.toString());
    const data = await res.json().catch(() => ({}));
    if (data.error) {
        const code = data.error.code;
        const msg  = data.error.message || `Graph API error ${code}`;
        const isRateLimit = [4, 17, 32, 613].includes(code) || msg.toLowerCase().includes('limit');
        if (isRateLimit) throw new RateLimitError(msg, code);
        throw new Error(msg);
    }
    return data;
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
            fields: `id,name,status,effective_status,adset_id,creative{id,thumbnail_url,body,headline,call_to_action_type}`,
            limit: '100',
        });

        const insightFields = 'spend,reach,impressions,clicks,actions,action_values';
        const until = new Date().toISOString().split('T')[0];
        const BATCH_SIZE = 50;
        const BATCH_DELAY = 500; // ms between batches (reduced from 1500ms)
        let adsUpdated = 0;
        let insightErrors = 0;

        // Build adSet lookup map (avoid N+1 DB queries)
        const adSetRows = await prisma.adSet.findMany({ select: { id: true, adSetId: true } });
        const adSetMap = new Map(adSetRows.map(a => [a.adSetId, a.id]));

        // Build creative upsert — full-quality image → compress WebP → Supabase Storage
        const creativeMap_raw = new Map(fbAds.map(a => [a.creative?.id, a.creative]).filter(([id]) => id));
        for (const [cid, creative] of creativeMap_raw) {
            // Priority: full image > thumbnail
            const imageSrc = creative?.object_story_spec?.link_data?.picture
                || creative?.object_story_spec?.video_data?.image_url
                || creative?.image_url
                || creative?.thumbnail_url
                || null;

            let storageUrl = null;
            if (imageSrc) {
                const adId = fbAds.find(a => a.creative?.id === cid)?.id;
                storageUrl = adId ? await uploadAdImage(imageSrc, adId, { fullQuality: true }) : null;
            }

            await prisma.adCreative.upsert({
                where: { creativeId: cid },
                update: {
                    ...(creative?.body && { body: creative.body }),
                    ...(creative?.headline && { headline: creative.headline }),
                    ...(creative?.call_to_action_type && { callToAction: creative.call_to_action_type }),
                    ...(storageUrl && { imageUrl: storageUrl }),
                },
                create: {
                    creativeId: cid,
                    name: `Creative ${cid}`,
                    body: creative?.body ?? null,
                    headline: creative?.headline ?? null,
                    callToAction: creative?.call_to_action_type ?? null,
                    imageUrl: storageUrl,
                },
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
                        const dReach       = parseInt(day.reach || 0, 10);
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
                        clicks += dClicks; reach += dReach; revenue += dRevenue;

                        dailyRows.push({
                            adId: ad.id, date: new Date(day.date_start),
                            spend: dSpend, impressions: dImpressions, clicks: dClicks,
                            reach: dReach,
                            revenue: dRevenue, leads: dLeads, purchases: dPurchases,
                            roas: dSpend > 0 ? dRevenue / dSpend : 0,
                        });
                    }
                    insightMap.set(ad.id, { spend, impressions, clicks, reach, revenue, dailyRows });
                }
            } catch (err) {
                logger.error('[MarketingSync]', `Batch insights error at chunk ${i}`, err);
                insightErrors += chunk.length;
            }

            if (i + BATCH_SIZE < fbAds.length) await new Promise(r => setTimeout(r, BATCH_DELAY));
            logger.info('[MarketingSync]', `Insights batch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(fbAds.length/BATCH_SIZE)} done`);
        }

        // Collect ad entries + all daily rows
        const adEntries = [];
        const allDailyRows = [];
        for (const ad of fbAds) {
            const adSetDbId = adSetMap.get(ad.adset_id);
            if (!adSetDbId) continue;
            const ins = insightMap.get(ad.id) || { spend: 0, impressions: 0, clicks: 0, reach: 0, revenue: 0, dailyRows: [] };
            adEntries.push({ ad, ins, adSetDbId });
            allDailyRows.push(...ins.dailyRows);
        }

        // 1. Upsert ads in parallel chunks of 25 (20× faster than sequential)
        const AD_CHUNK = 25;
        for (let i = 0; i < adEntries.length; i += AD_CHUNK) {
            await Promise.all(adEntries.slice(i, i + AD_CHUNK).map(({ ad, ins, adSetDbId }) =>
                prisma.ad.upsert({
                    where: { adId: ad.id },
                    update: {
                        name: ad.name, status: ad.status,
                        deliveryStatus: ad.effective_status ?? null,
                        spend: ins.spend, impressions: ins.impressions,
                        clicks: ins.clicks, reach: ins.reach, revenue: ins.revenue,
                        roas: ins.spend > 0 ? ins.revenue / ins.spend : 0,
                        creativeId: creativeMap.get(ad.creative?.id) ?? null,
                    },
                    create: {
                        adId: ad.id, name: ad.name, status: ad.status,
                        deliveryStatus: ad.effective_status ?? null,
                        adSetId: adSetDbId,
                        spend: ins.spend, impressions: ins.impressions,
                        clicks: ins.clicks, reach: ins.reach, revenue: ins.revenue,
                        roas: ins.spend > 0 ? ins.revenue / ins.spend : 0,
                        creativeId: creativeMap.get(ad.creative?.id) ?? null,
                    },
                })
            ));
        }
        adsUpdated = adEntries.length;

        // 2. Bulk upsert daily metrics: createMany (new rows) + batched updateMany (refresh existing)
        const DAILY_CHUNK = 100;
        for (let i = 0; i < allDailyRows.length; i += DAILY_CHUNK) {
            const chunk = allDailyRows.slice(i, i + DAILY_CHUNK);
            await prisma.$transaction([
                prisma.adDailyMetric.createMany({ data: chunk, skipDuplicates: true }),
                ...chunk.map(row => prisma.adDailyMetric.updateMany({
                    where: { adId: row.adId, date: row.date },
                    data: { spend: row.spend, impressions: row.impressions, clicks: row.clicks, reach: row.reach, revenue: row.revenue, leads: row.leads, purchases: row.purchases, roas: row.roas },
                })),
            ]);
            logger.info('[MarketingSync]', `Daily metrics batch ${Math.floor(i/DAILY_CHUNK)+1}/${Math.ceil(allDailyRows.length/DAILY_CHUNK)} done`);
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
        const msg = error?.message || String(error);
        if (error?.name === 'RateLimitError') {
            logger.warn('[MarketingSync]', `Rate limit (code ${error.fbCode}) — sync aborted, retry later`);
            return NextResponse.json({ success: false, error: 'rate_limit', message: msg, retryAfter: 900 }, { status: 429 });
        }
        logger.error('[MarketingSync]', 'Sync failed', error);
        return NextResponse.json({ success: false, error: msg }, { status: 500 });
    }
}
