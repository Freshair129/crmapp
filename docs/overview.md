# V School CRM - Project Portal

### 📗 Technical Infrastructure (arc42/C4 Model)
The Single Source of Truth for system architecture, data flow, and technical decisions.
👉 [**Read the Architecture Documentation**](./architecture/arc42-main.md)
👉 [**Domain Data Flow Diagrams**](./architecture/domain-flows.md) — Inbox · Marketing Sync · Notifications · Ad Review · Agent Attribution · Kitchen Stock
👉 [**ID & Naming Standards**](./id_standards.yaml)

---

## 🚀 Quick Start
```bash
cd /Users/ideab/Desktop/crm
docker compose up -d          # PostgreSQL (port 5433) เท่านั้น — Redis ย้าย Upstash แล้ว
npx prisma generate
npx prisma migrate dev
npm run dev                   # http://localhost:3000
# ❌ npm run worker — ไม่จำเป็นแล้ว (Phase 27: BullMQ → QStash serverless)
```
Login: `admin@vschool.com` / (ดูใน `.env`)
Node.js: **v22 LTS** (ดู `.nvmrc`)

**Required env vars (v0.27.0+):**
```
UPSTASH_REDIS_REST_URL=       # Upstash Redis REST URL
UPSTASH_REDIS_REST_TOKEN=     # Upstash Redis token
QSTASH_TOKEN=                 # Upstash QStash token
QSTASH_CURRENT_SIGNING_KEY=   # QStash signature verify
QSTASH_NEXT_SIGNING_KEY=      # QStash signature verify (rotation)
NEXT_PUBLIC_APP_URL=          # https://your-app.vercel.app
```

---

## 📊 System Architecture Overview

### 1. Data Flow Diagram
```text
[Customers / Web]        [Facebook Ecosystem]     [LINE Platform]     [Meta Ads API]
        |                         |                      |                   |
        | HTTP                    | Webhooks              | Webhooks/Push     | Graph API v19
        v                         v                      v                   v
+-----------------------------------------------------------------------------------+
|                           CRM Web Application (Next.js 14)                        |
|                                                                                   |
|  [API Routes]  ←──(read/write)──→  [Repository Layer]  ←──→  [Prisma ORM]        |
|       ^                              (marketingRepo,               |               |
|       |                               inboxRepo,                   v               |
|  [QStash Worker] ←──── [Webhook Listeners]  agentSyncRepo,   [PostgreSQL]          |
|  /api/workers/    (FB + LINE)          adReviewRepo,    (Supabase cloud)      |
|  notification     + Slip OCR           kitchenRepo …)         ^               |
|  (Vercel serverless)                   paymentRepo            |               |
|       └──(cache layer)──→ [Upstash Redis] ←────────────── cacheSync.js        |
|                           (@upstash/redis REST)                                    |
|                           getOrSet pattern · TTL · ADR-034                         |
+-----------------------------------------------------------------------------------+
                    |                          |                    |
     (Outbound)     v                          v                    v
           +----------------+      +---------------------+  +------------------+
           | LINE Messaging |      | Gemini AI           |  | Ad Review Engine |
           | Push Alerts    |      | (geminiReviewService|  | Phase A: rules   |
           | Flex Messages  |      |  adReviewPrompt)    |  | Phase B: Gemini  |
           | Group Notify   |      |                     |  | score 0–100      |
           +----------------+      +---------------------+  +------------------+
```

### 2. Pipeline Work Flow (Event-Driven Sync)
```text
[Phase 1: Ingestion]
  FB Webhook (< 200ms, NFR1)   LINE Webhook       Meta Ads Cron (hourly)
              |                     |                      |
              +----------+----------+                      |
                         |                                 |
                         v                                 v
               +------------------+            +---------------------+
               |  Upstash QStash  |            | sync/route.js       |
               |  HTTP Job Queue  |            | Batch API 50 ads    |
               |  retry ≥ 5x      |            | exponential backoff |
               |  ADR-040         |            | RateLimit fail-fast |
               +------------------+            +---------------------+
                         |                                 |
                         v HTTP call                       v (upsert)
               +------------------+            +---------------------+
               |/api/workers/     |           | AdDailyMetric       |
               | notification     |           | AdHourlyMetric      |
               | (Vercel serverless)          | AdActivity          |
               | lineService.push |           +---------------------+
               +------------------+
                         |
[Phase 4: Slip OCR]      v
  FB/LINE image attachment
               +-----------------------------+
               |        PostgreSQL (Supabase)|
               +-----------------------------+
                         ^
                         | getOrSet (TTL)
               +-----------------------------+
               |   Upstash Redis (REST)      |  ← NOT local docker anymore
               |   @upstash/redis client     |  ← Phase 27 — ADR-040
               |   ADR-034 singleton pattern |
               +-----------------------------+

[Phase 2: Ad Intelligence]
  GET /api/marketing/ai-review/[adId]
              |
              v
  runPhaseAChecks() → 7 rule checks → score 0-100 → riskLevel
              |
              | score < 60?
              v
  runPhaseBAnalysis() ──fire-and-forget──> Gemini 2.0 Flash
              |                            buildReviewPrompt()
              v                            → creativeScore, policyRisk,
  AdReviewResult (DB)                        rewriteSuggestion (TH)

[Phase 3: Agent Attribution (Playwright)]
  sync_agents_v5.js
              |
              v DOM scrape "ส่งโดย / Sent by"
  POST /api/marketing/chat/message-sender
              |
              v agentSyncRepo.processAgentAttribution()
  resolveEmployeeByName() → attributeByMsgId() / attributeByText()
              |
              v
  Message.responderId = Employee.id
```

