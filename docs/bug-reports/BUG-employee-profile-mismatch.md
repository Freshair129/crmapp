# BUG: Employee Directory ไม่ sync กับ Login Profile

**วันที่พบ:** 2026-03-20
**รายงานโดย:** Boss (พรพล ธนสุวรรณธาร)
**ความรุนแรง:** Medium — ข้อมูลไม่ตรงกัน, ไม่ crash

---

## อาการ

Profile ที่แสดงมุมขวาบน (Sidebar) แสดงข้อมูลคนละชุดกับ Employee Card ของพนักงานคนเดียวกันใน Employee Directory

## สาเหตุ (Root Cause)

| Source | ดึงข้อมูลจาก | อัปเดตเมื่อ |
|---|---|---|
| **Profile ขวาบน (Sidebar)** | `session.user` (JWT token) | ตอน login เท่านั้น |
| **Employee Card (Directory)** | `/api/employees` → live DB query | ทุกครั้งที่โหลดหน้า |

ถ้าข้อมูลใน DB เปลี่ยนหลัง login (เช่น อัปเดตชื่อ, role ผ่าน Supabase SQL) — Session จะยังคง cache ค่าเก่าอยู่จนกว่าจะ logout/login ใหม่

## ไฟล์ที่เกี่ยวข้อง

- `src/lib/authOptions.js` — JWT callback (set ครั้งเดียวตอน login)
- `src/components/Sidebar.js` — แสดง `currentUser.firstName` จาก session
- `src/components/EmployeeManagement.js` — แสดงข้อมูลจาก employees API
- `src/app/api/employees/route.js` — live DB query

## แนวทางแก้ (เลือก 1 วิธี)

### Option A — Re-fetch session จาก DB ทุกครั้ง (แนะนำ)
เพิ่ม `session` callback ใน `authOptions.js` ให้ query DB ใหม่ทุก request แทนการอ่านจาก JWT เพียงอย่างเดียว

```js
// authOptions.js — session callback
async session({ session, token }) {
    const prisma = await getPrisma();
    const fresh = await prisma.employee.findUnique({
        where: { employeeId: token.employeeId },
        select: { firstName: true, lastName: true, nickName: true, role: true }
    });
    if (fresh) {
        session.user.firstName = fresh.firstName;
        session.user.lastName  = fresh.lastName;
        session.user.nickName  = fresh.nickName;
        session.user.role      = fresh.role;
    }
    return session;
}
```

> ⚠️ เพิ่ม DB query ทุก request — ควรใช้ Redis cache TTL ~60s ร่วมด้วย

### Option B — Force re-login หลัง update employee
แสดง toast "กรุณา logout แล้ว login ใหม่เพื่ออัปเดตข้อมูล" เมื่อ admin แก้ไข employee record ของตัวเอง

### Option C — Session update via NextAuth `update()`
เรียก `update()` จาก NextAuth client หลัง PATCH employee สำเร็จ (ใช้ได้เฉพาะกรณีแก้จาก UI)

---

## Workaround ตอนนี้

Logout แล้ว Login ใหม่ — Session จะโหลดข้อมูลล่าสุดจาก DB

---

**Status:** 🔴 Backlog — แก้ใน Phase ถัดไป
