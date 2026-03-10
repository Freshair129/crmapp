# 📡 ระบบแจ้งเตือน LINE (LINE Notification System) - Technical Overview

เอกสารฉบับนี้สรุปโครงสร้างและการทำงานของระบบแจ้งเตือนผ่าน LINE สำหรับ V School CRM ซึ่งแบ่งออกเป็น 2 รูปแบบหลัก คือ **LINE Messaging API (Flex Messages)** และ **LINE Notify**

---

## 🏗️ 1. สถาปัตยกรรม (Architecture)

ระบบแจ้งเตือนประกอบด้วยส่วนประกอบหลักดังนี้:

### **A. Core Logic (Services/Libraries)**
*   **`src/lib/lineReport.js`**: หัวใจหลักในการสร้าง **Flex Messages** 📊
    *   ดึงข้อมูลจาก PostgreSQL (`ad_daily_metrics`)
    *   คำนวณ KPI (Spend, Impressions, Leads, CTR, CPL)
    *   สร้าง Layout สวยงาม (Header, KPI Box, Top Ads List, Footer Button)
    *   ใช้ตัวแปรสภาพแวดล้อม `LINE_GROUP_ID` และ `LINE_CHANNEL_ACCESS_TOKEN`
*   **`src/lib/lineService.js`**: ฟังก์ชันสำหรับส่ง **LINE Notify** 🔔
    *   ใช้สำหรับส่งข้อความ Text ง่ายๆ ผ่าน `LINE_NOTIFY_TOKEN`
    *   เน้นความเร็วและการแจ้งเตือนที่เป็นข้อความสั้น

### **B. API Endpoints**
*   **`/api/line/send-report`**: Endpoint สำหรับสั่งส่ง Report ผ่าน HTTP Request (ใช้กับระบบ Manual หรือ External Trigger)
*   **`/api/line/webhook`**: รองรับการตอบโต้ (Interaction) จากฝั่ง LINE (ถ้ามี)

---

## 🚀 2. รูปแบบรายงาน (Report Types)

| ประเภทรายงาน | ไฟล์ควบคุม (Script/Service) | แหล่งข้อมูล | วัตถุประสงค์ |
| :--- | :--- | :--- | :--- |
| **Daily Report** | `lineReport.js` | PostgreSQL (Daily) | สรุปภาพรวมเมื่อวาน (Total Spend, Leads) |
| **Live Ad Report** | `send_live_ad_report.ts` | PostgreSQL (Real-time) | แจ้งสถานะแอดที่กำลัง Active ณ ปัจจุบัน |
| **Real-time Notify** | `send_realtime_line.js` | Manual/Cache | แจ้งเตือนด่วน หรือทดสอบระบบการนำส่ง |

---

## 🛠️ 3. การจัดการกลุ่มรับแจ้งเตือน (Multi-Group Support)

ระบบรองรับการส่งเข้าหลายกลุ่มโดยใช้ Prefix ใน **.env.local**:
*   `LINE_GROUP_ID`: กลุ่มหลัก (Default)
*   `LINE_GROUP_MARKETING`: กลุ่มเฉพาะฝ่ายการตลาด
*   `LINE_GROUP_ADMIN`: กลุ่มเฉพาะผู้ดูแลระบบ

ในโค้ดจะใช้ `envKey` เพื่อเลือกกลุ่มเป้าหมายตาม Parameter ที่ส่งเข้ามา:
```javascript
const envKey = groupName ? `LINE_GROUP_${groupName.toUpperCase()}` : 'LINE_GROUP_ID';
```

---

## 🖥️ 4. วิธีการรันและทดสอบ (Manual Trigger)

หากต้องการสั่งส่งรายงานด้วยตัวเองผ่าน Terminal:

1.  **ส่งข้อมูลแอดล่าสุด (Live):**
    ```bash
    npx ts-node scripts/send_live_ad_report.ts
    ```
2.  **ส่งข้อมูลทดสอบ (Real-time):**
    ```bash
    node scripts/send_realtime_line.js
    ```

---

## 📝 หมายเหตุทางเทคนิค
*   **Flex Message Limit:** การส่ง Flex Message ต้องผ่าน Messaging API ซึ่งมีโควต้าจำกัด (Free Tier) จึงแนะนำให้ใช้สำหรับรายงานสรุปที่สำคัญเท่านั้น
*   **Database Dependency:** `lineReport.js` และ `send_live_ad_report.ts` จำเป็นต้องเชื่อมต่อกับ PostgreSQL/Supabase หากฐานข้อมูลล่ม รายงานจะไม่ถูกส่ง
