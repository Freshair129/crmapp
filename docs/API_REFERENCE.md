# API Reference — V School CRM

> อ้างอิง API routes ทั้งหมดใน `crm-app/src/app/api/`
> Base URL: `http://localhost:3000/api`
> อัปเดตล่าสุด: 2026-03-23 (v2.1.0 — Task Type System + Notion Sync + 12-role RBAC)

---

## สารบัญ

1. [Auth](#1-auth)
2. [Customers & V Points](#2-customers--v-points)
3. [Employees & Permissions](#3-employees--permissions)
4. [Products & Catalog](#4-products--catalog)
5. [Marketing & Ads Optimize](#5-marketing--ads-optimize)
6. [Inbox & AI Assistant](#6-inbox--ai-assistant)
7. [Procurement Lifecycle](#7-procurement-lifecycle)
8. [Inventory & Warehousing](#8-inventory--warehousing)
9. [Kitchen & Recipes](#9-kitchen--recipes)
10. [Schedules & Enrollment](#10-schedules--enrollment)
11. [Certificates](#11-certificates)
12. [Payments & Slip OCR](#12-payments--slip-ocr)
13. [Web Push & Notifications](#13-web-push--notifications)
14. [Webhooks](#14-webhooks)
15. [Tasks](#15-tasks)

---

## 1. Auth

### `POST /api/auth/[...nextauth]`

NextAuth.js authentication handler.

- **Roles (v2.0.0 — 12 roles):** `DEV`, `TEC`, `MGR`, `MKT`, `HR`, `PUR`, `PD`, `ADM`, `ACC`, `SLS`, `AGT`, `STF` + `OWNER` (executive read-only).
- **Legacy role codes** ยังรองรับ backward compat: `DEVELOPER→DEV`, `MANAGER→MGR`, `HEAD_CHEF→PD` ฯลฯ
- **Session:** JWT with 5-min auto-refresh from DB.

---

## 2. Customers & V Points

### `GET /api/customers`
ดึงรายชื่อลูกค้าพร้อม Fuzzy Thai Name Matching (`ADR-043`).
- **Query:** `search`, `fuzzy=true`, `limit`, `offset`.

### `POST /api/customers/[id]/vpoints`
สะสม V Points ให้ลูกค้า (300 VP per 150 THB).
- **Body:** `{ orderAmount, totalHours }`.
- **Logic:** Auto-recalculate membership tier (Member -> Black).

---

## 3. Employees & Permissions

### `GET /api/employees`
รายชื่อพนักงานพร้อม performance metrics.

### `GET /api/permissions`
ดึงสิทธิ์การใช้งาน (Permission Matrix) จาก `lib/permissionMatrix.js`.

---

## 4. Products & Catalog

### `GET /api/products`
ดึงสินค้าแบ่งตาม category (courses, packages, equipment).

### `POST /api/products/[id]/images`
Upload รูปสินค้า (max 6) → Supabase Storage → WebP.

---

## 5. Marketing & Ads Optimize

### `GET /api/marketing/sync-hourly`
Incremental hourly sync จาก Meta Graph API v19.0.

### `PATCH /api/ads/optimize/[type]/[id]/status`
Pause/Resume campaign, adset, หรือ ad.
- **Body:** `{ status: "ACTIVE" | "PAUSED" }`.
- **Logging:** AuditLog auto-generated.

### `POST /api/ads/optimize/requests`
ขออนุมัติเปลี่ยน Lifetime Budget (`AdsOptimizeRequest`).

---

## 6. Inbox & AI Assistant

### `GET /api/inbox/conversations`
Unified inbox (FB + LINE) พร้อม customer enrichment.

### `POST /api/inbox/ai-reply`
Generate AI reply using **Gemini 2.0 Flash**.
- **Body:** `{ input, tone, recentMessages, adminStyleOverride }`.
- **Context:** Knowledge files + Persona + Admin Style.

---

## 7. Procurement Lifecycle

### `GET/POST /api/procurement/po`
จัดการใบสั่งซื้อ (PO-YYYYMMDD-SERIAL).

### `POST /api/procurement/po/[id]/approve`
อนุมัติ/ตีกลับ PO (โดย HEAD_CHEF).
- **Body:** `{ action: "APPROVED" | "REJECTED", reason }`.

### `POST /api/procurement/po/[id]/grn`
รับของเข้าคลัง (GRN) → Auto-increment `Ingredient.currentStock`.

---

## 8. Inventory & Warehousing

### `GET /api/inventory/stock`
ดูสต็อกรายโกดัง (WarehouseStock).

### `POST /api/inventory/movements`
บันทึกการเคลื่อนไหวสต็อก (RECEIVE, ISSUE, TRANSFER, ADJUSTMENT).

### `POST /api/inventory/counts/[id]/complete`
ยืนยันการตรวจนับสต็อก → ปรับ system quantity ให้ตรง physical count.

---

## 9. Kitchen & Recipes

### `GET/POST /api/recipes`
จัดการสูตรอาหาร (RCP-[YYYY]-[SERIAL]).

### `GET /api/kitchen/course-bom/[productId]`
คำนวณวัตถุดิบที่ต้องใช้สำหรับคอร์ส.

---

## 10. Schedules & Enrollment

### `POST /api/schedules/[id]/complete`
ปิดคลาส + **Real-time Stock Deduction** (FEFO logic).
- **Logic:** ตัดสต็อกจาก `IngredientLot` เรียงตามวันหมดอายุ.

---

## 11. Certificates

### `POST /api/certificates`
Issue certificate (TVS-CERT-...).
- **Levels:** `BASIC_30H`, `PRO_111H`, `MASTER_201H`.

---

## 12. Payments & Slip OCR

### `POST /api/payments/ocr-slip`
Real-time Thai bank slip OCR (Gemini 2.0 Flash).
- **Confidence:** $\ge 0.80$ for auto-verification.

---

## 13. Web Push & Notifications

### `POST /api/push/subscribe`
Subscribe browser push notifications (VAPID).

---

## 14. Webhooks

### `POST /api/webhooks/facebook`
Meta Messenger webhook handler (Latency < 200ms).

### `POST /api/webhooks/line`
LINE Messaging API webhook handler.

---

## 15. Tasks

> **v2.1.0 (Phase 37)** — Task Type System: SINGLE / RANGE / PROJECT + Notion Bidirectional Sync

### `GET /api/tasks`
ดึงรายการ Task ทั้งหมด (หรือกรองตาม assignee / customer / status)
- **Query:** `assigneeId`, `customerId`, `status`, `taskType`
- **Response fields:** `taskType`, `startDate`, `timeStart`, `timeEnd`, `milestones[]`, `completedAt`, `notionId`

### `POST /api/tasks`
สร้าง Task ใหม่
- **Body:**
```json
{
  "title": "...",
  "type": "FOLLOW_UP | CALL | EMAIL | MEETING | DEMO",
  "taskType": "SINGLE | RANGE | PROJECT",
  "priority": "L1·Critical | L2·Important | L3·Routine | L4·Deferrable | L5·Optional",
  "dueDate": "2026-03-30",
  "startDate": "2026-03-25",
  "timeStart": "09:00",
  "timeEnd": "10:30",
  "milestones": [{ "id": "ms1", "title": "รับบรีฟ", "date": "2026-03-25", "type": "brief" }],
  "assigneeId": "...",
  "customerId": "..."
}
```
- **Note:** `startDate` required for RANGE/PROJECT. `milestones` for PROJECT only. `timeStart/timeEnd` for SINGLE only.

### `GET /api/tasks/[id]`
ดึง Task เดี่ยวพร้อม milestones array.

### `PATCH /api/tasks/[id]`
แก้ไข Task — รองรับทุก field รวมถึง `status`, `taskType`, `milestones`, `completedAt`, `notionId`.

### `DELETE /api/tasks/[id]`
ลบ Task (soft delete ผ่าน status = CANCELLED หรือ hard delete ตาม policy).

---

### Task Type Reference

| taskType | startDate | dueDate | timeStart/timeEnd | milestones | Calendar |
|---|---|---|---|---|---|
| `SINGLE` | — | ✅ required | optional (HH:MM) | — | Single card + ⏰ badge |
| `RANGE` | ✅ required | ✅ required | — | — | Purple spanning bar |
| `PROJECT` | ✅ required | ✅ required | — | optional | Amber bar + ◆ markers |

---

> **หมายเหตุ:** โปรเจคนี้ใช้ Repository Pattern ทั้งหมด DB Logic อยู่ใน `src/lib/repositories/`
