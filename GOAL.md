# GOAL.md — V School CRM v2 Project Dashboard

> **Lead Architect:** Claude 🧠 | **Senior Agent:** Antigravity 🤖 | **Worker Sub-agent:** Gemini 🛠️
> Last updated: 2026-03-22 (Phase 1–30 ✅ ALL DONE | v1.5.2 HEAD)

---

## 🔴 Ground Rules

| Rule | Detail |
|---|---|
| **Source of Truth** | `system_requirements.yaml` + `id_standards.yaml` — ยึดเหนือสิ่งอื่น |
| **GOAL.md** | Claude เป็นคนเดียวที่ติ๊ก `[x]` และเปลี่ยนสถานะ |
| **ADR** | Claude เขียนเท่านั้น — Gemini ห้ามแตะ |
| **CHANGELOG** | Gemini ร่างผ่าน stdout → Claude copy ลงไฟล์ |
| **Code Files** | Gemini ร่างผ่าน stdout → Claude review → Claude save |

---

## 📊 Project Status

| Phase | ชื่อ | สถานะ | เสร็จ |
|---|---|---|---|
| Phase 1 | Prisma Schema Initialization | ✅ Done | 5/5 |
| Phase 2 | LINE Attribution (ROAS Fix) | ✅ Done | 3/3 |
| Phase 3 | Creative Fatigue Alerts | ✅ Done | 2/2 |
| Phase 4 | Structured Logging | ✅ Done | 2/2 |
| Phase 5 | Marketing Intelligence Pipeline | ✅ Done | 5/5 |
| Phase 6 | Identity Resolution | ✅ Done | 3/3 |
| Phase 7 | RBAC | ✅ Done | 3/3 |
| Phase 8 | Facebook Messaging Integration | ✅ Done | 3/3 |
| Phase 9 | Employee Registry | ✅ Done | 4/4 |
| Phase 10 | Member Self-Registration | ✅ Done | 3/3 |
| Phase 11 | UI → Backend Wiring + Charts + Animations | ✅ Done | 6/6 |
| Phase 12 | Unified Inbox + Redis Cache | ✅ Done | 6/6 |
| Phase 13 | NotificationRules API + LINE Messaging | ✅ Done | 4/4 |
| Phase 14 | Production Hardening + Testing | ✅ Done | 4/4 |
| Phase 15 | Asset + Kitchen Ops + Course Enrollment | ✅ Done | 50/50 |
| Phase 16 | Recipe + Package + Real-time Stock Deduction | ✅ Done | 8/8 |
| Phase 17 | Repository Layer Refactor (Marketing/Inbox) | ✅ Done | — |
| Phase 18 | Production Hardening & API Optimization | ✅ Done | 4/4 |
| Phase 19 | Schema Hardening | ✅ Done | — |
| Phase 20 | Lot ID + Class ID (Stock Batches + Cohorts) | ✅ Done | — |
| Phase 20.5 | Bug Audit & Fix (Post-Antigravity) | ✅ Done | 6/6 |
| Phase 21 | FEFO Deduction in completeSession + Lot Integration | ✅ Done | 3/3 |
| Phase 22 | Repository Layer Refactor (Marketing/Inbox — Full Compliance) | ✅ Done | 5/5 |
| Phase 26 | Chat-First Revenue Attribution — Slip OCR + REQ-07 (Phase 26) | ✅ Done | 5/5 |
| Phase 27 | Upstash Migration — BullMQ→QStash, ioredis→Upstash, zero local infra | ✅ Done | 4/4 |
| Phase 28 | v1.0.0 Production Ready — Docs Hardening + ADR-041 | ✅ Done | 7/7 |
| Phase 29 | RBAC Redesign + Ads Optimize Write (ADR-045) | ✅ Done | 10/10 |
| Phase 30 (pre) | V Point Loyalty + UI Overhaul (ADR-046 plan) | ✅ Done | 7/7 |
| Phase 30 (UI) | Employee Card Full Redesign + Task Board (v1.5.2) | ✅ Done | — |

---

## ✅ Phase 1: Prisma Schema Initialization
> **ADR:** 027-database-schema-initialization.md
> **Goal:** สร้าง `prisma/schema.prisma` ที่สะอาด ตรงตาม spec ทั้งหมด พร้อม ADR-024/025/026

