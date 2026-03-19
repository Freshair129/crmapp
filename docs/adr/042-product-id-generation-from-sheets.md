# ADR-042 — Product ID Generation from Google Sheets (TVS Format)

**Status:** Accepted
**Date:** 2026-03-19
**Author:** Claude (Lead Architect)
**Phase:** Post-v1.0.0 (v1.1.0)
**Supersedes:** Partial override of ADR-036 (Sheets as SSOT) — productId column is now optional

---

## Context

เดิม `POST /api/sheets/sync-master-data` กำหนดให้ทุก row ใน Google Sheet ต้องมี `productId` อยู่แล้ว (ถ้าว่าง → skip) ซึ่งหมายความว่าคนที่เพิ่มคอร์สใหม่ต้องรู้ format รหัสสินค้าและกรอกเองทุกครั้ง

ปัญหา:
- Manager ต้องรู้ format `TVS-JP-2FC-HC-XX` และนับ serial เอง → error-prone
- ถ้าใส่รหัสผิด format → ข้อมูลใน DB inconsistent กับ `id_standards.yaml`
- ระบบควร generate ID ให้เองจากข้อมูล domain ที่มีอยู่แล้ว (cuisine, pack, subcat)

---

## Decision

**ปรับ sync-master-data ให้ auto-generate `productId` เมื่อ Sheet row ไม่มีค่าในคอลัมน์ `productId`**

โดย:
1. เพิ่ม columns ใหม่ใน Sheet: `productType`, `cuisineCode`, `packCode`, `subcatCode`, `pkgNo`, `pkgShortName`
2. ระบบ derive `productId` จาก columns เหล่านี้ผ่าน `generateProductId()` ใน `courseRepo.js`
3. เฉพาะ `name` เท่านั้นที่เป็น required column — ทุกอย่างอื่น optional

---

## ID Format Rules (จาก `id_standards.yaml` category: "Product & Course SKUs")

### COURSE
```
TVS-{cuisineCode}-{packCode}-{subcatCode}-{SERIAL:02d}
```
- **cuisineCode:** `JP` (ญี่ปุ่น) | `TH` (ไทย) | `SP` (พิเศษ) | `MG` (บริหาร) | `AR` (ศิลปะ)
- **packCode:** `1FC` (Full Course Pack 1) | `2FC` (Full Course Pack 1+2) | `SP` (Special)
- **subcatCode:** `HO` (Hot Kitchen) | `CO` (Cold Kitchen) | `SC` (Sushi & Classic) | `DS` (Dessert) | `HC` | `HR` | `HN` | `MG` | `AR`
- **SERIAL:** sequential per prefix — `TVS-JP-2FC-HC-XX` มี serial แยกจาก `TVS-JP-2FC-SC-XX`

ตัวอย่าง: `TVS-JP-2FC-HC-21`, `TVS-SP-2FC-HO-02`

### PACKAGE
```
TVS-PKG{pkgNo:02d}-{pkgShortName}-{hours}H
```
- **pkgNo:** ลำดับแพ็กเกจ 01–99
- **pkgShortName:** ชื่อย่อ เช่น `BUFFET`, `DELIVERY`, `RAMEN`, `CAFE`
- **hours:** ชั่วโมงรวมของแพ็กเกจ

ตัวอย่าง: `TVS-PKG01-BUFFET-30H`, `TVS-PKG07-PROCHEF-78H`

### FULL_COURSE
```
TVS-FC-FULL-COURSES-{variant}-{hours}H
```
- **variant:** `A` (≤ 111 ชม.) | `B` (> 111 ชม.)

ตัวอย่าง: `TVS-FC-FULL-COURSES-A-111H`, `TVS-FC-FULL-COURSES-B-201H`

---

## Google Sheet Column Specification

