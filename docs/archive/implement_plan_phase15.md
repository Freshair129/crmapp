# Implementation Plan — Phase 15: Asset + Kitchen Ops + Course Enrollment
_Date: 2026-03-15_
_Author: Claude (Lead Architect)_
_Status: PLANNED_

---

## Goal

Phase 15 extends the CRM into two new operational domains:

1. **Course Enrollment** — when a customer purchases a course via POS, create an `Enrollment` record. Track each class session (`CourseSchedule`), record attendance (`ClassAttendance`), and automatically award certificates when `hoursCompleted` thresholds are reached (30h / 111h / 201h).

2. **Kitchen Ops** — manage ingredient stock (`Ingredient`), define bill of materials per course (`CourseBOM`), and auto-generate purchase requests (`PurchaseRequest`) when stock falls below minimum before a scheduled class.

3. **Asset Management** — track physical assets (kitchen equipment, marketing materials) with status lifecycle (ACTIVE → IN_REPAIR → BROKEN → DISPOSED).

4. **Google Sheets Sync** — four master data tabs (Courses, Ingredients, CourseBOM, Assets) serve as the SSOT managed by the school manager. A CRM "Sync" button calls `POST /api/sheets/sync-master-data` to upsert all four domains.

5. **POS Enhancement** — checkout must create `Enrollment` when cart contains courses, and must allow creating a new customer inline without leaving POS.

6. **Excel Export** — any list view (purchase requests, asset inventory, enrollment reports) can be downloaded as `.xlsx`.

## ADRs ที่เกี่ยวข้อง
- ADR-035: Remove Facebook Login
- ADR-036: Google Sheets as SSOT for Master Data
- ADR-037: Product-as-Course-Catalog (reuse Product model, add COURSE category)
- ADR-025: Cross-Platform Identity Resolution (Customer creation inline in POS)
- ADR-027: Database Schema Initialization (base schema conventions)

## Scope

### In Scope ✅
- 9 new Prisma models: Enrollment, EnrollmentItem, CourseSchedule, ClassAttendance, Ingredient, CourseBOM, PurchaseRequest, PurchaseRequestItem, Asset
- Extend `ProductCategory` enum with `COURSE`
- Google Sheets sync: 4 tabs → 4 upsert flows
- API routes for all new models (CRUD)
- UI components: CourseEnrollmentPanel, KitchenStockPanel, AssetPanel, ScheduleCalendar
- POS: inline customer creation + enrollment creation on checkout
- Auto-generate PurchaseRequest when stock < minimum for upcoming class
- Certificate logic: hoursCompleted threshold check after each ClassAttendance record
- Excel export for: Enrollments, PurchaseRequests, Assets
- Unit tests: ≥ 3 test cases per new service module

### Out of Scope ❌
- Online payment gateway integration (POS remains cash/bank-transfer only)
- Student-facing portal or LINE self-enrollment
- Real-time socket updates for kitchen stock
- Barcode/QR scanning for asset tracking
- Integration with external accounting systems

---

## Database Changes

### New Models

