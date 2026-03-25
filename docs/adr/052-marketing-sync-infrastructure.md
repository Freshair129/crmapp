# ADR-052: Marketing Sync Infrastructure — Batch API + QStash + Pusher

**Date:** 2026-03-25
**Status:** Accepted
**Decider:** Pornpol (Boss)
**Tags:** #marketing #sync #pusher #qstash #facebook-api #infrastructure

---

## Context

Marketing sync มีปัญหาหลัก 3 อย่างพร้อมกัน:

1. **SSE/EventBus ใช้ไม่ได้บน Vercel serverless** — HTTP connection ปิดทันทีหลัง response กลับ ทำให้ real-time inbox ไม่ทำงาน
2. **Vercel Hobby Plan ไม่รองรับ hourly cron** — จำกัดแค่ daily cron หนึ่งครั้ง
3. **Facebook Insights API ยิง 1 call/ad** — ถ้ามี 50 ads = 50 API calls/hour → rate limit เร็ว

นอกจากนี้ยังขาด:
- Metrics เพิ่มเติม (CPM, CPC, video completion, quality ranking)
- Historical data (ไม่ได้ sync มาตั้งแต่ Dec 2025)
- Demographics/Placement breakdown สำหรับ audience analysis

---

## Decision

### 1. Real-time: SSE → Pusher

**เหตุผล:** Pusher เป็น WebSocket broker ภายนอก — server แค่ยิง HTTP POST ไปหา Pusher API (stateless), client subscribe WebSocket จาก Pusher โดยตรง ไม่ต้องการ persistent HTTP connection บน Vercel

```js
// Server (stateless, works on Vercel)
await pusher.trigger('inbox', 'chat-update', { conversationId });

// Client
const channel = pusher.subscribe('inbox');
channel.bind('chat-update', ({ conversationId }) => { ... });
```

**Credentials:** App ID `2132428`, cluster `ap1`

### 2. Hourly Cron: Vercel → QStash

**เหตุผล:** Vercel Hobby ไม่รองรับ cron ถี่กว่า 1 ครั้ง/วัน QStash (Upstash) ส่ง HTTP POST ตามเวลาที่กำหนด รองรับทุก cron expression

```
Schedule ID: scd_6jVKSPHsfSKFTmGZAZz1MdzEvW7i
Cron: 0 * * * *  (ทุกชั่วโมง)
URL: https://crmapp-pi.vercel.app/api/marketing/sync-hourly
Headers:
  X-Cron-Secret: vschool_cron_638d1a7da5f267a29627969e
  X-Vercel-Protection-Bypass: j26rvrhgwLGudOOCKlQP4HFopxN8VAKZ
```

### 3. Facebook API: Per-Ad → Batch API

**เหตุผล:** FB Graph API Batch ส่ง array ของ sub-requests ใน POST เดียว — 1 campaign = 1 HTTP call ได้ข้อมูลทุก ad ในแคมเปญนั้น จาก N calls → C calls (C = จำนวน campaigns)

```js
// 1 POST → ข้อมูลทุก ad ใน campaign
POST https://graph.facebook.com/
{
  "batch": [
    { "method": "GET", "relative_url": "{campaignId}/insights?level=ad&fields=..." }
    // ... per campaign
  ],
  "access_token": "..."
}
```

**Limit:** 50 sub-requests/batch call, แต่ปกติ campaign ไม่เกิน 20 ad

### 4. New Metrics Fields

เพิ่ม fields ใน `AdDailyMetric`, `AdHourlyMetric`, `AdHourlyLedger`:
- `cpm`, `cpc`, `frequency` — cost efficiency
- `costPerLead`, `costPerPurchase` — extracted จาก `cost_per_action_type`
- `qualityRanking`, `engagementRateRanking`, `conversionRateRanking` — Facebook's AI ranking
- `videoP25`, `videoP50`, `videoP75`, `videoP100` — video completion funnel

### 5. Demographics + Placement (New Tables)

Facebook ไม่อนุญาตให้รวม `hourly_stats` กับ `age,gender` หรือ `publisher_platform` breakdown ในเวลาเดียวกัน → แยกตารางและ sync แยก route (`sync-daily`)

```prisma
AdDailyDemographic  @@unique([adId, date, age, gender])
AdDailyPlacement    @@unique([adId, date, platform, position])
```

### 6. Secrets Management: Doppler

ย้ายจากการ manage secrets ใน Vercel Dashboard (manual, ไม่มี audit) มาใช้ **Doppler**:
- Project: `vschool-crm`, Config: `prd`
- 40 secrets uploaded ครบ
- ต้องตั้ง Doppler → Vercel integration เพื่อ auto-sync

---

## Consequences

**บวก:**
- Real-time inbox ทำงานได้บน Vercel serverless ✅
- Hourly sync ทำงานได้บน Hobby plan ✅
- FB API calls ลดจาก ~50/hour → ~5/hour (5 campaigns) ✅
- ข้อมูล marketing metrics ครบกว่าเดิม 10+ fields ✅
- Historical data ครบ 4 เดือน (Dec 2025 - Mar 2026) ✅

**ลบ/ข้อจำกัด:**
- Pusher ฟรี tier = 200k messages/day, 100 concurrent connections
- FB_ACCESS_TOKEN หมดอายุ ~60 วัน (long-lived) หรือ ~2 ชม. (short-lived) — ต้อง renew เป็นระยะ
- Demographics/Placement ย้อนหลัง Dec-Feb ไม่ได้ (FB error 99 สำหรับ old data)
- Doppler → Vercel sync ยังเป็น manual

---

## Token Renewal Protocol

```bash
# 1. Generate short-lived token จาก https://developers.facebook.com/tools/explorer
# 2. Exchange เป็น 60-day long-lived:
curl "https://graph.facebook.com/oauth/access_token?\
grant_type=fb_exchange_token&\
client_id=855039874236973&\
client_secret=b10d7faafd85d1b3684337a64df99cd7&\
fb_exchange_token=SHORT_LIVED_TOKEN"

# 3. อัปเดต Doppler:
doppler secrets set FB_ACCESS_TOKEN=LONG_LIVED_TOKEN

# 4. อัปเดต Vercel env var (จนกว่า Doppler sync จะ auto)
vercel env add FB_ACCESS_TOKEN production
```
