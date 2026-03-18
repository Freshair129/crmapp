/**
 * patch-ad-metrics.mjs
 * Replaces the .stats section in each flagged ad card with
 * full metrics: Spend, Impressions, Clicks, CTR, CPM, Revenue, ROAS, CFR
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

// ── Helpers ───────────────────────────────────────────────────────────────
function fmt(val, decimals = 0, prefix = '', suffix = '') {
  if (!val || val === 0) return '—';
  const n = parseFloat(val);
  if (isNaN(n) || n === 0) return '—';
  return prefix + n.toLocaleString('th-TH', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }) + suffix;
}

function buildStatsHTML(m) {
  const metrics = [
    { v: fmt(m.spend,       2, '฿'),   l: 'Spend'       },
    { v: fmt(m.impressions, 0),         l: 'Impressions' },
    { v: fmt(m.clicks,      0),         l: 'Clicks'      },
    { v: fmt(m.ctr,         2, '', '%'),l: 'CTR'         },
    { v: fmt(m.cpm,         2, '฿'),   l: 'CPM'         },
    { v: fmt(m.revenue,     0, '฿'),   l: 'Revenue'     },
    { v: m.roas > 0 ? parseFloat(m.roas).toFixed(2) + 'x' : '—', l: 'ROAS' },
    { v: m.cfr  > 0 ? parseFloat(m.cfr ).toFixed(2) + '%' : '—', l: 'CVR'  },
  ];

  const items = metrics.map(({ v, l }) =>
    `\n          <div class="stat">\n            <div class="sv">${v}</div>\n            <div class="sl">${l}</div>\n          </div>`
  ).join('');

  return `<div class="stats">${items}\n        </div>`;
}

// ── Remove a div by class using depth tracking ────────────────────────────
function removeDivByClass(html, className, fromIdx) {
  const marker = `<div class="${className}">`;
  const start  = html.indexOf(marker, fromIdx);
  if (start === -1) return { html, end: -1 };
  let depth = 0, i = start;
  while (i < html.length) {
    if (html.startsWith('<div', i))  { depth++; i += 4; }
    else if (html.startsWith('</div>', i)) { depth--; i += 6; if (depth === 0) break; }
    else i++;
  }
  return { html: html.slice(0, start) + html.slice(i), end: start };
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const { rows } = await db.query(
    `SELECT
       ad_id, spend, impressions, clicks, revenue, roas, cfr,
       CASE WHEN impressions > 0 THEN ROUND((clicks::numeric / impressions * 100)::numeric, 2) ELSE 0 END AS ctr,
       CASE WHEN impressions > 0 THEN ROUND((spend::numeric  / impressions * 1000)::numeric, 2) ELSE 0 END AS cpm
     FROM ads WHERE ad_id = ANY($1::text[])`,
    [FLAGGED_IDS]
  );
  await db.end();

  const metricsMap = Object.fromEntries(rows.map(r => [r.ad_id, r]));

  let html = await fs.readFile(HTML_PATH, 'utf8');

  // Update stats CSS for 4-column grid
  html = html.replace(
    /\.stats\s*\{[^}]+\}/,
    `.stats { display:grid; grid-template-columns:repeat(4,1fr); gap:5px; margin-bottom:8px; }`
  );

  let patched = 0;
  for (const adId of FLAGGED_IDS) {
    const m = metricsMap[adId];
    if (!m) { console.log(`  ⚠ no metrics for ${adId}`); continue; }

    const imgMarker = `/${adId}.webp"`;
    const imgIdx    = html.indexOf(imgMarker);
    if (imgIdx === -1) { console.log(`  ⚠ no card for ${adId}`); continue; }

    // Remove old stats div
    const { html: cleaned, end } = removeDivByClass(html, 'stats', imgIdx);
    if (end === -1) { console.log(`  ⚠ no .stats found for ${adId}`); continue; }

    // Build new stats and splice in at same position
    const newStats   = buildStatsHTML(m);
    const indentLine = html.slice(Math.max(0, end - 10), end).includes('\n')
      ? '        ' : '';

    html = cleaned.slice(0, end) + indentLine + newStats + cleaned.slice(end);

    patched++;
    console.log(`  ✓ ${adId}  CTR:${m.ctr}%  CPM:฿${m.cpm}  ROAS:${m.roas > 0 ? parseFloat(m.roas).toFixed(2) : '—'}  Rev:${m.revenue > 0 ? '฿'+m.revenue : '—'}`);
  }

  await fs.writeFile(HTML_PATH, html, 'utf8');
  console.log(`\n[patch-metrics] Done — ${patched} cards patched\n`);
}

main().catch(err => {
  console.error('[patch-metrics] FATAL:', err);
  process.exit(1);
});
