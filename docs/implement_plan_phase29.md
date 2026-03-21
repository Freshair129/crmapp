# Implementation Plan — Phase 29: RBAC Redesign + Ads Optimize
**Version:** v1.4.0  
**ADR:** ADR-045  
**Date:** 2026-03-21  
**Author:** Claude (Lead Architect)

---

## เป็น Major Upgrade ไหม?

**ใช่ — MINOR version bump (v1.3.0 → v1.4.0)** เพราะ:
- เพิ่ม feature ใหม่ (Ads Optimize write, 2 roles ใหม่, Permission Matrix UI)
- มี breaking change ภายใน (role values ใน DB + force re-login)
- ไม่ได้เปลี่ยน public API contract กับ client

ถ้าอนาคตมี public API clients → อาจ bump เป็น v2.0.0 แต่ตอนนี้ internal app เท่านั้น

---

## Phase Overview

```
Phase 29a — DB Migration + Role Normalization   (1 session)
Phase 29b — permissionMatrix.js + can() helper  (1 session)
Phase 29c — Refactor RBAC guards ทั่ว codebase  (2 sessions)
Phase 29d — Ads Optimize API Routes             (1 session)
Phase 29e — Ads Optimize UI                     (1 session)
Phase 29f — Permission Management UI            (1 session)
Phase 29g — Tests + Audit + Docs                (1 session)
```

---

## Phase 29a — DB Migration + Role Normalization

**Goal:** ทำให้ role values ใน DB เป็น UPPERCASE ทั้งหมด + เพิ่ม roles ใหม่

### Tasks

| # | Task | ไฟล์ | หมายเหตุ |
|---|---|---|---|
| 29a.1 | Migrate DB roles → UPPERCASE | psycopg2 script | `UPDATE employees SET role = UPPER(role)` |
| 29a.2 | เพิ่ม MARKETING, HEAD_CHEF ใน Prisma enum / validation | `prisma/schema.prisma` | ถ้าใช้ String ไม่ต้อง migrate schema |
| 29a.3 | Force-expire sessions | `NEXTAUTH_SECRET` ใน Vercel | เปลี่ยน secret → ทุก session invalid → re-login |
| 29a.4 | อัป `authOptions.js` validation | `src/lib/authOptions.js` | รับแค่ VALID_ROLES uppercase |
| 29a.5 | แก้ ROLE_LABEL ใน TopBar | `src/components/TopBar.js` | เพิ่ม MARKETING, HEAD_CHEF entries |

### VALID_ROLES (ใช้ใน validate)
```js
export const VALID_ROLES = ['DEVELOPER','MANAGER','ADMIN','MARKETING','HEAD_CHEF','EMPLOYEE','AGENT','GUEST']
```

---

## Phase 29b — permissionMatrix.js + can() Helper

**Goal:** สร้าง single source of truth สำหรับ permission ทุกอย่าง

### Tasks

| # | Task | ไฟล์ |
|---|---|---|
| 29b.1 | สร้าง `permissionMatrix.js` — full matrix config | `src/lib/permissionMatrix.js` |
| 29b.2 | สร้าง `can(role, domain, action)` helper | `src/lib/permissionMatrix.js` |
| 29b.3 | สร้าง `getModuleAccess(role)` — ส่งคืน accessible modules | `src/lib/permissionMatrix.js` |
| 29b.4 | Unit tests | `src/lib/__tests__/permissionMatrix.test.js` |

### Structure ของ permissionMatrix.js
```js
// domains: business, sales, inbox, marketing, kitchen, catalog, system
// actions: view, create, edit, delete, approve, request
// special: 'own' (เห็นเฉพาะ record ของตัวเอง), 'log' (ทำได้ + audit log)

export const PERMISSIONS = {
  DEVELOPER: {
    business:  { view: true, create: true, edit: true, delete: true },
    sales:     { view: true, create: true, edit: true, delete: true },
    inbox:     { view: true, create: true, edit: true, delete: true },
    marketing: { view: true, create: true, edit: true, delete: true, approve: true },
    kitchen:   { view: true, create: true, edit: true, delete: true, approve: true },
    catalog:   { view: true, create: true, edit: true, delete: true },
    system:    { view: true, create: true, edit: true, delete: true },
  },
  MARKETING: {
    business:  { view: true },
    sales:     { view: true },  // customers read-only
    inbox:     { view: true },
    marketing: { view: true, create: true, edit: true, approve: false, request: true }, // lifetime budget = request
    kitchen:   {},
    catalog:   {},
    system:    {},
  },
  HEAD_CHEF: {
    business:  { view: true },
    sales:     { view: true, create: true, edit: true },  // enrollments
    inbox:     {},
    marketing: {},
    kitchen:   { view: true, create: true, edit: true, delete: true, approve: true },
    catalog:   { view: true },
    system:    {},
  },
  // ... etc
}
```