| Model | หน้าที่ | Key Fields |
|---|---|---|
| `Enrollment` | Customer ซื้อคอร์ส/แพ็กเกจ | `id` (UUID), `customerId`, `productId` (→ Product COURSE), `employeeId` (who sold), `totalPrice`, `status` (ACTIVE/COMPLETED/CANCELLED), `enrolledAt`, `notes` |
| `EnrollmentItem` | แต่ละคอร์สภายใน Enrollment | `id`, `enrollmentId`, `productId`, `status` (PENDING/IN_PROGRESS/COMPLETED), `hoursCompleted` (Float, default 0), `certLevel` (Int, null=not certified), `completedAt` |
| `CourseSchedule` | Manager เปิด class session | `id`, `productId` (→ Product COURSE), `scheduledDate` (DateTime), `startTime`, `endTime`, `maxStudents` (Int), `confirmedStudents` (Int, default 0), `status` (OPEN/FULL/CANCELLED/COMPLETED), `instructorId` (→ Employee), `notes` |
| `ClassAttendance` | Student เข้าเรียน session | `id`, `enrollmentItemId`, `scheduleId`, `attendedAt` (DateTime), `hoursAttended` (Float), `note` |
| `Ingredient` | วัตถุดิบครัว | `id` (UUID), `name`, `unit` (e.g. "กก.", "ลิตร", "ชิ้น"), `currentStock` (Float), `minStock` (Float), `category` (PROTEIN/VEGETABLE/CONDIMENT/DRY_GOODS/OTHER), `updatedAt` |
| `CourseBOM` | Bill of Materials per course | `id`, `productId` (→ Product COURSE), `ingredientId`, `qtyPerPerson` (Float), `unit` — unique on `(productId, ingredientId)` |
| `PurchaseRequest` | Auto-generated when stock low | `id`, `requestId` (PR-[YYYYMMDD]-[SERIAL]), `scheduleId` (→ CourseSchedule trigger), `status` (DRAFT/SUBMITTED/APPROVED/RECEIVED), `createdAt`, `approvedBy` (→ Employee), `notes` |
| `PurchaseRequestItem` | รายการใน Purchase Request | `id`, `purchaseRequestId`, `ingredientId`, `qtyNeeded` (Float), `qtyInStock` (Float snapshot), `qtyToBuy` (Float = qtyNeeded - qtyInStock), `unit`, `estimatedCost` (optional) |
| `Asset` | อุปกรณ์ทางกายภาพ | `id` (UUID), `assetId` (AST-[CAT]-[YYYY]-[SERIAL]), `name`, `category` (MARKETING/KITCHEN/OFFICE), `status` (ACTIVE/IN_REPAIR/BROKEN/DISPOSED), `purchaseDate`, `purchasePrice`, `vendor`, `serialNumber`, `location`, `lastServiceDate`, `notes` |

### Modified Models

| Model | การเปลี่ยนแปลง |
|---|---|
| `Product` | เพิ่ม enum value `COURSE` ใน `ProductCategory`. Field `duration` ถูก reuse เป็น hours (แทน minutes) สำหรับ COURSE category |

### ID Formats (ตาม `id_standards.yaml`)

| Model | Format | ตัวอย่าง |
|---|---|---|
| Enrollment | `ENR-[YYYYMMDD]-[SERIAL]` | `ENR-20260315-001` |
| CourseSchedule | `SCH-[YYYYMMDD]-[SERIAL]` | `SCH-20260315-001` |
| PurchaseRequest | `PR-[YYYYMMDD]-[SERIAL]` | `PR-20260315-001` |
| Asset | `AST-[CAT]-[YYYY]-[SERIAL]` | `AST-KIT-2026-001` |

### Migration Command
```bash
npx prisma migrate dev --name phase15a-enrollment-kitchen-assets
```

---

## API Routes

