/**
 * inject-activity-timeline.mjs  — v3 (clean rebuild)
 *
 * Layout target:
 *   [img] | [adcard-body]
 *             top: name / tags / stats
 *             .adcard-caption-row:
 *               .caption-section  ← flabel + caption-box + expand-btn
 *               .adcard-tl-panel  ← delivery status + timeline (next to caption)
 *             bottom: flag-chips / policy-cats / fix-box
 *
 * Strategy: string indexOf (NOT regex) for HTML nested div handling
 */

import pg from 'pg';
import fs from 'fs/promises';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;
const HTML_PATH = new URL('../reports/meta-policy-flag-report-2026-03.html', import.meta.url).pathname;

const FLAGGED_IDS = [
  '120241264770250708','120233607466740708','120241976055360708',
  '120223286409710708','120241265819190708','120241775379950708',
  '120241971601710708','120241264734910708','120239740735470708',
  '120240164691260708','120241111922030708','120241265694340708',
  '120241774344740708','120241971044400708','120241971591570708',
  '120241973318570708','120241264692120708','120241971578880708',
  '23853483584040707','120213739949360708','120233918913550708',
  '120216068126780708','23853483584020707','120215928645630708',
  '120240383655840708',
];

const SKIP_EVENTS = new Set([
  'update_ad_delivery',
  'update_ad_bid_amount',
]);

const EVENT_LABELS = {
  create_ad:                                   { icon: '✨', label: 'สร้างโฆษณา',        cls: 'tl-create'   },
  update_ad_run_status:                        { icon: '🔄', label: 'เปลี่ยนสถานะ',      cls: 'tl-status'   },
  update_ad_run_status_to_be_set_after_review: { icon: '🔄', label: 'ตั้งสถานะหลังตรวจ', cls: 'tl-status'   },
  update_ad_creative:                          { icon: '🎨', label: 'แก้ไข Creative',    cls: 'tl-creative' },
  update_campaign_budget:                      { icon: '💰', label: 'แก้งบ Campaign',    cls: 'tl-budget'   },
  update_adset_budget:                         { icon: '💰', label: 'แก้งบ Ad Set',      cls: 'tl-budget'   },
  update_adset_targeting:                      { icon: '🎯', label: 'แก้ Targeting',     cls: 'tl-target'   },
  ad_review_approved:                          { icon: '✅', label: 'ผ่านการตรวจ',       cls: 'tl-ok'       },
  ad_review_declined:                          { icon: '❌', label: 'ไม่ผ่านการตรวจ',    cls: 'tl-reject'   },
  first_delivery_event:                        { icon: '🚀', label: 'นำส่งแล้ว',         cls: 'tl-delivery' },
  update_adset_run_status:                     { icon: '🔄', label: 'สถานะ Ad Set',      cls: 'tl-status'   },
  update_campaign_run_status:                  { icon: '🔄', label: 'สถานะ Campaign',    cls: 'tl-status'   },
};

function getLabel(eventType, translatedEventType) {
  if (EVENT_LABELS[eventType]) return EVENT_LABELS[eventType];
  if (translatedEventType) return { icon: '📌', label: translatedEventType, cls: 'tl-other' };
  return { icon: '📌', label: eventType, cls: 'tl-other' };
}

function formatChange(extraData) {
  if (!extraData) return null;
  const d = typeof extraData === 'string' ? JSON.parse(extraData) : extraData;
  if (d.old_value?.type === 'payment_amount' || d.new_value?.type === 'payment_amount') {
    const oldVal = d.old_value?.old_value ?? d.old_value?.new_value;
    const newVal = d.new_value?.new_value;
    if (oldVal && newVal) {
      const suffix = d.new_value?.additional_value ?? '';
      return `฿${(oldVal / 100).toLocaleString()} → ฿${(newVal / 100).toLocaleString()} ${suffix}`.trim();
    }
  }
  if (typeof d.old_value === 'string' && typeof d.new_value === 'string'
      && d.old_value.length < 60 && d.new_value.length < 60) {
    return `${d.old_value} → ${d.new_value}`;
  }
  return null;
}

