# Roadmap to Production — V School CRM v2

> **Lead Architect:** Claude | **Target:** v1.0.0 Production Ready
> **จัดทำ:** 2026-03-18 | **สถานะปัจจุบัน:** v0.26.0

---

## สถานะ ณ วันนี้

| Layer | สถานะ | หมายเหตุ |
|---|---|---|
| Next.js App (CRM) | ✅ Feature-complete | v0.26.0 — Phase 14 + 22 + 26 done |
| Database (Supabase) | ✅ Cloud, always-on | ไม่ต้องย้าย |
| RBAC Enforcement | ✅ เปิดแล้ว | BKL-04 RESOLVED (Phase 14b) |
| Unit Tests | ✅ 186 cases / 25 files | 100% pass — รวม slipParser + paymentRepo |
| Revenue Attribution | ✅ Chat-First | Slip OCR + REQ-07 firstTouchAdId |
| BullMQ Worker | ⚠️ รันมือบน Mac | ต้องย้ายไปเครื่องสำรอง |
| Redis | ⚠️ Docker บน Mac | → Upstash (cloud) แนะนำ |
| Deployment | 🔲 ยังไม่ deploy | Vercel (Phase 24 — NEXT) |

---

## Infrastructure Target (Production)

```
[Boss / Employee]
       │ HTTPS
       ▼
┌─────────────────────────────┐
│   Vercel (Next.js App)      │  ← CRM Dashboard + API Routes + Webhook listener
│   Auto-deploy from master   │
└──────────┬──────────────────┘
           │ Prisma ORM          │ BullMQ Jobs
           ▼                     ▼
┌──────────────────┐   ┌──────────────────────────────────┐
│ Supabase Cloud   │   │ Windows Machine (เครื่องสำรอง)  │
│ PostgreSQL       │   │ - BullMQ Worker (Node.js)        │
│ Always-on ✅     │   │ - Redis (Docker)                 │
└──────────────────┘   │ - Playwright Scraper (optional)  │
                       │ - PM2 (auto-restart + boot)      │
                       └──────────────────────────────────┘
```

---

## Phase 22 — Repository Layer Refactor `✅ DONE (v0.23.0)`

> **เป้าหมาย:** กำจัด Direct Prisma calls ใน Marketing + Inbox routes
> **Priority:** HIGH — tech debt ที่ block architecture compliance (ADR pattern)

| Task | ไฟล์ | Action |
|---|---|---|
| 22.1 | `src/app/api/marketing/sync/route.js` | ย้าย DB logic → `marketingRepo.js` |
| 22.2 | `src/app/api/marketing/sync/status/route.js` | แก้ `console.error` → `logger.error` |
| 22.3 | `src/app/api/marketing/chat/conversations/route.js` | ย้าย → `inboxRepo.js` (ถ้ายังไม่ครบ) |
| 22.4 | `src/app/api/marketing/insights/route.js` | ย้าย aggregation → `marketingRepo.js` |
| 22.5 | Vitest unit tests สำหรับ logic ที่ย้าย | เพิ่ม test coverage |

**Definition of Done:** ไม่มี `import { getPrisma }` โดยตรงใน `/api/marketing/*` หรือ `/api/inbox/*`

---

## Phase 23 — Windows Worker Setup `🔲 NEXT`

> **เป้าหมาย:** ย้าย background services จาก Mac → เครื่อง Windows สำรอง ให้รันได้อัตโนมัติ
> **ไม่ต้องสร้าง Electron app** — ใช้ PM2 ซึ่งเบากว่า รวดเร็วกว่า และเพียงพอ

### 23.1 ติดตั้งบนเครื่อง Windows

```bash
# 1. ติดตั้ง Node.js v22 LTS (nvm-windows)
# 2. ติดตั้ง Docker Desktop for Windows
# 3. Clone repo
git clone https://github.com/Freshair129/crmapp
cd crmapp
npm install

# 4. Copy .env จาก Mac
# 5. Docker: Redis เท่านั้น (ไม่ต้อง PostgreSQL)
docker run -d --name redis --restart always -p 6379:6379 redis:7-alpine

# 6. ติดตั้ง PM2
npm install -g pm2
```

### 23.2 PM2 Ecosystem Config

สร้างไฟล์ `ecosystem.config.cjs` ที่ root:

```js
module.exports = {
  apps: [
    {
      name: 'crm-worker',
      script: './src/workers/notificationWorker.mjs',
      interpreter: 'node',
      watch: false,
      restart_delay: 5000,
      max_restarts: 10,
      env: { NODE_ENV: 'production' }
    }
  ]
};
```