| Method | Path | หน้าที่ | Auth |
|---|---|---|---|
| `POST` | `/api/enrollments` | สร้าง Enrollment + EnrollmentItems จาก POS checkout | Agent+ |
| `GET` | `/api/enrollments` | List enrollments (filter: customerId, status, productId) | Agent+ |
| `GET` | `/api/enrollments/[id]` | Enrollment detail + items + attendance summary | Agent+ |
| `PATCH` | `/api/enrollments/[id]` | Update status, notes | Manager+ |
| `POST` | `/api/enrollments/[id]/attendance` | บันทึก ClassAttendance → update hoursCompleted → check cert | Agent+ |
| `GET` | `/api/enrollments/export` | Export enrollments as `.xlsx` | Manager+ |
| `POST` | `/api/schedules` | Manager เปิด class session | Manager+ |
| `GET` | `/api/schedules` | List schedules (filter: productId, date range, status) | Agent+ |
| `PATCH` | `/api/schedules/[id]` | Update schedule (status, maxStudents, notes) | Manager+ |
| `DELETE` | `/api/schedules/[id]` | Cancel schedule (soft: status=CANCELLED) | Manager+ |
| `GET` | `/api/kitchen/ingredients` | List ingredients (filter: category, low stock) | Agent+ |
| `PATCH` | `/api/kitchen/ingredients/[id]` | Update currentStock after delivery | Manager+ |
| `GET` | `/api/kitchen/bom/[productId]` | Get BOM for a course | Agent+ |
| `POST` | `/api/kitchen/purchase-requests` | Manual create PR | Manager+ |
| `GET` | `/api/kitchen/purchase-requests` | List PRs (filter: status, date) | Agent+ |
| `PATCH` | `/api/kitchen/purchase-requests/[id]` | Approve/receive PR, update stock | Manager+ |
| `GET` | `/api/kitchen/purchase-requests/export` | Export PRs as `.xlsx` | Manager+ |
| `GET` | `/api/assets` | List assets (filter: category, status) | Agent+ |
| `POST` | `/api/assets` | Create asset record | Manager+ |
| `PATCH` | `/api/assets/[id]` | Update status (ACTIVE→IN_REPAIR→BROKEN→DISPOSED) | Manager+ |
| `GET` | `/api/assets/export` | Export asset list as `.xlsx` | Manager+ |
| `POST` | `/api/sheets/sync-master-data` | Sync 4 Google Sheets tabs → DB upsert | Manager+ |
| `GET` | `/api/sheets/sync-master-data/status` | Last sync timestamp + error log | Agent+ |

---

## UI Components

| Component | File | หน้าที่ |
|---|---|---|
| `CourseEnrollmentPanel` | `src/components/CourseEnrollmentPanel.js` | List enrollments, filter, drill-down to detail, attendance entry |
| `ScheduleCalendar` | `src/components/ScheduleCalendar.js` | Monthly calendar view of class sessions. Manager: create/cancel/update |
| `KitchenStockPanel` | `src/components/KitchenStockPanel.js` | Ingredient list with stock gauge, low-stock highlight, PR trigger |
| `PurchaseRequestPanel` | `src/components/PurchaseRequestPanel.js` | PR list, approve/receive flow, Excel export button |
| `AssetPanel` | `src/components/AssetPanel.js` | Asset inventory table, status badge, Excel export button |
| `MasterDataSyncButton` | `src/components/MasterDataSyncButton.js` | Trigger `/api/sheets/sync-master-data`, show last sync time + error log |
| `POS (enhanced)` | `src/components/PremiumPOS.js` | Add: inline new-customer modal + `createEnrollment()` on checkout |
| `CertificateBadge` | `src/components/CertificateBadge.js` | Display cert status (Level 1 / 111 / 201) on EnrollmentItem |

---

## Task Breakdown

### Phase 15a — Prisma Schema + Migration
- [ ] T1: เพิ่ม `COURSE` ใน `ProductCategory` enum — `prisma/schema.prisma`
- [ ] T2: เพิ่ม `Enrollment` model — `prisma/schema.prisma`
- [ ] T3: เพิ่ม `EnrollmentItem` model — `prisma/schema.prisma`
- [ ] T4: เพิ่ม `CourseSchedule` model — `prisma/schema.prisma`
- [ ] T5: เพิ่ม `ClassAttendance` model — `prisma/schema.prisma`
- [ ] T6: เพิ่ม `Ingredient` model — `prisma/schema.prisma`
- [ ] T7: เพิ่ม `CourseBOM` model + unique constraint `(productId, ingredientId)` — `prisma/schema.prisma`
- [ ] T8: เพิ่ม `PurchaseRequest` + `PurchaseRequestItem` models — `prisma/schema.prisma`
- [ ] T9: เพิ่ม `Asset` model — `prisma/schema.prisma`
- [ ] T10: `npx prisma migrate dev --name phase15a-enrollment-kitchen-assets`
- [ ] T11: `npx prisma generate`

