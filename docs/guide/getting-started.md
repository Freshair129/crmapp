# Getting Started — V School CRM v2

คู่มือสำหรับ developer ใหม่ที่ต้องการรัน local development environment

---

## Prerequisites

| Requirement | Version | ตรวจสอบ |
|---|---|---|
| Node.js | v22 LTS (Iron) | `node --version` |
| Docker Desktop | ล่าสุด | `docker --version` |
| Git | ล่าสุด | `git --version` |
| npm | v10+ | `npm --version` |

---

## Step 1 — Clone Repository

```bash
git clone https://github.com/Freshair129/crmapp.git
cd crmapp
```

---

## Step 2 — Install Dependencies

```bash
npm install
```

---

## Step 3 — Environment Setup

```bash
cp .env.example .env
```

เปิด `.env` แล้วใส่ค่าต่อไปนี้ (ขอจาก team lead):

| Variable | ที่มา |
|---|---|
| `FB_PAGE_ACCESS_TOKEN` | Meta Developer Console |
| `FB_VERIFY_TOKEN` | กำหนดเองได้ (random string) |
| `GEMINI_API_KEY` | Google AI Studio |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers Console |
| `NEXTAUTH_SECRET` | รัน `openssl rand -base64 32` |
| `DATABASE_URL` | ใช้ default สำหรับ local Docker |
| `NEXTAUTH_URL` | `http://localhost:3000` |

---

## Step 4 — Start Infrastructure

```bash
docker compose up -d
```

ตรวจสอบว่า containers ทำงาน:
```bash
docker compose ps
# ต้องเห็น postgres + redis ทั้งคู่ "Up"
```

- PostgreSQL: `localhost:5433`
- Redis: `localhost:6379`

---

## Step 5 — Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed ข้อมูลตัวอย่าง
npx prisma db seed
```

ตรวจสอบ database ผ่าน GUI:
```bash
npx prisma studio   # เปิด http://localhost:5555
```

---

## Step 6 — Start Development Server

```bash
npm run dev
```

เปิด browser → [http://localhost:3000](http://localhost:3000)

Login ด้วย:
- **Email:** `admin@vschool.com`
- **Password:** ขอจาก team lead

---

## Step 7 — Start BullMQ Worker (Terminal แยก)

```bash
npm run worker
```

Worker นี้จัดการ background jobs (Facebook sync, LINE attribution, etc.)

---

## Directory Structure ที่ควรรู้

```
src/
  app/
    api/              ← API routes (Next.js App Router)
    page.js           ← Main app shell + routing logic
  components/         ← React components (PascalCase)
  lib/
    repositories/     ← ทุก DB query ต้องผ่านที่นี่
    redis.js          ← Cache singleton (getOrSet pattern)
    logger.js         ← Structured logger (ใช้แทน console.log)
  middleware.js       ← RBAC + auth guard
prisma/
  schema.prisma       ← Database schema (23 models)
  seed.ts             ← Seed data
docs/
  adr/                ← Architecture Decision Records
  guide/              ← คุณอยู่ที่นี่
.claude/
  skills/
    sync-docs.md      ← Skill สำหรับ sync documentation
```

---

## Development Commands

| Command | หน้าที่ |
|---|---|
| `npm run dev` | Dev server (hot reload) |
| `npm run worker` | BullMQ background worker |
| `npm run build` | Production build |
| `docker compose up -d` | Start PostgreSQL + Redis |
| `docker compose down` | Stop containers |
| `npx prisma studio` | DB GUI (port 5555) |
| `npx prisma migrate dev` | Apply schema changes |
| `npx prisma migrate reset` | Reset DB (ลบข้อมูลทั้งหมด) |

---

## Common Issues

### "Cannot connect to database"
```bash
# ตรวจสอบ Docker
docker compose ps
# ถ้า postgres ไม่ Up:
docker compose up -d postgres
```

### "Prisma Client not found"
```bash
npx prisma generate
```

### "Auth error / Cannot login"
- ตรวจว่า `NEXTAUTH_SECRET` มีค่าในไฟล์ `.env`
- ตรวจว่า `NEXTAUTH_URL=http://localhost:3000`

### "FB Webhook not receiving"
- Webhook ต้องการ HTTPS — ใช้ [ngrok](https://ngrok.com/) สำหรับ local testing:
```bash
ngrok http 3000
# Copy HTTPS URL → ใส่ใน Meta Developer Console
```

---

## Next Steps

- อ่าน [CLAUDE.md](../../CLAUDE.md) — coding rules + architecture decisions
- อ่าน [docs/adr/](../adr/) — ทำความเข้าใจ decisions ที่ผ่านมา
- อ่าน [docs/architecture/arc42-main.md](../architecture/arc42-main.md) — system architecture
- อ่าน [CONTRIBUTING.md](../../CONTRIBUTING.md) — commit convention + ADR process
