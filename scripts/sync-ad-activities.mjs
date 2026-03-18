/**
 * sync-ad-activities.mjs
 * Fetches full ad activity log from Meta API → inserts into ad_activities table
 * Usage: node scripts/sync-ad-activities.mjs [--days=90] [--dry-run]
 *
 * Phase 21.1 — Ad Activity Log
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const FB_TOKEN = process.env.FB_ACCESS_TOKEN;
const AD_ACCOUNT = process.env.FB_AD_ACCOUNT_ID; // act_XXXXXX
const BASE = 'https://graph.facebook.com/v19.0';
const PAGE_LIMIT = 100;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DAYS = parseInt(args.find(a => a.startsWith('--days='))?.split('=')[1] ?? '90');

// ── DB connection ──────────────────────────────────────────────────────────
const client = new Client({ connectionString: process.env.DATABASE_URL });

// ── Fetch all pages from Meta API ─────────────────────────────────────────
async function fetchAllActivities() {
  const since = Math.floor(Date.now() / 1000) - DAYS * 86400;
  let url = `${BASE}/${AD_ACCOUNT}/activities?fields=event_type,event_time,object_id,object_name,actor_name,translated_event_type,extra_data&limit=${PAGE_LIMIT}&since=${since}&access_token=${FB_TOKEN}`;

  const all = [];
  let page = 1;

  while (url) {
    console.log(`[sync-ad-activities] fetching page ${page}...`);
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Meta API error ${res.status}: ${err}`);
    }
    const json = await res.json();
    const records = json.data ?? [];
    all.push(...records);
    console.log(`  → ${records.length} records (total: ${all.length})`);

    url = json.paging?.next ?? null;
    page++;
  }

  return all;
}

// ── Upsert into DB ────────────────────────────────────────────────────────
async function upsertActivities(activities) {
  let inserted = 0;
  let skipped = 0;

  for (const act of activities) {
    // adId = object_id for ads; skip non-ad events if object_id looks like campaign
    const adId = act.object_id?.toString();
    if (!adId) { skipped++; continue; }

    let extraData = null;
    if (act.extra_data) {
      try {
        extraData = typeof act.extra_data === 'string'
          ? JSON.parse(act.extra_data)
          : act.extra_data;
      } catch { extraData = { raw: act.extra_data }; }
    }

    const eventTime = new Date(act.event_time);

    if (DRY_RUN) {
      console.log(`[DRY] ${act.actor_name ?? 'Meta'} | ${act.translated_event_type} | ${act.object_name} | ${eventTime.toISOString()}`);
      inserted++;
      continue;
    }

    try {
      await client.query(
        `INSERT INTO ad_activities
           (id, ad_id, event_type, event_time, object_id, object_name,
            actor_name, translated_event_type, extra_data, created_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, now())
         ON CONFLICT (ad_id, event_type, event_time) DO NOTHING`,
        [
          adId,
          act.event_type,
          eventTime,
          adId,
          act.object_name ?? '',
          act.actor_name ?? null,
          act.translated_event_type ?? null,
          extraData ? JSON.stringify(extraData) : null,
        ]
      );
      inserted++;
    } catch (err) {
      console.error(`[sync-ad-activities] insert error for ${adId}:`, err.message);
      skipped++;
    }
  }

  return { inserted, skipped };
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n[sync-ad-activities] Starting — last ${DAYS} days${DRY_RUN ? ' (DRY RUN)' : ''}`);

  if (!DRY_RUN) await client.connect();

  const activities = await fetchAllActivities();
  console.log(`\n[sync-ad-activities] Total fetched: ${activities.length}`);

  const { inserted, skipped } = await upsertActivities(activities);
  console.log(`[sync-ad-activities] Done — inserted: ${inserted}, skipped: ${skipped}\n`);

  if (!DRY_RUN) await client.end();
}

main().catch(err => {
  console.error('[sync-ad-activities] FATAL:', err);
  process.exit(1);
});
