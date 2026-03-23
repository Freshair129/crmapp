# V School CRM v2 — Project Overview

> **Version:** v2.1.0 (HEAD) | **Status:** Production Ready
> **Repository:** https://github.com/Freshair129/crmapp | **Branch:** `master`

> 📖 **รายละเอียดเต็ม:** ดูที่ [`docs/overview.md`](./docs/overview.md)

---

## What Is This?

V School CRM v2 เป็นระบบ CRM ที่เขียนใหม่ทั้งหมด (greenfield rewrite) สำหรับ **The V School** โรงเรียนสอนทำอาหารญี่ปุ่นในกรุงเทพฯ ครอบคลุมตั้งแต่ลูกค้า, การขาย, คอร์สเรียน, สต็อกครัว, จัดซื้อ, คลังสินค้า, Task Management พร้อม Notion Sync, ไปจนถึง AI-Native MCP

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| Queue | Upstash QStash (Serverless) |
| Cache | Upstash Redis (REST) |
| AI | Google Gemini 2.0 Flash |
| Protocol | MCP — AI-Native (ADR-050) |
| Styling | TailwindCSS |
| Marketing API | Meta Graph API v19.0 |
| Task Sync | Notion API (bidirectional) |
| Auth | NextAuth.js (Credentials only) |

---

## Architecture Highlights

- **Repository Pattern** — ทุก DB operation ผ่าน `src/lib/repositories/`
- **RBAC v2.0.0** — 12 roles: DEV · TEC · MGR · MKT · HR · PUR · PD · ADM · ACC · SLS · AGT · STF
- **AI-Native (MCP)** — 23 tools ผ่าน stdio + HTTP transport (ADR-050)
- **Zero Local Infra** — Vercel + Supabase + Upstash (ไม่ต้อง Docker สำหรับ Redis/Queue)
- **Task Type System** — SINGLE / RANGE / PROJECT + Notion bidirectional sync (v2.1.0)

---

## Key Documents

| Document | Link |
|---|---|
| Agent Context | [`CLAUDE.md`](./CLAUDE.md) |
| Requirements | [`system_requirements.yaml`](./system_requirements.yaml) |
| ID Standards | [`id_standards.yaml`](./id_standards.yaml) |
| Architecture | [`docs/architecture/arc42-main.md`](./docs/architecture/arc42-main.md) |
| Domain + Flows | [`docs/architecture/domain-architecture.md`](./docs/architecture/domain-architecture.md) |
| API Reference | [`docs/API_REFERENCE.md`](./docs/API_REFERENCE.md) |
| Changelog | [`CHANGELOG.md`](./CHANGELOG.md) |
| MCP Guide | [`docs/guide/mcp-guide.md`](./docs/guide/mcp-guide.md) |
