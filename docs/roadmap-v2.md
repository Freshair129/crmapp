# V School CRM v2 — Roadmap (Post v1.9.0)

> **Lead Architect:** Claude 🧠 | **Senior Agent:** Antigravity 🤖 | **Worker Sub-agent:** Gemini 🛠️
> **Updated:** 2026-03-22 | **Current HEAD:** v1.9.0 (NotebookLM Chat Intelligence)

---

## 🗺️ Overview

| Phase | Version | ชื่อ | Priority | Agent |
|---|---|---|---|---|
| Phase 33 | v2.0.0 | Visual Calendar + Class Attendance | 🔴 HIGH | Antigravity |
| Phase 34 | v2.1.0 | Student Self-Service Portal | 🔴 HIGH | Antigravity |
| Phase 35 | v2.2.0 | Certificate PDF + Document Generation | 🟠 MEDIUM | Antigravity + Gemini |
| Phase 36 | v2.3.0 | AI Smart Inbox (Reply Draft + Lead Score) | 🟠 MEDIUM | Antigravity |
| Phase 37 | v2.4.0 | Procurement Completion (PO full lifecycle) | 🟡 MEDIUM | Antigravity |
| Phase 38 | v2.5.0 | Advanced BI + Reporting Export | 🟡 MEDIUM | Antigravity + Gemini |
| Phase 39 | v3.0.0 | Mobile PWA + WhatsApp Channel | 🟢 LOW | Antigravity |

---

## 🔴 Phase 33 — v2.0.0: Visual Calendar + Class Attendance

**Goal:** เปลี่ยน ScheduleCalendar จาก list-view → full drag-drop visual calendar + ระบบ mark attendance ต่อนักเรียนต่อ session

**ADR:** ADR-051 (ต้องเขียน — Claude)

**Rationale:** ปัจจุบัน FR7.3 (Class Attendance) และ FR8.2 (Calendar View) ยัง stub — staff ต้องใช้ Google Calendar แยก ทำให้ข้อมูลขาด

### Sub-tasks

| # | Task | Who | Notes |
|---|---|---|---|
| 33a | **Schema:** `ClassAttendance` model (studentId, scheduleId, status: PRESENT/ABSENT/LATE, notes) | 🧠 Claude | ADR-051 |
| 33b | **API:** `POST /api/schedules/[id]/attendance` — batch mark attendance | 🤖 Antigravity | array of { enrollmentId, status } |
| 33c | **API:** `GET /api/schedules/[id]/attendance` — student list for session | 🤖 Antigravity | join Enrollment + Customer |
| 33d | **UI:** FullCalendar component (`@fullcalendar/react`) — month/week/day view | 🤖 Antigravity | drag-drop reschedule → PATCH |
| 33e | **UI:** Attendance modal — checklist per student, mark present/absent/late | 🤖 Antigravity | opens from calendar event click |
| 33f | **Integration:** attendance count → `hoursCompleted` auto-increment on PRESENT | 🤖 Antigravity | hook into existing enrollmentRepo |
| 33g | **Tests:** attendance repo unit tests (10 cases) | 🛠️ Gemini | Vitest |
| 33h | **Docs:** ADR-051, update API_REFERENCE.md | 🧠 Claude | |

**Deliverable:** Calendar หน้าตาสวย, mark attendance ได้ต่อ session, hours auto-update

---

## 🔴 Phase 34 — v2.1.0: Student Self-Service Portal

**Goal:** หน้า portal ให้ลูกค้า (student) login เพื่อดู enrollment, hours, certificate progress, upload slip

**ADR:** ADR-052 (ต้องเขียน — Claude)

**Rationale:** ปัจจุบัน staff ต้องตอบคำถาม "เหลือกี่ชั่วโมง / ได้ cert ยัง" ซ้ำๆ ทุกวัน — portal ลด workload 60%+

### Sub-tasks