### Phase 15b — Repository Layer + Business Logic
- [ ] T12: `src/lib/repositories/enrollmentRepo.js` — createEnrollment(), getEnrollmentById(), listEnrollments(), addAttendance()
- [ ] T13: `src/lib/repositories/scheduleRepo.js` — createSchedule(), listSchedules(), updateSchedule()
- [ ] T14: `src/lib/repositories/kitchenRepo.js` — listIngredients(), updateStock(), getBOM(), createPurchaseRequest(), approvePR()
- [ ] T15: `src/lib/repositories/assetRepo.js` — createAsset(), listAssets(), updateAssetStatus()
- [ ] T16: `src/lib/enrollmentService.js` — certificationCheck() เมื่อ hoursCompleted เพิ่ม (30/111/201 thresholds), idGenerator สำหรับ ENR/SCH/PR/AST formats
- [ ] T17: `src/lib/purchaseRequestService.js` — checkStockForSchedule(scheduleId): คำนวณ BOM × confirmedStudents → compare กับ currentStock → generate PR items
- [ ] T18: `src/lib/excelExportService.js` — exportToXlsx(data, columns, filename) ใช้ `xlsx` npm package
- [ ] T19: Unit tests — `src/lib/__tests__/enrollmentService.test.js` (≥ 3 cases: cert threshold, attendance accumulation, over-capacity guard)
- [ ] T20: Unit tests — `src/lib/__tests__/purchaseRequestService.test.js` (≥ 3 cases: sufficient stock, partial deficit, zero stock)

### Phase 15c — API Routes
- [ ] T21: `src/app/api/enrollments/route.js` — GET list + POST create
- [ ] T22: `src/app/api/enrollments/[id]/route.js` — GET detail + PATCH update
- [ ] T23: `src/app/api/enrollments/[id]/attendance/route.js` — POST attendance → trigger cert check
- [ ] T24: `src/app/api/enrollments/export/route.js` — GET → xlsx download
- [ ] T25: `src/app/api/schedules/route.js` — GET list + POST create
- [ ] T26: `src/app/api/schedules/[id]/route.js` — PATCH update + DELETE (soft cancel)
- [ ] T27: `src/app/api/kitchen/ingredients/route.js` — GET list
- [ ] T28: `src/app/api/kitchen/ingredients/[id]/route.js` — PATCH update stock
- [ ] T29: `src/app/api/kitchen/bom/[productId]/route.js` — GET BOM for course
- [ ] T30: `src/app/api/kitchen/purchase-requests/route.js` — GET list + POST create
- [ ] T31: `src/app/api/kitchen/purchase-requests/[id]/route.js` — PATCH approve/receive
- [ ] T32: `src/app/api/kitchen/purchase-requests/export/route.js` — GET → xlsx download
- [ ] T33: `src/app/api/assets/route.js` — GET list + POST create
- [ ] T34: `src/app/api/assets/[id]/route.js` — PATCH status update
- [ ] T35: `src/app/api/assets/export/route.js` — GET → xlsx download
- [ ] T36: `src/app/api/sheets/sync-master-data/route.js` — POST trigger sync (Courses, Ingredients, CourseBOM, Assets tabs)
- [ ] T37: `src/app/api/sheets/sync-master-data/status/route.js` — GET last sync info

### Phase 15d — UI Components
- [ ] T38: `src/components/CourseEnrollmentPanel.js` — enrollment list table, status filter, drill-down modal, attendance entry form
- [ ] T39: `src/components/ScheduleCalendar.js` — react-calendar or custom monthly grid, session cards, create/cancel actions
- [ ] T40: `src/components/KitchenStockPanel.js` — ingredient table, stock gauge (currentStock/minStock), low-stock badge, PR auto-generate button
- [ ] T41: `src/components/PurchaseRequestPanel.js` — PR list (grouped by status), approve/receive flow, line item detail, xlsx export
- [ ] T42: `src/components/AssetPanel.js` — asset table with status badge, status transition buttons (ACTIVE→IN_REPAIR etc.), xlsx export
- [ ] T43: `src/components/MasterDataSyncButton.js` — sync trigger, spinner, last sync timestamp, error summary (expandable)
- [ ] T44: `src/components/CertificateBadge.js` — show cert level badge with icon on EnrollmentItem row
- [ ] T45: `src/components/PremiumPOS.js` — เพิ่ม inline new-customer modal (name + phone, POST /api/customers), เพิ่ม `createEnrollment()` call ต่อจาก checkout ถ้า cart มี COURSE item

