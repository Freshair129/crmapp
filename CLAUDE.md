# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project

**V School CRM v2** — Greenfield rewrite ของระบบ CRM สำหรับ The V School (โรงเรียนสอนทำอาหารญี่ปุ่น, กรุงเทพฯ)

> ⚠️ นี่คือ v2 เขียนใหม่ทั้งหมด ไม่ใช่ refactor จาก `E:\data_hub`

---

## Source of Truth (ยึดสองไฟล์นี้เหนือสิ่งอื่นใด)

| ไฟล์ | หน้าที่ |
|---|---|
| `system_requirements.yaml` | WHAT to build — Functional & Non-Functional Requirements, API spec |
| `id_standards.yaml` | HOW to name — ID formats, casing conventions, ที่มาของ ID ทุกตัว |

**กฎ:** ถ้า code หรือ reference จาก `E:\data_hub` ขัดแย้งกับ 2 ไฟล์นี้ → ยึดตาม spec เสมอ

---

## Reference (ใช้ได้เมื่อไม่ขัดแย้ง)

- `E:\data_hub\crm-app\` — production codebase เก่า (messy, ใช้เป็น logic reference)
- `E:\crm\docs\adr\` — ADR 001–023 สำหรับเข้าใจ decisions ที่ผ่านมา

---

## Architecture Decisions ใหม่ (v2)

| ADR | Decision |
|---|---|
| ADR-024 | Marketing Intelligence: Bottom-Up Aggregation, Checksum, Hourly Ledger |
| ADR-025 | Identity Resolution: Phone E.164, Cross-platform Merge, LINE Attribution |
| ADR-026 | RBAC: 6-tier role hierarchy, server-side guard |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| Queue | Redis + BullMQ |
| AI | Google Gemini |
| Styling | TailwindCSS |
| Marketing API | Meta Graph API v19.0 |

---

## Naming Conventions (จาก `id_standards.yaml`)

| Context | Convention | ตัวอย่าง |
|---|---|---|
| DB columns / Prisma `@map` | `snake_case` | `customer_id`, `fb_thread_id` |
| JS/TS application code | `camelCase` | `customerId`, `fbThreadId` |
| React Components | `PascalCase` | `CustomerList`, `FacebookChat` |
| Env vars | `SCREAMING_SNAKE` | `FB_PAGE_ACCESS_TOKEN` |
| CSS | Tailwind utility classes | — |

**ห้ามใช้ `snake_case` ใน JS/TS layer เด็ดขาด**

---

## Key ID Formats (จาก `id_standards.yaml`)

```
Customer    : TVS-CUS-[CH]-[YY]-[XXXX]     e.g. TVS-CUS-FB-26-0123
Member      : MEM-[YY][AGENT][INTENT]-[NO] e.g. MEM-26BKKP-0001
Agent Code  : AGT-[TYPE]-[YEAR]-[SERIAL]   e.g. AGT-H-26-003
Task        : TSK-[YYYYMMDD]-[SERIAL]      e.g. TSK-20260308-001
Conversation: t_{15_digit_uid}             e.g. t_10163799966326505
Message     : mid.$c... หรือ m_...
Trace/Sync  : SYNC-[TYPE]-[YYYYMMDD]-[RND] e.g. SYNC-ADS-20260308-A92B
```

---

## Non-Functional Requirements (ห้ามละเมิด)

- **NFR1** — Webhook ตอบ Facebook < 200ms เสมอ
- **NFR2** — Dashboard API < 500ms (ใช้ local JSON cache)
- **NFR3** — BullMQ retry ≥ 5 ครั้ง, exponential backoff
- **NFR5** — Identity upsert ต้องอยู่ใน `prisma.$transaction`

---

## Error Handling Rules

- **ห้าม** `catch(e) {}` เงียบ — ต้อง log ทุกครั้ง
- Format: `console.error('[ModuleName] message', error)`
- API routes: `NextResponse.json({ error }, { status })`
- Workers: `throw error` เพื่อให้ BullMQ retry

---

## Database Access Pattern

- ทุก DB operation ต้องผ่าน repository layer (`src/lib/repositories/`)
- ห้ามเรียก Prisma โดยตรงจาก API route หรือ Component
- Cache operations ผ่าน `src/lib/cache/cacheSync.js` เท่านั้น
- File I/O ใช้ `fs.promises` เสมอ — ห้าม `readFileSync/writeFileSync`

---

## Sub-agent Protocol (Gemini CLI)

```bash
# รันจาก E:\crm เสมอ เพื่อให้ GEMINI.md โหลด context อัตโนมัติ
cd /e/crm
echo "INTERFACE_SPEC" | gemini -p "implement, code only" -o text
```

- ส่งเฉพาะ **function signature / interface** ไม่ส่งโค้ดทั้งไฟล์
- Gemini: boilerplate, helpers, unit tests
- Claude: architectural decisions, integration logic, security, QA

---

## Development Commands

```bash
cd crm-app
npm install
docker compose up -d       # PostgreSQL + Redis
npx prisma generate
npx prisma migrate dev
npm run dev                 # http://localhost:3000
npm run worker              # BullMQ worker (terminal แยก)
```

---

## Docs Structure

```
E:\crm\
  system_requirements.yaml   ← spec หลัก
  id_standards.yaml          ← naming หลัก
  CLAUDE.md                  ← this file
  GEMINI.md                  ← Gemini sub-agent context
  CHANGELOG.md               ← version history
  architect_plan.md          ← implementation roadmap (7 phases)
  prisma/schema.prisma       ← database schema
  docs/
    adr/                     ← Architecture Decision Records
    architecture/            ← arc42 + C4 diagrams
    database_erd.md          ← ERD (Mermaid)
  automation/                ← Playwright scripts
  crm-app/                   ← Next.js app (build here)
```
