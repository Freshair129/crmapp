# API Testing Protocol — V School CRM v2

**Version:** 1.0.0  
**Status:** Protocol Accepted  
**Objective:** เพื่อพิสูจน์ว่า API ของเรา ถูกต้อง, ทนโหลด, ไม่พังง่าย, และปลอดภัย (Production Ready)

🚨 **Warning:** API Testing ไม่ใช่แค่การเช็กว่าเรียกติด (200 OK) แต่อย่างใด

---

## 10 มิติของการทดสอบ (10 API Testing Types)

### 1. Smoke Testing (พังไหม?)
- **Goal:** ตรวจสอบความพร้อมเบื้องต้นของระบบ
- **Checklist:**
  - Endpoint ตอบสนอง (ไม่ Timeout)
  - Service หลักรันอยู่จริง
  - Core Business Flow ไม่พัง

### 2. Functional Testing (ถูกไหม?)
- **Goal:** ตรวจสอบความถูกต้องตาม Requirement
- **Checklist:**
  - Input ถูกต้อง -> Output ถูกต้อง
  - HTTP Status Code ตรงตามมาตรฐาน (200, 201, 400, 401, 404, 500)
  - ข้อมูลใน Field ครบถ้วนและ Schema ถูกต้อง

### 3. Integration Testing (ต่อกันไหวไหม?)
- **Goal:** ตรวจสอบการทำงานร่วมกับส่วนประกอบอื่น
- **Checklist:**
  - เชื่อมต่อ Database สำเร็จ
  - เชื่อมต่อ External API (Meta, LINE) สำเร็จ
  - การทำงานข้าม Microservices หรือ Module ไม่สะดุด

### 4. Regression Testing (ของเดิมพังไหม?)
- **Goal:** ป้องกันการแก้จุดใหม่แล้วทำลายจุดเดิม
- **Checklist:**
  - รัน Test Suite เดิมทั้งหมดหลังการแก้โค้ด
  - ยืนยันว่าไม่มี Side-effect ที่ทำให้ Logic เก่าผิดเพี้ยน

### 5. Load Testing (รับโหลดปกติไหวไหม?)
- **Goal:** ตรวจสอบประสิทธิภาพภายใต้การใช้งานจริง
- **Checklist:**
  - ทดสอบจำลอง User 100-1,000 คนพร้อมกัน
  - วัดค่า Response Time, Throughput และ Error Rate

### 6. Stress Testing (จุดแตกอยู่ตรงไหน?)
- **Goal:** ค้นหาขีดจำกัดสูงสุดของระบบ (Breaking Point)
- **Checklist:**
  - อัด Traffic เกิน Limit ที่ตั้งไว้
  - สังเกตพฤติกรรมเมื่อระบบล่ม (Graceful Degradation หรือไม่?)

### 7. Security Testing (โดนเจาะไหม?)
- **Goal:** ป้องกันช่องโหว่และความปลอดภัยของข้อมูล
- **Checklist:**
  - ตรวจสอบ SQL Injection
  - ตรวจสอบ Auth Bypass / Token ปลอม
  - ป้องกัน Data Leak และ Input อันตราย

### 8. UI Testing (ผู้ใช้เห็นถูกไหม?)
- **Goal:** ตรวจสอบความสอดคล้องระหว่าง API และ UI
- **Checklist:**
  - การแสดงผลข้อมูลในหน้าจอถูกต้อง
  - Interaction ของ User ไม่ทำให้ API พัง
  - Error Handling ในระดับ UI แสดงผลได้ดี

### 9. Fuzz Testing (Input แปลกแล้วรอดไหม?)
- **Goal:** ทดสอบความทนทานต่อข้อมูลที่คาดไม่ถึง
- **Checklist:**
  - ส่ง Malformed Data / Random Data
  - ส่งข้อมูลยาวผิดปกติ หรือ Null values
  - ดูว่าระบบ Crash หรือ Validation หลุดหรือไม่

### 10. Reliability Testing (รันยาวแล้วยังนิ่งไหม?)
- **Goal:** ตรวจสอบความเสถียรในระยะยาว
- **Checklist:**
  - ทดสอบรัน API ต่อเนื่องเป็นเวลานาน
  - ตรวจสอบ Memory Leak และการสะสมของ Error
  - ตรวจสอบว่าระบบไม่หน่วงลงเมื่อรันนานขึ้น

---

## 💡 สรุปแบบจำง่าย
1. **Smoke** = พังไหม  
2. **Functional** = ถูกไหม  
3. **Integration** = ต่อกันไหวไหม  
4. **Regression** = ของเดิมพังไหม  
5. **Load** = รับโหลดปกติไหวไหม  
6. **Stress** = จุดแตกอยู่ตรงไหน  
7. **Security** = โดนเจาะไหม  
8. **UI** = ผู้ใช้เห็นถูกไหม  
9. **Fuzz** = input แปลกแล้วรอดไหม  
10. **Reliability** = รันยาวแล้วยังนิ่งไหม  

---

## Conclusion
API ที่ดีไม่ใช่แค่เรียกผ่าน แต่ต้อง **ถูก, เร็ว, ทน, ปลอดภัย และไม่พังเวลาเจอโลกจริง** 🚀