---

## Phase 29c — Refactor RBAC Guards

**Goal:** แทนที่ hardcoded role checks ด้วย `can()` helper ทั่ว codebase

### Files ที่ต้อง refactor

| ไฟล์ | Pattern ที่ต้องแก้ |
|---|---|
| `src/app/page.js` | `['SUPERVISOR','MANAGER','ADMIN','DEVELOPER'].includes(role)` |
| `src/components/Sidebar.js` | role-based nav items |
| `src/components/EmployeeManagement.js` | admin-only actions |
| `src/app/api/employees/route.js` | requireRole guards |
| `src/app/api/marketing/*/route.js` | marketing domain guards |
| `src/lib/rbac.js` | update role list + hierarchy |
| `src/middleware.js` | route-level guards |

### Pattern ใหม่
```js
// เดิม (กระจาย ไม่ consistent)
if (!['ADMIN','MANAGER','DEVELOPER'].includes(currentUser.role)) return null

// ใหม่ (จากที่เดียว)
import { can } from '@/lib/permissionMatrix'
if (!can(currentUser.role, 'system', 'view')) return null
```

---

## Phase 29d — Ads Optimize API Routes

**Goal:** เพิ่ม API routes สำหรับ write operations ไปหา Meta Graph API

### New API Routes

```
POST   /api/ads/campaigns/[id]/status      ← pause/resume campaign
POST   /api/ads/adsets/[id]/status         ← pause/resume adset
POST   /api/ads/ads/[id]/status            ← pause/resume ad
PATCH  /api/ads/adsets/[id]/budget         ← ปรับ daily_budget
PATCH  /api/ads/adsets/[id]/bid            ← ปรับ bid_amount / strategy
POST   /api/ads/campaigns/[id]/duplicate   ← duplicate campaign
POST   /api/ads/optimize/requests          ← สร้าง lifetime budget request
PATCH  /api/ads/optimize/requests/[id]     ← MANAGER approve/reject
```

### Tasks

| # | Task | ไฟล์ |
|---|---|---|
| 29d.1 | `adsOptimizeRepo.js` — Meta API write wrapper | `src/lib/repositories/adsOptimizeRepo.js` |
| 29d.2 | Route: pause/resume (campaign/adset/ad) | `src/app/api/ads/[type]/[id]/status/route.js` |
| 29d.3 | Route: budget/bid patch | `src/app/api/ads/adsets/[id]/budget/route.js` |
| 29d.4 | Route: duplicate | `src/app/api/ads/campaigns/[id]/duplicate/route.js` |
| 29d.5 | Route: lifetime budget request/approve | `src/app/api/ads/optimize/requests/route.js` |
| 29d.6 | Audit log บันทึกทุก write action | ผ่าน `auditLogRepo.js` |
| 29d.7 | Rate limit guard (Meta 429 handling) | ใน `adsOptimizeRepo.js` |

### adsOptimizeRepo.js — Meta API calls

```js
// Meta Graph API endpoints ที่ใช้
// PATCH https://graph.facebook.com/v19.0/{campaign_id} { status: "PAUSED" }
// PATCH https://graph.facebook.com/v19.0/{adset_id}    { daily_budget: 50000 }
// PATCH https://graph.facebook.com/v19.0/{adset_id}    { bid_amount: 1000 }
// POST  https://graph.facebook.com/v19.0/act_{act}/campaigns { ...copy_fields }
```

### Prisma Schema เพิ่ม (ถ้ายังไม่มี)

```prisma
model AdsOptimizeRequest {
  id          String   @id @default(uuid())
  requestId   String   @unique  // OPT-YYYYMMDD-XXX
  requestedBy String   // employeeId
  type        String   // LIFETIME_BUDGET
  targetId    String   // campaign_id / adset_id
  targetName  String
  currentVal  Float
  proposedVal Float
  status      String   @default("PENDING")  // PENDING / APPROVED / REJECTED
  reviewedBy  String?
  reviewedAt  DateTime?
  createdAt   DateTime @default(now())
}
```

---

## Phase 29e — Ads Optimize UI

**Goal:** UI สำหรับ optimize ads ใน Ads Analytics page

### Components ที่ต้องเพิ่ม/แก้