| # | Task | Who | Status |
|---|---|---|---|
| 1.1 | สรุป spec จาก requirements + id_standards | 🧠 Claude | ✅ |
| 1.2 | Delegate: ร่าง schema.prisma ทุก domain | 🛠️ Gemini | ✅ |
| 1.3 | Review: ตรวจ naming, relations, ADR compliance | 🧠 Claude | ✅ |
| 1.4 | Save: เขียนลง `prisma/schema.prisma` จริง | 🧠 Claude | ✅ |
| 1.5 | Docs: สร้าง ADR-027 + อัปเดต CHANGELOG + GOAL.md | 🧠 Claude | ✅ |

---

## ✅ Phase 2: LINE Attribution Gap (ROAS Fix)
> **ADR:** ADR-025 (Cross-Platform Identity Resolution)
> **Goal:** แก้ ROAS under-report (จริง 5.29x vs ระบบ 1.54x)

| # | Task | Who | Status |
|---|---|---|---|
| 2.1 | Delegate: `normalizePhone()` — E.164 utility | 🛠️ Gemini | ✅ |
| 2.2 | Delegate: `recordLineConversion()` — attribution fn | 🛠️ Gemini | ✅ |
| 2.3 | Integrate + สร้าง LINE webhook route | 🧠 Claude | ✅ |

---

## ✅ Phase 3: Creative Fatigue Alerts
> **Goal:** Alert เมื่อ Ad รันนานกว่า 30 วัน + spend > threshold

| # | Task | Who | Status |
|---|---|---|---|
| 3.1 | Delegate: `detectCreativeFatigue()` | 🛠️ Gemini | ✅ |
| 3.2 | Integrate กับ cron job ใน instrumentation.js | 🧠 Claude | ✅ |

---

## ✅ Phase 4: Structured Logging
> **Goal:** แทนที่ `console.log` ด้วย structured JSON logger

| # | Task | Who | Status |
|---|---|---|---|
| 4.1 | Delegate: `logger.js` — structured log utility | 🧠 Claude | ✅ |
| 4.2 | Replace console.log ทั่วโปรเจกต์ | 🧠 Claude | ✅ |

---

## ✅ Phase 5: Marketing Intelligence Pipeline
> **ADR:** ADR-024 (Marketing Intelligence Pipeline)
> **Goal:** Bottom-Up Aggregation, Checksum, Hourly Ledger, Derived Metrics

| # | Task | Who | Status |
|---|---|---|---|
| 5.1 | Delegate: `marketingAggregator.js` — Bottom-Up sum | 🛠️ Gemini | ✅ |
| 5.2 | Delegate: `checksumVerifier.js` — data integrity | 🛠️ Gemini | ✅ |
| 5.3 | Schema: เพิ่ม `AdHourlyLedger` model (ทำใน Phase 1) | 🧠 Claude | ✅ |
| 5.4 | Delegate: `hourlyLedger.js` — append-only writer | 🛠️ Gemini | ✅ |
| 5.5 | Delegate: `marketingMetrics.js` — CON/CPA/ROAS calc | 🧠 Claude | ✅ |

---

## ✅ Phase 6: Identity Resolution
> **ADR:** ADR-025 (Cross-Platform Identity Resolution)
> **Goal:** Phone normalize, cross-platform merge, LINE attribution

| # | Task | Who | Status |
|---|---|---|---|
| 6.1 | Delegate: `phoneUtils.js` — normalizePhone() | 🛠️ Gemini | ✅ (Phase 2) |
| 6.2 | Delegate: `identityService.js` — resolveOrCreate() | 🛠️ Gemini | ✅ |
| 6.3 | Integrate: เชื่อมต่อกับ webhook handlers | 🧠 Claude | ✅ |

---

## ✅ Phase 7: RBAC
> **ADR:** ADR-026 (Role-Based Access Control)
> **Goal:** 6-tier roles, server-side API guard

| # | Task | Who | Status |
|---|---|---|---|
| 7.1 | Delegate: `rbac.js` — role hierarchy + hasPermission() | 🛠️ Gemini | ✅ |
| 7.2 | Delegate: `authGuard.js` — requireRole() middleware | 🧠 Claude | ✅ |
| 7.3 | Retrofit: wrap sensitive API routes | 🧠 Claude | ✅ |

---

---

## ✅ Phase 8: Facebook Messaging Integration
> **ADR:** 028-facebook-messaging-integration.md
> **Goal:** Real-time webhook + 90-day historical backfill + agent attribution

