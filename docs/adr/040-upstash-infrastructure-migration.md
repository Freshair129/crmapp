# ADR-040: Upstash Infrastructure Migration (Zero Local Infrastructure)

**Status:** Accepted
**Date:** 2026-03-19
**Version:** v0.27.0 (Phase 27)
**Implemented by:** Antigravity — verified by Claude

---

## Context

ก่อน v0.27.0 ระบบต้องการเครื่องที่เปิดตลอด 24/7 เพื่อรัน:
1. **Redis** (docker redis:7-alpine port 6379) — สำหรับ Cache + BullMQ Queue
2. **BullMQ Worker** (`notificationWorker.mjs`) — สำหรับส่ง LINE notifications

ปัญหา:
- Boss ต้องเปิด Mac ตลอดเวลา
- เครื่อง Windows สำรองซับซ้อนเกินสำหรับ MVP
- Cost ของ infrastructure ที่ต้องดูแล

---

## Decision

**ย้าย infrastructure ทั้งหมดไป cloud services ฟรี**

| Component เดิม | Component ใหม่ | เหตุผล |
|---|---|---|
| Redis docker local | **Upstash Redis** (REST) | Free 10k req/day, ทำงานได้ใน Vercel serverless |
| BullMQ Queue (Redis) | **Upstash QStash** (HTTP) | Free 500 msg/day, no worker process needed |
| `notificationWorker.mjs` | `/api/workers/notification` (Vercel) | Serverless — ไม่ต้องมีเครื่องเปิด |

---

## Architecture Change

### เดิม (v0.25.0)
```
notificationEngine.js
    → queue.add('send-notification', payload)
    → Redis BullMQ Queue (local docker)
    → notificationWorker.mjs (must be running)
    → lineService.pushMessage()
```

### ใหม่ (v0.27.0)
```
notificationEngine.js
    → qstash.publishJSON(NEXT_PUBLIC_APP_URL + '/api/workers/notification', payload)
    → Upstash QStash (cloud HTTP queue)
    → POST /api/workers/notification (Vercel serverless)
        → verify QStash signature (Receiver.verify)
        → lineService.pushMessage()
```

### Redis Cache (เดิม vs ใหม่)
```
เดิม: ioredis → TCP → redis:6379 (local docker)
ใหม่: @upstash/redis → HTTPS → upstash.io REST API
```

**Public API คงเดิม 100%:**
```js
cache.get(key)                    // → parsed JSON | null
cache.set(key, value, ttlSeconds) // → true | false
cache.del(key)                    // → number (deleted count)
cache.incr(key)                   // → number (new value)
cache.expire(key, seconds)        // → boolean
cache.getOrSet(key, fetcher, ttl) // → data (anti-stampede, promise sharing)
```

### NotificationEngine Class Export
```js
// เปลี่ยนจาก private class → named export เพื่อ testability
export class NotificationEngine { ... }        // สำหรับ test instantiation
export const notificationEngine = new NotificationEngine(); // singleton
```

---

## Rationale

### ทำไมไม่ใช้ Railway ($5/เดือน)?
- MVP ต้องการ zero cost ก่อน
- Upstash free tier เพียงพอสำหรับ V School (cooking school traffic ต่ำ)
- ถ้า traffic เกิน → upgrade Upstash ($0.2/10k req) ยังถูกกว่า Railway

### ทำไมไม่ใช้ Vercel Cron + DB Queue?
- ต้องเปลี่ยน architecture มาก (สร้าง NotificationJob table)
- Delay สูงสุด 1 นาที (QStash delay < 3 วินาที)
- QStash ง่ายกว่าและ retry built-in

---

## Free Tier Limits

| Service | Free Limit | V School Estimate | Buffer |
|---|---|---|---|
| Upstash Redis | 10,000 req/day | ~200-500 req/day | ✅ 20x |
| Upstash QStash | 500 msg/day | ~5-20 msg/day | ✅ 25x |

---

## Consequences

### ✅ Positive
- ไม่ต้องการเครื่องเปิดตลอด — Mac ปิดได้
- Deploy บน Vercel ได้เลย ไม่ต้องตั้งค่า Windows Worker
- Infrastructure cost = $0 สำหรับ MVP
- QStash retry built-in (≥ 5x) — เหมือน NFR3 เดิม

### ⚠️ Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Upstash free tier หมด | Monitor dashboard + alert — upgrade plan ถูกมาก |
| QStash delivery delay 1-3s | ยอมรับได้สำหรับ cooking school notifications |
| Vercel cold start (notification endpoint) | < 500ms — ยอมรับได้ |
| QStash signature bypass | `Receiver.verify()` บังคับ — return 401 ถ้าไม่ผ่าน |
| Playwright scraper ยังต้องการ local machine | รันมือเมื่อต้องการ — ไม่ใช่ critical path |

---

## Environment Variables เพิ่มใหม่

```bash
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...

# Upstash QStash
QSTASH_TOKEN=eyJVV...
QSTASH_CURRENT_SIGNING_KEY=sig_xxx
QSTASH_NEXT_SIGNING_KEY=sig_yyy
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Environment Variables ลบออก

```bash
REDIS_URL=redis://localhost:6379  # ไม่ใช้แล้ว
```

---

## Files Changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `src/lib/redis.js` | ioredis → @upstash/redis REST client (เพิ่ม `incr`, `expire`) |
| `src/lib/notificationEngine.js` | `queue.add()` → `qstash.publishJSON()`, `export class` |
| `src/app/api/workers/notification/route.js` | **ใหม่** — Vercel serverless worker + QStash signature verify |
| `src/workers/notificationWorker.mjs` | **ลบ** |
| `src/lib/queue.js` (BullMQ config) | **ลบ** |
| `package.json` | ลบ `bullmq` + `ioredis`, เพิ่ม `@upstash/redis` + `@upstash/qstash` |
| `src/__tests__/webhookIntegration.test.js` | mock `notificationEngine.evaluateRules` แทน `notificationQueue.add` |
| `src/lib/__tests__/redis.test.js` | อัพเดท mock จาก ioredis → @upstash/redis |
| `src/lib/__tests__/notificationEngine.test.js` | ใหม่ — mock QStash `Client` + `publishJSON` |
| `.env.example` | เพิ่ม Upstash vars, ลบ `REDIS_URL` |

---

## Verification

| Test File | Tests | สถานะ |
|---|---|---|
| `redis.test.js` | 6 tests (get/set/del/incr/expire/getOrSet) | ✅ |
| `notificationEngine.test.js` | 4 tests (keyword match, no match, tier match, catch-all) | ✅ |
| `webhookIntegration.test.js` | 2 tests (message + image attachment) | ✅ |
| **Full suite** | **186 tests across 25 files** | ✅ |

**Key test patterns:**
- QStash `Client` mock ต้องใช้ `mockImplementation(function() {...})` (ไม่ใช่ arrow function) เพื่อให้ `new Client()` ทำงานถูก
- แต่ละ test สร้าง `new NotificationEngine()` ใหม่ เพื่อ reset singleton QStash client
- `webhookIntegration.test.js` mock `notificationEngine` module ทั้งอัน (ไม่ import `queue` อีกต่อไป)

---

## Related
- ADR-034: Redis Caching Layer (ยังใช้ pattern เดิม แต่ backend เปลี่ยน)
- `ROADMAP_TO_PRODUCTION.md` — Phase 23 ถูก skip (Windows Worker ไม่จำเป็นแล้ว)
- `docs/architecture/domain-boundaries.md` — INFRA domain