### 23.3 Auto-start เมื่อ Windows บูต

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # สร้าง Windows Service อัตโนมัติ
```

### 23.4 ตรวจสอบ

```bash
pm2 status        # ดูว่า worker รันอยู่ไหม
pm2 logs crm-worker   # ดู log
pm2 monit         # real-time dashboard
```

---

## Phase 14 — Production Hardening `✅ DONE (v0.24.0–v0.25.0)`

### 14.1 Security ✅
| Task | สถานะ |
|---|---|
| เปิด RBAC Middleware — ลบ dev bypass (BKL-04) | ✅ |
| Rate Limiting บน `/api/auth` | ✅ |
| Webhook Signature Validation (FB + LINE) | ✅ |
| `.env` clean — ไม่มี secret ติด git history | ✅ |

### 14.2 Reliability ✅
| Task | สถานะ |
|---|---|
| BullMQ retry ≥ 5 ครั้ง, exponential backoff | ✅ |
| Redis reconnect strategy | ✅ |
| Webhook < 200ms (NFR1) หลัง refactor | ✅ |

### 14.3 Testing ✅ (v0.24.0 — 50+ cases)
| Task | สถานะ |
|---|---|
| Unit tests: redis, marketingRepo, inboxRepo | ✅ |
| Unit tests: customerRepo, employeeRepo | ✅ |
| Unit tests: adReviewRepo, agentSyncRepo | ✅ |
| Unit tests: analyticsRepository | ✅ |
| Unit tests: middleware + webhook integration | ✅ |

### 14.4 Build Validation ✅
| Task | สถานะ |
|---|---|
| `npm run build` ผ่านโดยไม่มี error/warning | ✅ |
| ไม่มี `console.log` หลงเหลือ — ทุก route ใช้ `logger` | ✅ |

---

## Phase 24 — Vercel Deployment `🔲 NEXT`

> **เป้าหมาย:** Deploy Next.js App บน Vercel — เข้าถึงได้ทุกที่ ไม่ต้องเปิด Mac

### 24.1 Pre-deploy Checklist

- [x] BKL-04: เปิด RBAC enforcement แล้ว ✅
- [x] ไม่มี `console.log` หลงเหลือ ✅
- [x] Build pass: `npm run build` ไม่มี error ✅
- [ ] `.env.example` ครบทุก variable
- [ ] `prisma migrate deploy` ผ่านบน Supabase cloud

### 24.2 Vercel Setup

```bash
# 1. Connect repo: vercel.com → New Project → GitHub repo
# 2. Framework: Next.js (auto-detected)
# 3. Environment Variables: copy จาก .env ทุกตัว
# 4. Build Command: npm run build (default)
# 5. ไม่ต้อง run worker บน Vercel — worker อยู่บน Windows
```

### 24.3 Environment Variables ที่ต้องใส่ใน Vercel

| Variable | หมายเหตุ |
|---|---|
| `DATABASE_URL` | Supabase connection string |
| `DIRECT_URL` | Supabase direct URL (Prisma migrations) |
| `NEXTAUTH_SECRET` | Random 32+ char string |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` |
| `FB_PAGE_ACCESS_TOKEN` | Facebook Page Token |
| `FB_AD_ACCOUNT_ID` | Meta Ads Account |
| `FB_ACCESS_TOKEN` | Meta Graph API |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Messaging |
| `LINE_CHANNEL_SECRET` | LINE Webhook verify |
| `REDIS_URL` | Redis บนเครื่อง Windows (ต้อง public IP หรือ tunnel) |
| `CRON_SECRET` | Secret สำหรับ cron routes |
| `GEMINI_API_KEY` | Google Gemini AI |

### 24.4 Redis บน Windows → Vercel Connection

**ปัญหา:** Vercel (cloud) ต้องเชื่อมกับ Redis บน Windows เครื่องบ้าน

**ตัวเลือก:**
| วิธี | ราคา | ความง่าย | แนะนำ |
|---|---|---|---|
| **Upstash Redis** (cloud) | Free tier ≤ 10k req/day | ง่ายมาก | ✅ แนะนำ |
| ngrok tunnel (Windows → public) | Free (unstable URL) | ปานกลาง | ไม่แนะนำ production |
| Redis Cloud (redis.com) | Free 30MB | ง่าย | ✅ ทางเลือก |

> **แนะนำ:** ใช้ **Upstash Redis** สำหรับ Cache + BullMQ Queue — เครื่อง Windows pull jobs จาก Upstash แทน local Redis

