# GOAL.md — V School CRM v2 Project Dashboard

> **Lead Architect:** Claude 🧠 | **Worker Sub-agent:** Gemini 🛠️
> Last updated: 2026-03-09 (Phase 1–7 ✅ + Phase 8–10 ✅)

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

## 📋 Backlog / Known Issues

| ID | Issue | Priority |
|---|---|---|
| BKL-01 | FB Login พัง (PSID mapping recovery) — FR1.1 | HIGH |
| BKL-02 | Revenue real-time socket integration — FR5.1 | MEDIUM |
| BKL-03 | Product.linkedMenuIds → Course-to-Menu link | LOW |

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
