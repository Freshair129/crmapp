# ADR-045: RBAC Redesign — Domain-Based Roles + Ads Optimize Write Access

**Date:** 2026-03-21  
**Status:** Accepted  
**Version:** v1.4.0  
**Author:** Claude (Lead Architect)  
**Requested by:** Boss (Owner)

---

## Context

### ปัญหาที่พบใน RBAC เดิม (Phase 7 / ADR-026)

1. **Role ใน DB เป็น mixed case** — DB เก็บ `'Developer'`, `'ADMIN'` ปนกัน แต่ code check `ROLE_LABEL['DEVELOPER']` (uppercase) → lookup fail → แสดงผล role ผิด
2. **Permission hardcoded กระจายทั่ว codebase** — ทุก component ทำ `if (!['ADMIN','MANAGER'].includes(role)) return null` ต่างกัน → แก้ครั้งเดียวต้องไล่แก้หลายไฟล์
3. **ไม่มี domain specialist role** — Head Chef (ครัว) และ Marketing (Ads) ต้องการ permission เฉพาะ domain ที่ไม่ match กับ tier hierarchy เดิม
4. **Ads Analytics เป็น read-only เท่านั้น** — ไม่สามารถ optimize campaign ผ่าน CRM ได้ ต้องสลับไปทำใน Meta Business Suite ทำให้ workflow ช้า
5. **Role naming สับสน** — `Admin` อยู่ต่ำกว่า `Manager` ในระบบแต่ชื่อดูสำคัญกว่า

---

## Decision

### 1. Role Hierarchy ใหม่ — 8 roles

| Priority | Role (DB value) | สถานะพนักงาน | เปลี่ยนจากเดิม |
|---|---|---|---|
| L0 | `DEVELOPER` | ประจำ | uppercase fix |
| L1 | `MANAGER` | ประจำ | uppercase fix |
| L2 | `ADMIN` | ประจำ | uppercase fix |
| L2.5 | `MARKETING` | ประจำ | **ใหม่** — Marketing domain specialist |
| L2.5 | `HEAD_CHEF` | ประจำ | **ใหม่** — Kitchen domain specialist |
| L3 | `EMPLOYEE` | ประจำ | เปลี่ยนจาก Employee (uppercase) |
| L4 | `AGENT` | Freelance | uppercase fix |
| L5 | `GUEST` | ไม่ระบุ | uppercase fix |

> **หลักการ:** MARKETING และ HEAD_CHEF อยู่ระดับเดียวกันแต่คนละ domain — ไม่ใช่ tier ที่สูงกว่า ADMIN แต่ได้รับ full access ในโดเมนของตัวเอง

### 2. Centralized Permission Matrix — `src/lib/permissionMatrix.js`

แทนที่ hardcoded checks ทุกที่ด้วย single source of truth:

```js
// src/lib/permissionMatrix.js
export const PERMISSIONS = {
  DEVELOPER:   { /* full everything */ },
  MANAGER:     { /* full business */ },
  ADMIN:       { /* operations, no marketing, no system */ },
  MARKETING:   { /* marketing domain full + inbox view */ },
  HEAD_CHEF:   { /* kitchen domain full + enrollment */ },
  EMPLOYEE:    { /* day-to-day + own data */ },
  AGENT:       { /* own inbox + own customers + pos create */ },
  GUEST:       { /* read-only dashboard */ },
}

export function can(role, domain, action) {
  return PERMISSIONS[role]?.[domain]?.[action] ?? false
}
```

### 3. Permission Matrix (full)

