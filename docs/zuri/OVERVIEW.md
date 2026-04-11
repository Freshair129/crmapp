# Zuri — Product Overview

> All-in-one management platform for culinary schools and food businesses in Thailand
> Built on production-proven codebase (V School CRM v2, 38+ phases)

---

## What is Zuri

Zuri เป็น Vertical SaaS สำหรับธุรกิจอาหารในไทย รวม CRM + Operations + Marketing ไว้ในที่เดียว
ออกแบบมาสำหรับเจ้าของที่ทำงานคนเดียวหรือทีมเล็ก ไม่ต้องการ IT department

---

## Core Modules

### 1. Inbox & CRM
- Unified inbox — Facebook Messenger + LINE ในหน้าเดียว
- Customer profiles — ประวัติ, channel, การซื้อ, lead status
- Identity resolution — track ลูกค้าข้าม platform
- Conversation history ย้อนหลังครบ

### 2. Course & Schedule Management
- สร้างคลาส / คอร์ส พร้อม capacity
- Drag-and-drop schedule builder
- Enrollment tracking — จอง, ชำระ, ยืนยัน, attendance
- QR code check-in
- รองรับ SINGLE / RANGE / PROJECT task types

### 3. Kitchen & Inventory
- Stock management พร้อม FEFO (First Expired First Out)
- Recipe builder + BOM (Bill of Materials)
- Lot tracking + yield percent
- Real-time deduction เมื่อเสร็จ session
- Reorder alerts

### 4. Procurement
- Purchase Order lifecycle — draft → approve → receive
- Vendor management
- Cost tracking per ingredient

### 5. Payment & Finance
- Slip OCR verification (PromptPay / bank transfer)
- Transaction history
- Revenue split by channel
- V Point loyalty system

### 6. Marketing Analytics
- Meta Ads sync (ROAS, CPL, campaign performance)
- LINE attribution
- Creative fatigue alerts
- Daily summary via AI

### 7. Employee & Access Control
- 12-role RBAC (Manager, Chef, Agent, Staff ฯลฯ)
- Employee profiles, grades, profile pictures
- Audit log ทุก action สำคัญ

### 8. AI & Automation
- MCP Server — AI tools integration (Claude, Gemini)
- NotebookLM daily summary
- Smart inbox reply suggestions (planned)
- Lead scoring (planned)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Database | PostgreSQL via Supabase + Prisma ORM |
| Cache / Queue | Upstash Redis + QStash |
| Auth | NextAuth.js |
| Hosting | Vercel (zero DevOps) |
| AI | Google Gemini 2.0 Flash + Claude API |
| Marketing API | Meta Graph API v19.0 |
| Messaging | LINE Messaging API |
| Push | Web Push (VAPID) |
| Styling | TailwindCSS |

---

## Architecture Highlights

- **Zero local infrastructure** — ทำงานบน cloud ทั้งหมด, ไม่มี server ให้ดูแล
- **Repository pattern** — DB access ผ่าน `src/lib/repositories/` ทั้งหมด
- **Webhook-first** — FB + LINE webhooks ตอบ < 200ms (NFR1)
- **Multi-tenant ready** — env vars per client, shared codebase
- **MCP Server** — AI agents เชื่อมต่อผ่าน stdio + HTTP

---

## Deployment Model

```
Client onboarding:
  1. Fork / branch from Zuri base
  2. Config env vars (FB, LINE, Supabase project)
  3. Deploy to Vercel (~30 นาที)
  4. Seed initial data (employees, courses, products)
  5. Go live
```

---

## Roadmap

| Phase | Feature | Priority |
|---|---|---|
| ✅ Done | Core CRM, Inbox, Schedule, Kitchen, Payment, RBAC, MCP | — |
| 🔲 Next | Visual Calendar + Attendance Scanner | High |
| 🔲 | Student Self-Service Portal | High |
| 🔲 | Certificate PDF Generation | Medium |
| 🔲 | AI Smart Inbox (reply draft + lead score) | Medium |
| 🔲 | Table Management (Restaurant module) | Medium |
| 🔲 | Mobile PWA + WhatsApp | Low |
| 🔲 | Multi-branch Dashboard | Low |

---

## Production Reference

**V School** (The V School, Bangkok) — โรงเรียนสอนทำอาหารญี่ปุ่น
- Production live บน Vercel + Supabase
- ใช้งานจริงตั้งแต่ Phase 1 (2025)
- 32 employees, RBAC v2.0.0 active
- FB Messenger + LINE inbox live
- Meta Ads sync + ROAS tracking active

---

## Key Metrics (from V School)

- Webhook response time: < 200ms ✅
- Dashboard API: < 500ms (Upstash cache) ✅
- Uptime: 99.9% (Vercel) ✅
- DB queries: via Prisma connection pooling ✅
