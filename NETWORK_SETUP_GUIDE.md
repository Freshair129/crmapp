# คู่มือการบริหารจัดการ Network & Docker (Mac + Windows) 🌐🐳

เมื่อคุณมีคอมพิวเตอร์ 2 เครื่องใน Wi-Fi เดียวกัน วิธีการจัดการที่ง่ายและเสถียรที่สุดคือแบบ **"Hub & Spoke"** ครับ

---

## 1. ผังการเชื่อมต่อ (Architecture)
- **ศูนย์กลาง (The Hub)**: คือ **Supabase** (Database บน Cloud) ทั้ง Mac และ Windows จะวิ่งเข้าหาที่นี่ที่เดียว ข้อมูลจึงตรงกันเสมอ
- **เครื่อง Windows (Backend Server)**: ทำหน้าที่รันงานหนัก และเป็นที่เก็บ Cache (Redis)
- **เครื่อง Mac (Frontend Dev)**: ใช้เขียนโค้ดและดูหน้าเว็บสวยๆ

---

## 2. การจัดการ Docker 🐳
คุณ **ไม่จำเป็น** ต้องรัน Docker ทุกอย่างบนทั้งสองเครื่องครับ แนะนำดังนี้:

### บนเครื่อง Windows (สำคัญ):
รัน Docker เพื่อเอาแค่ **Redis** (สำหรับระบบคิว/LINE/AI)
1. เปิด `docker-compose.yml`
2. ตรวจสอบว่าเปิดแค่ `redis` (ตัว `postgres` ปิดไว้ได้เลยเพราะเราใช้ Supabase)
3. รันคำสั่ง: `docker compose up -d redis`

### บนเครื่อง Mac:
**ไม่ต้องรัน Docker เลยก็ได้ครับ** เพื่อประหยัดทรัพยากรเครื่อง Mac ให้ทำงานได้ลื่นที่สุด

---

## 3. การบริหารพอร์ต (Ports) และ IP 📍
ทุกเครื่องในบ้านคุณจะมีเลข IP ประจำตัว (เช่น `192.168.1.XX`)

### กรณีรันเว็บ (Port 3000):
- **Windows**: รัน `npm run dev` จะอยู่ที่ `localhost:3000` (ในเครื่องตัวเอง)
- **Mac**: รัน `npm run dev` จะอยู่ที่ `localhost:3000` (ในเครื่องตัวเอง)
- **การเรียกข้ามเครื่อง**: หากคุณอยากเอา MacBook เปิดดูเว็บที่ Windows รันอยู่ ให้พิมพ์ใน Browser ของ Mac ว่า `http://[เลข-IP-ของ-Windows]:3000` ครับ

### วิธีเช็คเลข IP:
- **Windows**: เปิด PowerShell พิมพ์ `ipconfig` ดูตรง "IPv4 Address"
- **Mac**: เปิด Terminal พิมพ์ `ipconfig getifaddr en0`

---

## 4. สรุปหน้าที่ (Who does what?)

| หน้าที่ | เครื่อง Windows (PC) | เครื่อง Mac (Laptop) |
|---|---|---|
| **Database** | ต่อไปที่ Supabase | ต่อไปที่ Supabase |
| **Docker** | รัน Redis (Port 6379) | ไม่ต้องรัน |
| **Backend Worker** | รัน `npm run worker` ✅ | ปิด ❌ |
| **Automation** | รันหุ่นยนต์ดึงชื่อ ✅ | ปิด ❌ |
| **Coding / UI** | - | ใช้งานหลักที่นี่ ✅ |

---

## 5. เทคนิคพิเศษ: ให้ Mac ใช้ Redis จาก Windows
หากคุณอยากให้ MacBook รันระบบที่ต้องใช้ Redis ด้วย แต่ไม่อยากรัน Docker ใน Mac:
1. ในไฟล์ `.env` ของ Mac ให้แก้ `REDIS_URL`
2. จาก: `redis://localhost:6379`
3. เป็น: `redis://[เลข-IP-ของ-Windows]:6379`
*เพียงเท่านี้ Mac ก็จะไปดึงข้อมูลคิวจาก Windows มาแสดงผลได้ทันทีครับ!*

---

> [!TIP]
> **สรุปสั้นๆ**: ปล่อยให้ Windows เป็นคนรับใช้ที่ทำงานหนัก (Docker/Worker/Sync) ส่วน Mac เป็นเจ้านายที่คอยสั่งงานและดูรายงานผลครับ!
