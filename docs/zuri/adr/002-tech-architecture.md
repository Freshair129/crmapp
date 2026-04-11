# ADR-002: Tech Architecture — Next.js + Supabase + Vercel

**Date:** 2026-03-24
**Status:** Accepted
**Decider:** Founder

---

## Context

ต้องเลือก stack ที่:
- Solo founder manage ได้คนเดียว
- Deploy ให้ลูกค้าหลายรายได้โดยไม่มี DevOps overhead
- Cost ต่ำในช่วงเริ่มต้น (< 5 ลูกค้า)
- Scale ได้เมื่อโต

---

## Decision

**Next.js 14** + **Supabase (PostgreSQL)** + **Vercel** + **Upstash (Redis + QStash)**

---

## Rationale

### Next.js 14 App Router

| เหตุผล | รายละเอียด |
|---|---|
| Full-stack in one repo | API routes + UI ในที่เดียว — ไม่ต้องแยก backend |
| Vercel-native | deploy กด deploy เดียวจบ |
| Production proven | V School ใช้งานจริงอยู่แล้ว |
| Server Components | performance ดีโดยไม่ต้อง optimize เอง |

### Supabase (PostgreSQL + Prisma)

| เหตุผล | รายละเอียด |
|---|---|
| Managed PostgreSQL | ไม่ต้อง manage DB server |
| Free tier + predictable pricing | เริ่มต้น $0, scale เพิ่มตาม usage |
| Connection pooling built-in | รองรับ serverless functions |
| Multi-project | 1 Supabase org, หลาย project = 1 DB per client |
| Prisma ORM | type-safe queries, migration ง่าย |

### Vercel

| เหตุผล | รายละเอียด |
|---|---|
| Zero DevOps | push code → deploy อัตโนมัติ |
| Edge Network | CDN ทั่วโลก, latency ต่ำในไทย |
| Preview deployments | ทดสอบก่อน production ทุก PR |
| Environment variables | แยก config per client ได้ง่าย |
| Free tier | hobby = $0, pro = $20/เดือน |

### Upstash (Redis + QStash)

| เหตุผล | รายละเอียด |
|---|---|
| Serverless Redis | ไม่ต้อง maintain Redis server |
| QStash | HTTP message queue — แทน BullMQ local worker |
| REST API | ใช้ได้จาก Vercel Edge functions |
| Pay-per-use | ถูกมากสำหรับ SME traffic |

---

## Multi-tenant Strategy

```
1 Zuri codebase → หลาย client deployments

Client A (V School):
  - Vercel project: vschool.zuri.app
  - Supabase project: vschool-db
  - .env: FB_PAGE_ID=xxx, LINE_CHANNEL_ID=yyy

Client B (Cooking Studio X):
  - Vercel project: studioX.zuri.app
  - Supabase project: studiox-db
  - .env: FB_PAGE_ID=xxx, LINE_CHANNEL_ID=yyy
```

**ไม่ใช่ row-level multi-tenant** — แยก DB per client เพื่อ:
- Data isolation สมบูรณ์
- ง่ายต่อ backup / migrate แต่ละราย
- ป้องกัน data leak ระหว่าง client

---

## Cost per Client (ประมาณการ)

| Service | Cost/เดือน |
|---|---|
| Vercel Pro (shared) | ~$2 |
| Supabase Pro | $25 |
| Upstash Redis | ~$1 |
| Upstash QStash | ~$1 |
| **รวม** | **~$29 (~1,050 บาท)** |

ราคา retainer 5,000 บาท/เดือน → margin ~80% ✅

---

## Consequences

- **บวก:** deploy ใหม่ใน 30 นาที, zero DevOps, cost ต่ำ, scale ได้
- **ลบ:** ถ้า client > 20 ราย ต้องคิดเรื่อง shared infrastructure มากขึ้น
- **ยอมรับ:** ที่ 8-10 ลูกค้า (ceiling ของ solo founder) model นี้ยังดีอยู่
