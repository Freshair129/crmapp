# Testing Guide — V School CRM v2

**อ้างอิง:** `docs/guide/API_TEST_PROTOCOL.md` (10 มิติการทดสอบ), `test-employee-query.mjs`

---

## Overview

โปรเจกต์นี้ยังไม่มี automated test framework (Jest/Vitest) — ใช้แนวทาง **manual + script testing** สำหรับ API และ DB queries

---

## 1. Environment ก่อนทดสอบ

```bash
# ต้องรันก่อนทดสอบทุกครั้ง
docker compose up -d        # PostgreSQL + Redis
npm run dev                 # Next.js dev server

# ตรวจสอบ
docker compose ps           # postgres + redis = Up
curl http://localhost:3000  # ต้องได้ 200
```

---

## 2. Manual API Testing (curl)

### Auth
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@vschool.com","password":"YOUR_PASSWORD"}'

# ได้ cookie session → ใช้ใน request ถัดไป
```

### Customers
```bash
# List customers
curl http://localhost:3000/api/customers \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Get single customer
curl http://localhost:3000/api/customers/TVS-CUS-FB-26-0001 \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### Analytics
```bash
# Executive dashboard
curl http://localhost:3000/api/analytics/executive \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Team KPI
curl http://localhost:3000/api/analytics/team \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

### Inbox
```bash
# Conversations list
curl "http://localhost:3000/api/inbox/conversations?page=1&limit=20" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"

# Messages for a conversation
curl "http://localhost:3000/api/inbox/conversations/t_XXXXXXXXX/messages" \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN"
```

---

## 3. Script-based DB Testing

### ตัวอย่าง: test-employee-query.mjs
```bash
# รัน script ทดสอบ query ตรง DB
node test-employee-query.mjs
```

**Pattern สำหรับสร้าง test script ใหม่:**
```js
// test-[feature].mjs
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// ทดสอบ query
const result = await client.query('SELECT COUNT(*) FROM "Customer"');
console.log('Customer count:', result.rows[0].count);

await client.end();
```

> **หมายเหตุ:** ใช้ `pg.Client` โดยตรง — ห้ามใช้ `new PrismaClient()` ใน scripts (ต้องการ driver adapter)

---

## 4. API Test Protocol (10 มิติ)

ดูรายละเอียดครบถ้วนที่ **[docs/guide/API_TEST_PROTOCOL.md](./API_TEST_PROTOCOL.md)**

| มิติ | คำถาม | เครื่องมือ |
|---|---|---|
| Smoke | ระบบรันอยู่ไหม? | `curl`, `docker compose ps` |
| Functional | ผลลัพธ์ถูกไหม? | `curl` + ตรวจ JSON |
| Integration | ต่อกับ DB/Redis ได้ไหม? | Prisma Studio, Redis CLI |
| Security | Auth guard ทำงานไหม? | `curl` ไม่ส่ง cookie |
| NFR (Performance) | API < 500ms? | `curl -w "%{time_total}"` |

---

## 5. NFR Verification

### NFR1 — Webhook < 200ms
```bash
# Simulate Facebook webhook
curl -X POST http://localhost:3000/api/webhooks/facebook \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: sha256=TEST" \
  -w "\nTime: %{time_total}s\n" \
  -d '{"object":"page","entry":[]}'

# ต้องได้ < 0.200s
```

### NFR2 — Dashboard API < 500ms
```bash
curl http://localhost:3000/api/analytics/executive \
  -H "Cookie: next-auth.session-token=TOKEN" \
  -w "\nTime: %{time_total}s\n"

# ต้องได้ < 0.500s (ถ้า Redis warm)
```

---

## 6. Database Inspection

```bash
# Prisma Studio — GUI สำหรับ browse/edit data
npx prisma studio   # เปิด http://localhost:5555

# Redis CLI — ตรวจ cache
docker exec -it crm-redis-1 redis-cli
> KEYS *             # ดู cache keys ทั้งหมด
> GET executive_kpi  # ดู cache value
> TTL executive_kpi  # ดู time-to-live
```

---

## 7. Adding Automated Tests (แนะนำสำหรับ v1.0)

เมื่อถึง Phase production-ready ควรเพิ่ม:

```bash
# Install Vitest (compatible กับ Next.js 14)
npm install -D vitest @vitejs/plugin-react

# หรือ Jest
npm install -D jest jest-environment-node @types/jest
```

**Test structure ที่แนะนำ:**
```
src/
  lib/
    repositories/
      __tests__/
        customerRepo.test.js   ← unit test per repo
  app/
    api/
      __tests__/
        analytics.test.js      ← integration test per route
```

---

## 8. Common Test Failures

| อาการ | สาเหตุ | แก้ไข |
|---|---|---|
| `ECONNREFUSED 5433` | Docker ไม่รัน | `docker compose up -d` |
| `401 Unauthorized` | ไม่มี session cookie | Login ก่อน |
| `500 Internal Server Error` | DB query ผิด | ดู `npm run dev` terminal |
| Redis cache เก่า | Cache ยังค้างจากรอบก่อน | `redis-cli FLUSHALL` (dev only) |
| Prisma schema mismatch | Migration ยังไม่ run | `npx prisma migrate dev` |
