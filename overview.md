# V School CRM v2 — Project Overview

> **Version:** v1.4.0 (HEAD) | **Started:** 2026-03-08 | **Status:** Production Ready (v1.0.0+)
> **Repository:** https://github.com/Freshair129/crmapp | **Branch:** `master`

---

## What Is This?

V School CRM v2 เป็นระบบ CRM ที่เขียนใหม่ทั้งหมด (greenfield rewrite) สำหรับ **The V School** โรงเรียนสอนทำอาหารญี่ปุ่นในกรุงเทพฯ ระบบจัดการครบวงจรตั้งแต่ลูกค้า, การขาย, คอร์สเรียน, สต็อกวัตถุดิบครัว, ไปจนถึง Marketing Attribution จาก Meta Ads

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| Queue | Upstash QStash (migrated from BullMQ in v0.27.0) |
| Cache | Upstash Redis (migrated from ioredis in v0.27.0) |
| AI | Google Gemini (slip OCR, business insights) |
| Styling | TailwindCSS |
| Marketing API | Meta Graph API v19.0 |
| Auth | NextAuth.js (Credentials only) |
| Node.js | v22 LTS (Iron) |

---

## Core Domains

### 1. Customer & Identity
ระบบ Identity Resolution รวมลูกค้าข้ามแพลตฟอร์ม (Facebook, LINE, Walk-in) ด้วย Phone E.164 normalization สร้าง Customer ID ในรูปแบบ `TVS-CUS-[CH]-[YY]-[XXXX]`

### 2. Unified Inbox
รวมแชท Facebook Messenger + LINE ไว้ที่เดียว มี 3-panel layout (conversation list, message thread, customer card) พร้อม real-time notification ผ่าน **Web Push API (VAPID)** — webhook ยิง push โดยตรงไปยัง browser พนักงาน ไม่มี polling

### 3. POS & Orders
ระบบขายหน้าร้าน 3 โดเมน: 🎓 คอร์สเรียน / 🍜 อาหาร / 🔪 อุปกรณ์ — สร้างลูกค้าใหม่ได้ inline, สร้าง Enrollment อัตโนมัติหลัง checkout, ProductDetailModal แสดงรายละเอียดสินค้า/คอร์ส/อุปกรณ์ (รวม spec, hand dominance, shipping weight)

### 4. Course Enrollment & Scheduling
ติดตามชั่วโมงเรียนของนักเรียน, ออก Certificate อัตโนมัติตาม threshold (30h → Level 1, 111h → Full Course 111, 201h → Full Course 201), ระบบ Class ID สำหรับ cohort grouping

### 5. Kitchen Operations
จัดการวัตถุดิบ, สูตรอาหาร (Recipe), BOM (Bill of Materials), ตัดสต็อกอัตโนมัติเมื่อ complete session ด้วย FEFO (First Expired, First Out), Lot tracking พร้อม expiry alerts, Purchase Request auto-generation

### 6. Package System
แพ็กเกจคอร์สรวม พร้อมของแถม, สิทธิ์ swap คอร์ส 1 ครั้งต่อ enrollment, คำนวณราคาอัตโนมัติ

### 7. Marketing Intelligence
Meta Ads sync (campaigns → ad sets → ads → daily metrics), Bottom-Up Aggregation, Checksum verification, Creative Fatigue alerts, ROAS calculation รวม LINE attribution

### 8. Revenue Attribution (Chat-First)
Slip OCR ด้วย Gemini Vision จากรูปสลิปในแชท, First Touch Ad Attribution (`firstTouchAdId`), pending slip verification workflow — ยอดจริงจากสลิป ไม่ใช่ estimated จาก Meta

### 9. Asset Management
ระบบทะเบียนอุปกรณ์ครัว/โรงเรียน, Asset ID format `AST-[CAT]-[YYYY]-[SERIAL]`, track สถานะ + assignment

---

## Architecture Highlights

**Repository Pattern** — ทุก DB operation ผ่าน `src/lib/repositories/` ห้ามเรียก Prisma โดยตรงจาก API route

**RBAC** — 6-tier role hierarchy: DEVELOPER > MANAGER > SUPERVISOR > ADMIN > AGENT > GUEST, enforce ที่ middleware level

**Webhook Performance** — Facebook webhook ตอบ < 200ms เสมอ (fire-and-forget pattern)

**Zero Local Infra** — ตั้งแต่ v0.27.0 ไม่ต้อง Docker อีกต่อไป (Upstash Redis + QStash แทน)