| # | Task | Who | Notes |
|---|---|---|---|
| 34a | **Auth:** STUDENT role + magic link login via LINE (OTP ส่งผ่าน LINE Messaging) | 🧠 Claude | ใช้ phone number เป็น identifier |
| 34b | **Schema:** `StudentSession` model หรือ extend Customer auth | 🧠 Claude | ADR-052 |
| 34c | **API:** `GET /api/portal/me` — enrollment list + hours + tier | 🤖 Antigravity | STUDENT role guard |
| 34d | **API:** `GET /api/portal/certificates` — cert status + download URL | 🤖 Antigravity | |
| 34e | **API:** `POST /api/portal/slips` — upload payment slip (reuse slipParser) | 🤖 Antigravity | fire-and-forget OCR |
| 34f | **UI:** `/portal` route — enrollment cards, hours progress bar, cert badge | 🤖 Antigravity | mobile-first, Tailwind |
| 34g | **UI:** Course catalog page `/portal/courses` — browse + request enrollment | 🤖 Antigravity | read-only from Products |
| 34h | **Middleware:** whitelist `/portal/*` + `/api/portal/*` → STUDENT role | 🧠 Claude | |
| 34i | **Tests:** portal API auth + enrollment display (8 cases) | 🛠️ Gemini | Vitest |
| 34j | **Docs:** ADR-052, update GEMINI.md routes section | 🧠 Claude | |

**Deliverable:** `/portal` ลูกค้า login ได้, เห็นข้อมูลตัวเอง, upload slip ได้

---

## 🟠 Phase 35 — v2.2.0: Certificate PDF + Document Generation

**Goal:** Generate ใบ certificate PDF อัตโนมัติเมื่อ hoursCompleted ถึง threshold + print/download

**Rationale:** ปัจจุบัน cert flag มีใน DB แต่ไม่มี PDF จริง — ต้อง print มือทุกใบ

### Sub-tasks

| # | Task | Who | Notes |
|---|---|---|---|
| 35a | **Template:** HTML certificate template (school logo, student name, course, date, director sig) | 🤖 Antigravity | Tailwind print CSS |
| 35b | **API:** `POST /api/certificates/generate/[enrollmentId]` — puppeteer → PDF | 🤖 Antigravity | ใช้ `@sparticuz/chromium` (Vercel-compatible) |
| 35c | **Storage:** upload PDF ไป Supabase Storage → return public URL | 🤖 Antigravity | bucket: `certificates` |
| 35d | **Schema:** `Certificate` model (enrollmentId, pdfUrl, issuedAt, certNumber) | 🧠 Claude | certNumber: CERT-YYYYMMDD-XXX |
| 35e | **Trigger:** auto-generate cert เมื่อ attendance marks หลัง threshold (30/111/201h) | 🤖 Antigravity | hook ใน enrollmentRepo.updateHours |
| 35f | **Portal:** download button ใน `/portal/certificates` | 🤖 Antigravity | |
| 35g | **Tests:** cert generation + storage (6 cases) | 🛠️ Gemini | mock Supabase Storage |
| 35h | **id_standards.yaml:** เพิ่ม CERT-YYYYMMDD-XXX format | 🧠 Claude | |

**Deliverable:** ใบ cert สร้างอัตโนมัติ, download ได้จาก portal

---

## 🟠 Phase 36 — v2.3.0: AI Smart Inbox

**Goal:** ต่อยอด NotebookLM Intelligence → AI draft reply + lead scoring + auto-tag conversations

**Rationale:** v1.9.0 วาง foundation (Knowledge Tree) แล้ว — phase นี้ทำให้ actionable

### Sub-tasks

