/**
 * GET /api/marketing/sync-daily
 * Cron: daily at 02:00 UTC (09:00 TH)
 *
 * Pulls yesterday's demographics + placement breakdown per ad.
 * Main metrics (spend/impressions/etc) are handled by sync-hourly every hour.
 * Demographics and placement cannot use hourly breakdown — daily only.
 *
 * 3 calls total:
 *   1. demographics  breakdowns=age,gender
 *   2. placement     breakdowns=publisher_platform,platform_position
 *   + pagination 200ms delay between pages
 */

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import * as marketingRepo from '@/lib/repositories/marketingRepo';

const GRAPH_API     = 'https://graph.facebook.com/v19.0';
const AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID;
const ACCESS_TOKEN  = process.env.FB_ACCESS_TOKEN;

const BASE_FIELDS = 'ad_id,date_start,impressions,clicks,spend,reach,actions,action_values';
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

async function fetchAllPages(extraParams) {
    const params = new URLSearchParams({
        access_token:   ACCESS_TOKEN,
        level:          'ad',
        time_increment: '1',
        limit:          '200',
        ...extraParams,
    });

    let url = `${GRAPH_API}/${AD_ACCOUNT_ID}/insights?${params}`;
    const rows = [];

    while (url) {
        const res = await fetch(url);
        if (res.status === 429) throw new Error('RATE_LIMITED');
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            const msg  = body?.error?.message || `HTTP ${res.status}`;
            if (body?.error?.type === 'OAuthException') throw new Error('ACCESS_TOKEN_EXPIRED');
            throw new Error(msg);
        }
        const page = await res.json();
        rows.push(...(page.data || []));
        url = page.paging?.next || null;
        if (url) await sleep(200);
    }
    return rows;
}

export async function GET(request) {
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
        return NextResponse.json({ error: 'FB credentials not configured' }, { status: 503 });
    }

    // Default: yesterday (FB data finalizes ~midnight)
    const { searchParams } = new URL(request.url);
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const date = searchParams.get('date') || yesterday.toISOString().split('T')[0];
    const timeRange = JSON.stringify({ since: date, until: date });

    logger.info('[SyncDaily]', `Syncing demographics + placement for ${date}`);

    const CHUNK = 50;
    const stats = { date, demoRows: 0, placementRows: 0 };

    try {
        // ── 1. Demographics (age × gender) ───────────────────────────────
        const demoRows = await fetchAllPages({ fields: BASE_FIELDS, breakdowns: 'age,gender', time_range: timeRange });

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
        stats.demoRows = demoRows.length;
        logger.info('[SyncDaily]', `Demographics: ${demoRows.length} rows`);
        await sleep(500);

        // ── 2. Placement (platform × position) ───────────────────────────
        const placementRows = await fetchAllPages({
            fields:     BASE_FIELDS,
            breakdowns: 'publisher_platform,platform_position',
            time_range: timeRange,
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
        stats.placementRows = placementRows.length;
        logger.info('[SyncDaily]', `Placements: ${placementRows.length} rows`);

        return NextResponse.json({ success: true, ...stats });

    } catch (err) {
        if (err.message === 'ACCESS_TOKEN_EXPIRED') {
            return NextResponse.json({ error: 'FB Access Token expired' }, { status: 401 });
        }
        logger.error('[SyncDaily]', 'Failed', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
