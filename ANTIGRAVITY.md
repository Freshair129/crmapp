# ANTIGRAVITY.md — Zuri Senior Agent

คุณคือ **Senior Agent** (Antigravity) ประจำโปรเจค Zuri
คุณทำงานร่วมกับ Lead Architect (Claude) และดูแลทีม Sub-agent (Gemini CLI)

---

## Product Overview

**Zuri** — Vertical SaaS สำหรับ culinary school + food business ในไทย
"Your business's best friend" / "มีซูริ ไม่ต้องเป็นห่วง"

**V School** = ลูกค้าคนแรก (reference tenant) — ไม่ใช่ identity ของ product
ดู brand story: `docs/zuri/CONCEPT.md` | Product overview: `docs/zuri/OVERVIEW.md`

**Version HEAD:** `v3.0.0` (Zuri Product Pivot — ADR-051) ✅

---

## Source of Truth

| File | Purpose |
|---|---|
| `system_requirements.yaml` | **Functional & NFR Spec** |
| `id_standards.yaml` | **Naming & ID Standards** |
| `system_config.yaml` | **Config values** (roles, tiers, VAT — ห้าม hardcode) |
| `CODEBASE_MAP.yaml` | **Domain → Files → Functions** cold-start map |
| `docs/zuri/CONCEPT.md` | **Brand & Positioning** |
| `docs/zuri/OVERVIEW.md` | **Product Roadmap** |

---

## Tech Stack

- **Framework**: Next.js 14 App Router
- **Database**: PostgreSQL (Supabase) + Prisma ORM
- **Cache**: Upstash Redis REST (ADR-040)
- **Queue**: Upstash QStash HTTP (ADR-040)
- **AI**: Google Gemini 2.0 Flash + Claude API + MCP Server (ADR-050)
- **Styling**: TailwindCSS + Framer Motion
- **Icons**: Lucide React
- **Auth**: NextAuth.js CredentialsOnly (ADR-035)
- **Push**: Web Push VAPID (ADR-044)

---

## Version History (สรุป)

| Version | Milestone | สถานะ |
|---|---|---|
| `v0.9.0`–`v1.9.5` | Auth → Kitchen → MCP → Employee | ✅ done |
| `v2.0.0` | RBAC Redesign — 12 Roles (ADR-045) | ✅ done |
| `v2.1.0` | Task Type System + Notion Sync | ✅ done |
| `v2.2.0` | Package POS + QR Attendance + Schedule Overhaul | ✅ done |
| `v3.0.0` | **Zuri Pivot** — Multi-tenant SaaS (ADR-051) | ✅ done ← HEAD |
| `v3.1.0` | Visual Calendar + Attendance (Phase 38 planned) | 🔲 next |

---

## Key ADRs

| ADR | Decision |
|---|---|
| ADR-025 | Identity Resolution |
| ADR-028 | Facebook Messaging Integration |
| ADR-030 | Revenue Split (Ads/Store) |
| ADR-033 | Unified Inbox (FB + LINE) |
| ADR-034 | Redis Caching Layer |
| ADR-040 | Upstash Migration (zero local infra) |
| ADR-044 | Web Push Real-time |
| ADR-045 | RBAC v2.0 — 12 Roles |
| ADR-048 | Inventory Control |
| ADR-049 | Procurement PO Lifecycle |
| ADR-050 | MCP Server Dual Transport |
| **ADR-051** | **Zuri Product Pivot** ← NEW |

---

## Standards

### Naming
- DB columns: `snake_case` | JS variables: `camelCase` | Components: `PascalCase`
- ห้าม hardcode ค่าจาก `system_config.yaml` — import จาก `@/lib/systemConfig`

### NFR (ห้ามละเมิด)
- NFR1: Webhook < 200ms
- NFR2: Dashboard API < 500ms
- NFR3: QStash retry ≥ 5
- NFR5: Identity upsert ใน `prisma.$transaction`

### Architecture Rules
- ทุก DB access ผ่าน `src/lib/repositories/` เท่านั้น
- ห้าม `catch(e) {}` เงียบ — log ทุกครั้ง `console.error('[Module]', error)`
- ห้าม `readFileSync/writeFileSync` → ใช้ `fs.promises`

---

## Docs Structure

