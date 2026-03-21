/**
 * sync_agents_v6.js  (deep-scroll: more scroll patience + longer wait)
 */

import playwright from 'playwright';
import fs from 'fs';

const CDP_URL       = 'http://localhost:9222';
const API_URL       = 'http://localhost:3000/api/marketing/chat/message-sender';
const DELAY_CLICK   = 3500;
const DELAY_SCROLL  = 1200;
const DELAY_BETWEEN = 200;
const LOG_FILE      = '/Users/ideab/Desktop/crm/automation/v6_results.jsonl';
const CONV_ROW_SEL  = 'div[role="presentation"].x1ypdohk';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log   = msg => process.stdout.write(msg + '\n');

async function getPage(browser) {
  for (const ctx of browser.contexts()) {
    for (const page of ctx.pages()) {
      if (page.url().includes('business.facebook.com')) return page;
    }
  }
  throw new Error('No business.facebook.com page found.');
}

async function scrollSidebarToTop(page) {
  await page.evaluate((sel) => {
    const row = document.querySelector(sel);
    if (!row) return;
    let el = row.parentElement;
    for (let i = 0; i < 15; i++) {
      if (!el) break;
      if (el.scrollHeight > el.clientHeight + 50) { el.scrollTop = 0; return; }
      el = el.parentElement;
    }
  }, CONV_ROW_SEL);
  await sleep(2000);
}

async function extractSenders(page) {
  return page.evaluate(() => {
    const pairs = [];
    const links = document.querySelectorAll('a.uiLinkSubtle[data-hovercard]');
    for (const link of links) {
      const spanText = link.parentElement?.textContent || '';
      if (!spanText.includes('ส่งโดย') && !spanText.includes('Sent by')) continue;
      const name = link.textContent.trim();
      if (!name) continue;
      let container = link.parentElement;
      let msgText = '';
      for (let i = 0; i < 8; i++) {
        container = container?.parentElement;
        if (!container) break;
        const rect = container.getBoundingClientRect();
        if (rect.width > 100) {
          const texts = [];
          const walk = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
          while (walk.nextNode()) {
            const t = walk.currentNode.textContent?.trim();
            if (t && t.length > 3 && !t.includes('ส่งโดย') && !t.includes('Sent by') && t !== name)
              texts.push(t);
          }
          if (texts.length > 0) { msgText = texts[0]; break; }
        }
      }
      pairs.push({ name, msgText });
    }
    return pairs;
  });
}

async function scrollChatUp(page) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('[style*="overflow"]')) {
      const r = el.getBoundingClientRect();
      if (r.x > 520 && r.width > 300 && r.height > 200) { el.scrollTop = 0; return; }
    }
    for (const el of document.querySelectorAll('div')) {
      const r = el.getBoundingClientRect();
      if (r.x > 520 && r.width > 300 && r.height > 300 && el.scrollHeight > el.clientHeight + 100) {
        el.scrollTop = 0; return;
      }
    }
  });
  await sleep(1200);
}

/** Scroll sidebar down with longer wait to let FB lazy-load more rows */
async function scrollSidebarDown(page) {
  await page.evaluate((sel) => {
    const row = document.querySelector(sel);
    if (!row) return;
    let el = row.parentElement;
    for (let i = 0; i < 10; i++) {
      if (!el) break;
      if (el.scrollHeight > el.clientHeight + 50) { el.scrollTop += 600; return; }
      el = el.parentElement;
    }
  }, CONV_ROW_SEL);
  await sleep(2000);  // increased from 1000 to let FB load more conversations
}

async function postAttribution(conversationId, senders) {
  if (!senders.length) return { skipped: true };
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        senders: senders.map(s => ({ name: s.name, msgText: s.msgText || undefined }))
      })
    });
    return { status: res.status, ...(await res.json()) };
  } catch (e) {
    return { error: e.message };
  }
}

async function loadConvMap() {
  const map   = new Map();
  const names = [];
  try {
    const res   = await fetch('http://localhost:3000/api/conversations?from=2026-01-01&to=2026-03-31&limit=9999');
    const json  = await res.json();
    const convs = json.conversations || [];
    for (const c of convs) {
      if (c.conversationId) {
        map.set(c.conversationId, c.conversationId);
        map.set(c.conversationId.replace(/^t_/, ''), c.conversationId);
      }
      if (c.participantId) map.set(c.participantId, c.conversationId);
      if (c.participantName) {
        const key = c.participantName.toLowerCase().trim();
        map.set(key, c.conversationId);
        names.push(key);
      }
    }
    names.sort((a, b) => b.length - a.length);
    log(`📚 Loaded ${convs.length} convs → ${map.size} keys`);
  } catch (e) {
    log(`⚠️ Failed to load conv map: ${e.message}`);
  }
  return { map, names };
}

