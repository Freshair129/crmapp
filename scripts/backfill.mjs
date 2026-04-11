/**
 * Standalone backfill script — runs outside Next.js, no timeout.
 * Usage: node scripts/backfill.mjs [since] [until]
 * Example: node scripts/backfill.mjs 2025-12-14 2026-03-25
 */
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load env
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

// ── Prisma setup ────────────────────────────────────────────────────────────
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter, log: ['warn', 'error'] });

// ── Config ───────────────────────────────────────────────────────────────────
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

const sleep = ms => new Promise(r => setTimeout(r, ms));
const isPurchase = t => ['purchase', 'onsite_conversion.purchase'].includes(t);

// ── Helpers ──────────────────────────────────────────────────────────────────
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
      console.error('    FB API error:', JSON.stringify(body?.error || body));
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
    spend,
    impressions:           parseInt(row.impressions || 0, 10),
    reach:                 parseInt(row.reach || 0, 10),
    clicks:                parseInt(row.clicks || 0, 10),
    leads, purchases, revenue,
    roas:                  spend > 0 ? revenue / spend : 0,
    cpm:                   row.cpm       ? parseFloat(row.cpm)       : null,
    cpc:                   row.cpc       ? parseFloat(row.cpc)       : null,
    frequency:             row.frequency ? parseFloat(row.frequency) : null,
    costPerLead:           cpaLead       ? parseFloat(cpaLead.value || 0)     : null,
    costPerPurchase:       cpaPurchase   ? parseFloat(cpaPurchase.value || 0) : null,
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

// ── DB helpers ───────────────────────────────────────────────────────────────
async function upsertAdDailyMetric(adId, date, data) {
  const d = new Date(date); d.setUTCHours(0, 0, 0, 0);
  return prisma.adDailyMetric.upsert({
    where:  { adId_date: { adId, date: d } },
    update: data,
    create: { adId, date: d, ...data },
  });
}

async function upsertAdDailyDemographic(adId, date, age, gender, data) {
  const d = new Date(date); d.setUTCHours(0, 0, 0, 0);
  return prisma.adDailyDemographic.upsert({
    where:  { adId_date_age_gender: { adId, date: d, age, gender } },
    update: data,
    create: { adId, date: d, age, gender, ...data },
  });
}