function toThaiDate(isoStr) {
  if (!isoStr) return null;
  const d   = new Date(isoStr);
  const bkk = new Date(d.getTime() + 7 * 3600 * 1000);
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const day = bkk.getUTCDate().toString().padStart(2, '0');
  const mon = months[bkk.getUTCMonth()];
  const yr  = String(bkk.getUTCFullYear() + 543).slice(-2);
  const hh  = bkk.getUTCHours().toString().padStart(2, '0');
  const mm  = bkk.getUTCMinutes().toString().padStart(2, '0');
  return `${day} ${mon} ${yr}  ${hh}:${mm}`;
}

function convertDbDate(dbDate) {
  if (!dbDate) return null;
  const M = { Jan:'ม.ค.',Feb:'ก.พ.',Mar:'มี.ค.',Apr:'เม.ย.',May:'พ.ค.',Jun:'มิ.ย.',
              Jul:'ก.ค.',Aug:'ส.ค.',Sep:'ก.ย.',Oct:'ต.ค.',Nov:'พ.ย.',Dec:'ธ.ค.' };
  const m = dbDate.match(/^(\d{2}) (\w{3}) (\d{4}) (\d{2}:\d{2})$/);
  if (!m) return dbDate;
  const yr = String(parseInt(m[3]) + 543).slice(-2);
  return `${m[1]} ${M[m[2]] ?? m[2]} ${yr}  ${m[4]}`;
}

// ── Build panel HTML ──────────────────────────────────────────────────────
function buildPanelHTML(deliveryInfo, actRows) {
  const isActive  = deliveryInfo?.is_running_now === true;
  const isPaused  = deliveryInfo?.status === 'PAUSED';
  const statusBg  = isActive ? '#d1fae5' : '#f3f4f6';
  const statusClr = isActive ? '#065f46' : '#6b7280';
  const dot       = isActive ? '🟢' : '⏸';
  const statusTxt = isActive ? 'กำลังนำส่ง' : (isPaused ? 'หยุดชั่วคราว' : 'ไม่ได้ส่ง');
  const firstDel  = convertDbDate(deliveryInfo?.first_delivery_th);
  const lastImp   = convertDbDate(deliveryInfo?.last_impression_th);

  const header = `<div style="background:${statusBg};border-radius:8px;padding:6px 8px;margin-bottom:6px;">
          <div style="font-size:11px;font-weight:700;color:${statusClr};">${dot} ${statusTxt}</div>
          ${firstDel ? `<div style="font-size:9px;color:#6b7280;margin-top:2px;">🚀 เริ่มส่ง: ${firstDel}</div>` : ''}
          ${lastImp  ? `<div style="font-size:9px;color:#6b7280;margin-top:1px;">📊 Impression: ${lastImp}</div>` : ''}
        </div>`;

  if (!actRows.length) {
    return `<div class="adcard-tl-panel">\n        ${header}\n        <div class="tl-no-history">ไม่มีประวัติ</div>\n        </div>`;
  }

  const items = actRows.map(r => {
    const { icon, label, cls } = getLabel(r.event_type, r.translated_event_type);
    const change  = formatChange(r.extra_data);
    const isHuman = r.actor_name && r.actor_name !== 'Meta';
    const actor   = isHuman
      ? `<span class="tl-actor tl-human">👤 ${r.actor_name}</span>`
      : `<span class="tl-actor tl-meta">🤖 Meta</span>`;
    return `<div class="tl-item ${cls}"><div class="tl-dot"></div><div class="tl-content"><div class="tl-head"><span class="tl-icon">${icon}</span><span class="tl-label">${label}</span>${actor}</div><div class="tl-time">${toThaiDate(r.event_time)}</div>${change ? `<div class="tl-change">${change}</div>` : ''}</div></div>`;
  }).join('\n        ');

  return `<div class="adcard-tl-panel">\n        ${header}<div class="tl-title">📋 ประวัติ (${actRows.length} รายการ)</div>\n        <div class="tl-list">\n        ${items}\n        </div>\n        </div>`;
}

