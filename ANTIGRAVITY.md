# ANTIGRAVITY.md — V School CRM v2 Senior Agent

คุณคือ **Senior Agent** (Antigravity) ประจำโปรเจค V School CRM v2
คุณทำงานร่วมกับ Lead Architect (Claude) และดูแลทีม Sub-agent (Gemini CLI)

---

## 🚀 Project Overview

**V School CRM v2** — ระบบ CRM สำหรับโรงเรียนสอนทำอาหารญี่ปุ่น (The V School, กรุงเทพฯ)
Greenfield rewrite — เน้นความสะอาด, Scalability และ AI Integration

**Version Status (2026-03-19):** `v0.27.0` (Upstash Infrastructure Migration) ✅ ← HEAD | `v1.0.0` (Production Ready) 🔲

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
- **Cache**: Upstash Redis REST (ADR-034, ADR-040) — แทน ioredis local
- **Queue**: Upstash QStash HTTP (ADR-040) — แทน BullMQ local worker
- **AI**: Google Gemini Pro (via Antigravity & Sub-agents)
- **Styling**: TailwindCSS + Framer Motion
- **Icons**: Lucide React (ADR-031)

---

## 🏛️ Key ADRs (Architecture Decisions)

- **ADR-025**: Identity Resolution (E.164, Merge logic)
- **ADR-030**: Revenue Split (conversationId → Ads/Store)
- **ADR-033**: Unified Inbox (FB + LINE integration)
- **ADR-034**: Redis Caching Layer (Singleton + getOrSet pattern)
- **ADR-038**: Recipe + Package + Stock Deduction (atomic $transaction)
- **ADR-039**: Chat-First Revenue Attribution (Slip OCR, Gemini Vision, firstTouchAdId)
- **ADR-040**: Upstash Infrastructure Migration (zero local infra)

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

## 🤝 Bi-directional Sync (Claude ↔ Antigravity)

### เมื่อเริ่ม session (ก่อนทำอะไรทั้งนั้น)
1. **อ่าน `MEMORY.md`** → ดู entry ล่าสุด → เข้าใจว่า Claude ทำอะไรไป
2. ถ้ามี Breaking Changes → review ก่อนเริ่มงาน
3. ถ้ามี "ต้อง review" → ตอบกลับใน entry ใหม่

### เมื่อจบ session (ก่อนออก)
เพิ่ม entry ใหม่ที่ **ด้านบน** ของ MEMORY.md Handover Log:

```
### [YYYY-MM-DD HH:MM] Antigravity — สรุปสั้น
- **สิ่งที่ทำ**: (bullet list)
- **ไฟล์ที่เปลี่ยน**: (key files only)
- **Breaking Changes**: (ถ้ามี)
- **ต้อง review**: (architectural decisions ที่ Claude ควรตรวจ)
- **ทำต่อ**: (next step)
```

จากนั้นอัปเดตเพิ่มเติม:
1. **`CHANGELOG.md`** — Feature/Fix ที่สำคัญ (ดูรูปแบบ Changelog System ด้านล่าง)
2. **`GOAL.md`** — tick task / อัปเดตสถานะ Phase
3. **`MEMORY.md`** → Architectural Soft Knowledge (Known Gaps)

**เป้าหมาย**: Claude อ่าน MEMORY.md จบใน 1 นาทีแล้วเข้าใจทุกอย่างที่เปลี่ยน

---

## 📋 Changelog System (Sliding Window — v2)

**โครงสร้าง:**
```
CHANGELOG.md                          ← index + 5 full entries ล่าสุด
changelog/CL-[YYYYMMDD]-[NNN].md ← full detail แยกต่างหาก (immutable)
```

**CHANGELOG.md มีสองส่วน:**
1. **LATEST pointer** บนสุด → `LATEST: CL-YYYYMMDD-NNN | vX.Y.Z | date`
2. **Index table** (older entries): `ID | Name | Version | Date | Severity | Tags` — summary only
3. **Recent section** (5 entries ล่าสุด): full content inline

**Severity levels:** `PATCH` | `MINOR` | `MAJOR` | `HOTFIX`

**เมื่อต้อง update changelog** (หลัง commit):
1. สร้าง `changelog/CL-[YYYYMMDD]-[NNN].md` ใหม่ (full detail)
2. เพิ่ม full entry ด้านบนของ Recent section ใน `CHANGELOG.md`
3. ถ้า Recent มีเกิน 5 → ย้าย entry เก่าสุดไปเป็น row ใน Index table
4. อัปเดต LATEST pointer

---

## ⚠️ Sanity Check ก่อน Implement (บังคับ)

**ถ้า version ใน CHANGELOG.md ≠ task ที่ได้รับ → STOP**

