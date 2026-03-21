# ADR-044: Web Push สำหรับ Real-time Inbox Notification

**Date:** 2026-03-21
**Status:** Accepted
**Deciders:** Boss, Claude

---

## Context

หน้า UnifiedInbox ใช้ `setInterval` (30s) + SSE (`/api/events/stream`) เป็น "polling fallback" เพราะ SSE ไม่ทำงานจริงบน Vercel serverless — `eventBus` เป็น in-memory EventEmitter ที่ไม่ share state ข้าม Lambda instances

ทางเลือกที่พิจารณา:
1. **Upstash Redis Pub/Sub** — ทำงานข้าม instance แต่กิน Upstash free tier (10k req/day), SSE ยังมีปัญหา Vercel timeout 300s
2. **Short polling (5-10s)** — ง่ายแต่กิน Vercel function invocations (100k/month free tier)
3. **Web Push API** — browser standard เดียวกับที่ FB ใช้ ✅

---

## Decision

ใช้ **Web Push API (VAPID)** แทน SSE + polling ทั้งหมด

```
FB/LINE Webhook (Vercel fn A)
  → notifyInbox()               // ยิง HTTP → Google/Mozilla push server
  → browser push service        // handled by Google/Mozilla infra
  → Service Worker (/public/sw.js)
  → showNotification()          // แสดง OS notification
  → user click → postMessage → UnifiedInbox refetch
```

---

## Implementation

| ไฟล์ | หน้าที่ |
|---|---|
| `public/sw.js` | Service Worker — รับ push event, แสดง notification, handle click |
| `src/lib/pushNotifier.js` | Server-side helper — ยิง push ไปยัง subscriptions ทั้งหมดด้วย `web-push` |
| `src/app/api/push/subscribe/route.js` | POST: บันทึก subscription / DELETE: unsubscribe |
| `prisma/schema.prisma` → `PushSubscription` | เก็บ endpoint, p256dh, auth ต่อ employee |
| `webhooks/facebook/route.js` | เรียก `notifyInbox()` fire-and-forget เมื่อข้อความใหม่มาถึง |
| `webhooks/line/route.js` | เรียก `notifyInbox()` fire-and-forget เมื่อข้อความใหม่มาถึง |
| `UnifiedInbox.js` | ลบ SSE+polling ออก — ลงทะเบียน SW + subscribe VAPID |

**VAPID Keys** เก็บใน `.env.local` และ Vercel env vars:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...  (expose ให้ browser ได้)
VAPID_PRIVATE_KEY=...             (server only)
VAPID_SUBJECT=mailto:admin@thevschool.com
```

---

## Trade-offs

### ข้อดี
- **Zero polling** — ไม่มี setInterval เลย ไม่กิน Vercel invocations
- **Works offline / tab closed** — browser OS notification แม้ปิด tab
- **Cross-instance** — push ผ่าน Google/Mozilla infra ไม่ขึ้นกับ Vercel Lambda
- **Instant** — ~100-300ms หลัง webhook ถึง server

### ข้อเสีย / Known Gotchas
- **Permission required** — user ต้อง allow notification ครั้งแรก ถ้า deny → ไม่มี real-time (ต้องรีเฟรช manual)
- **Subscription expiry** — browser อาจ rotate subscription key (Firefox) → endpoint เปลี่ยน → ต้อง re-subscribe อัตโนมัติ (handled ใน `registerPush()`)
- **HTTPS required** — Service Worker ต้องการ HTTPS; localhost ต้อง use `http://localhost` (exempt) หรือ ngrok
- **Expired cleanup** — `pushNotifier.js` ลบ subscription ที่ return 410/404 อัตโนมัติ
- **Dev environment** — local webhook ไม่ถึง browser → push ไม่ทำงานใน dev; ใช้ ngrok หรือ `fetchConversations` manual แทน

---

## Fallback

ถ้า browser ปฏิเสธ notification permission → inbox ยังทำงานได้ปกติแบบ manual refresh (ไม่มี real-time เท่านั้น) ไม่มี error ใดๆ

---

## Vercel Env Vars ที่ต้อง set

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BCA6tQDsrdSqZ52wslPkiH_PmS30e6nRl3MrcnTEUP3EgsuIgKGUqGpf0GWCO2onzv7ikBYN_3wOu7pMaoqSGnU
VAPID_PRIVATE_KEY=rxSamNZOWbqx1StfeDImQdPQ_HLmVQpF-ZBZQaUNLZg
VAPID_SUBJECT=mailto:admin@thevschool.com
```
