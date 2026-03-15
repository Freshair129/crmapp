# ADR 037: Reuse Product Model as Course Catalog

**Date:** 2026-03-15
**Status:** Accepted
**Decider:** Claude (Lead Architect)
**Phase:** Phase 15

## Context

Phase 15 requires a Course catalog — a list of cookery courses the school offers (e.g., "Japanese Ramen 101", "Sushi Master Class", "Full Course 201"), each with a name, price, duration in hours, and maximum class size.

The existing `Product` model in `prisma/schema.prisma` already captures:
- `name` — product/course name
- `price` / `priceMin` / `priceMax` — pricing
- `category` — enum field (currently: MAIN, SIDE, BEVERAGE, PACKAGE)
- `duration` — duration in minutes (food prep time, can be reused for course hours)
- `linkedMenuIds` — JSONB, already planned for course-to-menu mapping (BKL-03)
- `metadata` — JSONB free field for course-specific data (maxStudents, certLevel, syllabus URL)

Creating a separate `Course` model would duplicate most of these fields and create a fork in the product catalog that must be kept in sync.

## Options Considered

| Option | ข้อดี | ข้อเสีย |
|---|---|---|
| A: Reuse Product model (add COURSE to category enum) | Zero new model. Existing POS, price logic, Enrollment FK work immediately. BKL-03 resolves naturally | `duration` unit changes meaning (minutes → hours); `metadata` must be used for course-specific fields |
| B: Create separate Course model | Clean separation, no field overloading | Duplicate schema (name, price, duration in both). POS must handle 2 types. Migration heavier |
| C: Create Course model extending Product via FK | OOP-style composition | Over-engineered for this scale. Two DB reads for one entity. Prisma relation complexity |

## Decision

เลือก **Option A — ใช้ `Product` model เดิม** โดยเพิ่ม `COURSE` เข้าใน `category` enum เพราะ:

1. `Product` มี fields ที่จำเป็นทุกอย่างอยู่แล้ว — reuse ทันที ไม่ต้องเขียน migration ใหม่ทั้งหมด
2. POS (PremiumPOS.js) ใช้ `Product` อยู่แล้ว — checkout สำหรับ course enrollment ทำได้โดยเพิ่ม logic ตรวจ `category === 'COURSE'` เท่านั้น
3. `Enrollment` model FK ชี้ที่ `productId` — เชื่อมตรงกับ `Product` ได้ทันที ไม่ต้อง FK ซ้อน
4. Google Sheets sync (ADR-036) จะ upsert Course rows ลง `Product` table — ไม่ต้องสร้าง sheet parser ใหม่

### Field Mapping สำหรับ Course
| Product field | Course interpretation | หมายเหตุ |
|---|---|---|
| `name` | ชื่อคอร์ส | เหมือนกัน |
| `price` | ราคาคอร์ส | เหมือนกัน |
| `category` | `'COURSE'` | เพิ่ม enum value |
| `duration` | ชั่วโมงคอร์ส (ไม่ใช่นาที) | unit เปลี่ยน — documented here |
| `metadata.maxStudents` | จำนวนนักเรียนสูงสุด/class | ใน JSONB |
| `metadata.certLevel` | 1, 111, 201 (cert threshold) | ใน JSONB |
| `metadata.syllabusUrl` | URL เอกสารหลักสูตร | ใน JSONB |
| `linkedMenuIds` | รายการ menu ที่คอร์สนี้สอน | BKL-03 resolved |

### Schema Change Required
```prisma
enum ProductCategory {
  MAIN
  SIDE
  BEVERAGE
  PACKAGE
  COURSE   // ← เพิ่มใหม่ใน Phase 15a
}
```

### Certificate Rule (from spec)
- `hoursCompleted >= 30` → Certificate Level 1
- `hoursCompleted >= 111` → Full Course Certificate 111
- `hoursCompleted >= 201` → Full Course Certificate 201

Logic อยู่ใน `EnrollmentItem` — คำนวณจาก `ClassAttendance` records

## Consequences

### ผลดี
- ไม่ต้องสร้าง migration เพิ่ม (เพียงแค่ extend enum)
- POS สามารถ checkout course ได้ทันที — เพิ่ม `if (item.category === 'COURSE') createEnrollment()`
- Google Sheets sync reuses `productRepo.upsertFromSheet()`
- BKL-03 (`Product.linkedMenuIds`) ถูก resolve โดย definition

### ผลเสีย / Trade-offs
- `duration` field มี ambiguous unit (minutes for food, hours for courses) — documented explicitly in this ADR
- `metadata` JSONB ต้องมี schema documentation เพิ่มเติม (ใน implement plan)
- Query ต้องกรอง `WHERE category = 'COURSE'` เสมอเมื่อต้องการ course list

### Rollback
ถ้าต้อง revert decision นี้:
1. สร้าง `Course` model ใหม่ใน `schema.prisma`
2. เขียน migration script ดึง `Product WHERE category='COURSE'` → insert ลง `Course` table
3. อัพเดต `Enrollment.productId` → `Enrollment.courseId` FK
4. ลบ `COURSE` ออกจาก `ProductCategory` enum
5. อัพเดต POS, Google Sheets sync, และ API routes ทุกตัวที่อ้างถึง products as courses
