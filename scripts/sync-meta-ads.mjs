/**
 * Standalone Meta Ads Sync — ไม่ต้องผ่าน auth
 * Run: node scripts/sync-meta-ads.mjs
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pg = require('pg');
const { Client } = pg;

const GRAPH_API     = 'https://graph.facebook.com/v19.0';
const AD_ACCOUNT_ID = 'act_231498665634943';
const ACCESS_TOKEN  = 'EAAMJp3v5Ai0BQoATDBpuNFeEdltWOXfDrzrUURQJoZANDNdCXHPZCZBqQkZACB59uUzrUI0ZCAzwCSl9Q6pYWHLuZCNm7u3rkDJzZAGIiZCAmtlpoIP602cQa3obNVOfwNSSKeyJ6E9wy4IZABhRj0pvPUnPZAZBITNpceW4jBR4FSzONvqpZAnVkGcdOSIXpe9VTnvMZBn0e6sAq2CZAYcAZDZD';
const SUPABASE_URL  = process.env.DATABASE_URL || 'postgresql://postgres:password123@localhost:5433/vschool_crm';
const MONTHS        = parseInt(process.argv[2] || '3', 10);
const INSIGHTS_ONLY = process.argv.includes('--insights-only');
const BATCH_SIZE    = 50;   // ads per Meta Batch API call
const BATCH_DELAY   = 2000; // ms between batches (avoid rate limit)

const since = new Date(Date.now() - MONTHS * 30 * 86400000).toISOString().split('T')[0];
const until = new Date().toISOString().split('T')[0];

let db;

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function graphGet(path, params = {}, retries = 3) {
    const url = new URL(`${GRAPH_API}${path}`);
    url.searchParams.set('access_token', ACCESS_TOKEN);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
    for (let attempt = 0; attempt <= retries; attempt++) {
        const res = await fetch(url.toString());
        const data = await res.json();
        if (data.error) {
            const isRateLimit = data.error.code === 32 || data.error.code === 613 ||
                (data.error.message || '').toLowerCase().includes('limit');
            if (isRateLimit && attempt < retries) {
                const wait = 60000 * (attempt + 1); // 1m, 2m, 3m
                console.log(`  ⚠️  Rate limit — waiting ${wait/1000}s...`);
                await sleep(wait);
                continue;
            }
            throw new Error(`[Graph] ${data.error.message}`);
        }
        return data;
    }
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

// ── Insights-only: update spend/impressions/clicks/revenue on existing ads ──
async function syncInsightsOnly() {
    const ads = (await db.query('SELECT ad_id FROM ads')).rows;
    console.log(`Fetching insights for ${ads.length} existing ads...\n`);

    const insightMap = new Map();
    let insightErrors = 0;

    for (let i = 0; i < ads.length; i += BATCH_SIZE) {
        const chunk = ads.slice(i, i + BATCH_SIZE);
        const batch = chunk.map(ad => ({
            method: 'GET',
            relative_url: `${ad.ad_id}/insights?fields=spend,impressions,clicks,actions&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}`,
        }));
        try {
            const body = new URLSearchParams();
            body.set('access_token', ACCESS_TOKEN);
            body.set('batch', JSON.stringify(batch));
            body.set('include_headers', 'false');
            const res = await fetch(`${GRAPH_API}/`, { method: 'POST', body });
            const results = await res.json();
            if (!Array.isArray(results)) { insightErrors += chunk.length; continue; }
            for (let j = 0; j < chunk.length; j++) {
                const r = results[j];
                if (!r || r.code !== 200) { insightErrors++; continue; }
                const parsed = JSON.parse(r.body);
                const ins = (parsed.data || [])[0];
                if (!ins) continue;
                const purchase = (ins.actions || []).find(a => a.action_type === 'purchase');
                insightMap.set(chunk[j].ad_id, {
                    spend:       parseFloat(ins.spend || 0),
                    impressions: parseInt(ins.impressions || 0, 10),
                    clicks:      parseInt(ins.clicks || 0, 10),
                    revenue:     purchase ? parseFloat(purchase.value || 0) : 0,
                });
            }
        } catch { insightErrors += chunk.length; }
        process.stdout.write(`\r  ${Math.min(i + BATCH_SIZE, ads.length)}/${ads.length}  errors: ${insightErrors}`);
        await sleep(BATCH_DELAY);
    }

    // Bulk update
    let updated = 0;
    for (const [adId, ins] of insightMap) {
        await db.query(`
            UPDATE ads SET spend=$1, impressions=$2, clicks=$3, revenue=$4,
                roas=$5, updated_at=NOW()
            WHERE ad_id=$6
        `, [ins.spend, ins.impressions, ins.clicks, ins.revenue,
            ins.spend > 0 ? ins.revenue / ins.spend : 0, adId]);
        updated++;
    }
    console.log(`\n\n══════════════════════════════════════`);
    console.log(`  updated : ${updated}`);
    console.log(`  errors  : ${insightErrors}`);
    console.log(`══════════════════════════════════════`);
    console.log('✅ Done');
}

async function main() {
    db = new Client({ connectionString: SUPABASE_URL });
    await db.connect();
    console.log(`✅ Connected to Supabase  |  Range: ${since} → ${until}\n`);

    if (INSIGHTS_ONLY) {
        console.log('⚡ --insights-only mode: skipping campaigns / adsets / creatives\n');
        await syncInsightsOnly();
        await db.end();
        return;
    }

    // ── 1. Campaigns ────────────────────────────────────────────────────────
    console.log('Syncing campaigns...');
    const campaigns = await paginate(`/${AD_ACCOUNT_ID}/campaigns`, {
        fields: 'id,name,status,objective,start_time,stop_time',
    });
    let campCount = 0;
    for (const c of campaigns) {
        await db.query(`
            INSERT INTO campaigns (id, campaign_id, name, status, objective, start_date, end_date, raw_data, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
            ON CONFLICT (campaign_id) DO UPDATE SET
                name = EXCLUDED.name, status = EXCLUDED.status,
                objective = EXCLUDED.objective, raw_data = EXCLUDED.raw_data, updated_at = NOW()
        `, [c.id, c.name, c.status, c.objective || null,
            c.start_time ? new Date(c.start_time) : null,
            c.stop_time  ? new Date(c.stop_time)  : null,
            JSON.stringify(c)]);
        campCount++;
    }
    console.log(`  → ${campCount} campaigns\n`);

    // ── 2. AdSets ────────────────────────────────────────────────────────────
    console.log('Syncing adsets...');
    const adsets = await paginate(`/${AD_ACCOUNT_ID}/adsets`, {
        fields: 'id,name,status,campaign_id,daily_budget,targeting',
    });
    let adsetCount = 0;
    for (const s of adsets) {
        const camp = await db.query('SELECT id FROM campaigns WHERE campaign_id = $1', [s.campaign_id]);
        if (!camp.rows[0]) continue;
        await db.query(`
            INSERT INTO ad_sets (id, ad_set_id, name, status, campaign_id, daily_budget, targeting, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (ad_set_id) DO UPDATE SET
                name = EXCLUDED.name, status = EXCLUDED.status,
                daily_budget = EXCLUDED.daily_budget, updated_at = NOW()
        `, [s.id, s.name, s.status, camp.rows[0].id,
            s.daily_budget ? parseFloat(s.daily_budget) / 100 : null,
            JSON.stringify(s.targeting || {})]);
        adsetCount++;
    }
    console.log(`  → ${adsetCount} adsets\n`);

    // ── 3. Ad Creatives ──────────────────────────────────────────────────────
    console.log('Syncing ad creatives...');
    const creatives = await paginate(`/${AD_ACCOUNT_ID}/adcreatives`, {
        fields: 'id,name,body,title,image_url,video_id,call_to_action_type',
    });
    let creativeCount = 0;
    for (const cr of creatives) {
        await db.query(`
            INSERT INTO ad_creatives (id, creative_id, name, body, headline, image_url, call_to_action, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
            ON CONFLICT (creative_id) DO UPDATE SET
                name = EXCLUDED.name, body = EXCLUDED.body,
                headline = EXCLUDED.headline, image_url = EXCLUDED.image_url,
                call_to_action = EXCLUDED.call_to_action, updated_at = NOW()
        `, [cr.id, cr.name || 'Untitled', cr.body || null,
            cr.title || null, cr.image_url || null,
            cr.call_to_action_type || null]);
        creativeCount++;
    }
    console.log(`  → ${creativeCount} creatives\n`);

    // ── 4. Ads + Insights (batched) ──────────────────────────────────────────
    console.log('Syncing ads + insights...');
    const ads = await paginate(`/${AD_ACCOUNT_ID}/ads`, {
        fields: 'id,name,status,effective_status,adset_id,creative{id}',
    });

    // Pre-load lookup maps (avoid per-ad DB round trips)
    const adsetMap = new Map(
        (await db.query('SELECT id, ad_set_id FROM ad_sets')).rows.map(r => [r.ad_set_id, r.id])
    );
    const creativeMap = new Map(
        (await db.query('SELECT id, creative_id FROM ad_creatives WHERE creative_id IS NOT NULL')).rows.map(r => [r.creative_id, r.id])
    );

    // Batch insights: 50 ads per Meta Batch API request
    const insightMap = new Map(); // ad_id → { spend, impressions, clicks, revenue }
    const timeRange = JSON.stringify({ since, until });
    let insightErrors = 0;

    for (let i = 0; i < ads.length; i += BATCH_SIZE) {
        const chunk = ads.slice(i, i + BATCH_SIZE);
        const batch = chunk.map(ad => ({
            method: 'GET',
            relative_url: `${ad.id}/insights?fields=spend,impressions,clicks,actions&time_range=${encodeURIComponent(timeRange)}`,
        }));
        try {
            // Meta Batch API requires form-urlencoded body
            const body = new URLSearchParams();
            body.set('access_token', ACCESS_TOKEN);
            body.set('batch', JSON.stringify(batch));
            body.set('include_headers', 'false');
            const res = await fetch(`${GRAPH_API}/`, {
                method: 'POST',
                body,
            });
            const results = await res.json();
            if (!Array.isArray(results)) { insightErrors += chunk.length; continue; }
            for (let j = 0; j < chunk.length; j++) {
                const r = results[j];
                if (!r || r.code !== 200) { insightErrors++; continue; }
                const parsed = JSON.parse(r.body);
                const ins = (parsed.data || [])[0];
                if (!ins) continue;
                const purchase = (ins.actions || []).find(a => a.action_type === 'purchase');
                insightMap.set(chunk[j].id, {
                    spend:       parseFloat(ins.spend || 0),
                    impressions: parseInt(ins.impressions || 0, 10),
                    clicks:      parseInt(ins.clicks || 0, 10),
                    revenue:     purchase ? parseFloat(purchase.value || 0) : 0,
                });
            }
        } catch (err) {
            insightErrors += chunk.length;
        }
        process.stdout.write(`\r  insights: ${Math.min(i + BATCH_SIZE, ads.length)}/${ads.length}`);
        await sleep(BATCH_DELAY);
    }
    console.log(`\n  insight errors: ${insightErrors}`);

    // Upsert ads
    let adCount = 0;
    for (const ad of ads) {
        const adsetUuid = adsetMap.get(ad.adset_id);
        if (!adsetUuid) continue;
        const creativeUuid = ad.creative?.id ? creativeMap.get(ad.creative.id) ?? null : null;
        const { spend = 0, impressions = 0, clicks = 0, revenue = 0 } = insightMap.get(ad.id) || {};
        await db.query(`
            INSERT INTO ads (id, ad_id, name, status, delivery_status, ad_set_id, creative_id, spend, impressions, clicks, revenue, roas, created_at, updated_at)
            VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
            ON CONFLICT (ad_id) DO UPDATE SET
                name = EXCLUDED.name, status = EXCLUDED.status,
                delivery_status = EXCLUDED.delivery_status,
                creative_id = EXCLUDED.creative_id,
                spend = EXCLUDED.spend, impressions = EXCLUDED.impressions,
                clicks = EXCLUDED.clicks, revenue = EXCLUDED.revenue,
                roas = EXCLUDED.roas, updated_at = NOW()
        `, [ad.id, ad.name, ad.status, ad.effective_status || null,
            adsetUuid, creativeUuid,
            spend, impressions, clicks, revenue,
            spend > 0 ? revenue / spend : 0]);
        adCount++;
    }
    console.log(`  → ${adCount} ads\n`);

    await db.end();
    console.log('══════════════════════════════════════');
    console.log(`  campaigns : ${campCount}`);
    console.log(`  adsets    : ${adsetCount}`);
    console.log(`  creatives : ${creativeCount}`);
    console.log(`  ads       : ${adCount}`);
    console.log('══════════════════════════════════════');
    console.log('✅ Done');
}

main().catch(err => { console.error('FATAL:', err.message); process.exit(1); });