---

## Phase 25 — Cron Jobs Setup `🔲 PLANNED`

> **เป้าหมาย:** แทน "รัน script มือ" ด้วย scheduled jobs อัตโนมัติ

### บน Vercel (Vercel Cron)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/marketing/sync",
      "schedule": "0 */6 * * *"
    },
    {
      "path": "/api/marketing/sync-hourly",
      "schedule": "0 * * * *"
    }
  ]
}
```

> ⚠️ ทุก cron request ต้องส่ง header `x-cron-secret` — ตรวจสอบว่า route ทั้งสองรองรับแล้ว

### บน Windows (PM2 Cron — สำหรับ Playwright scraper)

```js
// ecosystem.config.cjs เพิ่ม
{
  name: 'crm-scraper',
  script: './automation/sync_agents_v5.js',
  cron_restart: '0 3 * * *',  // 03:00 ทุกคืน
  autorestart: false,
}
```

---

## Pre-Production Checklist รวม

### Code Quality
- [x] Phase 22 complete — ไม่มี direct Prisma ใน API routes ✅
- [x] ไม่มี `console.log/error` ที่ไม่ผ่าน `logger` ✅
- [x] `npm run build` ผ่านโดยไม่มี warning ✅
- [x] Vitest: 50+ test cases pass ✅

### Security
- [x] BKL-04: ลบ dev middleware bypass ✅
- [x] ทุก sensitive route มี RBAC guard ✅
- [x] Webhook signature validation ครบ (FB + LINE) ✅
- [x] `.env` ไม่มีใน git history ✅

### Infrastructure
- [ ] Supabase: `prisma migrate deploy` บน production DB
- [ ] Upstash Redis: ตั้งค่าแล้ว, URL ใส่ใน Vercel env
- [ ] Windows Worker: PM2 รันอยู่, auto-start เปิด
- [ ] Vercel: deploy สำเร็จ, custom domain (ถ้ามี)

### Functional Validation
- [ ] Login → Dashboard โหลดได้
- [ ] FB Webhook รับ message → แสดงใน Inbox
- [ ] LINE Notification ส่งได้
- [ ] Marketing sync → AdDailyMetric มีข้อมูล
- [ ] POS → สร้าง Order ได้
- [ ] Stock deduction: completeSession → log ถูกต้อง

---

## Timeline (ประมาณการ)

```
ปัจจุบัน (v0.22.0)
        │
        ▼
Phase 22 — Repo Refactor         → v0.23.0
        │
        ▼
Phase 23 — Windows Worker Setup  → v0.24.0 (เครื่องสำรองรันได้แล้ว)
        │
        ▼
Phase 14 — Hardening + Testing   → v0.25.0
        │
        ▼
Phase 24 — Vercel Deploy         → v0.26.0 (เข้าถึง online ได้)
        │
        ▼
Phase 25 — Cron Automation       → v0.27.0
        │
        ▼
Pre-Production Checklist ✅
        │
        ▼
v1.0.0 — Production Ready 🚀
```

---

## Known Issues ที่ต้องแก้ก่อน v1.0.0

| ID | Issue | สถานะ |
|---|---|---|
| BKL-02 | Revenue real-time socket (FR5.1) | defer หลัง v1.0 |
| BKL-04 | RBAC middleware bypass | ✅ RESOLVED (Phase 14b) |

---

## Timeline (อัปเดต)

```
✅ v0.23.0 — Phase 22: Repo Refactor
✅ v0.24.0 — Phase 14a: Test Expansion (50+ cases)
✅ v0.25.0 — Phase 14b–d: Security + Reliability + Build
✅ v0.26.0 — Phase 26: Chat-First Revenue (Slip OCR + REQ-07 + 186 tests)
        │
        ▼
🔲 Phase 23 — Windows Worker (PM2)    → v0.27.0
        │
        ▼
🔲 Phase 24 — Vercel Deploy           → v0.28.0  ← NEXT
        │
        ▼
🔲 Phase 25 — Cron Automation         → v0.29.0
        │
        ▼
Pre-Production Checklist ✅ (Code + Security + Revenue ✅ — Infrastructure + Functional remaining)
        │
        ▼
v1.0.0 — Production Ready 🚀
```

---

> **กฎ:** ห้าม deploy v1.0.0 จนกว่า Pre-Production Checklist จะ ✅ ทั้งหมด
> **สถานะตอนนี้:** Code Quality + Security ✅ เหลือแค่ Infrastructure + Functional Validation