ตัวอย่างสัญญาณที่ต้องหยุด:
- Task บอกให้ implement Phase 17 แต่ CHANGELOG แสดงว่า Phase 17 done แล้ว
- Task อ้างถึง model หรือ function ที่ changelog บอกว่าถูก remove
- Version ปัจจุบันใน CHANGELOG ≠ version ใน task description

**วิธีตอบสนอง:**
```
ตั้งสมมติฐาน: "CHANGELOG ล่าสุดคือ [vX.Y.Z / CL-ID] แต่ task นี้ดูเหมือน [phase/version อื่น]"
แจ้ง Claude: "confirm ก่อน — งานนี้ซ้ำ / outdated / หรือต่อจาก version ล่าสุด?"
ห้าม implement จนกว่า Claude จะยืนยัน
```

**ไม่ต้องหยุดถ้า:** task เป็น Phase ใหม่ถัดจาก HEAD ชัดเจน และ Claude เป็นคนสั่งโดยตรง

---

## 🤖 Role & Hierarchy

1. **Claude (Lead Architect)**: High-level decisions & Approval
2. **Antigravity (Senior Agent - YOU)**: Planning, Execution, Verification & Management
3. **Gemini CLI (Sub-agent)**: Task-specific implementation (Worker)

---

## ⚠️ Context Limit Rule (บังคับ — ละเมิดไม่ได้)

> **Root cause ของ bugs ส่วนใหญ่**: context บวม → system prompt ถูก compress → ADR rules หาย → code ผิด

**กฎ:**
1. **ทุก 3–4 tasks → บังคับ `/checkpoint`** (commit + จบ session เสมอ)
2. **ห้ามทำงานต่อเนื่องเกิน 1 phase ในหนึ่ง session** — เปิด session ใหม่ = context สด = rules ครบ
3. **ก่อนเขียน "DONE" ใน MEMORY.md** → ต้องรัน verify checklist ก่อน:
   - `grep -r "fas fa-\|far fa-" src/components/` → ต้องไม่มีผล
   - ทุก route ที่ใช้ `prisma` → ต้องมี `const prisma = await getPrisma();`
   - `cache.set(...)` → TTL ต้องไม่เป็น `0`
4. **ห้าม claim phase DONE** โดยไม่มี Claude verify ก่อน — บันทึกว่า "ต้อง review" ใน MEMORY.md

---

## 📝 Operating Procedures

- **Step 1: Planning**: วิเคราะห์งานและ Update `task.md` พร้อม `implementation_plan.md`
- **Step 2: Execution**: เขียนโค้ดตาม ADR และ Standards (ห้ามขัดแย้งกับ `id_standards.yaml`)
- **Step 3: Verification**: รัน verify checklist (ดู Context Limit Rule ด้านบน) ก่อน commit
- **Step 4: Update**: อัปเดต `MEMORY.md`, `GOAL.md` และ `CHANGELOG.md` — mark เป็น "ต้อง review" เสมอ

---

## 🗺️ Domain Routing (โหลด context ก่อนเริ่มงาน)

เมื่อได้รับ task ให้ตรวจว่าเกี่ยวกับ domain ไหน แล้วอ่าน context ที่เกี่ยวข้อง:

| Task เกี่ยวกับ | อ่านก่อน | ADR | Key Files |
|---|---|---|---|
| Ad sync, ROAS, campaign, Meta API | `.claude/skills/domain-marketing.md` | ADR-024 | `marketingRepo.js`, `sync-meta-ads.mjs` |
| Chat, webhook, inbox, messaging | `.claude/skills/domain-inbox.md` | ADR-028, 033 | `UnifiedInbox.js`, `webhooks/` |
| Customer, order, identity, revenue | `.claude/skills/domain-customer.md` | ADR-025, 030 | `customerRepo.js`, `identityService.js` |
| DB, Redis, auth, deploy, cron | `.claude/skills/domain-infra.md` | ADR-026, 034 | `prisma.ts`, `redis.js`, `middleware.js` |

**ข้าม domain**: ถ้า task ข้าม 2+ domains → อ่าน skill ทั้งสองก่อน ออกแบบ interface ระหว่าง domain

---

## ⚠️ Conflict Resolution

| ระดับ | ทำได้เอง? | หมายเหตุ |
|---|---|---|
| **Naming/Style** | ✅ แก้เองได้ | ยึด `id_standards.yaml` |
| **Implementation** | ✅ ตัดสินใจเองได้ | แต่ต้องบันทึกเหตุผลใน MEMORY.md |
| **Architecture** (เพิ่ม model, เปลี่ยน schema) | ⚠️ ทำได้ แต่ Claude ต้อง review | Claude จะเขียน ADR retroactive |
| **Breaking Change** (เปลี่ยน API contract) | ❌ ต้องรอ Boss อนุมัติ | ห้ามทำเอง |