---

## 📂 Directories at a Glance
- `src/app/` — Next.js 14 App Router (API routes + pages)
- `src/lib/repositories/` — **Repository layer** (ทุก DB op ต้องผ่านที่นี่)
- `src/app/api/workers/` — Serverless worker endpoints (notification — แทน notificationWorker.mjs)
- `src/lib/` — Services: redis.js (Upstash), lineService.js, geminiReviewService.js, slipParser.js, notificationEngine.js
- `src/lib/repositories/` — **Repository layer** (ทุก DB op ต้องผ่านที่นี่) รวม paymentRepo.js (Phase 26)
- `src/components/` — React UI components (Lucide icons, Recharts, Framer Motion)
- `prisma/` — Schema + migrations (PostgreSQL via Supabase)
- `automation/` — Playwright scrapers (sync_agents_v5.js) — excluded from TS build, รันบน local machine
- `scripts/` — One-time data sync / report generation utilities
- `docs/` — ADRs, arc42, ERD, specs

> ⚠️ **ไม่มี** `workers/` แล้ว — ย้ายไป `src/app/api/workers/` (Vercel serverless) ตั้งแต่ v0.27.0 (ADR-040)
> ⚠️ **ไม่มี** local Redis docker แล้ว — ใช้ Upstash Redis REST ตั้งแต่ v0.27.0 (ADR-040)

---

### 3. Current Version Status
| Version | Milestone | Status |
|---|---|---|
| v0.26.0 | Chat-First Revenue — Slip OCR + REQ-07 firstTouchAdId | ✅ released |
| v0.27.0 | Upstash Migration — QStash + Upstash Redis (zero local infra) | ✅ released |
| v1.0.0 | Production Ready — Docs Hardening + ADR-041 | ✅ released |
| v1.1.0 | POS ProductDetailModal + Sheet Auto-ID (ADR-042) | ✅ HEAD |

### 4. Key Non-Functional Requirements
| NFR | Requirement |
|---|---|
| NFR1 | Webhook ตอบ Facebook < 200ms เสมอ |
| NFR2 | Dashboard API < 500ms (Upstash Redis cache) |
| NFR3 | QStash retry ≥ 5 ครั้ง (built-in, แทน BullMQ) |
| NFR5 | Identity upsert ต้องอยู่ใน prisma.$transaction |

---

## 🏗️ Architecture Decisions
Major technical choices and their rationale.
👉 [**View ADR Directory**](./adr/)

### v2 Core ADRs
| ADR | Title | Summary |
|---|---|---|
| **024** | Marketing Intelligence | Bottom-Up Aggregation, Checksum, Hourly Ledger |
| **025** | Identity Resolution | Phone E.164, Cross-platform Merge, LINE Attribution |
| **026** | RBAC | 6-tier role hierarchy, server-side guard |
| **027** | DB Schema Init | 23 models, UUID PKs, named relations |
| **028** | Facebook Messaging | Webhook < 200ms, fire-and-forget, prisma.$transaction |
| **029** | Employee Registry | Auto-generate TVS-EMP ID, JSONB identities, bcrypt |
| **030** | Revenue Channel Split | conversationId → Ads vs Store classification |
| **031** | Icon-Only Sidebar | w-20 sidebar, Lucide migration ออกจาก FontAwesome CDN |
| **032** | UI Enhancement (A) | Recharts charts, Framer Motion animations |
| **033** | Unified Inbox | FB + LINE inbox รวม, pagination, right customer card |
| **034** | Redis Cache | ioredis→Upstash REST, getOrSet pattern, TTL, negative cache |
| **035** | Remove FB Login | CredentialsOnly auth (FB hides admin PSID) |
| **036** | Google Sheets SSOT | Master data sync via CSV URL — amended by ADR-042 |
| **037** | Product-as-Course-Catalog | Reuse Product model, certLevel 30/111/201h |
| **039** | Chat-First Revenue Attribution | Slip OCR → Transaction → ROAS จริง (Phase 26) |
| **040** | Upstash Infrastructure | BullMQ→QStash, ioredis→Upstash Redis, zero local infra (Phase 27) |
| **041** | v1.0.0 Production Launch | Declaration of readiness, evidence of 17 modules + 6 NFRs |
| **042** | Product ID Generation | Sheet → auto-gen TVS-[CAT]-[PACK]-[SUB]-[SERIAL], column spec |

### v1 Reference ADRs
| ADR | Title | Summary |
|---|---|---|
| **019** | Agent Attribution | Automation of staff tracking via Business Suite scraping. |
| **020** | Threading Standard | Unified `t_THREAD_ID` mapping and Deep-Sync logic. |
| **021** | Admin PSIDs | Automated mapping of Page-Scoped IDs to Employee records. |
| **022** | Inbox Star System | Dual-sync strategy (PG + JSON) for Starred conversations feature. |
| **023** | Differential Sync | Intelligent rate-limit and storage optimization for marketing data. |
