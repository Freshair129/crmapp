# V School CRM v2 — Project Overview

> **Version:** v1.9.0 (HEAD) | **Started:** 2026-03-08 | **Status:** Production Ready (v1.0.0+)
> **Repository:** https://github.com/Freshair129/crmapp | **Branch:** `master`

---

## What Is This?

V School CRM v2 เป็นระบบ CRM ที่เขียนใหม่ทั้งหมด (greenfield rewrite) สำหรับ **The V School** โรงเรียนสอนทำอาหารญี่ปุ่นในกรุงเทพฯ ระบบจัดการครบวงจรตั้งแต่ลูกค้า, การขาย, คอร์สเรียน, สต็อกวัตถุดิบครัว, จัดซื้อ, คลังสินค้า, ไปจนถึง AI Intelligence ระดับ NotebookLM

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| Queue | Upstash QStash (Serverless Job Queue) |
| Cache | Upstash Redis (Serverless Cache) |
| AI | Google Gemini 2.0 Flash (OCR, AI Reply, NotebookLM Intelligence) |
| Protocol | Model Context Protocol (MCP) — AI-Native Standard |
| Styling | TailwindCSS |
| Marketing API | Meta Graph API v19.0 |
| Auth | NextAuth.js (Credentials only) |
| Node.js | v22 LTS (Iron) |

---

## Core Domains

### 1. Customer & Identity
ระบบ Identity Resolution รวมลูกค้าข้ามแพลตฟอร์ม (Facebook, LINE, Walk-in) พร้อม **V Point Loyalty System** และ **Fuzzy Thai Name Matching (ADR-043)**

### 2. Unified Inbox & AI Reply
รวมแชท FB + LINE ไว้ที่เดียว พร้อมระบบ **Web Push API (VAPID)** และ **AI Reply Assistant (Gemini 2.0)** ที่เข้าใจบริบทความรู้ของโรงเรียนและสไตล์การตอบของแอดมิน

### 3. POS & Orders
ระบบขายหน้าร้าน 3 โดเมน: 🎓 คอร์สเรียน / 🍜 อาหาร / 🔪 อุปกรณ์ พร้อมการออกใบเสร็จ (Thermal 80mm), ระบบตัดแต้ม V Point และการตัดสต็อก Real-time

### 4. Course Enrollment & Scheduling
ติดตามชั่วโมงเรียน, ออก Certificate อัตโนมัติ (30h/111h/201h), ระบบ Class Cohort สำหรับจัดการกลุ่มนักเรียนที่เรียนต่อเนื่องหลายวัน

### 5. Procurement Lifecycle
ระบบจัดซื้อครบวงจร: Supplier Master -> BOM Calculation -> PO Lifecycle -> Multi-stage Approval -> Goods Received (GRN) -> Credit Notes & Returns

### 6. Advanced Inventory Control
จัดการคลังสินค้าหลายจุด (Multi-Warehouse), การเคลื่อนไหวสต็อก (Stock Movement), การตรวจนับ (Physical Count), และการรองรับ Barcode EAN13

### 7. Kitchen Operations & FEFO
จัดการวัตถุดิบและสูตรอาหาร (Recipe) พร้อมการตัดสต็อกอัตโนมัติแบบ **FEFO (First Expired, First Out)** จากลล็อตวัตถุดิบจริง

### 8. Marketing & Ads Optimization
Meta Ads sync พร้อมระบบ **Ads Optimize (Write Access)**: พนักงานสามารถ Pause/Resume แคมเปญ หรือปรับงบประมาณได้โดยตรงจากหน้า CRM (ADR-045)

### 9. NotebookLM Intelligence
ระบบวิเคราะห์บทสนทนารายวัน สร้างสรุปใจความสำคัญและ **Knowledge Tree (Mermaid.js)** อัตโนมัติ เพื่อให้เห็นภาพรวมความสนใจของลูกค้าในรูปแบบแผนภูมิ

---

## Architecture Highlights

**Repository Pattern** — ทุก DB operation ผ่าน `src/lib/repositories/` แยก Business Logic ออกจาก API Route ชัดเจน

**RBAC v2** — 8-tier hierarchy: DEVELOPER > MANAGER > ADMIN > MARKETING > HEAD_CHEF > EMPLOYEE > AGENT > GUEST

**AI-Native (MCP)** — รองรับ Model Context Protocol ทำให้ AI Agents (เช่น Claude Desktop) สามารถสั่งงานระบบ CRM ผ่าน Tools มาตรฐานได้โดยตรง (ADR-050)

**Zero Local Infra** — ระบบรันบน Cloud แบบ Serverless ทั้งหมด (Vercel + Supabase + Upstash) ไม่ต้องมี Local Docker

---

## Key ID Formats

```
Customer     : TVS-CUS-[CH]-[YYMM]-[XXXX]
Employee     : TVS-[TYPE]-[DEPT]-[NNN] (v3)
Product      : TVS-{cuisine}-{pack}-{subcat}-{SERIAL}
Enrollment   : ENR-[YYYY]-[SERIAL]
Purchase Order: PO-YYYYMMDD-SERIAL
Ingredient Lot: LOT-YYYYMMDD-XXX
Certificate  : TVS-CERT-YYYYMMDD-XXX
```

---

## Version History (Recent Milestones)

| Version | Milestone |
|---|---|
| v1.5.0 | V Point Loyalty + UI Overhaul (Neon Charts) |
| v1.5.2 | POS Receipt & Printer Integration (ADR-046) |
| v1.6.0 | Inventory Control + Procurement PO Lifecycle (ADR-048, ADR-049) |
| v1.7.0 | MCP Server — Dual Transport stdio + HTTP (ADR-050) |
| v1.8.0 | Meta Ads Optimization (Write) via MCP |
| v1.9.0 | NotebookLM Chat Intelligence + Knowledge Tree (HEAD) |

---

## ADR Index (50 records)

ADR-024 ถึง **ADR-050** เป็นโครงสร้างหลักของ v2 ครอบคลุมตั้งแต่การ Sync Ads, Identity, RBAC, Kitchen Ops, จนถึงการเป็น AI-Native CRM ผ่าน MCP

---

## Open Backlog

| ID | Issue | Priority |
|---|---|---|
| BKL-02 | Revenue real-time socket integration | MEDIUM |
| BKL-03 | Advanced AI Forecast for Inventory | LOW |