function extractCustomerName(rowText) {
  const idx = rowText.indexOf('คุณ:');
  if (idx > 0) return rowText.substring(0, idx).trim();
  return rowText.substring(0, 40).trim();
}

function resolveConvId(rawName, map, names) {
  const name = rawName.toLowerCase().trim();
  const exact = map.get(name);
  if (exact) return exact;
  for (const n of names) {
    if (name.startsWith(n)) return map.get(n);
  }
  return null;
}

// Load convIds already successfully processed in previous runs
function loadDoneConvIds() {
  const done = new Set();
  if (!fs.existsSync(LOG_FILE)) return done;
  const lines = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n');
  for (const line of lines) {
    try {
      const row = JSON.parse(line);
      if (row.convId) done.add(row.convId);
    } catch (_) {}
  }
  return done;
}

async function main() {
  log('🚀 sync_agents_v6 (deep-scroll) starting...');
  const browser = await playwright.chromium.connectOverCDP(CDP_URL);
  const page    = await getPage(browser);
  log(`✅ Connected: ${page.url().substring(0, 70)}`);

  const { map: convMap, names: convNames } = await loadConvMap();

  // Skip convIds already attributed in previous runs
  const doneConvIds = loadDoneConvIds();
  log(`⏭️  ${doneConvIds.size} convIds already processed (will skip)`);

  log('⏫ Scrolling sidebar to top...');
  await scrollSidebarToTop(page);

  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
  let found = 0, skipped = 0, skippedNotDB = 0, skippedDone = 0, noReply = 0;

  const processed = new Set();
  let noNewCount  = 0;
  let globalIdx   = 0;

  while (noNewCount < 15) {  // ← increased from 5 to 15 for deeper scroll
    const visibleRows = await page.evaluate((sel) => {
      const rows = document.querySelectorAll(sel);
      const result = [];
      rows.forEach((r, i) => {
        const rect = r.getBoundingClientRect();
        if (rect.y < 370 || rect.height < 60) return;
        const nameEl = r.querySelector('.x78zum5.x1q0g3np');
        const text   = nameEl?.textContent?.trim().substring(0, 70) || '';
        if (text) result.push({ idx: i, text, y: Math.round(rect.y) });
      });
      return result;
    }, CONV_ROW_SEL);

    const newRows = visibleRows.filter(r => !processed.has(r.text) && r.text);

    if (newRows.length === 0) {
      await scrollSidebarDown(page);
      noNewCount++;
      if (noNewCount % 3 === 0) log(`⚠️ No new rows (${noNewCount}/15) — scrolling deeper...`);
      continue;
    }
    noNewCount = 0;

    for (const row of newRows) {
      processed.add(row.text);
      globalIdx++;

      const customerName = extractCustomerName(row.text);
      const convId       = resolveConvId(customerName, convMap, convNames);

      if (!convId) {
        skippedNotDB++;
        // Only log every 10th skip to keep output clean
        if (skippedNotDB % 10 === 0) log(`  [skip×${skippedNotDB}] not in Jan-Mar 2026 DB`);
        continue;
      }

      // Skip if already attributed in a previous run
      if (doneConvIds.has(convId)) {
        skippedDone++;
        if (skippedDone % 20 === 0) log(`  [done×${skippedDone}] already attributed, skipping`);
        continue;
      }

      await page.evaluate(({ idx, sel }) => {
        const rows = document.querySelectorAll(sel);
        if (idx < rows.length) rows[idx].click();
      }, { idx: row.idx, sel: CONV_ROW_SEL });

      await sleep(DELAY_CLICK);
      await scrollChatUp(page);
      await sleep(DELAY_SCROLL);

      const senders = await extractSenders(page);

      if (!senders.length) {
        noReply++;
        await sleep(DELAY_BETWEEN);
        continue;
      }

      const result  = await postAttribution(convId, senders);
      const names   = [...new Set(senders.map(s => s.name))].join(', ');
      const idLabel = convId.substring(0, 24);
      log(`  [${globalIdx}] ${customerName.substring(0,28)} → ${names} (${senders.length}) | ${idLabel} → updated:${result.updated ?? result.error}`);

      logStream.write(JSON.stringify({ i: globalIdx, customerName, convId, senders, result }) + '\n');
      found++;
      await sleep(DELAY_BETWEEN);
    }

    await scrollSidebarDown(page);
  }

  logStream.end();
  log(`\n✅ Done`);
  log(`  Attributed: ${found}`);
  log(`  No human reply: ${noReply}`);
  log(`  Already done (skipped): ${skippedDone}`);
  log(`  Not in Jan-Mar 2026 DB: ${skippedNotDB}`);
  await browser.close();
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