| # | Task | Who | Status |
|---|---|---|---|
| 8.1 | FB Webhook handler (NFR1 < 200ms, NFR5 transaction) | 🧠 Claude | ✅ |
| 8.2 | `scripts/sync-fb-messages.mjs` — 90-day Graph API poll | 🧠 Claude | ✅ |
| 8.3 | `/api/marketing/chat/message-sender` — sync_agents_v2 attribution | 🧠 Claude | ✅ |

---

## ✅ Phase 9: Employee Registry
> **ADR:** 029-employee-registry.md
> **Goal:** Employee CRUD API + Management UI + Facebook identity for attribution

| # | Task | Who | Status |
|---|---|---|---|
| 9.1 | POST `/api/employees` — create with auto ID + bcrypt + facebookName | 🧠 Claude | ✅ |
| 9.2 | PATCH/DELETE `/api/employees/[id]` — update + soft delete | 🧠 Claude | ✅ |
| 9.3 | `/settings/employees` — management UI with modal form | 🧠 Claude | ✅ |
| 9.4 | `prisma/schema.prisma` — เพิ่ม `creativeId` unique field | 🧠 Claude | ✅ |

---

## ✅ Phase 10: Member Self-Registration
> **Goal:** Public landing page + API สำหรับลูกค้าลงทะเบียนเองโดยไม่ต้อง login

| # | Task | Who | Status |
|---|---|---|---|
| 10.1 | `POST /api/members/register` — public API, MemberId gen, duplicate check | 🧠 Claude | ✅ |
| 10.2 | `/register` page — branded form (interest radio cards) | 🧠 Claude | ✅ |
| 10.3 | Middleware whitelist `/api/members/register` | 🧠 Claude | ✅ |

---

## ✅ Phase 11: UI → Backend Wiring + Charts + Animations
> **ADR:** ADR-031 (Icon Sidebar), ADR-032 (UI Enhancement)
> **Goal:** เชื่อม UI components ทั้งหมดกับ real API endpoints, Recharts charts, Framer Motion

| # | Task | Who | Status |
|---|---|---|---|
| 11.1 | `Sidebar.js` — icon-only w-20, Lucide React, tooltip hover | 🧠 Claude | ✅ |
| 11.2 | `TopBar.js` — Global Search, Language, Theme toggle | 🧠 Claude | ✅ |
| 11.3 | `ExecutiveAnalytics.js` — Recharts AreaChart + BarChart + timeframe toggle | 🧠 Claude | ✅ |
| 11.4 | `Dashboard.js` — AnimatedNumber (useSpring), Framer Motion page transition | 🧠 Claude | ✅ |
| 11.5 | `EmployeeManagement.js` — stacked card deck, swipe gesture, 4-tab dashboard | 🧠 Claude | ✅ |
| 11.6 | Node.js upgrade 20 → 22 LTS, `.nvmrc`, Dockerfile 4-stage build | 🧠 Claude | ✅ |

---

## ✅ Phase 12: Unified Inbox + Redis Cache
> **ADR:** ADR-033 (Unified Inbox), ADR-034 (Redis Caching Layer)
> **Goal:** รวม FB + LINE inbox ไว้ที่เดียว + Redis caching สำหรับ analytics

| # | Task | Who | Status |
|---|---|---|---|
| 12.1 | `UnifiedInbox.js` — 3-panel layout: conv list + message thread + customer card | 🧠 Claude | ✅ |
| 12.2 | `GET /api/inbox/conversations` — channel/status filter, search, pagination | 🧠 Claude | ✅ |
| 12.3 | `GET+POST /api/inbox/conversations/[id]/messages` — paginated + reply | 🧠 Claude | ✅ |
| 12.4 | `src/lib/redis.js` — Redis singleton + getOrSet cache pattern | 🧠 Claude | ✅ |
| 12.5 | `executive/route.js` — Redis cache 5min TTL (latency 2s → <50ms) | 🧠 Claude | ✅ |
| 12.6 | `NotificationCenter.js` — Google Sheets sync + alert rules UI | 🧠 Claude | ✅ |

---

## ✅ Phase 13: NotificationRules API + LINE Messaging
> **ADR:** (inline — NotificationRule model in schema.prisma)
> **Goal:** ระบบ Notification rules + LINE push messaging integration (→ v0.14.0)
> **Implemented by:** Antigravity (Senior Agent) — verified by Claude (Lead)