| Component | งาน |
|---|---|
| `ExecutiveAnalytics.js` | เพิ่ม action buttons บน campaign/adset cards |
| `AdsOptimizePanel.js` | **ใหม่** — side panel สำหรับ edit budget/bid/status |
| `AdsOptimizeRequestModal.js` | **ใหม่** — modal สำหรับ request lifetime budget change |
| `AdsApprovalBadge.js` | **ใหม่** — badge แสดง pending requests สำหรับ MANAGER |

### UI Layout บน Campaign Card

```
┌─────────────────────────────────────────────────┐
│  📣 V School April 2026                         │
│  Spend: ฿12,500  ROAS: 3.2x  Reach: 45,230     │
│  Status: ● ACTIVE                               │
├─────────────────────────────────────────────────┤
│  [⏸ Pause]  [📋 Duplicate]  [✏️ Budget: ฿500/d] │
└─────────────────────────────────────────────────┘
```

- ปุ่มแสดงเฉพาะ MARKETING, MANAGER, DEVELOPER
- ทุก action แสดง confirm dialog ก่อนยิง API
- หลัง action สำเร็จ → optimistic UI update + toast

---

## Phase 29f — Permission Management UI

**Goal:** หน้า UI สำหรับ toggle permission ต่อ role (ใน Employee Management section)

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Permission Management                                       │
│  [ DEVELOPER ] [ MANAGER ] [ ADMIN ] [ MARKETING ] ...       │
├───────────────┬──────┬────────┬──────┬───────────────────────┤
│ Module        │ View │ Create │ Edit │ Delete / Special       │
├───────────────┼──────┼────────┼──────┼───────────────────────┤
│ 📊 Dashboard  │  ✅  │   —    │  —   │  —                    │
│ 💬 Inbox      │  ✅  │  ✅   │  ✅  │  —                    │
│ 📢 Ads        │  ✅  │  ✅   │  ✅  │  Request Lifetime ⚠️  │
│ 🍳 Kitchen    │  ✅  │  ✅   │  ✅  │  Approve PR ✅         │
│ 👥 Employees  │  ✅  │   —    │  —   │  —                    │
└───────────────┴──────┴────────┴──────┴───────────────────────┘
                              [ กำลังดู: MARKETING ▾ ]
```

> Phase นี้เป็น **read-only UI** ก่อน — แสดง permission ของแต่ละ role  
> Phase ถัดไปค่อยทำ editable toggles (ถ้า Boss ต้องการ)

---

## Phase 29g — Tests + Audit + Docs

| # | Task |
|---|---|
| 29g.1 | Unit tests: `permissionMatrix.test.js` — ครบทุก role + domain + action |
| 29g.2 | Integration tests: Ads Optimize API routes (mock Meta API) |
| 29g.3 | Test: Lifetime budget request/approve flow |
| 29g.4 | อัปเดต `docs/API_REFERENCE.md` — เพิ่ม Ads Optimize endpoints |
| 29g.5 | อัปเดต `docs/architecture/domain-architecture.md` — เพิ่ม Marketing domain |
| 29g.6 | อัปเดต `GEMINI.md` — เพิ่ม new API routes + roles |
| 29g.7 | Changelog entry `CL-20260321-003.md` |

---

## Dependency Map

```
29a (DB) → 29b (Matrix) → 29c (Refactor) ─────────────────────┐
                       → 29d (Ads API) → 29e (Ads UI)          │
                       → 29f (Perm UI)                          │
                                                  29g (Tests + Docs) ← all
```

29a ต้องเสร็จก่อน เพราะ role values ที่ถูกต้อง (uppercase) เป็น prerequisite ของทุกอย่าง

---

## Known Risks

| Risk | Mitigation |
|---|---|
| Force re-login ทำให้ user งง | แสดง toast "Session expired, กรุณา login ใหม่" |
| Meta API rate limit บน write | Exponential backoff + queue write requests |
| permission ที่เคย hardcode ถูกมองข้าม | Grep ทุก `includes(role)` + `role ===` ก่อน push |
| MARKETING role ปรับ budget โดยไม่ตั้งใจ | Confirm dialog + audit log ทุก action |

---

## Definition of Done — v1.4.0

- [ ] ไม่มี `['ADMIN','MANAGER'].includes(role)` หลงเหลือใน components
- [ ] `can(role, domain, action)` ใช้แทนทั้งหมด
- [ ] DB roles ทุก row เป็น UPPERCASE
- [ ] MARKETING + HEAD_CHEF login ได้ เห็น menu ถูกต้อง
- [ ] Ads Optimize: pause/resume/budget/bid ทำงานจริงกับ Meta API
- [ ] Lifetime budget request/approve flow ทำงานครบ
- [ ] Audit log บันทึกทุก Ads write action
- [ ] Tests ผ่าน
- [ ] `npm run build` ผ่านไม่มี error
