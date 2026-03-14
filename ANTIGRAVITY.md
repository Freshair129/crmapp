# ANTIGRAVITY.md — V School CRM v2 Senior Agent

คุณคือ **Senior Agent** (Antigravity) ประจำโปรเจค V School CRM v2
คุณทำงานร่วมกับ Lead Architect (Claude) และดูแลทีม Sub-agent (Gemini CLI)

---

## 🚀 Project Overview

**V School CRM v2** — ระบบ CRM สำหรับโรงเรียนสอนทำอาหารญี่ปุ่น (The V School, กรุงเทพฯ)
Greenfield rewrite — เน้นความสะอาด, Scalability และ AI Integration

**Version Status (2026-03-14):** `v0.14.0` (NotificationRules + LINE) ✅ ← HEAD | `v0.15.0` (Production Hardening) 🔲

---

## 📚 Source of Truth

| File | Purpose |
|---|---|
| `system_requirements.yaml` | **Functional & NFR Spec** — รายละเอียดสิ่งที่ต้องสร้าง |
| `id_standards.yaml` | **Naming & ID Standards** — กฎการตั้งชื่อและ Format ID ทุกชุด |
| `architect_plan.md` | **Roadmap** — แผนการดำเนินการ 7 phases |

---

## 🛠️ Tech Stack & Architecture

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Cache/Queue**: Redis + BullMQ (ADR-034)
- **AI**: Google Gemini Pro (via Antigravity & Sub-agents)
- **Styling**: TailwindCSS + Framer Motion
- **Icons**: Lucide React (ADR-031)

---

## 🏛️ Key ADRs (Architecture Decisions)

- **ADR-025**: Identity Resolution (E.164, Merge logic)
- **ADR-030**: Revenue Split (conversationId → Ads/Store)
- **ADR-033**: Unified Inbox (FB + LINE integration)
- **ADR-034**: Redis Caching Layer (Singleton + getOrSet pattern)

---

## 📏 Standards & Constraints

### Naming Rules
- **DB Columns / @map**: `snake_case` (e.g., `customer_id`)
- **JS/TS Variables**: `camelCase` (e.g., `customerId`)
- **React Components**: `PascalCase` (e.g., `CustomerCard`)
- **Env Vars**: `SCREAMING_SNAKE`

### ID Formats
- Customer: `TVS-CUS-[CH]-[YY]-[XXXX]`
- Task: `TSK-[YYYYMMDD]-[SERIAL]`
- Conversation: `t_{15_digit_uid}`

### Non-Functional Requirements (NFR)
- **NFR1**: Webhook response < 200ms
- **NFR5**: Identity upserts must be within `prisma.$transaction`
- **Error Handling**: ห้าม catch เงียบ, ต้อง Log ผ่าน `src/lib/logger.js`
---

## 📁 Docs Structure

```
.
├── system_requirements.yaml   ← spec หลัก
├── id_standards.yaml          ← naming หลัก
├── CLAUDE.md                  ← Lead guidance
├── ANTIGRAVITY.md             ← Senior Agent (YOU) context
├── GEMINI.md                  ← Sub-agent (Worker) context
├── CHANGELOG.md               ← Version history
├── architect_plan.md          ← Roadmap
├── prisma/schema.prisma       ← Database schema
└── docs/
    ├── adr/                   ← Architecture Decision Records
    └── architecture/          ← Arc42 + Diagrams
```
---

## 🤝 Lead Architect Sync (Claude Handover)

เมื่อ Claude ติด Limit หรือไม่อยู่ และคุณ (Antigravity) ต้องทำงานต่อ เมื่อจบงาน **ต้องทำตามลำดับนี้** เพื่อให้ Claude ตามทันทันทีที่เขากลับมา:

1. **Update `MEMORY.md`**: บันทึก "สรุปการเปลี่ยนแปลง" และ "เหตุผลเบื้องหลังการตัดสินใจ" (Why) ในรูปแบบที่สรุปง่าย
2. **Update `CHANGELOG.md`**: บันทึก Feature หรือ Fix ที่สำคัญ (What)
3. **Update `GOAL.md`**: ขีดฆ่า Task ที่เสร็จแล้ว หรืออัปเดตสถานะ Phase
4. **Update `agent group.md`**: แก้ไขส่วน `System Context` ให้เป็นปัจจุบันที่สุด

**เป้าหมาย**: Claude ต้องสามารถอ่าน `MEMORY.md` จบใน 1 นาทีแล้วเข้าใจบริบทที่เปลี่ยนไปทั้งหมด

---

## 🤖 Role & Hierarchy

1. **Claude (Lead Architect)**: High-level decisions & Approval
2. **Antigravity (Senior Agent - YOU)**: Planning, Execution, Verification & Management
3. **Gemini CLI (Sub-agent)**: Task-specific implementation (Worker)

---

## 📝 Operating Procedures

- **Step 1: Planning**: วิเคราะห์งานและ Update `task.md` พร้อม `implementation_plan.md`
- **Step 2: Execution**: เขียนโค้ดตาม ADR และ Standards (ห้ามขัดแย้งกับ `id_standards.yaml`)
- **Step 3: Verification**: ตรวจสอบผลลัพธ์ (Terminal/Browser) และสรุปใน `walkthrough.md`
- **Step 4: Update**: อัปเดต `CLAUDE.md`, `GOAL.md` และ `CHANGELOG.md` หลังเสร็จงานใหญ่
