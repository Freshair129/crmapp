# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project

**V School CRM v2** — Greenfield rewrite ของระบบ CRM สำหรับ The V School (โรงเรียนสอนทำอาหารญี่ปุ่น, กรุงเทพฯ)

> ⚠️ นี่คือ v2 เขียนใหม่ทั้งหมด ไม่ใช่ refactor จาก `E:\data_hub`

---

## Version Status (อัพเดท: 2026-03-14)

| Version | Milestone | สถานะ |
|---|---|---|
| `v0.9.0` | Auth Stable | ✅ released |
| `v0.10.0` | API Connected | ✅ released |
| `v0.11.0` | Revenue Split | ✅ released |
| `v0.12.0` | UI Enhanced | ✅ released |
| `v0.13.0` | Unified Inbox + Redis Cache | ✅ released ← HEAD |
| `v0.14.0` | NotificationRules API + LINE Messaging | 🔲 planned (Phase 13) |
| `v1.0.0` | Production Ready | 🔲 planned |

**Branch:** `master` (งานประจำวัน) · `stable` → ชี้ที่ `v0.12.0`
**รายละเอียด rollback:** `docs/guide/version-control-and-rollback.md`

### v0.13.0 — สิ่งที่ทำแล้ว (Phase 12) ✅
| ไฟล์ | สถานะ | หมายเหตุ |
|---|---|---|
| `src/components/UnifiedInbox.js` | ✅ done | FB + LINE inbox รวม, pagination, reply, right customer card panel |
| `src/app/api/inbox/conversations/route.js` | ✅ done | enriched customer data: originId, membershipTier, intelligence |
| `src/app/api/inbox/conversations/[id]/messages/route.js` | ✅ done | GET paginated + POST reply |
| `src/components/ExecutiveAnalytics.js` | ✅ done | Lucide icons ครบ, Recharts charts |
| `src/lib/redis.js` | ✅ done | Redis singleton + getOrSet cache pattern (ADR-034) |
| `src/components/NotificationCenter.js` | ✅ done | Google Sheets sync + alert rules |

> ⚠️ **Known Gotcha — Customer model**: ไม่มี field `channel` — ใช้ `conversation.channel` แทน

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
| ADR-027 | DB Schema Init: 23 models, UUID PKs, named relations |
| ADR-028 | Facebook Messaging: Webhook < 200ms, fire-and-forget, prisma.$transaction |
| ADR-029 | Employee Registry: Auto-generate TVS-EMP ID, JSONB identities, bcrypt |
| ADR-030 | Revenue Channel Split: conversationId → Ads vs Store classification |
| ADR-031 | Icon-Only Sidebar: w-20, Lucide migration ออกจาก FontAwesome CDN |
| ADR-032 | UI Enhancement (A): Recharts charts, Framer Motion animations |

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
# รันจาก /Users/ideab/Desktop/crm เสมอ เพื่อให้ GEMINI.md โหลด context อัตโนมัติ
cd /Users/ideab/Desktop/crm
echo "INTERFACE_SPEC" | gemini -p "implement, code only" -o text
```

- ส่งเฉพาะ **function signature / interface** ไม่ส่งโค้ดทั้งไฟล์
- Gemini: boilerplate, helpers, unit tests
- Claude: architectural decisions, integration logic, security, QA

---

## Auto-Update Protocol (บังคับ — ทำทุกครั้งหลังเสร็จงาน)

หลังทำงานชิ้นใหญ่ หรือ commit สำเร็จ Claude **ต้องอัปเดต** ไฟล์เหล่านี้โดยไม่ต้องรอให้สั่ง:

| ไฟล์ | เมื่อไหร่ต้องอัปเดต |
|---|---|
| `CLAUDE.md` | เมื่อ version status เปลี่ยน, phase เสร็จ, หรือมี Known Gotcha ใหม่ |
| `GEMINI.md` | เมื่อ phase เปลี่ยน (DONE/CURRENT/PLANNED), DB schema เพิ่มฟิลด์, หรือ API routes ใหม่ |
| `GOAL.md` | เมื่อ task ใน phase เสร็จ → tick ✅, หรือ phase ใหม่เริ่ม |
| `CHANGELOG.md` | เมื่อทำ commit ที่มีนัยสำคัญ (feature, fix, breaking change) |

### กฎ
1. หลัง commit ทุกครั้ง → ตรวจ CLAUDE.md version table ว่าตรงไหม
2. เมื่อ phase เสร็จ → อัปเดต GOAL.md table + เพิ่ม detail section
3. ถ้า API route ใหม่ → เพิ่มใน GEMINI.md Directory section
4. Known Gotcha ใหม่ → เพิ่มใน CLAUDE.md ทันที

---

## Development Commands

```bash
cd /Users/ideab/Desktop/crm
docker compose up -d       # PostgreSQL (port 5433) + Redis
npx prisma generate
npx prisma migrate dev
npm run dev                 # http://localhost:3000
npm run worker              # BullMQ worker (terminal แยก)
```

**Node.js:** v22 LTS (Iron) — ดู `.nvmrc`

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
