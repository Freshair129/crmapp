import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { upsertAdHourlyMetric, appendHourlyLedgerIfChanged } from '@/lib/repositories/marketingRepo';

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;

async function graphGet(path, params = {}, retries = 3) {
    const url = new URL(`${GRAPH_API}${path}`);
    url.searchParams.set('access_token', ACCESS_TOKEN);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

    for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(url.toString());

        if (res.status === 429) {
            if (attempt === retries) throw new Error('Rate limited after retries');
            const delay = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
            logger.warn('[SyncHourly]', `Rate limited, retry ${attempt + 1}/${retries} in ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
            continue;
        }

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            const message = err?.error?.message || `Graph API ${res.status}`;
            if (message.includes('code 190') || message.includes('OAuthException')) {
                throw new Error('ACCESS_TOKEN_EXPIRED');
            }
            throw new Error(message);
        }
        return res.json();
    }
}

/**
 * GET /api/marketing/sync-hourly
 * Incremental hourly sync. Fetches today's hourly stats and records deltas.
 */
export async function GET() {
    try {
        if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
            return NextResponse.json({ success: false, error: 'FB credentials not configured' }, { status: 503 });
        }

        const prisma = await getPrisma();
        const today = new Date().toISOString().split('T')[0];

        // Fetch active/recent ads to reduce API load
        // Alternatively, pull all ads if account is small
        const ads = await prisma.ad.findMany({
            where: { status: 'ACTIVE' },
            select: { adId: true }
        });

        logger.info('[SyncHourly]', `Syncing ${ads.length} active ads for ${today}`);
        let updatedCount = 0;
        let ledgerRows = 0;

        const BATCH_SIZE = 5;
        for (let i = 0; i < ads.length; i += BATCH_SIZE) {
            const batch = ads.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (ad) => {
                try {
                    // Pull hourly breakdown for today
                    const hourly = await graphGet(`/${ad.adId}/insights`, {
                        fields: 'spend,impressions,clicks,actions,action_values',
                        time_range: JSON.stringify({ since: today, until: today }),
                        breakdowns: 'hourly_stats_aggregated_by_advertiser_time_zone',
                    });

                    for (const slot of (hourly.data || [])) {
                        const hourStr = slot.hourly_stats_aggregated_by_advertiser_time_zone;
                        if (!hourStr) continue;
                        const hour = parseInt(hourStr.split(':')[0], 10);
                        
                        const spend = parseFloat(slot.spend || 0);
                        const impressions = parseInt(slot.impressions || 0, 10);
                        const clicks = parseInt(slot.clicks || 0, 10);
                        
                        const purchaseValue = (slot.action_values || []).find(a => ['purchase', 'onsite_conversion.purchase'].includes(a.action_type));
                        const revenue = purchaseValue ? parseFloat(purchaseValue.value || 0) : 0;
                        
                        const purchaseAction = (slot.actions || []).find(a => ['purchase', 'onsite_conversion.purchase'].includes(a.action_type));
                        const purchases = purchaseAction ? parseInt(purchaseAction.value || 0) : 0;
                        
                        const leadAction = (slot.actions || []).find(a => a.action_type === 'lead');
                        const leads = leadAction ? parseInt(leadAction.value || 0) : 0;

                        const metrics = { spend, impressions, clicks, leads, purchases, revenue };

                        // 1. Update Hourly Rollup
                        await upsertAdHourlyMetric(ad.adId, today, hour, metrics);
                        
                        // 2. Delta Ledgering
                        const ledgerEntry = await appendHourlyLedgerIfChanged(ad.adId, today, hour, metrics);
                        if (ledgerEntry) ledgerRows++;
                        
                        updatedCount++;
                    }
                } catch (err) {
                    if (err.message === 'ACCESS_TOKEN_EXPIRED') throw err;
                    logger.error('[SyncHourly]', `Failed for ad ${ad.adId}`, err);
                }
            }));
        }

        return NextResponse.json({
            success: true,
            date: today,
            stats: {
                adsProcessed: ads.length,
                hourlySlotsUpdated: updatedCount,
                ledgerEntriesAdded: ledgerRows
            },
            syncedAt: new Date().toISOString()
        });
    } catch (error) {
        if (error.message === 'ACCESS_TOKEN_EXPIRED') {
            return NextResponse.json({ success: false, error: 'FB Access Token expired — renew in env vars' }, { status: 401 });
        }
        logger.error('[SyncHourly]', 'Sync failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