### Phase 15e — Sidebar Wiring + Google Sheets Template
- [ ] T46: เพิ่ม nav items ใน `src/components/Sidebar.js`: Course Enrollment (GraduationCap icon), Kitchen (ChefHat icon), Assets (Wrench icon)
- [ ] T47: เพิ่ม pages: `src/app/enrollment/page.js`, `src/app/kitchen/page.js`, `src/app/assets/page.js`
- [ ] T48: สร้าง Google Sheet template (4 tabs: Courses, Ingredients, CourseBOM, Assets) พร้อม header rows ตาม field mapping ใน ADR-036
- [ ] T49: บันทึก `GOOGLE_SHEETS_MASTER_DATA_ID` ใน `.env.example`
- [ ] T50: อัพเดต `MEMORY.md`, `GOAL.md`, `CLAUDE.md`, `GEMINI.md` หลัง phase เสร็จ

---

## Definition of Done
ถือว่า Phase 15 เสร็จเมื่อ:
- [ ] `npx prisma migrate dev` ผ่านโดยไม่มี error — 9 models ใหม่ + COURSE enum value อยู่ใน DB
- [ ] `POST /api/enrollments` สร้าง Enrollment + EnrollmentItems ได้ถูกต้อง
- [ ] `POST /api/enrollments/[id]/attendance` เพิ่ม hoursCompleted และ set certLevel อัตโนมัติเมื่อครบ 30/111/201 ชั่วโมง
- [ ] `POST /api/sheets/sync-master-data` upsert ข้อมูลจาก Google Sheets ทั้ง 4 tabs ได้ถูกต้อง
- [ ] `GET /api/enrollments/export`, `/api/kitchen/purchase-requests/export`, `/api/assets/export` ส่ง `.xlsx` ที่เปิดได้ใน Excel
- [ ] POS checkout สำหรับ COURSE item สร้าง Enrollment record อัตโนมัติ
- [ ] POS inline customer creation ทำงานโดยไม่ต้อง redirect ออกจาก POS
- [ ] `npm run build` ผ่านไม่มี error
- [ ] Unit tests ≥ 6 test cases (enrollmentService + purchaseRequestService) PASSED
- [ ] `GOAL.md`, `CLAUDE.md`, `CHANGELOG.md`, `GEMINI.md` อัพเดตแล้ว

---

## Rollback Procedure
ถ้า Phase 15 พัง:
```bash
# 1. Revert code
git revert <phase15-commit-hash>

# 2. Rollback DB migration (dev เท่านั้น)
npx prisma migrate resolve --rolled-back 20260315000000_phase15a_enrollment_kitchen_assets
# หรือถ้าต้องการ reset สมบูรณ์ (dev only):
npx prisma db push --force-reset

# 3. Remove new env var
# ลบ GOOGLE_SHEETS_MASTER_DATA_ID จาก .env

# 4. อัพเดต MEMORY.md ว่า rollback แล้ว
# เพิ่ม entry: [DATE] Claude — Phase 15 rolled back เพราะ [เหตุผล]
```

หากต้อง rollback บน production (Supabase):
1. ไปที่ Supabase Dashboard → Database → Migrations
2. Drop tables: `Enrollment`, `EnrollmentItem`, `CourseSchedule`, `ClassAttendance`, `Ingredient`, `CourseBOM`, `PurchaseRequest`, `PurchaseRequestItem`, `Asset`
3. Revert `ProductCategory` enum: `ALTER TYPE "ProductCategory" RENAME VALUE 'COURSE' TO '_COURSE_REMOVED'` (ไม่ delete enum value — Postgres ทำไม่ได้โดยตรง, ใช้ rename แทน)
4. Deploy ode ที่ revert แล้ว

---

## Version History
| Date | Version | Change | By |
|---|---|---|---|
| 2026-03-15 | v1.0 | Initial plan — 50 tasks, 5 sub-phases | Claude |
