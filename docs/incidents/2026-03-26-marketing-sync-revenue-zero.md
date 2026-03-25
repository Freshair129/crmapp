# Incident Report: Marketing Sync Revenue = 0 & Cascading Failures (2026-03-26)

**Ref ID:** `INC-20260326-MKTREV`
**Severity:** HIGH — ADS REVENUE แสดง 0 บน Executive Dashboard ตลอด + sync timeout ทุก run
**Discovered by:** Claude (Lead Architect) — bottom-up verification vs DB vs FB Graph API
**Resolved:** 2026-03-26, commits `176afca` `b22e7df` `3ae2d8c` `b81c84b` `69c7c56`

---

## What Happened

Executive Dashboard แสดง ADS REVENUE = 0 ทุกวัน แม้มีการซื้อขายจริงจาก Meta Ads
`/api/marketing/backfill` ที่ควรแก้ข้อมูลย้อนหลังก็ fail ด้วย FK constraint ทุกครั้ง
`/api/marketing/sync` timeout ก่อนเสร็จ ทำให้ `ads` table ค้างที่ Mar 17 ตลอด

---

## Timeline

| เวลา | เหตุการณ์ |
|------|----------|
| Mar 17 | sync ครั้งสุดท้ายที่สำเร็จ — `ads` table last updated |
| Mar 17+ | FB สร้าง ads ใหม่ แต่ไม่เคย sync เข้า DB เพราะ sync timeout |
| Mar 26 | พบ ADS REVENUE = 0 จาก bottom-up verification |
| Mar 26 | Trace root cause → แก้ 6 bugs → deploy |

---

## Root Causes (6 bugs ใน 4 ไฟล์)

### BUG-1: `isPurchase` filter แคบเกินไป (Critical — ต้นเหตุหลัก)
**ไฟล์:** `sync/route.js`, `backfill/route.js`, `sync-daily/route.js`, `sync-hourly/route.js`

```js
// Before (ผิด) — ครอบคลุมแค่ 2 action types
const dRevenue = (day.action_values || [])
    .filter(a => ['purchase', 'onsite_conversion.purchase'].includes(a.action_type))

// After (ถูก) — FB ส่งมา 7 types
const isPurchase = t => [
    'purchase', 'onsite_conversion.purchase',
    'omni_purchase', 'onsite_app_purchase', 'onsite_web_purchase',
    'onsite_web_app_purchase', 'offsite_conversion.fb_pixel_purchase',
].includes(t);
```

**ผลกระทบ:** `action_values` ที่มี `action_type: 'omni_purchase'` (ซึ่ง FB ส่งเป็นหลัก) ถูก filter ทิ้งทั้งหมด → revenue = 0 ทุก row

---

### BUG-2: `reach` ไม่ถูก initialize (Critical — ทำให้ทุก insight batch fail)
**ไฟล์:** `sync/route.js` line 180

```js
// Before (ผิด) — reach หาย → ReferenceError ใน strict mode ESM
let spend = 0, impressions = 0, clicks = 0, revenue = 0;

// After (ถูก)
let spend = 0, impressions = 0, clicks = 0, reach = 0, revenue = 0;
```

**ผลกระทบ:** `reach += dReach` ใน for-loop โยน `ReferenceError` ทุก iteration → caught โดย outer try/catch → `insightErrors += chunk.length` → ทุก batch ถูกนับเป็น error โดยไม่มีข้อมูลบันทึกเลย

---

### BUG-3: Creative image upload sequential (High — ต้นเหตุ timeout)
**ไฟล์:** `sync/route.js` lines 131-151

```js
// Before (ผิด) — await ทีละ creative
for (const [cid, creative] of creativeMap_raw) {
    storageUrl = await uploadAdImage(imageSrc, adId, { fullQuality: true }); // ← blocking
    await marketingRepo.upsertAdCreative(cid, { ... });
}

// After (ถูก) — parallel 10 ต่อ chunk
for (let ci = 0; ci < creativeEntries.length; ci += CREATIVE_CHUNK) {
    await Promise.allSettled(creativeEntries.slice(ci, ci + CREATIVE_CHUNK).map(async ([cid, creative]) => {
        ...
    }));
}
```

**ผลกระทบ:** ~500 unique creatives × 1-2s ต่อรูป (download FB + upload Supabase) = 500-1000s sequential → timeout ก่อนถึง insight sync เลย

---

### BUG-4: `Promise.all` ใน backfill ไม่ tolerant FK violations (High)
**ไฟล์:** `backfill/route.js`

```js
// Before (ผิด) — fail fast ถ้า 1 row มี FK error
await Promise.all(mainRows.slice(i, i + CHUNK).map(row => ...));

// After (ถูก) — skip FK errors, update ที่เหลือต่อ
const settled = await Promise.allSettled(mainRows.slice(i, i + CHUNK).map(row => ...));
mainSkipped += settled.filter(r => r.status === 'rejected').length;
```

**ผลกระทบ:** FB ส่ง metrics ของ ads ใหม่ (หลัง Mar 17) ที่ไม่มีใน `ads` table → FK constraint fail → `Promise.all` throw → ทั้ง 30-day window ถูก catch เป็น error → `mainRows: 0` ทุกครั้ง

---