async function upsertAdDailyPlacement(adId, date, platform, position, data) {
  const d = new Date(date); d.setUTCHours(0, 0, 0, 0);
  return prisma.adDailyPlacement.upsert({
    where:  { adId_date_platform_position: { adId, date: d, platform, position } },
    update: data,
    create: { adId, date: d, platform, position, ...data },
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
    console.error('❌ FB_AD_ACCOUNT_ID or FB_ACCESS_TOKEN not set');
    process.exit(1);
  }

  let since = process.argv[2];
  const until = process.argv[3] || new Date().toISOString().split('T')[0];

  if (!since) {
    const last = await prisma.adDailyMetric.findFirst({ orderBy: { date: 'desc' }, select: { date: true } });
    const base = last ? new Date(last.date) : (() => { const d = new Date(); d.setDate(d.getDate() - 90); return d; })();
    if (last) base.setDate(base.getDate() + 1);
    since = base.toISOString().split('T')[0];
  }

  if (since > until) {
    console.log('✅ No missing data', { since, until });
    return;
  }

  console.log(`📅 Backfilling ${since} → ${until}`);

  const COMMON = { level: 'ad', time_increment: '1', limit: '200' };
  const timeRange = (s, u) => JSON.stringify({ since: s, until: u });
  const windows = splitWindows(since, until, 30);
  const stats = { windows: windows.length, mainRows: 0, demoRows: 0, placementRows: 0, errors: [] };
  const CHUNK = 50;

  for (const win of windows) {
    console.log(`  📦 Window ${win.since} → ${win.until}`);
    const tr = timeRange(win.since, win.until);

    try {
      // Pre-fetch known FB adIds to skip unknown ads
      const knownAds = await prisma.ad.findMany({ select: { adId: true } });
      const knownAdIds = new Set(knownAds.map(a => a.adId)); // FB ad IDs

      // 1. Main metrics
      const mainRows = await fetchAllPages({ ...COMMON, fields: MAIN_FIELDS, time_range: tr });
      let mainSaved = 0, mainSkipped = 0;
      for (let i = 0; i < mainRows.length; i += CHUNK) {
        const results = await Promise.allSettled(mainRows.slice(i, i + CHUNK).map(row => {
          if (!knownAdIds.has(row.ad_id)) { mainSkipped++; return Promise.resolve(); }
          const date = new Date(row.date_start);
          const r = parseMainRow(row);
          return upsertAdDailyMetric(row.ad_id, date, r).then(() => mainSaved++);
        }));
        results.filter(r => r.status === 'rejected').forEach(r => console.warn('    ⚠ row error:', r.reason?.message?.slice(0, 80)));
      }
      stats.mainRows += mainSaved;
      console.log(`    ✓ Main: ${mainSaved} saved, ${mainSkipped} skipped (unknown ads)`);
      await sleep(500);

      // 2. Demographics
      const demoRows = await fetchAllPages({ ...COMMON, fields: BASE_FIELDS, breakdowns: 'age,gender', time_range: tr });
      let demoSaved = 0, demoSkipped = 0;
      for (let i = 0; i < demoRows.length; i += CHUNK) {
        const results = await Promise.allSettled(demoRows.slice(i, i + CHUNK).map(row => {
          if (!knownAdIds.has(row.ad_id)) { demoSkipped++; return Promise.resolve(); }
          const { leads, purchases, revenue } = extractConversions(row);
          return upsertAdDailyDemographic(row.ad_id, new Date(row.date_start), row.age, row.gender, {
            impressions: parseInt(row.impressions || 0, 10),
            clicks:      parseInt(row.clicks || 0, 10),
            spend:       parseFloat(row.spend || 0),
            reach:       parseInt(row.reach || 0, 10),
            leads, purchases, revenue,
          }).then(() => demoSaved++);
        }));
        results.filter(r => r.status === 'rejected').forEach(r => console.warn('    ⚠ row error:', r.reason?.message?.slice(0, 80)));
      }
      stats.demoRows += demoSaved;
      console.log(`    ✓ Demographics: ${demoSaved} saved, ${demoSkipped} skipped`);
      await sleep(500);

      // 3. Placement
      const placementRows = await fetchAllPages({ ...COMMON, fields: BASE_FIELDS, breakdowns: 'publisher_platform,platform_position', time_range: tr });
      let placeSaved = 0, placeSkipped = 0;
      for (let i = 0; i < placementRows.length; i += CHUNK) {
        const results = await Promise.allSettled(placementRows.slice(i, i + CHUNK).map(row => {
          if (!knownAdIds.has(row.ad_id)) { placeSkipped++; return Promise.resolve(); }
          const { leads, purchases, revenue } = extractConversions(row);
          return upsertAdDailyPlacement(row.ad_id, new Date(row.date_start), row.publisher_platform, row.platform_position, {
            impressions: parseInt(row.impressions || 0, 10),
            clicks:      parseInt(row.clicks || 0, 10),
            spend:       parseFloat(row.spend || 0),
            reach:       parseInt(row.reach || 0, 10),
            leads, purchases, revenue,
          }).then(() => placeSaved++);
        }));
        results.filter(r => r.status === 'rejected').forEach(r => console.warn('    ⚠ row error:', r.reason?.message?.slice(0, 80)));
      }
      stats.placementRows += placeSaved;
      console.log(`    ✓ Placements: ${placeSaved} saved, ${placeSkipped} skipped`);

      if (win !== windows[windows.length - 1]) await sleep(2000);

    } catch (err) {
      if (err.message === 'ACCESS_TOKEN_EXPIRED') {
        console.error('❌ FB Access Token expired');
        process.exit(1);
      }
      console.error(`  ❌ Window ${win.since}→${win.until} failed:`, err.message, err.code || '');
      stats.errors.push({ window: `${win.since}→${win.until}`, error: err.message });
    }
  }

  console.log('\n✅ Done!', stats);
  await prisma.$disconnect();
  await pool.end();
}

main().catch(err => { console.error(err); process.exit(1); });