| Domain | Module | DEV | MGR | ADMIN | MKTG | HEAD_CHEF | EMP | AGENT | GUEST |
|---|---|---|---|---|---|---|---|---|---|
| BUSINESS | Dashboard | full | full | full | view | view | view | view | view |
| BUSINESS | Reports | full | full | full | mktg-only | kitchen-only | view | - | - |
| SALES | POS / Orders | full | full | full | - | - | full | create | - |
| SALES | Customers | full | full | full | view | - | full | own | view |
| SALES | Enrollments | full | full | full | - | full | full | - | - |
| INBOX | Chat / Inbox | full | full | full | view | - | full | own | - |
| MARKETING | Analytics / AI | full | full | - | full | - | - | - | - |
| MARKETING | Lead Attribution | full | full | - | full | - | - | - | - |
| MARKETING | Campaign Sync | full | full | - | full | - | - | - | - |
| MARKETING | Pause/Resume Ad | full | full | - | full | - | - | - | - |
| MARKETING | Daily Budget | full | full | - | full+log | - | - | - | - |
| MARKETING | Bid/Targeting | full | full | - | full+log | - | - | - | - |
| MARKETING | Lifetime Budget | full | approve | - | request | - | - | - | - |
| KITCHEN | Stock / Lots | full | full | full | - | full | partial | - | - |
| KITCHEN | Purchase Request | full | approve | approve | - | approve | create | - | - |
| KITCHEN | Recipe | full | full | full | - | full | view | - | - |
| CATALOG | Products | full | full | full | - | view | view | view | view |
| CATALOG | Assets | full | full | full | - | view | view | - | - |
| SYSTEM | Employee Mgmt | full | full | view | - | - | - | - | - |
| SYSTEM | System Settings | full | - | - | - | - | - | - | - |

### 4. Ads Optimize — Meta API Write Access

ระบบ CRM มี `ads_management` permission บน Meta App อยู่แล้ว → เปิดใช้ write operations:

**Safe Actions** (MARKETING ทำได้เลย ไม่ต้อง approve):
- Pause / Resume campaign, adset, ad
- Duplicate campaign / adset

**Budget/Bid Actions** (MARKETING ทำได้ + บันทึก audit log):
- ปรับ daily_budget บน adset
- ปรับ bid_amount / bid_strategy
- เปลี่ยน targeting

**Restricted Actions** (ต้อง MANAGER approve ก่อน):
- ปรับ lifetime_budget — เพราะเปลี่ยนแล้วย้อนกลับยาก กระทบงบ campaign ทั้งก้อน

**ไม่ทำผ่าน CRM** (ทำใน Meta Business Suite โดยตรง):
- แก้ creative / ad copy
- สร้าง campaign ใหม่ตั้งแต่ต้น

### 5. Audit Log สำหรับ Ads Write Actions

ทุก write action ต้องบันทึกลง `AuditLog` model:

```
actor: employeeId
action: ADS_PAUSE | ADS_BUDGET_CHANGE | ADS_BID_CHANGE | ADS_DUPLICATE
target: campaign_id / adset_id / ad_id
details: { before: {...}, after: {...}, metaResponse: {...} }
```

---

## Consequences

### Positive
- Permission แก้ที่เดียว (`permissionMatrix.js`) — ทุก component อัปเดตพร้อมกัน
- Role ใน DB consistent uppercase ทั้งหมด — ไม่มี lookup fail อีก
- Marketing optimize Ads ได้ใน CRM เลย — ไม่ต้องสลับ tab
- Head Chef / Marketing มี domain access ที่เหมาะสม — ไม่ได้รับหรือขาด permission โดยไม่จำเป็น

### Negative / Risks
- **Breaking change:** Role values ใน DB ต้องแก้ทั้งหมด → ต้อง migrate + force re-login ทุก session
- **Meta API rate limit:** `ads_management` write calls มี limit — ต้อง handle 429 + retry
- **Lifetime budget approval flow:** ต้องสร้าง UI/API สำหรับ request/approve workflow

### Migration Plan
1. `UPDATE employees SET role = UPPER(role)` — normalize existing data
2. Update `authOptions.js` + `rbac.js` ให้รับค่า uppercase เท่านั้น
3. Force-expire NextAuth sessions ทั้งหมด (เปลี่ยน `NEXTAUTH_SECRET`) เพื่อให้ทุกคน re-login

---

## Alternatives Considered

| Option | เหตุที่ไม่เลือก |
|---|---|
| เพิ่ม role ลงใน hierarchy เดิม (ไม่ทำ permissionMatrix) | ยังคง hardcode กระจาย — แก้ยากเหมือนเดิม |
| ใช้ ABAC (attribute-based) | ซับซ้อนเกินขนาดทีม V School |
| ให้ HEAD_CHEF = MANAGER role | ได้รับ permission นอก kitchen มากเกินไป (Ads, Finance) |
| Ads Optimize ผ่าน external tool เท่านั้น | workflow ช้า ต้องสลับ context |
