# ADR 036: Google Sheets as Single Source of Truth for Master Data

**Date:** 2026-03-15
**Status:** Accepted
**Decider:** Claude (Lead Architect)
**Phase:** Phase 15

## Context

Phase 15 introduces four master data domains that require frequent non-technical updates by the school manager:

- **Courses** — course names, prices, durations, capacity (updates seasonally)
- **Ingredients** — kitchen stock items, units, minimum stock thresholds (updates weekly)
- **CourseBOM** (Bill of Materials) — which ingredients are used per course, quantity per student (updates per curriculum change)
- **Assets** — physical equipment inventory (kitchen equipment, marketing materials)

These domains share common characteristics:
1. Updated by **non-developers** (school manager, head chef) who are comfortable with spreadsheets but not with CRM admin UIs
2. Bulk updates are the norm — changing 20 ingredient thresholds at once is common
3. Historical snapshots matter — Google Sheets native versioning (File > Version History) gives free audit trail
4. The CRM already has `src/lib/googleSheetService.js` infrastructure (built in Phase 12 for NotificationCenter sync)

The alternative — building full CRUD UIs in the CRM for all four domains — would take significantly longer and would not serve the actual users' workflow.

## Options Considered

| Option | ข้อดี | ข้อเสีย |
|---|---|---|
| A: Google Sheets as SSOT, sync-to-DB via CRM button | Manager คุ้นเคยกับ Sheets. Bulk edit ง่าย. Audit trail ฟรี. Infrastructure มีอยู่แล้ว | ต้องมี manual sync step. Conflict possible ถ้า DB ถูกแก้โดยตรง |
| B: DB as SSOT, full CRM CRUD UI | Single source, real-time consistency | ต้องสร้าง UI 4 ชุด. Manager ต้องเรียนรู้ UI ใหม่. Bulk edit ยากกว่า |
| C: DB as SSOT, import CSV | ไม่ต้องพึ่ง Google API | ไม่มี collaboration. ไม่มี version history. UX แย่กว่า |

## Decision

เลือก **Option A — Google Sheets as SSOT** เพราะ:

1. Infrastructure (`googleSheetService.js`) มีอยู่แล้วและทำงานได้ใน production
2. Manager ใช้ Google Sheets อยู่แล้วในการจัดการ menu และ stock — zero learning curve
3. Google Sheets native versioning เป็น free audit trail ที่ไม่ต้องสร้างเอง
4. Sync-on-demand (CRM button) เหมาะกับ update cadence — ไม่ใช่ real-time trading system

### Sync Architecture
```
Google Sheets (4 tabs)
  ├── Courses       → upsert Product (name, price, duration, category='COURSE')
  ├── Ingredients   → upsert Ingredient (name, unit, minStock, category)
  ├── CourseBOM     → upsert CourseBOM (courseId × ingredientId × qtyPerPerson)
  └── Assets        → upsert Asset (name, category, status, purchaseDate)

Sync trigger: POST /api/sheets/sync-master-data  (Manager+ role)
Sync output:  { inserted: N, updated: N, errors: [] }
```

### Conflict Prevention Rules
- DB records สำหรับ master data domains ห้ามแก้โดยตรงผ่าน CRM — แก้ใน Sheets แล้ว sync เท่านั้น
- ยกเว้น: status changes (Asset status BROKEN/IN_REPAIR) ทำได้ใน CRM โดยตรง เพราะเป็น operational state ไม่ใช่ master data

### ENV vars ที่ต้องการ
```
GOOGLE_SHEETS_MASTER_DATA_ID=<spreadsheet_id>
```
(ใช้ credentials เดิมจาก `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_PRIVATE_KEY`)

## Consequences

### ผลดี
- Manager สามารถ bulk update ingredients/BOM ก่อนเปิด term ได้ใน 5 นาที
- Version history ของ master data ไม่ต้องสร้างเพิ่มใน DB
- `googleSheetService.js` reuse — ไม่ต้องเขียน Google API client ใหม่
- Dev ไม่ต้องสร้าง admin UI สำหรับ master data 4 ชุด

### ผลเสีย / Trade-offs
- ต้องมี "Sync" step — ถ้า Manager แก้ Sheets แต่ลืม sync, DB จะ stale
- Google API quota: 60 requests/minute per project — เพียงพอสำหรับ use case นี้
- ถ้า Google Sheets URL เปลี่ยน (Share link revoked) → sync พัง

### Rollback
ถ้าต้อง revert decision นี้:
1. Freeze Google Sheets (read-only)
2. สร้าง CRM CRUD UI สำหรับแต่ละ domain
3. ย้าย edit workflow ไปที่ CRM UI
4. ลบ sync endpoint `POST /api/sheets/sync-master-data`
5. ปล่อยให้ Sheets เป็นแค่ export/read view

---

## Amendment — v1.1.0 (2026-03-19) — ADR-042

**ปรับปรุงจาก ADR-042:** `productId` column ใน Courses Sheet เป็น optional แล้ว

เดิม sync-master-data กำหนดให้ทุก row ต้องมี `productId` ไม่งั้น skip
ใหม่: ถ้า `productId` ว่าง → `generateProductId()` สร้างให้อัตโนมัติตาม `TVS-[CATEGORY]-[PACK]-[SUBCAT]-[SERIAL]`

เพิ่ม columns ใหม่ใน Courses Sheet:
- `productType` — COURSE / PACKAGE / FULL_COURSE
- `cuisineCode` — JP / TH / SP / MG / AR
- `packCode` — 1FC / 2FC / SP
- `subcatCode` — HO / CO / SC / DS / HC / HR / HN
- `pkgNo`, `pkgShortName` — สำหรับ PACKAGE เท่านั้น

รายละเอียดเต็มดู [ADR-042](./042-product-id-generation-from-sheets.md)
