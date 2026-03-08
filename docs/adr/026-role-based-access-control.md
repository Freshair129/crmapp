# ADR 026: Role-Based Access Control (RBAC)

## Status
Planned (2026-03-08)

## Context
ระบบ CRM ปัจจุบันไม่มี Authorization layer — ทุก authenticated user เห็นทุกหน้า:
- Staff ระดับ Agent เห็นข้อมูล Financial และ Marketing ที่ควร restrict
- ไม่มีการจำกัดสิทธิ์ในการแก้ไข / ลบ records
- FR1.3 กำหนดให้มี 6 roles: Developer, Manager, Supervisor, Admin, Agent, Guest

## Decision

### D1: Role Hierarchy
```
Developer   → Full access (override ทุก policy)
Manager     → ทุกอย่างยกเว้น Developer tools
Supervisor  → Marketing + Chat + Reports (ไม่มี Financial settings)
Admin       → Chat + Customer management
Agent       → Chat ของตัวเองเท่านั้น
Guest       → Read-only dashboard
```

### D2: Storage
`Employee.role` (String Enum) ใน PostgreSQL — ไม่ใช้ external auth provider
Role ฝังอยู่ใน NextAuth session token หลัง login

### D3: Enforcement Layer
**Server-side (API routes)**:
```js
// middleware pattern
export function requireRole(minRole) {
  return async (req) => {
    const session = await getServerSession()
    if (!hasPermission(session.user.role, minRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }
}
```

**Client-side (UI)**:
- ซ่อน Sidebar menu items ตาม role (cosmetic only)
- ปิด edit buttons / destructive actions
- Client-side check เป็นแค่ UX — Server-side เป็น enforcement จริง

### D4: Permission Matrix (ย่อ)
| Feature | Developer | Manager | Supervisor | Admin | Agent | Guest |
|---|---|---|---|---|---|---|
| Marketing Analytics | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Employee Management | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| All Customer Chats | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Own Chats Only | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Financial Settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Read Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### D5: Migration Path
1. เพิ่ม `role` column ใน Employee table (default: `'AGENT'`)
2. อัปเดต NextAuth callback ให้ embed role ใน session
3. Wrap existing API routes ทีละ route (ไม่ break existing behavior)

## Consequences
**Pros:**
- ลด data exposure ให้ Staff ระดับล่าง
- Audit trail ชัดเจนขึ้น (รู้ว่า role ไหนทำอะไร)

**Cons:**
- ต้อง retrofit ทุก API route — งานมาก
- Session token ใหญ่ขึ้นเล็กน้อย

**Risk:**
- ถ้า role default ผิด → access lockout — ต้องมี Developer override seed
