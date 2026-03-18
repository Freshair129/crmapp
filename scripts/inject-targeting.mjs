/**
 * inject-targeting.mjs
 * Pulls targeting data from ad_sets → injects a "กลุ่มเป้าหมาย" section
 * into each flagged ad card in the report HTML.
 * Injects BEFORE .flag-chips (after caption row).
 */

import pg from 'pg';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const HTML_PATH = new URL('../reports/meta-policy-flag-report-2026-03.html', import.meta.url).pathname;

const FLAGGED_IDS = [
  '120241264770250708','120233607466740708','120241976055360708',
  '120223286409710708','120241265819190708','120241971601710708',
  '120239740735470708','120241111922030708','120241774344740708',
  '120241971044400708','120241971591570708','120241971578880708',
  '120213739949360708','120215928645630708',
];

const LOCALE_MAP = { 6: 'EN', 24: 'TH', 35: 'ZH', 11: 'AR', 23: 'FR' };

// ── Parse targeting JSON → pill data ────────────────────────────────────────
function parseTargeting(t, adsetName) {
  const pills = [];

  // AdSet name (type)
  if (adsetName) pills.push({ type: 'adset', label: adsetName });

  // Advantage+
  if (t.targeting_automation?.advantage_audience === 1)
    pills.push({ type: 'adv', label: 'Advantage+' });

  // Age
  const ageMin = t.age_range?.[0] ?? t.age_min;
  const ageMax = t.age_range?.[1] ?? t.age_max;
  if (ageMin || ageMax) pills.push({ type: 'age', label: `อายุ ${ageMin}–${ageMax}` });

  // Locales
  if (t.locales?.length) {
    const langs = t.locales.map(id => LOCALE_MAP[id] ?? `L${id}`).join(', ');
    pills.push({ type: 'locale', label: `ภาษา: ${langs}` });
  }

  // Geo — cities
  const cities = t.geo_locations?.cities ?? [];
  cities.slice(0, 4).forEach(c =>
    pills.push({ type: 'geo', label: `${c.name} +${c.radius}km` })
  );

  // Geo — custom_locations (lat/lon pins)
  const customs = t.geo_locations?.custom_locations ?? [];
  customs.forEach(loc => {
    const name = loc.name?.split(',')[0]?.trim() ?? 'ตำแหน่ง';
    pills.push({ type: 'geo', label: `${name} +${loc.radius}km` });
  });

  // Custom / Lookalike audiences
  const audiences = t.custom_audiences ?? [];
  audiences.forEach(a => {
    const isLAL = a.name?.toLowerCase().includes('คล้าย') || a.name?.toLowerCase().includes('lookalike') || a.name?.toLowerCase().includes('similar') || a.name?.includes('%');
    pills.push({ type: isLAL ? 'lal' : 'custom', label: a.name?.length > 32 ? a.name.slice(0, 32) + '…' : a.name });
  });

  // Flexible spec — interests, behaviors, industries, work_employers
  const specs = t.flexible_spec ?? [];
  const seenInterests = [];
  specs.forEach(spec => {
    // Interests (show top 6)
    (spec.interests ?? []).slice(0, 6).forEach(i => {
      const name = i.name?.split(' (')[0];
      if (!seenInterests.includes(name)) {
        seenInterests.push(name);
        pills.push({ type: 'int', label: name });
      }
    });
    // Behaviors
    (spec.behaviors ?? []).forEach(b =>
      pills.push({ type: 'beh', label: b.name?.split(' (')[0] })
    );
    // Industries
    (spec.industries ?? []).forEach(ind =>
      pills.push({ type: 'ind', label: ind.name?.split(' (')[0] })
    );
    // Work employers
    (spec.work_employers ?? []).slice(0, 3).forEach(w =>
      pills.push({ type: 'emp', label: w.name })
    );
  });

  return pills;
}

// ── Build HTML for targeting section ────────────────────────────────────────
function buildTargetingHTML(pills) {
  const pillHtml = pills.map(({ type, label }) =>
    `<span class="tpill tpill-${type}">${label}</span>`
  ).join('');
  return `<div class="targeting-section">\n          <div class="flabel">🎯 กลุ่มเป้าหมาย</div>\n          <div class="targeting-pills">${pillHtml}</div>\n        </div>`;
}