| Column | Type | Required | หมายเหตุ |
|---|---|---|---|
| `productId` | String | ❌ | ว่าง = auto-gen ตาม format ด้านบน |
| `name` | String | ✅ | ชื่อหลักสูตร |
| `productType` | Enum | ❌ | `COURSE` (default) / `PACKAGE` / `FULL_COURSE` |
| `cuisineCode` | String | ❌ | `JP` / `TH` / `SP` / `MG` / `AR` (COURSE) |
| `packCode` | String | ❌ | `1FC` / `2FC` / `SP` (COURSE) |
| `subcatCode` | String | ❌ | `HO` / `CO` / `SC` / `DS` / `HC` / `HR` / `HN` (COURSE) |
| `pkgNo` | Integer | ❌ | 1–99 (PACKAGE เท่านั้น) |
| `pkgShortName` | String | ❌ | ชื่อย่อแพ็กเกจ (PACKAGE เท่านั้น) |
| `category` | String | ❌ | DB category — ถ้าว่าง auto-infer จาก cuisineCode |
| `price` | Float | ❌ | ราคาขาย |
| `basePrice` | Float | ❌ | ราคาก่อนลด |
| `hours` | Float | ❌ | ชั่วโมงเรียน |
| `days` | Float | ❌ | จำนวนวัน |
| `sessionType` | String | ❌ | `MORNING\|AFTERNOON\|EVENING` (pipe-separated) |
| `description` | String | ❌ | คำอธิบาย |
| `tags` | String | ❌ | `sushi\|japanese\|beginner` (pipe-separated) |
| `image` | String | ❌ | URL รูปหลัก |
| `isActive` | Boolean | ❌ | `TRUE` / `FALSE` (default: TRUE) |

### cuisineCode → DB category Mapping

| cuisineCode | DB category |
|---|---|
| `JP` | `japanese_culinary` |
| `TH` | `thai` |
| `SP` | `specialty` |
| `MG` | `management` |
| `AR` | `arts` |
| `FC` | `full_course` |
| `PKG` | `package` |

---

## Implementation

### `generateProductId()` — `src/lib/repositories/courseRepo.js`
```js
export async function generateProductId({ productType, cuisineCode, packCode, subcatCode, pkgNo, pkgShortName, hours })
```
- Exported function — เรียกได้จาก sync-master-data route
- Serial counter query: `prisma.product.findFirst({ where: { productId: { startsWith: prefix } }, orderBy: { productId: 'desc' } })`
- PACKAGE/FULL_COURSE: deterministic (ไม่มี serial DB lookup) — ใช้ `pkgNo` หรือ `hours` โดยตรง

### `POST /api/sheets/sync-master-data` — `src/app/api/sheets/sync-master-data/route.js`
- Import `generateProductId` จาก courseRepo
- ถ้า `row.productId` ว่าง → call `generateProductId({ ... })` ก่อน upsert
- Upsert key: `productId` (unique constraint)

---

## Consequences

### ผลดี
- Manager เพิ่มคอร์สใหม่ใน Sheet ได้โดยไม่ต้องรู้ ID format — กรอกแค่ชื่อ + ข้อมูล domain
- ID ที่ generate สอดคล้องกับ `id_standards.yaml` เสมอ — ไม่มี human error ใน format
- Upsert pattern เดิมยังใช้ได้ — ถ้า row มี `productId` อยู่แล้ว (เช่น existing courses) จะ update แทน insert

### ผลเสีย / Trade-offs
- Row ที่ไม่มี `productId` จะ generate ID ใหม่ทุกครั้งที่ sync ถ้า record ยังไม่มีใน DB
  → ถ้า Manager sync ซ้ำโดยไม่กรอก `productId` กลับไปใน Sheet → อาจสร้าง duplicate product
  → **Mitigation:** แจ้ง Manager ให้ copy `productId` ที่ได้กลับไปใส่ใน Sheet หลัง sync ครั้งแรก
- PACKAGE/FULL_COURSE ไม่มี serial counter → สร้าง ID เดิมซ้ำได้ถ้า pkgNo/hours เหมือนกัน
  → **Acceptable:** แพ็กเกจ upsert ด้วย productId เดิม = update (ไม่ insert ซ้ำ)

### Known Issue — No Write-back
ระบบไม่ write `productId` ที่ generate กลับไป Google Sheet อัตโนมัติ เพราะ:
- ต้องใช้ Google Sheets API write permission (OAuth scope ต่างจาก read)
- Risk: overwrite data ที่ Manager กรอกเองผิดพลาด

แนวทางในอนาคต: sync response ส่ง list ของ `{ name, productId }` ที่ generate ใหม่ → แสดงใน UI ให้ Manager copy กลับไปเอง

---

## Relationship to Other ADRs

| ADR | ความสัมพันธ์ |
|---|---|
| ADR-036 | Extension — Sheet-based sync ยังคงอยู่ แต่ productId column ไม่ required อีกต่อไป |
| ADR-037 | Foundation — Product model เป็น Course Catalog ซึ่ง ADR นี้อ้างอิง |
| id_standards.yaml | Source of Truth สำหรับ ID format ทุก format ที่ใช้ในที่นี้ |
