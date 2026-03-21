# ADR-047: Employee ID v3 Format — TVS-[TYPE]-[DEPT]-[NNN]

**Status:** Accepted
**Date:** 2026-03-21
**Deciders:** Boss + Claude

## Context

Employee ID เดิม (v2) ใช้รูปแบบ `TVS-EMP-[YYYY]-[XXXX]` ซึ่งรวมพนักงานทุกประเภทไว้ใน prefix เดียว (`EMP`) ทำให้ไม่สามารถแยกแยะได้ทันทีว่า:
- เป็นพนักงานประจำ, ฟรีแลนซ์, หรือสัญญาจ้าง
- อยู่แผนกอะไร

Boss ต้องการให้ Employee ID สื่อสารข้อมูลสำคัญผ่าน ID ได้เลย โดยไม่ต้อง lookup ฐานข้อมูล

## Decision

เปลี่ยนรูปแบบ Employee ID เป็น:

```
TVS-[TYPE]-[DEPT]-[NNN]
```

### Employment Type (TYPE)
| Code | ความหมาย |
|------|-----------|
| `EMP` | พนักงานประจำ (Full-time employee) |
| `FL` | ฟรีแลนซ์ (Freelancer) |
| `CT` | สัญญาจ้าง (Contract worker) |

### Department / Position Code (DEPT)
| Code | แผนก/ตำแหน่ง |
|------|----------------|
| `MKT` | Marketing |
| `MGT` | Management |
| `PD` | Purchasing Department |
| `SLS` | Sales |
| `AM` | Assistant Manager |
| `ADM` | Admin |
| `GD` | Graphic Design |
| `CG` | Computer Graphic |
| `MM` | Multimedia |
| `MGFX` | Motion Graphic |
| `ED` | Editor |
| `CC` | Content Creator |

### Serial (NNN)
- 3 หลัก, zero-padded: `001`–`999`
- Reset per TYPE+DEPT combination (เช่น `TVS-EMP-MKT-` นับแยกจาก `TVS-FL-MKT-`)
- ไม่มีปี (YYYY) ใน ID อีกต่อไป

### ตัวอย่าง
- `TVS-EMP-MKT-001` — พนักงานประจำฝ่ายการตลาด คนที่ 1
- `TVS-FL-GD-003` — ฟรีแลนซ์ Graphic Design คนที่ 3
- `TVS-CT-SLS-002` — สัญญาจ้างฝ่ายขาย คนที่ 2

## Consequences

### Positive
- อ่าน ID แล้วรู้ทันทีว่าเป็นประเภทจ้างอะไร + แผนกอะไร
- ย่อกว่า v2 (ไม่มีปี 4 หลัก)
- Serial per TYPE+DEPT ทำให้ไม่ overlap

### Negative
- **Breaking change** กับ ID ที่มีอยู่ — พนักงานเดิม (TVS-EMP-2026-0001 ~ 0004) ยังใช้รูปแบบเก่า
- Login by employeeId ต้อง support ทั้ง format เก่าและใหม่
- SQL queries ที่ filter ด้วย `LIKE 'TVS-EMP-%'` ต้อง update ให้ cover ทั้ง EMP/FL/CT

### Migration
- พนักงานเก่า (seeded) ยังคง ID เดิม — ไม่ migrate
- พนักงานใหม่ที่สร้างหลัง ADR-047 จะใช้ format ใหม่อัตโนมัติ
- EmployeeManagement UI เพิ่ม dropdown สำหรับ "ประเภทการจ้าง" และ "แผนก/ตำแหน่ง"

## Files Changed
- `src/app/api/employees/route.js` — `generateEmployeeId()` รับ `employmentType` param
- `src/components/EmployeeManagement.js` — เพิ่ม dropdown ประเภทการจ้าง + แผนก
- `id_standards.yaml` — อัปเดต Employee ID format spec
- `src/app/api/analytics/admin-performance/route.js` — SQL LIKE patterns
- `src/app/auth/signin/page.tsx` — placeholder text
- `src/lib/authOptions.js` — comment update
