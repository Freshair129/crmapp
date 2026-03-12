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
[External Users/Customers]                 [Facebook Ecosystem]   [LINE Platform]
         |                                          |                    |
         | (Web Requests)                           | (Webhooks)         | (Webhooks / Push API)
         v                                          v                    v
+-----------------------------------------------------------------+-----------+
|                        CRM Web Application                                  |
|                                                                             |
|   [API Routes] <--- (Read/Write) ---> [Prisma ORM (db.js)]                 |
|        ^                                       |                            |
|        | (Event Processing)                    v                            |
|   [BullMQ / Redis] <------------------ [Webhook Listeners]                  |
|                                        (FB + LINE)                          |
+-----------------------------------------------------------------------------+
                           |         |                    |
      (Primary Data Flow)  |         |                    | (Outbound Alerts)
                           v         v                    v
+-----------------------------+   +------------------+  +-------------------+
|     Single Source of Truth  |   | Local File Cache |  | LINE Messaging    |
|        [PostgreSQL]         |   |   [cache/]       |  | (Flex Messages,   |
|         (Supabase)          |   |   [logs/]        |  |  Push Alerts)     |
+-----------------------------+   +------------------+  +-------------------+
```

### 2. Pipeline Work Flow (Event-Driven Sync)
```text
[Phase 1: Ingestion]
    FB Webhooks (Real-time)  OR  Cron Job (Hourly Reconciliation)
              |                          |
              +-----------+--------------+
                          |
                          v
                  +-----------------+
                  |  Event Queue    | (BullMQ / Redis)
                  +-----------------+
                          |
                          v
                  +-----------------+
                  | Sync Services   | (chatService, marketingService)
                  +-----------------+
                          |
                          v (Upsert Data)
                  +-----------------+
                  |  PostgreSQL DB  |
                  +-----------------+

              |
[Phase 2: Data Extraction & Processing]
              |
              v (Query via Prisma: getAllProducts, findMany)
      +-----------------+
      | Context Builder | (Prepares Data for AI)
      +-----------------+
              |
              v (Structured Context: JSON/Text)
      +-----------------+
      | Gemini AI Model | (BusinessAnalyst.js)
      +-----------------+

              |
[Phase 3: Output Generation]
              |
              v
   +-----------------------+
   | Executive Summary     |
   | Intelligence Insights |  <--- (Sent as Response to CRM Frontend)
   | Recommendations       |
   +-----------------------+
```

---

## 📂 Directories at a Glance
- `crm-app/`: Core Web App & API.
- `crm-app/cache/`: Internal local data mirror & fallback.
- `docs/`: Technical documentation (ADRs, arc42).
- `scripts/`: Maintenance & data sync utilities.
- `logs/`: System activity & checkpoint reports.

---

### 3. Agent Sync & Attribution (Playwright)
```text
[Playwright Worker] ──(Deep Scroll)──> [Business Suite UI]
         |                                     |
         | (Extract Fiber Props: threadID, responseId)
         v
[API: /api/marketing/chat/message-sender] ──> [DB: Conversation (t_ID)]
                                         └──> [DB: Message (msgId)]
```

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
| **032** | UI Enhancement (A) | Recharts charts, Framer Motion animations, cherry-pick approach |

### v1 Reference ADRs
| ADR | Title | Summary |
|---|---|---|
| **019** | Agent Attribution | Automation of staff tracking via Business Suite scraping. |
| **020** | Threading Standard | Unified `t_THREAD_ID` mapping and Deep-Sync logic. |
| **021** | Admin PSIDs | Automated mapping of Page-Scoped IDs to Employee records. |
| **022** | Inbox Star System | Dual-sync strategy (PG + JSON) for Starred conversations feature. |
| **023** | Differential Sync | Intelligent rate-limit and storage optimization for marketing data. |