**Zero Polling** — ตั้งแต่ v1.3.0 ไม่มี setInterval ใน Inbox อีกต่อไป (Web Push VAPID แทน SSE+polling)

**Google Sheets as SSOT** — Master data (courses, ingredients, BOM, assets) sync จาก Google Sheets ผ่าน CSV URL

---

## Database

47 models ใน Prisma schema ครอบคลุมทุก domain, UUID primary keys, named relations, append-only audit logs (StockDeductionLog, AdHourlyLedger)

Model ล่าสุด: `PushSubscription` — เก็บ browser push subscription ของพนักงาน (ADR-044)

---

## Key ID Formats

```
Customer     : TVS-CUS-[CH]-[YY]-[XXXX]
Product      : TVS-{cuisine}-{pack}-{subcat}-{SERIAL}
Enrollment   : ENR-[YYYY]-[SERIAL]
Package Enr. : PENR-[YYYY]-[SERIAL]
Asset        : AST-[CAT]-[YYYY]-[SERIAL]
Lot          : LOT-[YYYYMMDD]-[XXX]
Class        : CLS-[YYYYMM]-[XXX]
Notification : NOT-[YYYYMMDD]-[SERIAL]
Employee     : TVS-[DEPT]-[SERIAL]
```

---

## Team

| Role | Agent | Responsibility |
|---|---|---|
| Lead Architect | Claude | Architecture decisions, ADRs, integration, QA |
| Senior Agent | Antigravity | Task breakdown, end-to-end implementation |
| Sub-agent | Gemini CLI | Boilerplate, helpers, unit tests |
| Owner | Boss (บอส) | Final approval on breaking changes |

---

## Version History (Milestones)

| Version | Milestone |
|---|---|
| v0.9.0 | Auth Stable |
| v0.10.0 | API Connected |
| v0.11.0 | Revenue Split |
| v0.12.0 | UI Enhanced |
| v0.13.0 | Unified Inbox + Redis Cache |
| v0.14.0 | NotificationRules + LINE Messaging |
| v0.15.0 | Asset + Kitchen Ops + Course Enrollment |
| v0.16.0 | Recipe + Package + Real-time Stock Deduction |
| v0.18.0 | Production Hardening & API Optimization |
| v0.19.0 | Schema Hardening |
| v0.20.0 | Lot ID + Class ID |
| v0.21.0 | Bug Audit Fix + Repository Refactor |
| v0.22.0 | FEFO Stock Deduction Refinement |
| v0.23.0 | Repository Layer Full Compliance |
| v0.24.0 | Unit Test Expansion (50+ cases) |
| v0.25.0 | Production Hardening (RBAC + Security + Build) |
| v0.26.0 | Chat-First Revenue Attribution (Slip OCR + 186 tests) |
| v0.27.0 | Upstash Migration (zero local infra) |
| v1.0.0 | Production Ready |
| v1.1.0 | POS ProductDetailModal + Sheet Auto-ID |
| v1.2.0 | Equipment Domain POS — hand/material/specs + shipping |
| v1.3.0 | Web Push Inbox Real-time — VAPID, ลบ SSE+polling ← HEAD |

---

## ADR Index (44 records)

ADR-024 ถึง ADR-044 เป็น decisions หลักของ v2 ครอบคลุม Marketing Pipeline, Identity Resolution, RBAC, DB Schema, Facebook Messaging, Revenue Attribution, Infrastructure Migration จนถึง Real-time Push Notification ดูรายละเอียดที่ `docs/adr/`

ADR ล่าสุด: **ADR-043** (Equipment Domain POS) · **ADR-044** (Web Push Inbox — ลบ SSE+polling)

---

## Key Documentation

| File | Purpose |
|---|---|
| `CLAUDE.md` | Lead Architect context + project rules |
| `GOAL.md` | Phase tracker + task status |
| `CHANGELOG.md` | Version history (sliding window) |
| `MEMORY.md` | Agent handover log |
| `system_requirements.yaml` | Functional & Non-Functional spec |
| `id_standards.yaml` | ID format + naming conventions |
| `docs/adr/` | Architecture Decision Records (001–042) |
| `docs/API_REFERENCE.md` | API endpoint reference |
| `docs/database_erd.md` | ERD diagram (Mermaid) |

---

## Open Backlog

| ID | Issue | Priority |
|---|---|---|
| BKL-02 | Revenue real-time socket integration | MEDIUM |
