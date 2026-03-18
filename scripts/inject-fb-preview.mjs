/**
 * inject-fb-preview.mjs
 * Replaces .caption-section in each flagged ad card with a
 * 300×300px Facebook Ad creative payload preview box.
 *
 * Shows: page header, full body text (scrollable), creative metadata, CTA button.
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

const CTA_LABEL = {
  MESSAGE_PAGE:   'ส่งข้อความ',
  LEARN_MORE:     'ดูเพิ่มเติม',
  SHOP_NOW:       'ช้อปเลย',
  SIGN_UP:        'สมัครเลย',
  CONTACT_US:     'ติดต่อเรา',
  BOOK_TRAVEL:    'จองเลย',
  SUBSCRIBE:      'ติดตาม',
  WATCH_MORE:     'ดูเพิ่ม',
};

// ── Build the Facebook Ad Preview HTML ──────────────────────────────────────
function buildFbPreview(adId, creative) {
  const body      = (creative.body ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ctaRaw    = creative.call_to_action ?? 'MESSAGE_PAGE';
  const ctaLabel  = CTA_LABEL[ctaRaw] ?? ctaRaw;
  const creativeId = creative.creative_id ?? '—';
  const hasVideo  = !!creative.video_url;
  const mediaType = hasVideo ? '🎬 Video' : '🖼 Image';

  return `<div class="fb-preview-box">
  <div class="fb-ph">
    <div class="fb-pa">V</div>
    <div class="fb-pi">
      <div class="fb-pn">The V School</div>
      <div class="fb-sp">ได้รับการสนับสนุน · <span class="fb-globe">🌐</span></div>
    </div>
    <div class="fb-badge">${mediaType}</div>
  </div>
  <div class="fb-pb">${body}</div>
  <div class="fb-pf">
    <div class="fb-pfinfo">
      <div class="fb-pfrow"><span class="fb-lbl">Ad ID</span><span class="fb-val">${adId}</span></div>
      <div class="fb-pfrow"><span class="fb-lbl">Creative</span><span class="fb-val">${creativeId}</span></div>
      <div class="fb-pfrow"><span class="fb-lbl">CTA</span><span class="fb-val">${ctaRaw}</span></div>
    </div>
    <button class="fb-pfbtn">${ctaLabel}</button>
  </div>
</div>`;
}

// ── Remove existing fb-preview-box via depth tracking ──────────────────────
function removeFbPreview(html, fromIdx) {
  const marker = '<div class="fb-preview-box">';
  const start  = html.indexOf(marker, fromIdx);
  if (start === -1) return html;
  let depth = 0, i = start;
  while (i < html.length) {
    if (html.startsWith('<div', i))   { depth++; i += 4; }
    else if (html.startsWith('</div>', i)) { depth--; i += 6; if (depth === 0) break; }
    else i++;
  }
  return html.slice(0, start) + html.slice(i);
}

// ── Replace caption-section with fb-preview-box ─────────────────────────────
function replaceCaptionSection(html, adId, previewHtml) {
  const imgMarker = `/${adId}.webp"`;
  const imgIdx    = html.indexOf(imgMarker);
  if (imgIdx === -1) return { html, ok: false, reason: 'no card img' };

  const csMarker = '<div class="caption-section">';
  const csStart  = html.indexOf(csMarker, imgIdx);
  if (csStart === -1) return { html, ok: false, reason: 'no caption-section' };

  // Depth-track to find closing </div> of caption-section
  let depth = 0, i = csStart;
  while (i < html.length) {
    if (html.startsWith('<div', i))   { depth++; i += 4; }
    else if (html.startsWith('</div>', i)) { depth--; i += 6; if (depth === 0) break; }
    else i++;
  }

  const newHtml = html.slice(0, csStart) + previewHtml + html.slice(i);
  return { html: newHtml, ok: true };
}

// ── Inject CSS block if not already present ─────────────────────────────────
function injectCSS(html) {
  if (html.includes('.fb-preview-box')) return html; // already injected

  const css = `
    /* ── Facebook Ad Creative Preview Box ── */
    .fb-preview-box {
      width: 300px;
      height: 300px;
      border: 1px solid #dddfe2;
      border-radius: 8px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      background: #fff;
      flex-shrink: 0;
      box-shadow: 0 1px 3px rgba(0,0,0,.1);
    }
    .fb-ph {
      display: flex;
      align-items: center;
      padding: 10px 12px 6px;
      gap: 8px;
      border-bottom: 1px solid #f0f2f5;
      flex-shrink: 0;
    }
    .fb-pa {
      width: 34px; height: 34px;
      border-radius: 50%;
      background: linear-gradient(135deg, #1a1a2e, #0f3460);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 14px; font-weight: 800;
      flex-shrink: 0;
    }
    .fb-pi { flex: 1; min-width: 0; }
    .fb-pn { font-weight: 700; font-size: 12px; color: #050505; line-height: 1.3; }
    .fb-sp { font-size: 10px; color: #65676b; }
    .fb-badge {
      font-size: 9px; font-weight: 600;
      background: #e7f3ff; color: #1877f2;
      padding: 2px 6px; border-radius: 10px;
      flex-shrink: 0;
    }
    .fb-pb {
      padding: 8px 12px 6px;
      font-size: 11.5px; line-height: 1.6; color: #1c1c1e;
      overflow-y: auto;
      flex: 1;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .fb-pf {
      border-top: 1px solid #e4e6ea;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #f0f2f5;
      flex-shrink: 0;
      gap: 6px;
    }
    .fb-pfinfo { flex: 1; min-width: 0; }
    .fb-pfrow {
      display: flex; gap: 4px;
      font-size: 9px; line-height: 1.5;
      overflow: hidden;
    }
    .fb-lbl { color: #8a8d91; flex-shrink: 0; }
    .fb-val {
      color: #444; font-family: monospace;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .fb-pfbtn {
      background: #e4e6eb;
      border: 1px solid #ccd0d5;
      border-radius: 6px;
      padding: 6px 12px;
      font-size: 11px; font-weight: 700; color: #050505;
      white-space: nowrap;
      cursor: default;
      flex-shrink: 0;
    }

    /* ── Responsive: stack on narrow screens ── */
    @media (max-width: 580px) {
      .adcard { flex-direction: column !important; }
      .adcard-img-wrap {
        width: 100% !important; min-width: 0 !important;
        height: 220px;
        border-right: none !important;
        border-bottom: 1px solid #ececf2;
      }
      .adcard-img { height: 220px; object-fit: cover; }
      .adcard-caption-row { flex-direction: column !important; }
      .fb-preview-box { width: 100% !important; max-width: 100%; }
      .adcard-tl-panel {
        width: 100% !important; min-width: 0 !important;
        border-left: none !important;
        border-top: 1px solid #e5e5ea;
        padding: 8px 0 0 !important;
        max-height: 180px !important;
      }
    }
`;

  return html.replace('</style>', css + '\n  </style>');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const { rows } = await db.query(
    `SELECT a.ad_id, c.creative_id, c.body, c.headline,
            c.call_to_action, c.image_url, c.video_url
     FROM ads a LEFT JOIN ad_creatives c ON a.creative_id = c.id
     WHERE a.ad_id = ANY($1::text[])`,
    [FLAGGED_IDS]
  );
  await db.end();

  const dataMap = Object.fromEntries(rows.map(r => [r.ad_id, r]));

  let html = await fs.readFile(HTML_PATH, 'utf8');

  // Inject CSS
  html = injectCSS(html);
  console.log('[inject-fb-preview] CSS injected');

  let patched = 0;
  for (const adId of FLAGGED_IDS) {
    const creative = dataMap[adId];
    if (!creative) { console.log(`  ⚠ no creative for ${adId}`); continue; }
    if (!creative.body) { console.log(`  ⚠ empty body for ${adId}`); continue; }

    // Remove any previous preview box first (idempotent)
    const imgMarker = `/${adId}.webp"`;
    const imgIdx    = html.indexOf(imgMarker);
    if (imgIdx !== -1) html = removeFbPreview(html, imgIdx);

    const previewHtml = buildFbPreview(adId, creative);
    const { html: updated, ok, reason } = replaceCaptionSection(html, adId, previewHtml);

    if (!ok) {
      console.log(`  ⚠ ${adId} — ${reason}`);
      continue;
    }

    html = updated;
    patched++;
    const bodyPreview = (creative.body ?? '').slice(0, 50).replace(/\n/g, ' ');
    console.log(`  ✓ ${adId}  "${bodyPreview}…"`);
  }

  await fs.writeFile(HTML_PATH, html, 'utf8');
  console.log(`\n[inject-fb-preview] Done — ${patched}/${FLAGGED_IDS.length} cards patched\n`);
}

main().catch(err => {
  console.error('[inject-fb-preview] FATAL:', err);
  process.exit(1);
});
