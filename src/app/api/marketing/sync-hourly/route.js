import { Receiver } from '@upstash/qstash';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
    nextSigningKey:    process.env.QSTASH_NEXT_SIGNING_KEY    || '',
});

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

const FIELDS = [
    'ad_id', 'spend', 'impressions', 'clicks', 'reach',
    'actions', 'action_values',
    'cpm', 'cpc', 'frequency',
    'cost_per_action_type',
    'quality_ranking', 'engagement_rate_ranking', 'conversion_rate_ranking',
    'video_p25_watched_actions', 'video_p50_watched_actions',
    'video_p75_watched_actions', 'video_p100_watched_actions',
].join(',');
const BREAKDOWN = 'hourly_stats_aggregated_by_advertiser_time_zone';

/**
 * Send a Facebook Batch API request (max 50 sub-requests per call).
 * Returns array of parsed response bodies in the same order as `requests`.
 */
async function graphBatch(requests, retries = 3) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(`${GRAPH_API}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                access_token: ACCESS_TOKEN,
                batch: requests,
            }),
        });

        if (res.status === 429) {
            if (attempt === retries) throw new Error('Rate limited after retries');
            const delay = Math.pow(2, attempt) * 1000;
            logger.warn('[SyncHourly]', `Rate limited, retry ${attempt + 1}/${retries} in ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
            continue;
        }

        if (!res.ok) throw new Error(`Batch API HTTP ${res.status}`);

        const results = await res.json();
        return results.map(r => {
            const body = JSON.parse(r.body);
            if (body?.error) {
                const msg = body.error.message || '';
                if (msg.includes('code 190') || body.error.type === 'OAuthException') {
                    throw new Error('ACCESS_TOKEN_EXPIRED');
                }
            }
            return body;
        });
    }
}

function parseSlot(slot) {
    const hourStr = slot[BREAKDOWN];
    if (!hourStr) return null;
    const hour = parseInt(hourStr.split(':')[0], 10);

    const spend       = parseFloat(slot.spend || 0);
    const impressions = parseInt(slot.impressions || 0, 10);
    const clicks      = parseInt(slot.clicks || 0, 10);
    const reach       = parseInt(slot.reach || 0, 10);

    const isPurchase = t => [
        'purchase',
        'onsite_conversion.purchase',
        'omni_purchase',
        'onsite_app_purchase',
        'onsite_web_purchase',
        'onsite_web_app_purchase',
        'offsite_conversion.fb_pixel_purchase',
    ].includes(t);

    const purchaseValue  = (slot.action_values || []).find(a => isPurchase(a.action_type));
    const purchaseAction = (slot.actions || []).find(a => isPurchase(a.action_type));
    const leadAction     = (slot.actions || []).find(a => a.action_type === 'lead');
    const cpaLead        = (slot.cost_per_action_type || []).find(a => a.action_type === 'lead');
    const cpaPurchase    = (slot.cost_per_action_type || []).find(a => isPurchase(a.action_type));

    const videoActions = (type) => parseInt((slot[type] || []).find(a => a.action_type === 'video_view')?.value || 0, 10);

    return {
        adId: slot.ad_id,
        hour,
        metrics: {
            spend,
            impressions,
            clicks,
            reach,
            revenue:              purchaseValue  ? parseFloat(purchaseValue.value || 0)   : 0,
            purchases:            purchaseAction ? parseInt(purchaseAction.value || 0, 10) : 0,
            leads:                leadAction     ? parseInt(leadAction.value || 0, 10)     : 0,
            cpm:                  slot.cpm       ? parseFloat(slot.cpm)                   : null,
            cpc:                  slot.cpc       ? parseFloat(slot.cpc)                   : null,
            frequency:            slot.frequency ? parseFloat(slot.frequency)             : null,
            costPerLead:          cpaLead        ? parseFloat(cpaLead.value || 0)         : null,
            costPerPurchase:      cpaPurchase    ? parseFloat(cpaPurchase.value || 0)     : null,
            qualityRanking:       slot.quality_ranking          ?? null,
            engagementRateRanking: slot.engagement_rate_ranking ?? null,
            conversionRateRanking: slot.conversion_rate_ranking ?? null,
            videoP25:  videoActions('video_p25_watched_actions')  || null,
            videoP50:  videoActions('video_p50_watched_actions')  || null,
            videoP75:  videoActions('video_p75_watched_actions')  || null,
            videoP100: videoActions('video_p100_watched_actions') || null,
        },
    };
}

/**
 * GET /api/marketing/sync-hourly
 * 1 Facebook Batch API call → all active campaigns → all ads inside → save to DB.
 */
export async function POST(request) {
    return GET(request);
}

export async function GET(request) {
    // Allow manual call with CRON_SECRET, otherwise verify QStash signature
    const authHeader = request.headers.get('authorization');
    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
        // manual — allowed
    } else {
        const signature = request.headers.get('upstash-signature');
        const body      = await request.text().catch(() => '');
        const valid     = await receiver.verify({ signature: signature || '', body }).catch(() => false);
        if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        if (!ACCESS_TOKEN) {
            return NextResponse.json({ success: false, error: 'FB credentials not configured' }, { status: 503 });
        }

        const today = new Date().toISOString().split('T')[0];
        const campaignIds = await marketingRepo.getActiveCampaignIds();

        if (campaignIds.length === 0) {
            return NextResponse.json({ success: true, date: today, stats: { campaigns: 0, slotsUpdated: 0 } });
        }

        logger.info('[SyncHourly]', `Batch syncing ${campaignIds.length} campaigns for ${today}`);

        // Build 1 sub-request per campaign (max 50 per batch — split if needed)
        const timeRange = encodeURIComponent(JSON.stringify({ since: today, until: today }));
        const batchRequests = campaignIds.map(id => ({
            method: 'GET',
            relative_url: `${id}/insights?level=ad&fields=${FIELDS}&time_range=${timeRange}&breakdowns=${BREAKDOWN}&limit=200`,
        }));

        let updatedCount = 0;
        let ledgerRows   = 0;

        // Split into chunks of 50 (FB batch limit)
        const CHUNK = 50;
        for (let i = 0; i < batchRequests.length; i += CHUNK) {
            const chunk   = batchRequests.slice(i, i + CHUNK);
            const results = await graphBatch(chunk);

            for (const result of results) {
                const slots = (result?.data || []).map(parseSlot).filter(Boolean);
                const settled = await Promise.allSettled(slots.map(async (parsed) => {
                    await marketingRepo.upsertAdHourlyMetric(parsed.adId, today, parsed.hour, parsed.metrics);
                    const entry = await marketingRepo.appendHourlyLedgerIfChanged(parsed.adId, today, parsed.hour, parsed.metrics);
                    return entry ? 1 : 0;
                }));
                for (const r of settled) {
                    if (r.status === 'fulfilled') {
                        updatedCount++;
                        ledgerRows += r.value;
                    }
                }
            }
        }

        return NextResponse.json({
            success: true,
            date: today,
            stats: {
                campaigns:    campaignIds.length,
                slotsUpdated: updatedCount,
                ledgerEntries: ledgerRows,
            },
            syncedAt: new Date().toISOString(),
        });

    } catch (error) {
        if (error.message === 'ACCESS_TOKEN_EXPIRED') {
            return NextResponse.json({ success: false, error: 'FB Access Token expired — renew in env vars' }, { status: 401 });
        }
        logger.error('[SyncHourly]', 'Sync failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