// ── Remove all tl-* divs from HTML using depth tracking ───────────────────
function removeAllTimelineMarkup(html) {
  const TL_CLASSES = [
    'adcard-tl-panel',
    'tl-wrap',
    'tl-list',
    'tl-item tl-',     // matches any tl-item variant
  ];

  for (const cls of TL_CLASSES) {
    const marker = `<div class="${cls}`;
    let result = html;
    let start;
    let safety = 0;
    while ((start = result.indexOf(marker)) !== -1 && safety++ < 500) {
      // Find matching closing div using depth counter
      let depth = 0;
      let i = start;
      while (i < result.length) {
        if (result.startsWith('<div', i)) { depth++; i += 4; }
        else if (result.startsWith('</div>', i)) {
          depth--;
          i += 6;
          if (depth === 0) break;
        } else { i++; }
      }
      // Trim leading/trailing whitespace around the removed block
      let trimStart = start;
      while (trimStart > 0 && result[trimStart - 1] === ' ') trimStart--;
      if (trimStart > 0 && result[trimStart - 1] === '\n') trimStart--;
      result = result.slice(0, trimStart) + result.slice(i);
    }
    html = result;
  }

  // Remove orphaned tl-title divs
  html = html.replace(/<div class="tl-title">.*?<\/div>\s*/g, '');
  html = html.replace(/<div class="tl-no-history">.*?<\/div>\s*/g, '');

  return html;
}

// ── Remove JS restructure block (no longer needed) ────────────────────────
function removeJsRestructure(html) {
  const marker = '    // Restructure: move caption + timeline into side-by-side row';
  const end    = '    // Inject owner badge under every ad name';
  const s = html.indexOf(marker);
  const e = html.indexOf(end);
  if (s !== -1 && e !== -1 && e > s) {
    html = html.slice(0, s) + '    ' + html.slice(e);
  }
  return html;
}

