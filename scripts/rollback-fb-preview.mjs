/**
 * rollback-fb-preview.mjs
 * Reverts inject-fb-preview.mjs changes:
 *   fb-preview-box → caption-section (flabel + caption-box with real caption text)
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

// ── Depth-track removal ──────────────────────────────────────────────────────
function removeDiv(html, marker, fromIdx = 0) {
  const start = html.indexOf(marker, fromIdx);
  if (start === -1) return { html, removed: false };
  let depth = 0, i = start;
  while (i < html.length) {
    if (html.startsWith('<div', i))       { depth++; i += 4; }
    else if (html.startsWith('</div>', i)) { depth--; i += 6; if (depth === 0) break; }
    else i++;
  }
  return { html: html.slice(0, start) + html.slice(i), removed: true };
}

// ── Build caption-section HTML ───────────────────────────────────────────────
function buildCaptionSection(body) {
  const safe = (body ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<div class="caption-section">
          <div class="flabel">Caption</div>
          <div class="caption-box">${safe}</div>
        </div>`;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const { rows } = await db.query(
    `SELECT a.ad_id, c.body
     FROM ads a LEFT JOIN ad_creatives c ON a.creative_id = c.id
     WHERE a.ad_id = ANY($1::text[])`,
    [FLAGGED_IDS]
  );
  await db.end();

  const dataMap = Object.fromEntries(rows.map(r => [r.ad_id, r]));

  let html = await fs.readFile(HTML_PATH, 'utf8');

  let patched = 0;
  for (const adId of FLAGGED_IDS) {
    const imgMarker = `/${adId}.webp"`;
    const imgIdx = html.indexOf(imgMarker);
    if (imgIdx === -1) { console.log(`  ⚠ no card img for ${adId}`); continue; }

    // Find fb-preview-box after this card's image
    const fbMarker = '<div class="fb-preview-box">';
    const fbIdx = html.indexOf(fbMarker, imgIdx);
    if (fbIdx === -1) { console.log(`  – ${adId} already rolled back`); continue; }

    // Verify it's in the same card (not a later card's)
    const nextCard = html.indexOf('class="adcard"', imgIdx + 10);
    if (nextCard !== -1 && fbIdx > nextCard) {
      console.log(`  – ${adId} fb-preview not in this card`);
      continue;
    }

    const creative = dataMap[adId];
    if (!creative?.body) { console.log(`  ⚠ no body for ${adId}`); continue; }

    // Remove fb-preview-box
    const { html: cleaned } = removeDiv(html, fbMarker, imgIdx);
    html = cleaned;

    // Re-find image after removal
    const imgIdx2 = html.indexOf(imgMarker);
    const captionRowMarker = '<div class="adcard-caption-row">';
    const crIdx = html.indexOf(captionRowMarker, imgIdx2);
    if (crIdx === -1) { console.log(`  ⚠ no adcard-caption-row for ${adId}`); continue; }

    // Insert caption-section right after adcard-caption-row opening tag
    const insertAt = crIdx + captionRowMarker.length;
    const captionHtml = '\n          ' + buildCaptionSection(creative.body);
    html = html.slice(0, insertAt) + captionHtml + html.slice(insertAt);

    patched++;
    const preview = (creative.body ?? '').slice(0, 60).replace(/\n/g, ' ');
    console.log(`  ✓ ${adId} — "${preview}…"`);
  }

  // Fix caption-box CSS: ensure it uses transparent background inside caption-row
  if (!html.includes('.adcard-caption-row .caption-box { background: transparent')) {
    const captionBoxOverride = `
    /* ── Caption inside caption-row: no box background ── */
    .adcard-caption-row .caption-box {
      background: transparent;
      border-radius: 0;
      border-left: 2px solid #c0c0d0;
      padding: 4px 8px;
      max-height: 280px;
    }`;
    html = html.replace('.adcard-caption-row .caption-box {', '/* override below */\n    .adcard-caption-row .caption-box-old {');
    html = html.replace('</style>', captionBoxOverride + '\n  </style>');
    console.log('  ✓ Injected caption-box override CSS');
  }

  await fs.writeFile(HTML_PATH, html, 'utf8');
  console.log(`\n[rollback-fb-preview] Done — ${patched}/${FLAGGED_IDS.length} cards restored\n`);
}

main().catch(err => {
  console.error('[rollback-fb-preview] FATAL:', err);
  process.exit(1);
});
