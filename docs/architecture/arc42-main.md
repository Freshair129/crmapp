# System Architecture Documentation — V School CRM
Documentation template based on **arc42** (v8.2) and visual representations using the **C4 Model**.

---

## 1. Introduction and Goals
A comprehensive CRM system designed for V School (Japanese Culinary Academy). It provides a 360° view of customer engagement, real-time marketing analytics, and AI-driven insights to optimize business operations and student recruitment.

### Key Goals
- **Real-time Insights:** Instant visibility into marketing spend and ROAS.
- **Engagement:** Seamless integration with Facebook Messenger for student communication.
- **Scalability:** Hybrid architecture to handle growing student data and complex AI workloads.

---

## 2. Architecture Constraints
- **Database:** PostgreSQL (Supabase) as the primary relational store.
- **High Performance:** Must use Redis caching for high-traffic dashboard components and heavy analytics queries.
- **AI Integration:** Python-based worker for Gemini AI processing and heavy data manipulation.
- **Queueing:** Redis/BullMQ for asynchronous job processing.

---

## 3. Context and Scope
Describes the system's environment and external interfaces.

### 3.1 Business Context
The CRM interacts with students (Customers), Academy staff (Employees), and external platforms like Meta (Facebook/Messenger).

### 3.2 Technical Context (C4 Level 1 — System Context)

```mermaid
graph TB
    subgraph Actors
        Student([🎓 Student / Lead])
        Employee([👤 Employee / Agent])
    end

    subgraph VSchool_CRM [V School CRM System]
        CRM[V School CRM v2\nNext.js 14 App Router\n+ Python Worker]
    end

    subgraph External_Systems [External Systems]
        Meta[📘 Meta / Facebook\nGraph API v19.0]
        LINE[🟢 LINE Messaging API]
        Gemini[🤖 Google Gemini AI]
        Supabase[(🐘 PostgreSQL\nSupabase)]
        SlipOK[💳 SlipOK\nSlip Verification]
        Sheets[📊 Google Sheets\nTask Sync]
    end

    Student -->|Chat via Facebook / LINE| Meta
    Student -->|Chat via LINE| LINE
    Employee -->|CRM Dashboard / Inbox| CRM

    Meta -->|Webhook: messages + ad events| CRM
    LINE -->|Webhook: messages| CRM

    CRM -->|Fetch ad metrics + send messages| Meta
    CRM -->|Push notifications| LINE
    CRM -->|AI analysis + insights| Gemini
    CRM -->|Read / Write data| Supabase
    CRM -->|Verify payment slip| SlipOK
    CRM -->|Sync tasks| Sheets
```

---

## 4. Solution Strategy
- **Hybrid Platform:** Next.js for the web interface and API; Python for background AI and sync tasks.
- **Cache-First UI:** Redis-based caching layer to minimize database latency and API rate limits.
- **Event-Driven:** Changes in the database or external webhooks trigger background workers via Redis.

---

## 5. Building Block View
Detailed decomposition of the system using C4 containers and components.

### 5.1 Level 2: Containers
```mermaid
graph TD
    User([Customer / Employee])
    
    subgraph V_School_CRM_System [V School CRM System]
        Web_App[Next.js App / Webhook Listener]
        Python_Worker[Python AI Worker]
        Redis_Queue[Redis Queue / BullMQ]
        Redis_Cache[Redis Cache / Caching Layer]
    end

    Supabase[(PostgreSQL / Supabase)]
    Meta[Meta Graph API]
    Gemini[Google Gemini AI]

    User -->|Interacts with| Web_App
    Web_App -->|Reads/Writes| Supabase
    Web_App -->|Fast Reads| Redis_Cache
    Web_App -->|Enqueues Events| Redis_Queue
    Meta -->|Webhooks| Web_App
    
    Redis_Queue -->|Processed by| Python_Worker
    Redis_Queue -->|Processed by| Node_Worker[Node.js Event Worker]
    
    Node_Worker -->|Updates| Supabase
    Python_Worker -->|Syncs/Responds| Meta
    Python_Worker -->|RAG / AI Analysis| Gemini
    Python_Worker -->|Updates| Supabase
```