| # | Task | Who | Status |
|---|---|---|---|
| 13.1 | `POST/GET/DELETE /api/notifications/rules` — CRUD notification rules | 🤖 Antigravity | ✅ |
| 13.2 | LINE Messaging API integration — `pushMessage()` in lineService.js | 🤖 Antigravity | ✅ |
| 13.3 | `notificationEngine.js` — evaluate rules on MESSAGE_RECEIVED events (FB+LINE webhooks) | 🤖 Antigravity | ✅ |
| 13.4 | `notificationWorker.mjs` — BullMQ worker for notification actions (LINE push, etc.) | 🤖 Antigravity | ✅ |

**Bonus:** Vitest unit tests for notificationEngine (4 test cases) ✅

---

---

## 📋 Phase 15: Asset + Kitchen Ops + Course Enrollment
> **ADRs:** ADR-035 (Remove FB Login), ADR-036 (Google Sheets SSOT), ADR-037 (Product-as-Course)
> **Goal:** Course enrollment tracking, kitchen stock + BOM, purchase requests, asset inventory, Google Sheets master data sync, POS enhancement
> **Implement Plan:** `docs/implement_plan_phase15.md`
> **Target version:** v0.15.0

| # | Sub-phase | สถานะ |
|---|---|---|
| 15a | Prisma Schema + Migration (9 models) | ✅ |
| 15b | Repository Layer + Business Logic + Unit Tests | ✅ |
| 15c | API Routes (17 routes) | ✅ |
| 15d | UI Components (8 components) | ✅ |
| 15e | Sidebar Wiring + Google Sheets Template | ✅ |

**New Models:** Enrollment, EnrollmentItem, CourseSchedule, ClassAttendance, Ingredient, CourseBOM, PurchaseRequest, PurchaseRequestItem, Asset

**Certificate Rule:** hoursCompleted ≥ 30 → Level 1 | ≥ 111 → Full Course 111 | ≥ 201 → Full Course 201

---


## ✅ Phase 29: RBAC Redesign + Ads Optimize (v1.4.0)
> **ADR:** ADR-045
> **Goal:** Domain-based roles (8 roles), centralized permissionMatrix.js, Ads Optimize write access to Meta API
> **Implement Plan:** `docs/implement_plan_phase29.md`
> **Status:** ✅ Done (2026-03-21)

| Sub-phase | งาน | สถานะ |
|---|---|---|
| 29a | DB Migration — normalize role → UPPERCASE + เพิ่ม MARKETING/HEAD_CHEF | ✅ |
| 29b | `permissionMatrix.js` + `can()` helper + unit tests (67 cases) | ✅ |
| 29c | Refactor RBAC guards ทั่ว codebase → ใช้ `can()` | ✅ |
| 29d | Ads Optimize API routes (6 routes) + adsOptimizeRepo.js | ✅ |
| 29e | Ads Optimize UI — campaign card actions + budget modal | ✅ |
| 29f | Permission Management UI (read-only) ใน Employee section | ✅ |
| 29g | Tests + Audit log + Docs update | ✅ |

**New Roles:** `MARKETING` (L2.5, domain: marketing) · `HEAD_CHEF` (L2.5, domain: kitchen)
**Breaking Change:** Role values ใน DB → UPPERCASE · Force re-login ทุก session

---

## 📋 Phase 30: POS Receipt & Printer Integration (v1.5.0)
> **ADR:** ADR-046
> **Goal:** ออกบิล/ใบเสร็จจาก POS, เชื่อมต่อ thermal printer 80mm, ส่งบิลทาง LINE
> **Implement Plan:** `docs/implement_plan_phase30.md`
> **Status:** Planned

| Sub-phase | งาน | สถานะ |
|---|---|---|
| 30a | Prisma Schema (Receipt model) + `receiptRepo.js` | ⏳ |
| 30b | Receipt API Routes (5 endpoints) | ⏳ |
| 30c | Receipt Component + Print Preview Modal | ⏳ |
| 30d | Thermal Printer 80mm (ESC/POS via Web Serial API) | ⏳ |
| 30e | LINE Receipt Send (PNG image via LINE Messaging API) | ⏳ |
| 30f | Receipt History Page + Sidebar nav | ⏳ |
| 30g | POS Integration + Tests + Docs | ⏳ |

**New Model:** `Receipt` (1:1 กับ Order) — `RCP-YYYYMMDD-XXX`
**Print Channels:** Thermal 80mm (Web Serial) · Browser Print (fallback) · LINE Send (PNG)

