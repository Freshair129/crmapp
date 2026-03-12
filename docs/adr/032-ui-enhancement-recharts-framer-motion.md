# ADR-032 — UI Enhancement: Recharts + Framer Motion (Approach A)

**Date:** 2026-03-13
**Status:** Accepted (In Progress)
**Deciders:** Lead (Claude), Implementation (Gemini)

---

## Context

หลัง Phase 11 ระบบมี API ครบแล้ว แต่ UI ยังเป็น plain Tailwind CSS ไม่มี:
- Data visualization (chart ไม่มีเลย)
- Animation / transition ระหว่าง views
- Component library สำหรับ interaction complex

มีสองทางเลือก:
- **Approach A** (Cherry-pick): เพิ่ม Recharts + Framer Motion ใน codebase เดิม
- **Approach B** (Migrate): ย้ายไป NestJS + TypeORM + Next.js 16 template

---

## Decision: Approach A — Cherry-pick

เลือก A เพราะ:
1. Phase 1-11 ทำไปแล้ว (DB, RBAC, Webhook, BullMQ) — migrate = ทิ้งงาน 90%
2. `recharts`, `framer-motion`, `lucide-react` **ติดตั้งอยู่แล้ว** แต่ยังไม่ถูกใช้เต็มที่
3. ไม่กระทบ NFR1 (Webhook < 200ms), NFR5 (identity transaction)

---

## Implementation Plan (Phase A1–A5)

### A1 — Charts (Recharts) ✅ DONE
- `ExecutiveAnalytics`: AreaChart Ads/Store trend + BarChart daily orders
- `analytics/executive/history` API + `analyticsRepository.getRevenueHistory(days)`

### A2 — Motion (Framer Motion) ✅ DONE
- `page.js`: AnimatePresence page transitions
- `Dashboard`: AnimatedNumber useSpring counter

### A3 — Unified Inbox ⏳ IN PROGRESS
- API: `GET/POST /api/inbox/conversations/[id]/messages`
- Component: `UnifiedInbox.js` — รวม Facebook + LINE พร้อม filter tab
- ดู GEMINI.md Phase 12 สำหรับ interface spec

### A4 — Lucide Icons ✅ DONE
- Sidebar + TopBar: FontAwesome → lucide-react (ADR-031)

### A5 — Polish ⏳ PLANNED
- ลบ `UI_CRM_STANDALONE/`
- `loading.js` + `error.js` boundaries
- `React.memo` สำหรับ heavy components

---

## Libraries Used

| Library | Version | ใช้ใน |
|---|---|---|
| `recharts` | ^3.7.0 | ExecutiveAnalytics charts |
| `framer-motion` | ^12.35.1 | Page transitions, AnimatedNumber |
| `lucide-react` | ^0.577.0 | Sidebar, TopBar icons |

ทั้ง 3 ตัวติดตั้งอยู่แล้วใน `package.json` — ไม่ต้อง `npm install` เพิ่ม

---

## Consequences

**Positive:**
- Visual impact สูง — chart + animation ทำให้ระบบดูเป็น professional มากขึ้น
- Zero migration risk — ไม่แตะ backend, DB, auth
- Bundle เพิ่มขึ้นประมาณ +180KB gzip (recharts ~120KB, framer-motion ~60KB) — ยอมรับได้สำหรับ internal tool

**Negative:**
- ไม่ได้ design system สมบูรณ์เหมือน migrate ไป template
- แต่ละ component ยังต้อง customize styling เอง