### 5.2 Level 3: Components (CRM Web App)
```mermaid
%% [MermaidChart: e0a42f31-fbb1-49a2-b675-007850abd9a3]
graph TD
    subgraph Nextjs_App [Next.js Web Application]
        API_Routes[API Routes / App Router]
        UI_Components[React UI Components]
        Lib_Core[Lib Core: chatService, taskManager, marketingService]
        Prisma_Client[Prisma Client / DB Adapter]
        Cache_Sync[Cache Sync Utility]
        Cron_Scheduler[Cron Scheduler / Instrumentation]
    end

    subgraph External_APIs [External APIs]
        FB_API[Facebook Marketing API]
    end

    UI_Components -->|Queries| API_Routes
    API_Routes -->|Uses| Lib_Core
    Lib_Core -->|Database Ops| Prisma_Client
    Lib_Core -->|Caching Ops| Cache_Sync
    Lib_Core -->|Fetch Insights| FB_API
    
    Cron_Scheduler -->|Triggers Sync| Lib_Core
    Cache_Sync -->|Read/Write| Redis_Cache[(Redis Cache)]
    Prisma_Client -->|Read/Write| Postgres[(PostgreSQL)]
```

---

## 6. Runtime View
Behavior of the system during specific scenarios.

### 6.1 Marketing Data Synchronization
```mermaid
sequenceDiagram
    participant FB as Facebook Marketing API
    participant PS as marketing_sync.py (Python)
    participant DB as PostgreSQL (Supabase)
    participant NX as Next.js API/Cron
    participant RD as Redis (BullMQ)
    participant WK as cacheSyncWorker.js
    participant LC as Redis Cache

    rect rgb(240, 240, 240)
        Note over PS, FB: Daily Bulk Sync (Legacy/Deep)
        FB->>PS: Bulk Fetch Data
        PS->>DB: SQL Upsert Data
        PS->>NX: Trigger Sync
    end

    rect rgb(230, 240, 255)
        Note over NX, FB: Hourly Breakdown Sync (New)
        NX->>FB: Fetch Hourly Breakdown
        FB-->>NX: Success
        NX->>DB: Prisma Upsert AdHourlyMetric
    end

    NX->>RD: Enqueue Job
    RD->>WK: Process Job
    WK->>DB: Read Latest Metrics
    WK->>LC: Write JSON Cache
    Note over LC: Optimized for High Performance UI (Redis)
```

### 6.2 Event-Driven Chat Synchronization (Real-time)
```mermaid
sequenceDiagram
    participant FB as Facebook Messenger
    participant WH as Webhook API (/api/webhooks)
    participant RD as Redis (BullMQ)
    participant WK as eventProcessor.mjs
    participant DB as PostgreSQL (Supabase)
    participant LC as Redis Cache

    FB->>WH: New Message/Event
    WH->>RD: Enqueue 'fb-events'
    WH-->>FB: 200 OK (Immediate)
    
    RD->>WK: Pull Event
    WK->>DB: Upsert Message & Customer
    WK->>LC: Update Redis Cache
    Note over WK: Automatic Slip Detection & AI Analysis
```

---

## 7. Deployment View

### 7.1 Infrastructure Overview

```mermaid
graph TB
    subgraph Internet
        Student([🎓 Student / Lead])
        Employee([👤 Employee / Agent])
    end

    subgraph Vercel [Vercel — Production]
        NextApp[Next.js 14\nApp Router\nSSR + API Routes]
    end

    subgraph VPS_or_Local [VPS / Local Worker]
        BullWorker[BullMQ Worker\nNode.js eventProcessor]
        PythonWorker[Python Worker\nAd Calc / NumPy / Pandas]
    end

    subgraph Data_Layer [Data Layer]
        Supabase[(PostgreSQL\nSupabase Cloud)]
        Redis[(Redis\nCache + Queue)]
    end

    subgraph External
        Meta[Meta Graph API]
        LINE[LINE Messaging API]
        Gemini[Google Gemini AI]
        SlipOK[SlipOK Verify]
    end

    Student -->|HTTPS| NextApp
    Employee -->|HTTPS| NextApp

    NextApp -->|Prisma ORM| Supabase
    NextApp -->|Cache-Aside| Redis
    NextApp -->|Enqueue jobs| Redis

    Redis -->|BullMQ pull| BullWorker
    Redis -->|BullMQ pull| PythonWorker

    BullWorker -->|Upsert| Supabase
    PythonWorker -->|Upsert metrics| Supabase
    PythonWorker -->|Fetch ads| Meta

    NextApp -->|Webhook receive| Meta
    NextApp -->|Webhook receive| LINE
    NextApp -->|AI call| Gemini
    NextApp -->|Slip verify| SlipOK
```

