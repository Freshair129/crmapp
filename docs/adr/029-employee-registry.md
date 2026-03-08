# ADR 029: Employee Registry — Registration UI, CRUD API, Facebook Identity

## Status
Implemented (2026-03-09)

## Context
ระบบต้องการจัดการข้อมูลพนักงาน (Employee) แบบ Self-contained:

1. **ไม่ Migrate จาก v1**: เริ่มลงทะเบียนพนักงานใหม่ทั้งหมดผ่าน UI — ไม่ sync จาก data_hub
2. **Facebook Name for Attribution**: sync_agents_v2.js match "ส่งโดย [ชื่อ]" — Employee ต้องมี `facebookName` เพื่อให้ identity resolution ทำงานได้
3. **RBAC Integration**: พนักงานใหม่ได้ default role `AGENT` — Manager เป็นคนเปลี่ยน role
4. **Secure Password**: bcryptjs salt=12, ไม่เก็บ plaintext

## Decision

### D1: Employee ID Format
```
TVS-[DEPT]-[SERIAL]
  DEPT: MKT/SLS/ADM/MGR/DEV/SPT
  e.g. TVS-MKT-001, TVS-MGR-001
```

### D2: API Routes (MANAGER+ required via middleware)
```
GET    /api/employees          → list (supports ?status= filter)
POST   /api/employees          → create + auto-generate ID + bcrypt password
PATCH  /api/employees/[id]     → update fields, password, facebookName
DELETE /api/employees/[id]     → soft delete (status → INACTIVE)
```

### D3: Facebook Identity Storage
`facebookName` เก็บใน `Employee.identities` JSONB:
```json
{
  "facebook": { "name": "ชื่อที่แสดงใน Business Suite" },
  "line": { "id": "..." }
}
```
- JSONB ยืดหยุ่น — เพิ่ม identity provider ใหม่ได้โดยไม่ต้อง migrate schema
- Query: `identities->'facebook'->>'name' ILIKE $name` (PostgreSQL)

### D4: Management UI (`/settings/employees`)
- Table แสดงพนักงานทั้งหมด พร้อม role badge + status
- Modal form: firstName, lastName, nickName, facebookName, email, phone, department, role, password
- Activate / Deactivate button (soft delete)
- เฉพาะ MANAGER+ เข้าได้ (enforced by middleware)

### D5: Seed Employee
`prisma/seed.ts` สร้าง admin@vschool.com / vschool2026 (DEVELOPER role) สำหรับ bootstrap

## Consequences
**Pros:**
- Employee data สะอาด ไม่มี legacy debt จาก v1
- Facebook attribution ทำงานได้ทันทีเมื่อลงทะเบียน facebookName
- JSONB identities รองรับ multi-platform ในอนาคต (LINE OA Official, etc.)

**Cons:**
- ต้องลงทะเบียนพนักงานทุกคนใหม่ผ่าน UI
- facebookName เป็น string match (case-insensitive) — อาจ false positive ถ้าชื่อซ้ำ

**Risk:**
- ถ้าพนักงานเปลี่ยนชื่อ Facebook → attribution พัง → ต้องอัปเดต facebookName ใน CRM ด้วย