// ── Remove old targeting-section if exists ───────────────────────────────────
function removeTargetingSection(html, fromIdx) {
  const marker = '<div class="targeting-section">';
  const start = html.indexOf(marker, fromIdx);
  if (start === -1) return { html, removed: false };
  let depth = 0, i = start;
  while (i < html.length) {
    if (html.startsWith('<div', i)) { depth++; i += 4; }
    else if (html.startsWith('</div>', i)) { depth--; i += 6; if (depth === 0) break; }
    else i++;
  }
  return { html: html.slice(0, start) + html.slice(i), removed: true };
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const { rows } = await db.query(
    `SELECT a.ad_id, s.name AS adset_name, s.targeting
     FROM ads a JOIN ad_sets s ON a.ad_set_id = s.id
     WHERE a.ad_id = ANY($1::text[])`,
    [FLAGGED_IDS]
  );
  await db.end();

  const dataMap = Object.fromEntries(rows.map(r => [r.ad_id, r]));

  let html = await fs.readFile(HTML_PATH, 'utf8');

  // Inject CSS if not present
  if (!html.includes('.tpill {')) {
    const cssBlock = `
    /* ── Targeting Pills ── */
    .targeting-section { margin: 6px 0 4px; }
    .targeting-pills { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
    .tpill {
      display:inline-block; font-size:10px; font-weight:600;
      padding:2px 7px; border-radius:20px; line-height:1.5;
    }
    .tpill-adset { background:#e8eaf6; color:#3949ab; }
    .tpill-adv   { background:#fff3e0; color:#e65100; }
    .tpill-age   { background:#e3f2fd; color:#1565c0; }
    .tpill-locale{ background:#f3e5f5; color:#7b1fa2; }
    .tpill-geo   { background:#e8f5e9; color:#2e7d32; }
    .tpill-lal   { background:#fce4ec; color:#c62828; }
    .tpill-custom{ background:#fff8e1; color:#f57f17; }
    .tpill-int   { background:#f1f8e9; color:#558b2f; }
    .tpill-beh   { background:#e0f2f1; color:#00695c; }
    .tpill-ind   { background:#e8eaf6; color:#283593; }
    .tpill-emp   { background:#fafafa; color:#424242; border:1px solid #e0e0e0; }
`;
    // Insert before closing </style>
    html = html.replace('</style>', cssBlock + '\n  </style>');
    console.log('  ✓ Injected targeting CSS');
  }

  let patched = 0;
  for (const adId of FLAGGED_IDS) {
    const row = dataMap[adId];
    if (!row) { console.log(`  ⚠ no data for ${adId}`); continue; }

    const imgMarker = `/${adId}.webp"`;
    const imgIdx = html.indexOf(imgMarker);
    if (imgIdx === -1) { console.log(`  ⚠ no card for ${adId}`); continue; }

    // Remove previous targeting-section if re-running
    const { html: cleaned } = removeTargetingSection(html, imgIdx);
    html = cleaned;

    // Find injection point: before .flag-chips after this card's image
    const imgIdx2 = html.indexOf(`/${adId}.webp"`, 0); // re-find after clean
    const anchors = ['<div class="flag-chips"', '<div class="policy-cats"', '<div class="fix-box"'];
    const positions = anchors.map(a => html.indexOf(a, imgIdx2)).filter(x => x > imgIdx2);
    if (!positions.length) { console.log(`  ⚠ no injection point for ${adId}`); continue; }
    const insertAt = Math.min(...positions);

    const pills = parseTargeting(row.targeting, row.adset_name);
    const targetingHtml = buildTargetingHTML(pills) + '\n        ';

    html = html.slice(0, insertAt) + targetingHtml + html.slice(insertAt);

    patched++;
    console.log(`  ✓ ${adId} — ${pills.length} pills (AdSet: ${row.adset_name})`);
  }

  await fs.writeFile(HTML_PATH, html, 'utf8');
  console.log(`\n[inject-targeting] Done — ${patched} cards patched\n`);
}

main().catch(err => {
  console.error('[inject-targeting] FATAL:', err);
  process.exit(1);
});