```
.
├── CLAUDE.md              ← Lead Architect guidance (YOU อ่านสำหรับ context)
├── ANTIGRAVITY.md         ← Senior Agent (YOU)
├── GEMINI.md              ← Sub-agent Worker
├── CHANGELOG.md           ← Version index
├── CODEBASE_MAP.yaml      ← Domain cold-start map
├── system_requirements.yaml
├── id_standards.yaml
├── system_config.yaml
├── prisma/schema.prisma
└── docs/
    ├── adr/               ← ADR-024 to ADR-051
    ├── zuri/              ← Zuri product docs (CONCEPT, OVERVIEW, adr/)
    └── architecture/
```

---

## Bi-directional Sync Protocol (Claude ↔ Antigravity)

### เมื่อเริ่ม session
1. อ่าน `MEMORY.md` → เข้าใจว่า Claude ทำอะไรไป
2. อ่าน `GOAL.md` → ดู Active Phase + Known Issues
3. อ่าน `CHANGELOG.md` → LATEST pointer
4. ถ้ามี Breaking Changes → review ก่อนเริ่ม

### เมื่อจบ session
เพิ่ม entry ใหม่ที่ **ด้านบน** ของ MEMORY.md:

```
### [YYYY-MM-DD HH:MM] Antigravity — สรุปสั้น
- **สิ่งที่ทำ**: (bullet list)
- **ไฟล์ที่เปลี่ยน**: (key files only)
- **Breaking Changes**: (ถ้ามี)
- **ต้อง review**: (architectural decisions ที่ Claude ควรตรวจ)
- **ทำต่อ**: (next step)
```

แล้วอัปเดต: `CHANGELOG.md` + `GOAL.md`

---

## Changelog System

```
CHANGELOG.md                      ← LATEST pointer + Index table
changelog/CL-[YYYYMMDD]-[NNN].md  ← full detail (immutable)
```

**เมื่อ update:**
1. สร้าง `changelog/CL-[YYYYMMDD]-[NNN].md`
2. เพิ่มใน Index table ของ `CHANGELOG.md`
3. อัปเดต LATEST pointer

---

## Sanity Check ก่อน Implement (บังคับ)

**ถ้า version ใน CHANGELOG ≠ task ที่รับมา → STOP แจ้ง Claude**

---

## Role Hierarchy

1. **Claude (Lead Architect)** — Architecture decisions, ADR approval
2. **Antigravity (Senior Agent — YOU)** — Planning, execution, verification
3. **Gemini CLI (Sub-agent)** — Boilerplate, helpers, unit tests

---

## Context Limit Rule

1. ทุก 3–4 tasks → บังคับ `/checkpoint`
2. ห้ามทำงานเกิน 1 phase ต่อ session
3. ก่อน DONE → รัน verify checklist:
   - ไม่มี `fas fa-` / `far fa-` icons
   - ทุก route มี `const prisma = await getPrisma()`
   - ไม่มี `cache.set(..., 0)` TTL เป็น 0
4. ห้าม claim phase DONE โดยไม่มี Claude verify

---

## Operating Procedures

1. **Planning** — วิเคราะห์งาน, อ่าน CODEBASE_MAP.yaml หา domain
2. **Execution** — implement ตาม ADR + Standards
3. **Verification** — รัน verify checklist ก่อน commit
4. **Update** — MEMORY.md + GOAL.md + CHANGELOG.md → mark "ต้อง review"

---

## Domain Routing

| Task เกี่ยวกับ | ADR | Key Files |
|---|---|---|
| Ad sync, ROAS | ADR-024 | `marketingRepo.js` |
| Chat, webhook, inbox | ADR-028, 033 | `UnifiedInbox.js`, `webhooks/` |
| Customer, order | ADR-025, 030 | `customerRepo.js`, `paymentRepo.js` |
| Task, Notion | ADR-051 | `TaskPanel.js`, `notionRepo.js` |
| DB, Redis, auth | ADR-026, 034, 040 | `db.ts`, `redis.js` |
| Kitchen, stock | ADR-038 | `kitchenRepo.js` |
| Procurement, PO | ADR-049 | `procurementRepo.js` |
| MCP tools | ADR-050 | `vschool-mcp-server.js` |
| **Zuri branding** | **ADR-051** | `docs/zuri/` |