| # | Task | Who | Notes |
|---|---|---|---|
| 36a | **AI Reply Draft:** `intelligenceRepo.draftReply(conversationId)` — Gemini drafts response based on context + customer profile | 🤖 Antigravity | return 3 draft options |
| 36b | **API:** `GET /api/inbox/conversations/[id]/draft` — returns AI draft options | 🤖 Antigravity | |
| 36c | **UI:** Draft bubble ใน UnifiedInbox — "AI แนะนำ" section ก่อน reply box | 🤖 Antigravity | click to fill textarea |
| 36d | **Lead Score:** `intelligenceRepo.calculateLeadScore(customerId)` — 0-100 based on: msg frequency, intent keywords, payment history, course interest | 🤖 Antigravity | Gemini classification |
| 36e | **Schema:** `Customer.leadScore` INT, `Customer.lastScoredAt` DateTime | 🧠 Claude | |
| 36f | **Auto-tag:** detect intent on every message → tag: `INQUIRY / PAYMENT / COMPLAINT / BOOKING / GENERAL` | 🤖 Antigravity | extend notificationEngine.evaluateRules() |
| 36g | **Schema:** `Conversation.intentTag` enum | 🧠 Claude | |
| 36h | **UI:** tag badge ใน conversation list | 🤖 Antigravity | color coded |
| 36i | **MCP:** +3 tools: `inbox.get_draft_reply`, `customer.get_lead_score`, `inbox.get_intent_tags` | 🧠 Claude | MCP version → 2.0.0 |
| 36j | **Tests:** draft reply + lead score mock (10 cases) | 🛠️ Gemini | |

**Deliverable:** Staff เห็น AI draft reply + lead score บน customer card + tags บน conversation list

---

## 🟡 Phase 37 — v2.4.0: Procurement Full Lifecycle Completion

**Goal:** Complete FR18 (PO full lifecycle) — Supplier master, multi-stage approval, GRN, advance payment

**Rationale:** v1.6.0 วาง schema + basic PO แล้ว แต่ approval workflow และ GRN ยังไม่ครบ

### Sub-tasks

| # | Task | Who | Notes |
|---|---|---|---|
| 37a | **Schema:** `Supplier` model (name, contactPerson, phone, address, paymentTerms, rating) | 🧠 Claude | ADR update ADR-049 |
| 37b | **API:** `GET+POST /api/suppliers` + `[id]` CRUD | 🤖 Antigravity | |
| 37c | **PO Approval workflow:** stage machine — DRAFT → CHEF_APPROVED → MANAGER_APPROVED → ORDERED | 🧠 Claude | can() RBAC gates |
| 37d | **API:** `POST /api/purchase-orders/[id]/approve` — role-gated approval step | 🤖 Antigravity | |
| 37e | **GRN:** `POST /api/purchase-orders/[id]/receive` — create GRN + auto-update IngredientLot.remainingQty | 🤖 Antigravity | transaction |
| 37f | **Advance Payment:** `POST /api/purchase-orders/[id]/advance` — record advance amount | 🤖 Antigravity | |
| 37g | **UI:** Procurement panel — PO list + approval buttons + GRN form | 🤖 Antigravity | role-aware buttons |
| 37h | **UI:** Supplier management page | 🤖 Antigravity | |
| 37i | **Tests:** PO lifecycle state machine (12 cases) | 🛠️ Gemini | |

**Deliverable:** PO ไหลจาก Draft → Approved → GRN → Stock updated ครบ loop

---

## 🟡 Phase 38 — v2.5.0: Advanced BI + Reporting Export

**Goal:** เพิ่ม business intelligence ให้ executive: forecast, cohort, export to Excel/CSV

### Sub-tasks

| # | Task | Who | Notes |
|---|---|---|---|
| 38a | **Revenue Forecast:** linear regression on last 6 months → next 3 months projection | 🤖 Antigravity | in-memory JS calc |
| 38b | **Cohort Analysis:** enrollment cohort retention (month 1/3/6 retention %) | 🤖 Antigravity | SQL window function |
| 38c | **Enrollment Funnel:** Lead → Trial → Enrolled → Graduated stage counts | 🤖 Antigravity | |
| 38d | **API:** `GET /api/analytics/forecast` + `/cohort` + `/funnel` | 🤖 Antigravity | cache Redis 1hr |
| 38e | **UI:** new BI dashboard tab in ExecutiveAnalytics | 🤖 Antigravity | Recharts LineChart + funnel |
| 38f | **Export:** `GET /api/export/revenue?month=YYYY-MM` → Excel (.xlsx via exceljs) | 🛠️ Gemini | |
| 38g | **Export:** `GET /api/export/students` → CSV of all enrollments | 🛠️ Gemini | |
| 38h | **MCP:** +2 tools: `analytics.get_forecast`, `analytics.get_cohort` | 🧠 Claude | |
| 38i | **Tests:** forecast calc + cohort SQL (8 cases) | 🛠️ Gemini | |

