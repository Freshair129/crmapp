# Skill: verify-adr

รัน ADR compliance checklist ก่อน claim "DONE" หรือก่อน commit ขนาดใหญ่

## เมื่อไหร่ต้องใช้
- ก่อนเขียน MEMORY.md entry ว่า phase/task เสร็จ
- ก่อน commit หลังทำงาน 3+ tasks
- เมื่อเพิ่ม component ใหม่หรือ API route ใหม่

## Checklist (รันตามลำดับ)

### 1. ADR-031: Icons
```bash
grep -rn "fas fa-\|far fa-\|fab fa-" src/components/
```
**ผ่าน**: ไม่มีผล
**ไม่ผ่าน**: Replace ด้วย `import { X } from 'lucide-react'` ก่อน commit

### 2. DB Pattern: await getPrisma()
สำหรับทุก route ที่แก้ไข — ตรวจว่ามี `const prisma = await getPrisma();` ก่อนใช้ `prisma.`
```bash
grep -l "await prisma\." src/app/api/**/*.js | xargs grep -L "getPrisma()"
```
**ผ่าน**: ไม่มีผล (ทุกไฟล์ที่ใช้ prisma มี getPrisma)
**ไม่ผ่าน**: เพิ่ม `const prisma = await getPrisma();` ที่ต้นฟังก์ชัน

### 3. Cache TTL
```bash
grep -rn "cache\.set(.*,\s*0)" src/
```
**ผ่าน**: ไม่มีผล
**ไม่ผ่าน**: เปลี่ยน TTL=0 เป็นค่าที่เหมาะสม (3600 = 1h, 86400 = 1d)

### 4. Error Handling
```bash
grep -rn "catch.*{}" src/app/api/ src/lib/
grep -rn "catch (e) {}" src/app/api/ src/lib/
```
**ผ่าน**: ไม่มีผล (ไม่มี empty catch)
**ไม่ผ่าน**: เพิ่ม `logger.error('[Module]', 'message', error)`

### 5. camelCase ใน JS (ไม่ใช้ snake_case ใน code)
```bash
grep -rn "const [a-z]*_[a-z]* =" src/components/ src/lib/ src/app/api/
```
**ผ่าน**: ผลที่เห็นเป็น pattern ที่ถูก หรือไม่มีผล
**ไม่ผ่าน**: Rename variable เป็น camelCase

## สรุปผล
หลังรันครบ 5 ข้อ → เขียนใน MEMORY.md entry:
```
- **Verify**: ADR check passed ✅ [หรือ list items ที่ fail]
```

## รันอัตโนมัติ (ถ้า hook ติดตั้งแล้ว)
```bash
sh scripts/check-adr.sh
```
