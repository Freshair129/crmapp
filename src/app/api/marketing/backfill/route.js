/**
 * GET /api/marketing/backfill?since=YYYY-MM-DD&until=YYYY-MM-DD
 *
 * Per 30-day window fires 3 calls:
 *   1. Main insights   (level=ad, time_increment=1)          → ad_daily_metrics
 *   2. Demographics    (breakdowns=age,gender)               → ad_daily_demographics
 *   3. Placement       (breakdowns=publisher_platform,...)   → ad_daily_placements
 *
 * Rate: 3 calls/window + pagination → far below FB 200 calls/hour
 * Protected by CRON_SECRET.
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

const GRAPH_API     = 'https://graph.facebook.com/v19.0';
const AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID;
const ACCESS_TOKEN  = process.env.FB_ACCESS_TOKEN;

const BASE_FIELDS = 'ad_id,date_start,spend,reach,impressions,clicks,actions,action_values';

const MAIN_FIELDS = [
    BASE_FIELDS,
    'cpm,cpc,frequency,cost_per_action_type',
    'quality_ranking,engagement_rate_ranking,conversion_rate_ranking',
    'video_p25_watched_actions,video_p50_watched_actions',
    'video_p75_watched_actions,video_p100_watched_actions',
].join(',');

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));

const isPurchase = t => [
    'purchase',
    'onsite_conversion.purchase',
    'omni_purchase',
    'onsite_app_purchase',
    'onsite_web_purchase',
    'onsite_web_app_purchase',
    'offsite_conversion.fb_pixel_purchase',
].includes(t);

function extractConversions(row) {
    return {
        leads:     (row.actions || []).filter(a => a.action_type === 'lead').reduce((s, a) => s + parseInt(a.value || 0, 10), 0),
        purchases: (row.actions || []).filter(a => isPurchase(a.action_type)).reduce((s, a) => s + parseInt(a.value || 0, 10), 0),
        revenue:   (row.action_values || []).filter(a => isPurchase(a.action_type)).reduce((s, a) => s + parseFloat(a.value || 0), 0),
    };
}

async function fetchAllPages(params) {
    const url = new URL(`${GRAPH_API}/${AD_ACCOUNT_ID}/insights`);
    url.searchParams.set('access_token', ACCESS_TOKEN);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    let next = url.toString();
    const rows = [];
    while (next) {
        const res = await fetch(next);
        if (res.status === 429) throw new Error('RATE_LIMITED');
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            const msg  = body?.error?.message || `HTTP ${res.status}`;
            if (body?.error?.type === 'OAuthException') throw new Error('ACCESS_TOKEN_EXPIRED');
            throw new Error(msg);
        }
        const page = await res.json();
        rows.push(...(page.data || []));
        next = page.paging?.next || null;
        if (next) await sleep(200);
    }
    return rows;
}

function parseMainRow(row) {
    const spend = parseFloat(row.spend || 0);
    const { leads, purchases, revenue } = extractConversions(row);
    const cpaLead     = (row.cost_per_action_type || []).find(a => a.action_type === 'lead');
    const cpaPurchase = (row.cost_per_action_type || []).find(a => isPurchase(a.action_type));
    const videoVal    = key => parseInt((row[key] || []).find(a => a.action_type === 'video_view')?.value || 0, 10) || null;
    return {
        adId:  row.ad_id,
        date:  new Date(row.date_start),
        spend,
        impressions:          parseInt(row.impressions || 0, 10),
        reach:                parseInt(row.reach || 0, 10),
        clicks:               parseInt(row.clicks || 0, 10),
        leads, purchases, revenue,
        roas:                 spend > 0 ? revenue / spend : 0,
        cpm:                  row.cpm       ? parseFloat(row.cpm)       : null,
        cpc:                  row.cpc       ? parseFloat(row.cpc)       : null,
        frequency:            row.frequency ? parseFloat(row.frequency) : null,
        costPerLead:          cpaLead       ? parseFloat(cpaLead.value || 0)     : null,
        costPerPurchase:      cpaPurchase   ? parseFloat(cpaPurchase.value || 0) : null,
        qualityRanking:        row.quality_ranking           ?? null,
        engagementRateRanking: row.engagement_rate_ranking   ?? null,
        conversionRateRanking: row.conversion_rate_ranking   ?? null,
        videoP25:  videoVal('video_p25_watched_actions'),
        videoP50:  videoVal('video_p50_watched_actions'),
        videoP75:  videoVal('video_p75_watched_actions'),
        videoP100: videoVal('video_p100_watched_actions'),
    };
}

function splitWindows(since, until, days = 30) {
    const windows = [];
    let s = new Date(since);
    const e = new Date(until);
    while (s <= e) {
        const w = new Date(s);
        w.setDate(w.getDate() + days - 1);
        if (w > e) w.setTime(e.getTime());
        windows.push({ since: s.toISOString().split('T')[0], until: w.toISOString().split('T')[0] });
        s = new Date(w); s.setDate(s.getDate() + 1);
    }
    return windows;
}

const timeRange = (since, until) => JSON.stringify({ since, until });
const COMMON = { level: 'ad', time_increment: '1', limit: '200' };

// ── Route ─────────────────────────────────────────────────────────────────────

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
        return NextResponse.json({ error: 'FB credentials not configured' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    let since = searchParams.get('since');
    const until = searchParams.get('until') || new Date().toISOString().split('T')[0];

    if (!since) {
        const last = await marketingRepo.getLastDailyMetricDate();
        const base = last ? new Date(last) : (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d; })();
        if (last) base.setDate(base.getDate() + 1);
        since = base.toISOString().split('T')[0];
    }

    if (since > until) {
        return NextResponse.json({ success: true, message: 'No missing data', since, until });
    }

    logger.info('[Backfill]', `${since} → ${until}`);

    const windows = splitWindows(since, until, 30);
    const stats   = { windows: windows.length, mainRows: 0, demoRows: 0, placementRows: 0, errors: [] };

    for (const win of windows) {
        logger.info('[Backfill]', `Window ${win.since} → ${win.until}`);
        const tr = timeRange(win.since, win.until);

        try {
            // ── 1. Main metrics ───────────────────────────────────────────
            const mainRows = await fetchAllPages({ ...COMMON, fields: MAIN_FIELDS, time_range: tr });
            const CHUNK = 50;
            for (let i = 0; i < mainRows.length; i += CHUNK) {
                await Promise.all(mainRows.slice(i, i + CHUNK).map(row => {
                    const r = parseMainRow(row);
                    return marketingRepo.upsertAdDailyMetric(r.adId, r.date, r);
                }));
            }
            stats.mainRows += mainRows.length;
            await sleep(500);

            // ── 2. Demographics (age × gender) ────────────────────────────
            const demoRows = await fetchAllPages({
                ...COMMON,
                fields:     BASE_FIELDS,
                breakdowns: 'age,gender',
                time_range: tr,
            });
            for (let i = 0; i < demoRows.length; i += CHUNK) {
                await Promise.all(demoRows.slice(i, i + CHUNK).map(row => {
                    const { leads, purchases, revenue } = extractConversions(row);
                    return marketingRepo.upsertAdDailyDemographic(
                        row.ad_id, new Date(row.date_start), row.age, row.gender,
                        {
                            impressions: parseInt(row.impressions || 0, 10),
                            clicks:      parseInt(row.clicks || 0, 10),
                            spend:       parseFloat(row.spend || 0),
                            reach:       parseInt(row.reach || 0, 10),
                            leads, purchases, revenue,
                        }
                    );
                }));
            }
            stats.demoRows += demoRows.length;
            await sleep(500);

            // ── 3. Placement (platform × position) ───────────────────────
            const placementRows = await fetchAllPages({
                ...COMMON,
                fields:     BASE_FIELDS,
                breakdowns: 'publisher_platform,platform_position',
                time_range: tr,
            });
            for (let i = 0; i < placementRows.length; i += CHUNK) {
                await Promise.all(placementRows.slice(i, i + CHUNK).map(row => {
                    const { leads, purchases, revenue } = extractConversions(row);
                    return marketingRepo.upsertAdDailyPlacement(
                        row.ad_id, new Date(row.date_start),
                        row.publisher_platform, row.platform_position,
                        {
                            impressions: parseInt(row.impressions || 0, 10),
                            clicks:      parseInt(row.clicks || 0, 10),
                            spend:       parseFloat(row.spend || 0),
                            reach:       parseInt(row.reach || 0, 10),
                            leads, purchases, revenue,
                        }
                    );
                }));
            }
            stats.placementRows += placementRows.length;

            // 2s cooldown between windows
            if (win !== windows[windows.length - 1]) await sleep(2000);

        } catch (err) {
            if (err.message === 'ACCESS_TOKEN_EXPIRED') {
                return NextResponse.json({ error: 'FB Access Token expired' }, { status: 401 });
            }
            logger.error('[Backfill]', `Window ${win.since}→${win.until} failed`, err);
            stats.errors.push({ window: `${win.since}→${win.until}`, error: err.message });
        }
    }

    logger.info('[Backfill]', `Done`, stats);
    return NextResponse.json({ success: true, since, until, ...stats, errors: stats.errors.length ? stats.errors : undefined });
}
