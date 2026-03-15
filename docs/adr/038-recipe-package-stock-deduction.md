# ADR 038: Recipe-Package-Stock System (Phase 16)

**Date:** 2026-03-15
**Status:** Accepted
**Decider:** Claude (Lead Architect)
**Phase:** Phase 16

---

## Context

V School ต้องการระบบที่ครอบคลุม 3 สิ่งที่เชื่อมโยงกัน:

1. **Recipe (สูตรอาหาร)** — แต่ละ course มีเมนูที่สอน แต่ละเมนูต้องการวัตถุดิบและอุปกรณ์พิเศษ
2. **Package** — คอร์สหลายตัวรวมกันในราคาลด พร้อม rule ว่าสามารถเปลี่ยนคอร์สได้หรือไม่
3. **Real-time stock deduction** — เมื่อ session เสร็จ ต้องตัดสต็อกอัตโนมัติตาม recipe ที่สอน

---

## Decision 1: Recipe เป็น Entity แยกจาก Product

**ตัดสิน:** สร้าง `Recipe` model ใหม่ — ไม่ embed ใน `Product`

**เหตุผล:**
- Recipe มี lifecycle ต่างจาก Product — Product คือ "สิ่งที่ขาย", Recipe คือ "สิ่งที่สอน"
- Recipe 1 ตัวอาจถูกสอนในหลาย course (many-to-many ผ่าน `CourseMenu`)
- Recipe มี sub-entities (ingredients, equipment) ที่ต้องการ relation ของตัวเอง
- ในอนาคต Recipe อาจมี version history, difficulty level, nutrition info เป็นต้น

**ทางเลือกที่ไม่เลือก:**
- `Product.metadata` JSON — ไม่สามารถ query/filter ได้อย่างมีประสิทธิภาพ
- Embed recipe ใน `Product` — ทำให้ Product model โตเกินไป

---

## Decision 2: RecipeEquipment แยกจาก Ingredient

**ตัดสิน:** `RecipeEquipment` เป็น model ต่างหาก — ไม่ reuse `Ingredient`

**เหตุผล:**
- Equipment (อุปกรณ์พิเศษ) มีลักษณะต่างจาก Ingredient:
  - Ingredient: สิ้นเปลือง (consumable), qty per person
  - Equipment: ไม่สิ้นเปลือง (reusable), qty per session (ไม่คูณจำนวนนักเรียน)
- Equipment track ที่ recipe level (ผูกกับสูตร) — Ingredient track ที่ global level (pool เดียว)
- ถ้า reuse `Ingredient` จะต้องเพิ่ม field `isEquipment`, `qtyType` ทำให้ model ซับซ้อนและ confusing

**Implication:** Stock deduction logic ต่างกัน:
- `RecipeIngredient.qty` × studentCount → deduct `Ingredient.currentStock`
- `RecipeEquipment.qtyRequired` (fixed per session) → deduct `RecipeEquipment.currentStock`

---

## Decision 3: Package Swap — 1 ครั้งต่อ Enrollment

**ตัดสิน:** `PackageEnrollment.swapUsedAt DateTime?` — null = ยังไม่ swap

**เหตุผล:**
- Boss ยืนยัน: ใช้สิทธิ์ swap ได้เพียง 1 ครั้งต่อ enrollment
- `swapUsedAt` ที่เป็น DateTime ดีกว่า Boolean `swapUsed` เพราะ:
  - Track ได้ว่า swap เมื่อไหร่ (audit trail)
  - ง่ายต่อ query "ลูกค้าที่ swap ในช่วงเวลานั้นๆ"
- Swap เป็น atomic transaction ใน `packageRepo.swapCourseInEnrollment()`:
  1. DELETE `PackageEnrollmentCourse` (old)
  2. CREATE `PackageEnrollmentCourse` (new, `wasSwapped: true`)
  3. UPDATE `PackageEnrollment.swapUsedAt = now()`

**Business rule enforcement:**
- Backend check `swapUsedAt != null` → return 409 Conflict
- UI ไม่แสดง swap button ถ้า `swapUsedAt` มีค่า

---

## Decision 4: Package Price = Manual Input (ไม่ auto-compute จาก DB)

**ตัดสิน:** เก็บทั้ง `originalPrice` (sum courses) และ `packagePrice` (actual) เป็น stored fields

**เหตุผล:**
- `originalPrice` ควร snapshot ณ เวลาสร้าง package — ถ้าราคา course เปลี่ยนทีหลัง discount ไม่ควรเปลี่ยนตาม
- `packagePrice` คือสิ่งที่ business กำหนด — ไม่ใช่ formula
- Client-side auto-calculate `originalPrice` จาก selected courses ตอนสร้าง (ใน `PackagePage.js`)
- Database stores final values เท่านั้น

**ทางเลือกที่ไม่เลือก:**
- Computed field — Prisma ยังไม่ support computed fields ใน PostgreSQL โดยตรง
- View/Function — over-engineering สำหรับ use case นี้

---

## Decision 5: Real-time Stock Deduction ทำใน `$transaction`

**ตัดสิน:** `completeSessionWithStockDeduction()` ใช้ `prisma.$transaction`

**เหตุผล:**
- NFR5: Identity upsert ต้องอยู่ใน `prisma.$transaction` (ขยายหลักการนี้ไปยัง stock deduction)
- ถ้าตัดสต็อกบางรายการสำเร็จแต่บางรายการ fail → inventory inconsistent
- Transaction guarantee: ทั้งหมด succeed หรือทั้งหมด rollback

**Flow:**
```
1. Load schedule + product + courseMenus + recipe ingredients/equipment
2. Compute deductions (Map to aggregate ingredients across multiple recipes)
3. $transaction {
     - Deduct each Ingredient.currentStock (decrement)
     - Deduct each RecipeEquipment.currentStock (decrement)
     - Update CourseSchedule.status = 'COMPLETED'
   }
4. Log summary
```

**Edge cases handled:**
- Stock ลบเกิน 0: อนุญาต (ให้เห็น negative stock = ต้องซื้อเพิ่ม)
- Session ที่ไม่มี recipes: transaction ยังทำงาน (no deductions, status update only)
- studentCount = 0: fallback เป็น `confirmedStudents` หรือ 1

---

## Consequences

### Positive
- Recipe + Course decoupled อย่างถูกต้อง — เปลี่ยน recipe ไม่กระทบ course pricing
- Package swap rule enforce ที่ backend — UI ไม่สามารถ bypass ได้
- Stock deduction atomic — ไม่มี partial state
- `wasSwapped` flag ใน `PackageEnrollmentCourse` ทำให้ audit trail ชัดเจน

### Trade-offs
- `RecipeEquipment` เป็น model แยก → เพิ่ม complexity เล็กน้อย
- ไม่มี real-time stock alert (push notification) เมื่อ stock ต่ำ — อยู่ใน backlog Phase 17
- Package swap validate `swapGroup` ที่ UI layer เท่านั้น — backend ไม่ validate business rule นี้ (ทำได้ใน Phase 17)

---

## ID Formats

| Model | Format | ตัวอย่าง |
|---|---|---|
| Recipe | `RCP-[YYYY]-[SERIAL]` | `RCP-2026-001` |
| Package | `PKG-[YYYY]-[SERIAL]` | `PKG-2026-001` |
| PackageEnrollment | `PENR-[YYYY]-[SERIAL]` | `PENR-2026-0001` |

---

## Related ADRs

- ADR-027: DB Schema Init — UUID PKs
- ADR-037: Product-as-Course-Catalog
- NFR5: Identity upsert in `prisma.$transaction`