### 7.2 Environments

| Environment | Next.js | Database | Redis | Worker |
|---|---|---|---|---|
| **Local Dev** | `npm run dev` (port 3000) | Docker PostgreSQL (port 5433) | Docker Redis (port 6379) | `npm run worker` |
| **Production** | Vercel (auto-deploy from master) | Supabase Cloud | Redis Cloud / Upstash | VPS cron or always-on |

### 7.3 Key NFRs for Deployment

- **NFR1:** Webhook ตอบ Meta < 200ms — ใช้ Vercel Edge proximity
- **NFR2:** Dashboard API < 500ms — Redis cache-aside ลด DB round-trips
- **NFR3:** BullMQ retry ≥ 5 ครั้ง, exponential backoff — worker process แยกต่างหาก

---

## 8. Cross-cutting Concepts
### 8.1 Data Consistency & Caching
- **Cache-First:** API handlers use `src/lib/redis.js` to manage transient data.
- **Stale-While-Revalidate:** Immediate stale data display with background refresh.
- **Sync Logic:** Managed by `src/lib/cacheSync.js`.

### 8.2 Security & Compliance
- PDPA compliance via dedicated logging in `marketing/logs/compliance/`.
- Audit logging for all critical business actions.

---

## 9. Architecture Decisions (ADR)
Detailed history of key architectural choices:
- [ADR 001: Event-Driven Architecture](../adr/001-event-driven-architecture.md)
- [ADR 002: Hybrid Python Integration](../adr/002-hybrid-python-integration.md)
- [ADR 003: Hybrid Database Adapter](../adr/003-hybrid-database-adapter.md)
- [ADR 007: Customer ID Standardization](../adr/007-customer-id-standardization.md)
- [ADR 009: Hybrid Cache Marketing Sync](../adr/009-hybrid-cache-marketing-sync.md)
- [ADR 010: Database-First Product Catalog](../adr/010-database-first-product-catalog.md)
- [ADR 011: Custom ID Formatting](../adr/011-custom-id-formatting-and-smarter-sessioning.md)
- [ADR 012: arc42 Documentation Framework](../adr/012-arc42-documentation-framework.md)
- [ADR 013: Hourly Marketing Sync](../adr/013-hourly-marketing-sync.md)
- [ADR 014: AI-Driven Chat Automation](../adr/014-ai-driven-chat-automation.md)
- [ADR 015: Scalable Synchronization Architecture](../adr/015-scalable-sync-architecture.md)
- [ADR 030: Executive Revenue Channel Split](../adr/030-executive-revenue-channel-split.md)
- [ADR 031: Icon-only Sidebar Lucide Migration](../adr/031-icon-only-sidebar-lucide-migration.md)
- [ADR 032: UI Enhancement Recharts Framer Motion](../adr/032-ui-enhancement-recharts-framer-motion.md)
- [ADR 033: Unified Inbox Implementation](../adr/033-unified-inbox-implementation.md)
- [ADR 034: Redis Caching Layer](../adr/034-redis-caching-layer.md)

---

## 10. Quality Requirements
- **Reliability:** Background workers must handle retries for Meta Graph API rate limits.
- **Performance:** Page load for dashboards under 500ms using local cache.
- **Maintainability:** Standardized ID systems and directory structure.

---

## 11. Risks and Technical Debt
- **JSON File Size:** Large customer lists may require more optimized directory splitting (partially addressed by ID subdirectories).
- **Concurrency:** Ensure atomic writes to JSON files during high-frequency updates.

---

## 12. Glossary
- **TVS:** The V School / Thai Video Solution.
- **RAG:** Retrieval-Augmented Generation (used in knowledge base).
- **SSOT:** Single Source of Truth.
- **BullMQ:** Message queue on top of Redis.
