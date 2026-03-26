import { Receiver } from '@upstash/qstash';
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
    nextSigningKey:    process.env.QSTASH_NEXT_SIGNING_KEY    || '',
});

const GRAPH_API    = 'https://graph.facebook.com/v19.0';
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID;

// ── Only fields supported by hourly_stats_aggregated_by_advertiser_time_zone ──
// Quality/video/ranking fields are NOT available at hourly granularity.
const HOURLY_FIELDS = [
    'ad_id', 'spend', 'impressions', 'clicks', 'reach',
    'actions', 'action_values',
    'cpm', 'cpc',
    'cost_per_action_type',
].join(',');

const BREAKDOWN = 'hourly_stats_aggregated_by_advertiser_time_zone';

// ── Thai timezone UTC offset (+7h) ─────────────────────────────────────────
function getTodayBangkok() {
    const utcMs  = Date.now();
    const bhMs   = utcMs + 7 * 3600 * 1000; // Bangkok = UTC+7
    const d      = new Date(bhMs);
    const yyyy   = d.getUTCFullYear();
    const mm     = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd     = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function parseSlot(slot) {
    const hourStr = slot[BREAKDOWN];
    if (!hourStr) return null;
    // FB returns e.g. "0:00:00 - 1:00:00" or "00:00:00"
    const hour = parseInt(hourStr.split(':')[0], 10);
    if (isNaN(hour) || hour < 0 || hour > 23) return null;

    const spend       = parseFloat(slot.spend || 0);
    const impressions = parseInt(slot.impressions || 0, 10);
    const clicks      = parseInt(slot.clicks || 0, 10);
    const reach       = parseInt(slot.reach || 0, 10);

    const isPurchase = t => [
        'purchase', 'onsite_conversion.purchase', 'omni_purchase',
        'onsite_app_purchase', 'onsite_web_purchase',
        'onsite_web_app_purchase', 'offsite_conversion.fb_pixel_purchase',
    ].includes(t);

    const purchaseValue  = (slot.action_values || []).find(a => isPurchase(a.action_type));
    const purchaseAction = (slot.actions || []).find(a => isPurchase(a.action_type));
    const leadAction     = (slot.actions || []).find(a => a.action_type === 'lead');
    const cpaLead        = (slot.cost_per_action_type || []).find(a => a.action_type === 'lead');
    const cpaPurchase    = (slot.cost_per_action_type || []).find(a => isPurchase(a.action_type));

    return {
        adId: slot.ad_id,
        hour,
        metrics: {
            spend,
            impressions,
            clicks,
            reach,
            revenue:         purchaseValue  ? parseFloat(purchaseValue.value  || 0)   : 0,
            purchases:       purchaseAction ? parseInt(purchaseAction.value   || 0, 10) : 0,
            leads:           leadAction     ? parseInt(leadAction.value       || 0, 10) : 0,
            cpm:             slot.cpm       ? parseFloat(slot.cpm)            : null,
            cpc:             slot.cpc       ? parseFloat(slot.cpc)            : null,
            frequency:       null,
            costPerLead:     cpaLead        ? parseFloat(cpaLead.value        || 0)   : null,
            costPerPurchase: cpaPurchase    ? parseFloat(cpaPurchase.value    || 0)   : null,
            qualityRanking:  null, engagementRateRanking: null, conversionRateRanking: null,
            videoP25: null, videoP50: null, videoP75: null, videoP100: null,
        },
    };
}

/**
 * POST /api/marketing/sync-hourly (QStash) or GET with CRON_SECRET
 */
export async function POST(request) {
    return GET(request);
}

export async function GET(request) {
    // Auth: CRON_SECRET for manual/cron, otherwise QStash signature
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
        if (!ACCESS_TOKEN || !AD_ACCOUNT_ID) {
            return NextResponse.json({ success: false, error: 'FB credentials not configured' }, { status: 503 });
        }

        // Use Bangkok date (UTC+7) — FB account timezone is Thailand
        const today = getTodayBangkok();
        const timeRange = JSON.stringify({ since: today, until: today });

        logger.info('[SyncHourly]', `Fetching hourly insights for ${today} (Bangkok) from ad account`);

        // ── Query ad account directly (not per-campaign) ─────────────────────
        // This avoids the per-campaign batch approach which silently returns empty
        // when incompatible fields are mixed, and is more reliable.
        const params = new URLSearchParams({
            access_token: ACCESS_TOKEN,
            level:        'ad',
            fields:       HOURLY_FIELDS,
            time_range:   timeRange,
            breakdowns:   BREAKDOWN,
            limit:        '500',
        });

        let url = `${GRAPH_API}/${AD_ACCOUNT_ID}/insights?${params}`;
        const allSlots = [];
        let pageCount  = 0;

        // Paginate all results
        while (url) {
            const res  = await fetch(url);
            const body = await res.json();

            if (body?.error) {
                const code = body.error.code;
                const msg  = body.error.message || `FB API error ${code}`;
                logger.error('[SyncHourly]', `FB API error: ${msg}`, body.error);
                if (body.error.type === 'OAuthException' || code === 190) {
                    throw new Error('ACCESS_TOKEN_EXPIRED');
                }
                throw new Error(msg);
            }

            const rows = body.data || [];
            allSlots.push(...rows);
            pageCount++;

            const next = body.paging?.next;
            url = (next && next !== url) ? next : null;
        }

        logger.info('[SyncHourly]', `Got ${allSlots.length} hourly rows across ${pageCount} page(s)`);

        if (allSlots.length === 0) {
            logger.warn('[SyncHourly]', `No hourly data returned for ${today} — ads may not be active or spending yet`);
            return NextResponse.json({
                success: true,
                date: today,
                stats: { slotsRaw: 0, slotsUpdated: 0, ledgerEntries: 0 },
                note: 'No hourly data from FB for this date — ads may not be active or spending today',
                syncedAt: new Date().toISOString(),
            });
        }

        // Parse + upsert
        const parsed = allSlots.map(parseSlot).filter(Boolean);
        logger.info('[SyncHourly]', `Parsed ${parsed.length} valid slots`);

        const settled = await Promise.allSettled(parsed.map(async (p) => {
            await marketingRepo.upsertAdHourlyMetric(p.adId, today, p.hour, p.metrics);
            const entry = await marketingRepo.appendHourlyLedgerIfChanged(p.adId, today, p.hour, p.metrics);
            return entry ? 1 : 0;
        }));

        let updatedCount = 0;
        let ledgerRows   = 0;
        for (const r of settled) {
            if (r.status === 'fulfilled') { updatedCount++; ledgerRows += r.value; }
            else logger.error('[SyncHourly]', 'Upsert failed', r.reason);
        }

        return NextResponse.json({
            success: true,
            date: today,
            stats: {
                slotsRaw:     allSlots.length,
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
