/**
 * backfill-hourly.mjs
 * Pulls historical hourly stats (last 30 days) from Meta Graph API.
 * Usage: node scripts/backfill-hourly.mjs [months=1]
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pg = require('pg');
const { Client } = pg;
import dotenv from 'dotenv';
dotenv.config();

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const AD_ACCOUNT_ID = process.env.FB_AD_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;
const SUPABASE_URL = process.env.DATABASE_URL;
const MONTHS = parseInt(process.argv[2] || '1', 10);
const BATCH_DELAY = 1000;

if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
    console.error('❌ Missing FB credentials in .env');
    process.exit(1);
}

const since = new Date(Date.now() - MONTHS * 30 * 86400000).toISOString().split('T')[0];
const until = new Date().toISOString().split('T')[0];

let db;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function graphGet(path, params = {}) {
    const url = new URL(`${GRAPH_API}${path}`);
    url.searchParams.set('access_token', ACCESS_TOKEN);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error) throw new Error(`[Graph] ${data.error.message}`);
    return data;
}

async function paginate(path, params) {
    const results = [];
    let data = await graphGet(path, { ...params, limit: 100 });
    results.push(...(data.data || []));
    while (data.paging?.next) {
        const res = await fetch(data.paging.next);
        data = await res.json();
        results.push(...(data.data || []));
    }
    return results;
}

async function main() {
    db = new Client({ connectionString: SUPABASE_URL });
    await db.connect();
    console.log(`✅ Connected to DB  |  Backfill Range: ${since} → ${until}\n`);

    console.log('Fetching all Ads...');
    const ads = (await db.query('SELECT ad_id FROM ads')).rows;
    console.log(`  → Found ${ads.length} ads to backfill\n`);

    for (let i = 0; i < ads.length; i++) {
        const ad = ads[i];
        console.log(`[${i + 1}/${ads.length}] Ad: ${ad.ad_id}`);

        try {
            const insights = await graphGet(`/${ad.ad_id}/insights`, {
                fields: 'spend,impressions,clicks,actions,action_values',
                time_range: JSON.stringify({ since, until }),
                time_increment: 1, // first get daily to know which days have spend
            });

            const activeDays = (insights.data || []).filter(d => parseFloat(d.spend) > 0).map(d => d.date_start);
            console.log(`    → ${activeDays.length} active days`);

            for (const date of activeDays) {
                try {
                    const hourly = await graphGet(`/${ad.ad_id}/insights`, {
                        fields: 'spend,impressions,clicks,actions,action_values',
                        time_range: JSON.stringify({ since: date, until: date }),
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

                        await db.query(`
                            INSERT INTO ad_hourly_metrics (id, ad_id, date, hour, spend, impressions, clicks, leads, purchases, revenue, roas, created_at)
                            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
                            ON CONFLICT (ad_id, date, hour) DO UPDATE SET
                                spend = EXCLUDED.spend, impressions = EXCLUDED.impressions,
                                clicks = EXCLUDED.clicks, leads = EXCLUDED.leads,
                                purchases = EXCLUDED.purchases, revenue = EXCLUDED.revenue,
                                roas = EXCLUDED.roas
                        `, [ad.ad_id, date, hour, spend, impressions, clicks, leads, purchases, revenue, 
                            spend > 0 ? revenue / spend : 0]);
                    }
                } catch (e) {
                    console.error(`      ❌ Failed for date ${date}: ${e.message}`);
                }
                await sleep(100); // small delay between days
            }
        } catch (err) {
            console.error(`    ❌ Ad ${ad.ad_id} failed: ${err.message}`);
        }
        await sleep(BATCH_DELAY);
    }

    await db.end();
    console.log('\n✅ Backfill complete');
}

main().catch(console.error);
