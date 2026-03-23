# V School CRM v2.1.0

ระบบ CRM สำหรับ **The V School** — โรงเรียนสอนทำอาหารญี่ปุ่น กรุงเทพฯ
Greenfield rewrite · Next.js 14 · PostgreSQL · Upstash (Redis/QStash) · Gemini AI

---

## Version

| Version | Milestone | Status |
|---|---|---|
| `v1.0.0` | Production Ready — Docs Hardening | ✅ released |
| `v1.9.5` | Employee Profile — profilePicture, dateOfBirth, grade | ✅ released |
| `v2.0.0` | RBAC Redesign — 12 roles, permissionMatrix rewrite | ✅ released |
| `v2.1.0` | Task Type System (SINGLE/RANGE/PROJECT) + Notion Sync | ✅ current |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | PostgreSQL (Supabase) via Prisma ORM |
| Queue | Upstash QStash (HTTP serverless — ADR-040) |
| Cache | Upstash Redis REST (ADR-040) |
| AI | Google Gemini 2.0 Flash |
| Styling | TailwindCSS |
| Marketing API | Meta Graph API v19.0 |
| Task Sync | Notion API (bidirectional) |

---

## Quick Start

```bash
# 1. Clone
git clone https://github.com/Freshair129/crmapp.git
cd crmapp

# 2. Install dependencies
npm install

# 3. Environment setup
cp .env.example .env
# แก้ไขค่าใน .env ตาม credentials จริง

# 4. Start infrastructure (PostgreSQL only — Redis/Queue ใช้ Upstash Cloud)
docker compose up -d   # PostgreSQL port 5433

# 5. Database setup
npx prisma generate
npx prisma migrate dev
npx prisma db seed     # (optional) seed ข้อมูลตัวอย่าง

# 6. Start dev server
npm run dev            # http://localhost:3000

# ❌ npm run worker — ไม่จำเป็นแล้ว (Phase 27: BullMQ → Upstash QStash serverless)
```

**Node.js required:** v22 LTS (Iron) — ดู `.nvmrc`

---

## Project Structure

```
src/
  app/
    api/          — Next.js API routes
    page.js       — Main app shell
  components/     — React components
  lib/
    repositories/ — DB access layer (ทุก query ผ่านที่นี่)
    redis.js      — Redis cache singleton
    logger.js     — Structured JSON logger
prisma/
  schema.prisma   — Database schema (47 models)
docs/
  adr/            — Architecture Decision Records (ADR-024–050)
  architecture/   — arc42 + ERD + domain-architecture
  guide/          — Developer guides
  API_REFERENCE.md — API endpoint catalog (15 sections)
scripts/          — Sync & maintenance scripts
```

---

## Key Documents

| Document | Purpose |
|---|---|
| [CLAUDE.md](CLAUDE.md) | AI agent context + coding rules |
| [GEMINI.md](GEMINI.md) | Gemini CLI sub-agent protocol |
| [system_requirements.yaml](system_requirements.yaml) | Functional & Non-Functional Requirements |
| [id_standards.yaml](id_standards.yaml) | ID formats + naming conventions |
| [CHANGELOG.md](CHANGELOG.md) | Version history |
| [docs/architecture/arc42-main.md](docs/architecture/arc42-main.md) | System architecture |
| [docs/API_REFERENCE.md](docs/API_REFERENCE.md) | API endpoint catalog |
| [docs/guide/getting-started.md](docs/guide/getting-started.md) | Developer setup guide |

---

## Architecture Overview

```
[Meta / LINE / Web]         [Notion API]
        │                       ↕ (bidirectional task sync)
        ▼ Ingestion (< 200ms NFR1)
[Next.js Webhook] ──fire-and-forget──► [Upstash QStash]
                                               │
                                               ▼ HTTP POST
                               [/api/workers/notification (Vercel serverless)]
                                               │
                                               ▼ Identity Resolution
                               [customerRepo + prisma.$transaction (NFR5)]
                                               │
                                               ▼ Presentation
                               [Upstash Redis Cache-Aside] ──► [CRM Dashboard]
```

---

## Development Commands

```bash
docker compose up -d      # Start PostgreSQL only (Redis/Queue = Upstash Cloud)
npm run dev               # Dev server (http://localhost:3000)
npx prisma studio         # DB GUI
npx prisma migrate dev    # Apply migrations
```

---

## Contributing

ดู [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Team

| Role | Responsibility |
|---|---|
| 🧠 Claude (Lead Architect) | Architecture decisions, integration, security, QA |
| 🛠️ Gemini (Worker) | Boilerplate, helpers, unit tests |