**Deliverable:** Boss กด Export ได้ทันที, เห็น forecast และ cohort บน dashboard

---

## 🟢 Phase 39 — v3.0.0: Mobile PWA + WhatsApp Channel

**Goal:** ทำให้ระบบใช้งานได้ดีบนมือถือ (staff) + เพิ่ม WhatsApp เป็น 3rd channel

**ADR:** ADR-053 (WhatsApp Integration)

### Sub-tasks

| # | Task | Who | Notes |
|---|---|---|---|
| 39a | **PWA:** update `public/manifest.json` + SW cache strategy (stale-while-revalidate) | 🤖 Antigravity | installable on iOS/Android |
| 39b | **Mobile UI:** Inbox responsive overhaul — bottom tab nav, swipe gestures | 🤖 Antigravity | ≤768px breakpoint |
| 39c | **WhatsApp:** Meta WhatsApp Business API webhook handler | 🧠 Claude | ADR-053 |
| 39d | **WhatsApp:** send/receive messages in UnifiedInbox (3rd channel) | 🤖 Antigravity | reuse conversation model |
| 39e | **WhatsApp:** identity resolution (phone → Customer merge) | 🧠 Claude | reuse identityService.js |
| 39f | **Camera Barcode:** `quagga2` library ใน browser → scan ingredient barcode → update stock | 🛠️ Gemini | mobile only |
| 39g | **Tests:** WhatsApp webhook handler (8 cases) | 🛠️ Gemini | |

**Deliverable:** Staff ใช้บนมือถือได้ full-featured, WhatsApp ใน inbox, scan barcode stock

---

## 📋 Agent Assignment Summary

| Agent | Phase 33 | Phase 34 | Phase 35 | Phase 36 | Phase 37 | Phase 38 | Phase 39 |
|---|---|---|---|---|---|---|---|
| 🧠 Claude | ADR-051, schema, middleware | ADR-052, auth, schema, middleware | schema, id_standards | schema, MCP tools | schema, state machine | MCP tools | ADR-053, webhook, identity |
| 🤖 Antigravity | API 33b-33f, UI 33d-33e | API 34c-34h, UI 34f-34g | API+storage 35b-35f | API 36b-36h, UI 36c, 36h | API 37b-37h, UI 37g-37h | API+UI 38a-38e | PWA, mobile UI, WhatsApp send/recv |
| 🛠️ Gemini | Tests 33g | Tests 34i | Tests 35g | Tests 36j | Tests 37i | Export 38f-38g, Tests 38i | Barcode 39f, Tests 39g |

---

## 🔑 Architecture Principles (ห้ามละเมิด)

1. **ทุก DB operation** ผ่าน repository layer เสมอ — ห้าม Prisma โดยตรงใน route
2. **Webhook** ตอบ < 200ms — ทุก heavy work ไปใน QStash (Upstash)
3. **ADR** ต้องเขียนก่อน implement ทุก architectural decision
4. **Breaking change** (API contract, schema migration) → Boss อนุมัติเท่านั้น
5. **MCP tools** เพิ่มทุก phase ที่มี data domain ใหม่

---

## 🚀 Recommended Start Order

```
Phase 33 → Phase 34 → Phase 35 → Phase 36 → Phase 37 → Phase 38 → Phase 39
  (calendar)  (portal)   (cert)    (AI inbox)  (procure)  (BI export)  (mobile)
```

Phase 33 ควรทำก่อนเพราะ unblocks Phase 34 (portal ต้องใช้ attendance data) และ Phase 35 (cert generation ต้องอิง attendance)
