import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/db';
import { upsertAdHourlyMetric, appendHourlyLedgerIfChanged } from '@/lib/repositories/marketingRepo';

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

        for (const ad of ads) {
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
                logger.error('[SyncHourly]', `Failed for ad ${ad.adId}`, err);
            }
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
        logger.error('[SyncHourly]', 'Sync failed', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
