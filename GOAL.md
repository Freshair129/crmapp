# GOAL.md — V School CRM v2 Project Dashboard

> **Lead Architect:** Claude 🧠 | **Senior Agent:** Antigravity 🤖 | **Worker Sub-agent:** Gemini 🛠️
> Last updated: 2026-03-18 (Phase 1–13 ✅ | Phase 15 ✅ | Phase 16 ✅ | Phase 18 ✅ | Phase 19 ✅ | Phase 20 ✅ | Phase 21 ✅)

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
| Phase 14 | Production Hardening + Testing | 🔲 Planned | 0/? |
| Phase 15 | Asset + Kitchen Ops + Course Enrollment | ✅ Done | 50/50 |
| Phase 16 | Recipe + Package + Real-time Stock Deduction | ✅ Done | 8/8 |
| Phase 17 | Repository Layer Refactor (Marketing/Inbox) | ✅ Done | — |
| Phase 18 | Production Hardening & API Optimization | ✅ Done | 4/4 |
| Phase 19 | Schema Hardening | ✅ Done | — |
| Phase 20 | Lot ID + Class ID (Stock Batches + Cohorts) | ✅ Done | — |
| Phase 20.5 | Bug Audit & Fix (Post-Antigravity) | ✅ Done | 6/6 |
| Phase 21 | FEFO Deduction in completeSession + Lot Integration | ✅ Done | 3/3 |
| Phase 22 | Repository Layer Refactor (Marketing/Inbox) | 🔲 Planned | 0/? |

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
| 15a | Prisma Schema + Migration (9 models) | 🔲 |
| 15b | Repository Layer + Business Logic + Unit Tests | 🔲 |
| 15c | API Routes (17 routes) | 🔲 |
| 15d | UI Components (8 components) | 🔲 |
| 15e | Sidebar Wiring + Google Sheets Template | 🔲 |

**New Models:** Enrollment, EnrollmentItem, CourseSchedule, ClassAttendance, Ingredient, CourseBOM, PurchaseRequest, PurchaseRequestItem, Asset

**Certificate Rule:** hoursCompleted ≥ 30 → Level 1 | ≥ 111 → Full Course 111 | ≥ 201 → Full Course 201

---

## 📋 Backlog / Known Issues

| ID | Issue | Priority |
|---|---|---|
| BKL-01 | ~~FB Login พัง (PSID mapping recovery) — FR1.1~~ | ~~HIGH~~ → **CLOSED** (ADR-035: FB hides admin PSID by design — won't fix) |
| BKL-02 | Revenue real-time socket integration — FR5.1 | MEDIUM |
| BKL-03 | ~~Product.linkedMenuIds → Course-to-Menu link~~ | ~~LOW~~ → **RESOLVED** by ADR-037 (Product-as-Course, Phase 15) |
| BKL-04 | **Login page + RBAC enforcement** — ปิดไว้ระหว่าง dev (middleware bypass `NODE_ENV=development`) **ไม่ได้ยกเลิก** — เปิดก่อน production deploy โดยลบ dev bypass block ใน `src/middleware.js` | PRE-PROD |

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
