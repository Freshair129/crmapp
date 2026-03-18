# V School CRM - Project Portal

### 📗 Technical Infrastructure (arc42/C4 Model)
The Single Source of Truth for system architecture, data flow, and technical decisions.
👉 [**Read the Architecture Documentation**](./architecture/arc42-main.md)
👉 [**ID & Naming Standards**](./id_standards.yaml)

---

## 🚀 Quick Start
```bash
cd /Users/ideab/Desktop/crm
docker compose up -d          # PostgreSQL (port 5433) + Redis
npx prisma generate
npx prisma migrate dev
npm run dev                   # http://localhost:3000
npm run worker                # BullMQ worker (terminal แยก)
```
Login: `admin@vschool.com` / (ดูใน `.env`)
Node.js: **v22 LTS** (ดู `.nvmrc`)

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
|  [BullMQ Workers] ←── [Webhook Listeners]  agentSyncRepo,   [PostgreSQL]          |
|       |                (FB + LINE)          adReviewRepo,    (Supabase cloud)      |
|       |                                     kitchenRepo …)         ^               |
|       └──(cache layer)──→ [Redis Cache]  ←─────────────────── cacheSync.js        |
|                           (ioredis, docker)                                        |
|                           getOrSet pattern                                         |
|                           TTL-based invalidation                                   |
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
               |  BullMQ Queue    |            | sync/route.js       |
               |  (Redis 6379)    |            | Batch API 50 ads    |
               |  retry ≥ 5x      |            | exponential backoff |
               |  exp. backoff    |            | RateLimit fail-fast |
               +------------------+            +---------------------+
                         |                                 |
                         v                                 v (upsert)
               +------------------+            +---------------------+
               | notificationWorker|           | AdDailyMetric       |
               | lineService.push  |           | AdHourlyMetric      |
               +------------------+            | AdActivity          |
                         |                     +---------------------+
                         v
               +-----------------------------+
               |        PostgreSQL (Supabase)|
               +-----------------------------+
                         ^
                         | getOrSet (TTL)
               +-----------------------------+
               |   Redis Cache (ioredis)     |  ← NOT local file cache
               |   docker: redis:7-alpine    |
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
- `src/lib/` — Services: redis.js, lineService.js, geminiReviewService.js, notificationEngine.js
- `src/components/` — React UI components (Lucide icons, Recharts, Framer Motion)
- `prisma/` — Schema + migrations (PostgreSQL via Supabase)
- `automation/` — Playwright scrapers (sync_agents_v5.js) — excluded from TS build
- `scripts/` — One-time data sync / report generation utilities
- `docs/` — ADRs, arc42, ERD, specs
- `workers/` — BullMQ worker processes (notificationWorker.mjs)

> ⚠️ **ไม่มี** `cache/` local file cache แล้ว — ใช้ Redis (ioredis docker) ตั้งแต่ v0.13.0 (ADR-034)

---

### 3. Current Version Status
| Version | Milestone | Status |
|---|---|---|
| v0.21.0 | Bug Audit Fix + Repository Layer Refactor | ✅ HEAD |
| v0.22.0 | AI Ad Review Engine (Phase A + B) + agentSyncRepo | ✅ released |
| v1.0.0 | Production Ready | 🔲 planned |

### 4. Key Non-Functional Requirements
| NFR | Requirement |
|---|---|
| NFR1 | Webhook ตอบ Facebook < 200ms เสมอ |
| NFR2 | Dashboard API < 500ms (Redis cache) |
| NFR3 | BullMQ retry ≥ 5 ครั้ง, exponential backoff |
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
| **034** | Redis Cache | ioredis singleton, getOrSet pattern, TTL, negative cache |
| **035** | Remove FB Login | CredentialsOnly auth (FB hides admin PSID) |
| **036** | Google Sheets SSOT | Master data sync via CSV URL |
| **037** | Product-as-Course-Catalog | Reuse Product model, certLevel 30/111/201h |

### v1 Reference ADRs
| ADR | Title | Summary |
|---|---|---|
| **019** | Agent Attribution | Automation of staff tracking via Business Suite scraping. |
| **020** | Threading Standard | Unified `t_THREAD_ID` mapping and Deep-Sync logic. |
| **021** | Admin PSIDs | Automated mapping of Page-Scoped IDs to Employee records. |
| **022** | Inbox Star System | Dual-sync strategy (PG + JSON) for Starred conversations feature. |
| **023** | Differential Sync | Intelligent rate-limit and storage optimization for marketing data. |