### BUG-5: `getMarketingInsights` คืน `impressions` แทน `reach` (Medium)
**ไฟล์:** `marketingRepo.js` lines 440-443, 492

```js
// Before (ผิด) — query ไม่ดึง reach, ใช้ impressions แทน
_sum: { spend: true, impressions: true, clicks: true, revenue: true, leads: true }
...
reach: metrics._sum.impressions || 0,  // ← ผิดทั้งคู่

// After (ถูก)
_sum: { spend: true, impressions: true, clicks: true, reach: true, revenue: true, leads: true }
...
reach: metrics._sum.reach || 0,
```

**ผลกระทบ:** Marketing Insights page แสดง reach = impressions เสมอ (ค่า inflated 10-20x จาก reach จริง)

---

### BUG-6: `bulkUpsertDailyMetrics` update หลุด fields (Medium)
**ไฟล์:** `marketingRepo.js` lines 257-275

```js
// Before (ผิด) — update เฉพาะ 8 core fields
data: { spend, impressions, clicks, reach, revenue, leads, purchases, roas }

// After (ถูก) — update ครบ 20 fields รวม cpm, cpc, frequency, ranking, videoP25-100
data: { spend, impressions, clicks, reach, revenue, leads, purchases, roas,
        cpm, cpc, frequency, costPerLead, costPerPurchase,
        qualityRanking, engagementRateRanking, conversionRateRanking,
        videoP25, videoP50, videoP75, videoP100 }
```

**ผลกระทบ:** Re-sync ไม่ refresh extended metrics — ad quality rankings และ video completion rates ค้างที่ค่าแรกที่ sync ได้ตลอดไป

---

### BUG-7 (Bonus): N+1 query ใน AdSet sync loop (Low)
**ไฟล์:** `sync/route.js` + `marketingRepo.js`

```js
// Before (ผิด) — 1 DB query per adSet
for (const s of fbAdSets) {
    const campaign = await marketingRepo.getCampaignByFBId(s.campaign_id); // ← N+1
    ...
}

// After (ถูก) — 1 query total
const campaignMap = await marketingRepo.getAllCampaignFBIds(); // new helper
for (const s of fbAdSets) {
    const campaignDbId = campaignMap.get(s.campaign_id);
    ...
}
```

**ผลกระทบ:** 100+ adSets = 100+ sequential DB queries ระหว่าง sync — เพิ่ม sync time ไม่จำเป็น

---

## Impact Assessment

| ระบบ | ผลกระทบ |
|------|---------|
| Executive Dashboard — ADS REVENUE | แสดง 0 ตั้งแต่ first sync เป็นต้นมา |
| Executive Dashboard — ROAS | ไม่สามารถคำนวณได้ (denominator = 0) |
| Marketing Insights — Reach | inflate ~10-20x (= impressions จริงๆ) |
| `/api/marketing/sync` | timeout ทุก run → `ads` table stale ตั้งแต่ Mar 17 |
| `/api/marketing/backfill` | abort ทุก window → `ad_daily_metrics` ว่างเปล่า |
| Ad quality rankings / video metrics | ไม่เคย refresh หลัง first insert |

---

## Fix Summary

| Commit | ไฟล์ | แก้ |
|--------|------|-----|
| `176afca` | backfill, sync-daily, sync-hourly | isPurchase expanded to 7 types |
| `b22e7df` | backfill, sync | maxDuration = 300 (5 min timeout) |
| `3ae2d8c` | backfill/route.js | Promise.all → Promise.allSettled (BUG-4) |
| `b81c84b` | sync/route.js | reach init + isPurchase + parallel creatives (BUG-1,2,3) |
| `69c7c56` | marketingRepo.js, sync/route.js | reach metric + bulkUpsert fields + N+1 (BUG-5,6,7) |

---

## Recovery Steps

หลัง deploy ครบ ต้อง run ตามลำดับ:

1. **`GET /api/marketing/sync?months=1`** — อัพเดท `ads` table ให้รวม ads ใหม่หลัง Mar 17
2. **`GET /api/marketing/backfill?since=2026-03-01&until=2026-03-26`** — backfill revenue ย้อนหลัง
3. ตรวจสอบ Executive Dashboard ว่า ADS REVENUE > 0

---

## Prevention

| สิ่งที่ต้องระวัง | Action |
|----------------|--------|
| FB `action_type` เพิ่มขึ้นเรื่อยๆ | ดึง distinct `action_type` จาก raw data และ log ถ้าพบ type ใหม่ |
| Variable init ใน ESM strict mode | ต้อง declare ทุก variable ก่อนใช้ ไม่มี implicit global |
| Sequential I/O ใน Vercel function | always ใช้ Promise.allSettled + chunk สำหรับ HTTP calls |
| FK dependency ใน backfill | backfill ต้องรัน **หลัง** sync เสมอ หรือ handle FK gracefully |
| `maxDuration` ใน Next.js route | ทุก route ที่ call FB API ต้องมี `export const maxDuration = 300` |

---

## Related Files

- `src/app/api/marketing/sync/route.js`
- `src/app/api/marketing/backfill/route.js`
- `src/app/api/marketing/sync-daily/route.js`
- `src/app/api/marketing/sync-hourly/route.js`
- `src/lib/repositories/marketingRepo.js`
- `src/app/api/analytics/executive/route.js` (consumer ที่แสดงผล — ไม่มี bug)