// ── Inject caption row for one card ──────────────────────────────────────
function injectCaptionRow(html, adId, panelHtml) {
  const imgMarker = `/${adId}.webp"`;
  const imgIdx = html.indexOf(imgMarker);
  if (imgIdx === -1) return { html, ok: false };

  // Find caption flabel start (after img, within this card)
  const captionFlabelMarker = '<div class="flabel">Caption';
  const captionStart = html.indexOf(captionFlabelMarker, imgIdx);
  if (captionStart === -1) return { html, ok: false };

  // Find end of caption section = first of these markers after captionStart:
  const candidates = [
    '<div class="flag-chips"',
    '<div class="flabel">Keyword',
    '<div class="flabel">KEYWORD',
    '<div class="policy-cats"',
    '<div class="fix-box"',
  ].map(m => html.indexOf(m, captionStart)).filter(x => x > captionStart);

  if (!candidates.length) return { html, ok: false };
  const captionEnd = Math.min(...candidates);

  const captionContent = html.slice(captionStart, captionEnd).trimEnd();
  const indent = '        ';

  const rowHtml =
    `${indent}<div class="adcard-caption-row">\n` +
    `${indent}  <div class="caption-section">\n` +
    `${indent}  ${captionContent}\n` +
    `${indent}  </div>\n` +
    `${indent}  ${panelHtml}\n` +
    `${indent}</div>\n` +
    `${indent}`;

  return {
    html: html.slice(0, captionStart) + rowHtml + html.slice(captionEnd),
    ok: true,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const { rows: actRows } = await db.query(
    `SELECT ad_id, event_type, translated_event_type, actor_name, event_time, extra_data
     FROM ad_activities
     WHERE ad_id = ANY($1::text[]) AND event_type <> ALL($2::text[])
     ORDER BY ad_id, event_time ASC`,
    [FLAGGED_IDS, [...SKIP_EVENTS]]
  );

  const { rows: statusRows } = await db.query(
    `SELECT a.ad_id, a.status, als.is_running_now,
            to_char(als.last_impression_time AT TIME ZONE 'Asia/Bangkok', 'DD Mon YYYY HH24:MI') AS last_impression_th,
            (SELECT to_char(MIN(aa.event_time) AT TIME ZONE 'Asia/Bangkok', 'DD Mon YYYY HH24:MI')
             FROM ad_activities aa WHERE aa.ad_id = a.ad_id AND aa.event_type = 'first_delivery_event') AS first_delivery_th
     FROM ads a LEFT JOIN ad_live_status als ON als.ad_id = a.id
     WHERE a.ad_id = ANY($1::text[])`,
    [FLAGGED_IDS]
  );

  await db.end();

  const byAd = {};
  for (const r of actRows) {
    if (!byAd[r.ad_id]) byAd[r.ad_id] = [];
    byAd[r.ad_id].push(r);
  }
  const statusMap = Object.fromEntries(statusRows.map(s => [s.ad_id, s]));

  let html = await fs.readFile(HTML_PATH, 'utf8');

  // Step 1 — remove ALL timeline markup cleanly
  html = removeAllTimelineMarkup(html);
  console.log('[inject] cleaned all timeline markup');

  // Step 2 — remove old JS restructure block
  html = removeJsRestructure(html);
  console.log('[inject] removed JS restructure block');

  // Step 3 — update CSS (remove old tl-panel, add fresh)
  html = html.replace(/\/\* ── Timeline Right Panel ──[\s\S]*?\.tl-change\s*\{[^}]*\}\s*/, '');

  const newCss = `
    /* ── Timeline Panel (next to caption) ── */
    .adcard-caption-row { display:flex; gap:0; align-items:flex-start; margin-top:6px; }
    .caption-section { flex:1; min-width:0; }
    .adcard-tl-panel {
      width:195px; min-width:195px; flex-shrink:0;
      border-left:1px solid #e5e5ea; padding:0 0 0 10px;
      display:flex; flex-direction:column;
      overflow-y:auto; max-height:340px;
    }
    .tl-title { font-size:10px; font-weight:700; letter-spacing:.5px; text-transform:uppercase; color:#8e8e93; margin-bottom:5px; }
    .tl-list { position:relative; padding-left:13px; }
    .tl-list::before { content:''; position:absolute; left:4px; top:0; bottom:0; width:2px; background:#e5e5ea; border-radius:1px; }
    .tl-item { position:relative; margin-bottom:6px; }
    .tl-dot { position:absolute; left:-11px; top:3px; width:7px; height:7px; border-radius:50%; background:#c7c7cc; border:2px solid white; }
    .tl-create .tl-dot   { background:#34c759; }
    .tl-status .tl-dot   { background:#007aff; }
    .tl-creative .tl-dot { background:#ff9500; }
    .tl-budget .tl-dot   { background:#5856d6; }
    .tl-target .tl-dot   { background:#32ade6; }
    .tl-ok .tl-dot       { background:#30d158; }
    .tl-reject .tl-dot   { background:#ff3b30; }
    .tl-delivery .tl-dot { background:#ff6b00; }
    .tl-content { background:#f2f2f7; border-radius:6px; padding:4px 6px; }
    .tl-head { display:flex; flex-wrap:wrap; align-items:center; gap:3px; }
    .tl-icon { font-size:10px; }
    .tl-label { font-size:10px; font-weight:600; color:#1c1c1e; flex:1; min-width:0; }
    .tl-actor { font-size:9px; font-weight:700; padding:1px 5px; border-radius:10px; white-space:nowrap; }
    .tl-human { background:#e8f4ff; color:#0070c9; }
    .tl-meta  { background:#f0f0f5; color:#8e8e93; }
    .tl-time  { font-size:9px; color:#aeaeb2; margin-top:2px; }
    .tl-change { font-size:9px; color:#636366; margin-top:2px; }`;

  html = html.replace('</style>', newCss + '\n  </style>');

  // Step 4 — inject each card
  let injected = 0;
  for (const adId of FLAGGED_IDS) {
    const rows    = byAd[adId] ?? [];
    const delInfo = statusMap[adId] ?? null;
    if (!rows.length && !delInfo) continue;

    const panelHtml = buildPanelHTML(delInfo, rows);
    const result = injectCaptionRow(html, adId, panelHtml);

    if (result.ok) {
      html = result.html;
      injected++;
      const status = delInfo?.is_running_now ? '🟢 ACTIVE' : `⏸ ${delInfo?.status ?? '?'}`;
      console.log(`  ✓ ${adId}  ${status}  (${rows.length} events)`);
    } else {
      console.log(`  ⚠ no card found for ${adId}`);
    }
  }

  await fs.writeFile(HTML_PATH, html, 'utf8');
  console.log(`\n[inject] Done — ${injected} cards updated\n`);
}

main().catch(err => {
  console.error('[inject] FATAL:', err);
  process.exit(1);
});
