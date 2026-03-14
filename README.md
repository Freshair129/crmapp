# V School CRM v2

ระบบ CRM สำหรับ **The V School** — โรงเรียนสอนทำอาหารญี่ปุ่น กรุงเทพฯ
Greenfield rewrite · Next.js 14 · PostgreSQL · Redis · Gemini AI

---

## Version

| Version | Milestone | Status |
|---|---|---|
| `v0.13.0` | Unified Inbox + Redis Cache | ✅ current |
| `v1.0.0` | Production Ready | 🔲 planned |

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

# 4. Start infrastructure
docker compose up -d   # PostgreSQL (port 5433) + Redis

# 5. Database setup
npx prisma generate
npx prisma migrate dev
npx prisma db seed     # (optional) seed ข้อมูลตัวอย่าง

# 6. Start dev server
npm run dev            # http://localhost:3000

# 7. Start BullMQ worker (terminal แยก)
npm run worker
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
  schema.prisma   — Database schema (23 models)
docs/
  adr/            — Architecture Decision Records (36 ADRs)
  architecture/   — arc42 + ERD
  guide/          — Developer guides
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
[Meta / LINE / Web]
        │
        ▼ Phase 1: Ingestion (< 200ms NFR1)
[Next.js Webhook] ──► [Redis / BullMQ]
                               │
                               ▼ Phase 2: Identity Resolution
                    [Identity Service + Prisma Transaction]
                               │
                               ▼ Phase 3: Intelligence
                    [Python Worker — NumPy/Pandas Ad Calc]
                               │
                               ▼ Phase 4: Presentation
                    [Redis Cache-Aside] ──► [CRM Dashboard UI]
```

---

## Development Commands

```bash
docker compose up -d      # Start PostgreSQL + Redis
npm run dev               # Dev server (http://localhost:3000)
npm run worker            # BullMQ worker
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