---

## 📋 Backlog / Known Issues

| ID | Issue | Priority |
|---|---|---|
| BKL-01 | ~~FB Login พัง (PSID mapping recovery) — FR1.1~~ | ~~HIGH~~ → **CLOSED** (ADR-035: FB hides admin PSID by design — won't fix) |
| BKL-02 | Revenue real-time socket integration — FR5.1 | MEDIUM |
| BKL-03 | ~~Product.linkedMenuIds → Course-to-Menu link~~ | ~~LOW~~ → **RESOLVED** by ADR-037 (Product-as-Course, Phase 15) |
| BKL-04 | ~~**Login page + RBAC enforcement** — ปิดไว้ระหว่าง dev~~ | ~~PRE-PROD~~ → **RESOLVED** (Phase 14b — ลบ dev bypass แล้ว) |

---

## 🗂️ Key Files

| ไฟล์ | หน้าที่ |
|---|---|
| `system_requirements.yaml` | Functional & Non-Functional Requirements |
| `id_standards.yaml` | ID formats, naming conventions |
| `architect_plan.md` | Detailed phase plans + delegation commands |
| `prisma/schema.prisma` | Database schema (Phase 1) |
| `docs/adr/` | Architecture Decision Records |
| `CHANGELOG.md` | Version history |
---

## ✅ Phase 18: Production Hardening & API Optimization
> **Goal:** Fix reliability issues (race conditions, rate limits) and optimize chat performance (pagination)
> **Implemented by:** Antigravity (Senior Agent)

| # | Task | Who | Status |
|---|---|---|---|
| 18.1 | [FB Webhook] Race condition recovery for Customer creation + Env-based Page IDs | 🤖 Antigravity | ✅ |
| 18.2 | [Hourly Sync] 429 Retry/Backoff + Concurrency Batching (Batch Size 5) | 🤖 Antigravity | ✅ |
| 18.3 | [Chat API] Cursor-based pagination + Null-safe display mapping | 🤖 Antigravity | ✅ |
| 18.4 | [Redis] JSON.parse safety + _inflight watchdog timeout + Negative caching | 🤖 Antigravity | ✅ |

---

## ✅ Phase 21: FEFO Deduction Implementation
> **Goal:** Refine stock deduction to ensure full audit trail (remainder logging) + Vitest verification
> **Implemented by:** Antigravity (Senior Agent)

| # | Task | Who | Status |
|---|---|---|---|
| 21.1 | Implement remainder logging for partial lot deductions in `scheduleRepo.js` | 🤖 Antigravity | ✅ |
| 21.2 | Add unit test `FEFO: logs remainder when lots are insufficient` | 🤖 Antigravity | ✅ |
| 21.3 | Verify stock audit trail completion (total master stock decrement vs log sum) | 🤖 Antigravity | ✅ |

---

## ✅ Phase 22: Repository Layer Full Compliance
> **Goal:** กำจัด Direct Prisma calls ทั้งหมดใน Marketing + Inbox API routes
> **Version:** v0.23.0 | **Implemented by:** Boss + Claude

| # | Task | Who | Status |
|---|---|---|---|
| 22.1 | `sync/route.js` → ย้าย DB logic → `marketingRepo.js` | 👨‍💼 Boss | ✅ |
| 22.2 | `sync/status/route.js` → `marketingRepo.getSyncStatus()` + `logger` | 👨‍💼 Boss | ✅ |
| 22.3 | `marketing/chat/conversations/route.js` → `inboxRepo.getConversations()` ครบ | 👨‍💼 Boss | ✅ |
| 22.4 | `marketing/insights/route.js` → ย้าย aggregation → `marketingRepo.js` | 👨‍💼 Boss | ✅ |
| 22.5 | Vitest unit tests สำหรับ logic ที่ย้าย | 👨‍💼 Boss | ✅ |

> ✅ **Definition of Done met:** ไม่มี `import { getPrisma }` โดยตรงใน `/api/marketing/*` หรือ `/api/inbox/*`

---

## 🔄 Phase 14: Production Hardening + Testing
> **Goal:** ระบบพร้อม production — ไม่ crash, ไม่ leak, มี safety net ครบ
> **Version Target:** v0.25.0 | **Status:** In Progress (Testing ✅ เสร็จแล้ว)

### 14a — Unit Test Expansion ✅ (v0.24.0)

| Test File | Coverage | Status |
|---|---|---|
| `redis.test.js` | getOrSet, negative cache, inflight dedup, watchdog | ✅ new |
| `marketingRepo.test.js` | getSyncStatus, campaigns, sync pipeline | ✅ new |
| `adReviewRepo.test.js` | ad review workflow, approval/rejection | ✅ new |
| `agentSyncRepo.test.js` | agent attribution sync, name-matching | ✅ new |
| `customerRepo.test.js` | resolveOrCreate, phone normalize, cross-platform merge | ✅ new |
| `analyticsRepository.test.js` | revenue aggregation, team KPI, ROAS | ✅ new |
| `employeeRepo.test.js` | CRUD, TVS-EMP ID gen, bcrypt, facebookName | ✅ new |
| `inboxRepo.test.js` | ขยาย: pagination edge cases + reply validation | ✅ expanded |
| `middleware` | RBAC guard tests (BKL-04 coverage) | ✅ new |
| Webhook integration | FB + LINE e2e (race condition, duplicate msg) | ✅ new |

### 14b — Security ✅ (v0.25.0)

| # | Task | Status |
|---|---|---|
| 14b.1 | เปิด RBAC Middleware (ลบ dev bypass ใน `middleware.js`) — **BKL-04** | ✅ |
| 14b.2 | Rate Limiting บน `/api/auth` | ✅ |
| 14b.3 | Webhook Signature Validation ครบทุก route (FB + LINE) | ✅ |
| 14b.4 | ตรวจ `.env` ไม่มี secret ติด git history | ✅ |

### 14c — Reliability ✅ (v0.25.0)

| # | Task | Status |
|---|---|---|
| 14c.1 | ตรวจ BullMQ `defaultJobOptions` retry ≥ 5 ครั้ง | ✅ |
| 14c.2 | ตรวจ Redis reconnect strategy | ✅ |
| 14c.3 | ตรวจ Webhook < 200ms (NFR1) ยังครบไหมหลัง refactor | ✅ |

### 14d — Build Validation ✅ (v0.25.0)

| # | Task | Status |
|---|---|---|
| 14d.1 | `npm run build` ผ่านโดยไม่มี error/warning | ✅ |
| 14d.2 | ไม่มี `console.log` หลงเหลือ (ใช้ `logger` ทุก route) | ✅ |

---

## ✅ Phase 26: Chat-First Revenue Attribution
> **Goal:** ใช้สลิปโอนเงินในแชทเป็น source of truth ของ Revenue แทน Meta estimated
> **Version:** v0.26.0 | **Implemented by:** Antigravity (Senior Agent) — verified by Claude
> **ADR:** ADR-039 (docs/adr/039-chat-first-revenue-attribution.md ✅)

| # | Task | Who | Status |
|---|---|---|---|
| 26.A1 | Schema: `Conversation.firstTouchAdId` (REQ-07) | 🤖 Antigravity | ✅ |
| 26.A2 | Webhook fix: บันทึก `referral.ad_id` เมื่อ CREATE conversation | 🤖 Antigravity | ✅ |
| 26.B | `src/lib/slipParser.js` — Gemini Vision OCR, confidence threshold 0.80 | 🤖 Antigravity | ✅ |
| 26.C | Webhook: fire-and-forget slip detection (FB + LINE) | 🤖 Antigravity | ✅ |
| 26.D | `src/lib/repositories/paymentRepo.js` — CRUD + getMonthlyRevenue | 🤖 Antigravity | ✅ |
| 26.E | API: `POST /api/payments/verify/[id]` + `GET /api/payments/pending` | 🤖 Antigravity | ✅ |
| Tests | 186 cases / 25 files — 100% pass (รวม slipParser + paymentRepo + webhook) | 🤖 Antigravity | ✅ |

> ⚠️ **Known Gotcha — firstTouchAdId historical**: conversation ที่สร้างก่อน v0.26.0 จะมี firstTouchAdId = null
> ⚠️ **Known Gotcha — confidence threshold**: 0.80 — สลิปไม่ชัด/ถ่ายเอียงอาจต่ำกว่า threshold → ต้อง manual add
> ⚠️ **Known Gotcha — refNumber duplicate**: LINE ลูกค้า forward สลิปซ้ำ → unique constraint reject อัตโนมัติ
> ✅ **ADR-039 written:** docs/adr/039-chat-first-revenue-attribution.md

---

## ✅ Phase 27: Upstash Infrastructure Migration
> **Goal:** ลบ local Docker dependency ทั้งหมด — zero local infra, deploy บน Vercel ได้เลย
> **Version:** v0.27.0 | **Implemented by:** Antigravity + Claude
> **ADR:** ADR-040 (docs/adr/040-upstash-infrastructure-migration.md ✅)

| # | Task | Who | Status |
|---|---|---|---|
| 27.1 | `src/lib/redis.js` → ioredis → @upstash/redis REST client | 🤖 Antigravity | ✅ |
| 27.2 | `src/lib/notificationEngine.js` → queue.add() → qstash.publishJSON() | 🤖 Antigravity | ✅ |
| 27.3 | `src/app/api/workers/notification/route.js` — Vercel endpoint + QStash sig verify | 🤖 Antigravity | ✅ |
| 27.4 | ลบ `notificationWorker.mjs` + `queue.js` + bullmq จาก package.json | 🤖 Antigravity | ✅ |

> ⚠️ **Known Gotcha — Upstash Free Tier**: Redis 10k req/day, QStash 500 msg/day
> ⚠️ **Known Gotcha — QStash Signature**: /api/workers/notification ต้อง verify เสมอ

---

## ✅ Phase 28: v1.0.0 Production Ready — Docs Hardening + ADR-041
> **Goal:** เตรียมทุก documentation ให้ตรงกับ HEAD (v0.27.0) + ประกาศ v1.0.0
> **Version Target:** v1.0.0 | **Implemented by:** Claude (Lead Architect)

### 28a — Documentation Completion

| # | Task | Who | Status |
|---|---|---|---|
| 28a.1 | Fix GOAL.md — Phase 15 sub-phases ✅, Phase 26 ADR ref, Phase 27 section | 🧠 Claude | ✅ |
| 28a.2 | Update `docs/API_REFERENCE.md` — เพิ่ม Phase 20/26/27 endpoints | 🧠 Claude | ✅ |
| 28a.3 | Update `docs/database_erd.md` — header + IngredientLot + Phase 26 fields | 🧠 Claude | ✅ |
| 28a.4 | Update `id_standards.yaml` — version header v0.18.0 → v0.27.0 | 🧠 Claude | ✅ |

### 28b — ADR-041 Production Launch Declaration

| # | Task | Who | Status |
|---|---|---|---|
| 28b.1 | Write `docs/adr/041-v1-production-launch.md` | 🧠 Claude | ✅ |

### 28c — v1.0.0 Release

| # | Task | Who | Status |
|---|---|---|---|
| 28c.1 | Update `CLAUDE.md` version table (v1.0.0 planned → in progress) | 🧠 Claude | ✅ |
| 28c.2 | Write `CHANGELOG.md` + `changelog/CL-20260319-005.md` | 🧠 Claude | ✅ |
| 28c.3 | Update `MEMORY.md` handover note | 🧠 Claude | ✅ |

---

## ✅ Phase 29: RBAC Redesign + Ads Optimize Write (ADR-045)
> **Goal:** ขยาย role จาก 6 → 8, เพิ่ม permissionMatrix.js central config, เพิ่ม Ads Optimize write routes
> **Version:** v1.4.0 | **Implemented by:** Claude (Lead Architect)
> **ADR:** ADR-045 (docs/adr/045-rbac-redesign-ads-optimize.md ✅)

| # | Task | Who | Status |
|---|---|---|---|
| 29.1 | `src/lib/permissionMatrix.js` — central permission config + can() helper | 🧠 Claude | ✅ |
| 29.2 | `src/lib/rbac.js` — VALID_ROLES → 8 roles uppercase | 🧠 Claude | ✅ |
| 29.3 | `src/lib/authOptions.js` — role validation uppercase | 🧠 Claude | ✅ |
| 29.4 | `src/components/TopBar.js` — ROLE_LABEL เพิ่ม MARKETING, HEAD_CHEF | 🧠 Claude | ✅ |
| 29.5 | `src/app/page.js` + components — แทน hardcoded role checks → can() | 🧠 Claude | ✅ |
| 29.6 | `src/app/api/ads/*/route.js` — 6 Ads Optimize write routes | 🧠 Claude | ✅ |
| 29.7 | `src/lib/repositories/adsOptimizeRepo.js` — Meta API write wrapper | 🧠 Claude | ✅ |
| 29.8 | `prisma/schema.prisma` → AdsOptimizeRequest — lifetime budget approval model | 🧠 Claude | ✅ |
| 29.9 | `docs/adr/045-rbac-redesign-ads-optimize.md` | 🧠 Claude | ✅ |
| 29.10 | `docs/implement_plan_phase29.md` | 🧠 Claude | ✅ |

> ⚠️ **Known Breaking Change**: ต้อง DB migration role values → UPPERCASE + เปลี่ยน NEXTAUTH_SECRET (force re-login)
> ⚠️ **Known Gotcha — 8 Roles**: MARKETING (L2.5) + HEAD_CHEF (L2.5) — domain specialist, ไม่สูงกว่า ADMIN

---

## ✅ Phase 30 (pre): V Point Loyalty + UI Overhaul
> **Goal:** ระบบสะสมคะแนน V Point + TopBar slim + Sidebar 3-mode + Neon chart
> **Version:** v1.5.0-pre | **Implemented by:** Claude
> **ADR:** ADR-046 (plan only — POS Receipt planned for v1.5.0)

| # | Task | Who | Status |
|---|---|---|---|
| 30.1 | `prisma/schema.prisma` → Customer vpPoints/totalVpEarned/totalSpend | 🧠 Claude | ✅ |
| 30.2 | `src/lib/repositories/customerRepo.js` — TIER_CONFIG, VP_RATE, calcVPoints, calculateTier, awardVPoints | 🧠 Claude | ✅ |
| 30.3 | `src/app/api/customers/[id]/vpoints/route.js` — NEW POST endpoint | 🧠 Claude | ✅ |
| 30.4 | `src/components/PremiumPOS.js` — CartCustomerSearch, CustomerCard, VP receipt card, reset on done | 🧠 Claude | ✅ |
| 30.5 | `src/components/TopBar.js` — slim h-10, breadcrumb left, search center | 🧠 Claude | ✅ |
| 30.6 | `src/components/Sidebar.js` — 3-mode (expanded/collapsed/hover), localStorage persist | 🧠 Claude | ✅ |
| 30.7 | `src/components/AdminPerformance.js` — NEON_PALETTE, MonthlyLineChart futuristic neon | 🧠 Claude | ✅ |

> ⚠️ **Known Gotcha**: default sidebar mode = `hover`, persisted in `localStorage` key `sidebarMode`
> ⚠️ **Known Gotcha**: VP award ไม่ block receipt display — fire-and-forget, errors logged in console only

---

## ✅ Phase 30 (UI): Employee Card Full Redesign + Task Board (v1.5.2)
> **Goal:** Redesign Employee card ให้ตรงกับ reference image (dark glass folder card) + Task Board
> **Version:** v1.5.2 | **Implemented by:** Claude
> **CL:** CL-20260322-001

| # | Task | Who | Status |
|---|---|---|---|
| UI.1 | Task Board (TaskPanel) + L0–L5 priority + sidebar badge | 🧠 Claude | ✅ |
| UI.2 | RBAC guard + canManage + Status toggle + Role selector in modals | 🧠 Claude | ✅ |
| UI.3 | JWT auto-refresh from DB every 5 min (stale session fix) | 🧠 Claude | ✅ |
| UI.4 | ThumbnailStrip — centered wheel carousel (ResizeObserver + Framer Motion spring) | 🧠 Claude | ✅ |
| UI.5 | Dark glass SVG card — base + tint + glow + border layers, opacity 0.92 | 🧠 Claude | ✅ |
| UI.6 | KpiBlock (Revenue, Customers, CloseRate) + Sparkline SVG (role-color area + glow) | 🧠 Claude | ✅ |
| UI.7 | StatusToggle bare + Priority bar L0–L5 + smoke/haze effects + FAB | 🧠 Claude | ✅ |
| UI.8 | Fix Employee IDs: TVS-EMP-2026-XXXX → TVS-EMP-XXXX (DB + code) | 🧠 Claude | ✅ |
| UI.9 | SVG folder shape — final: 1 tab + 3 Q bezier rounded corners (match reference) | 🧠 Claude | ✅ |

> ⚠️ **Known Gotcha — SVG path**: 4 identical path strings in EmployeeManagement.js (base/tint/glow/border) — update all 4 when changing shape
> ⚠️ **SVG Final Path**: `M 28 0 Q 0 0 0 28 L 0 344 Q 0 372 28 372 L 344 372 Q 372 372 372 344 L 372 100 L 322 0 Z` (viewBox 0 0 372 372)
