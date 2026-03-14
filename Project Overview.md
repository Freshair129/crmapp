# **V School CRM \- Project Portal (Updated Work Flow)**

### **📗 Technical Infrastructure (arc42/C4 Model)**

The Single Source of Truth for system architecture, data flow, and technical decisions.

👉 [**Read the Architecture Documentation**](http://docs.google.com/architecture/arc42-main.md)

## **🚀 System Pipeline Phases (The Hybrid Lifecycle)**

เพื่อให้ระบบทำงานได้อย่าง Non-blocking และ Scalable เราจะแบ่งวงจรการไหลของข้อมูลออกเป็น 4 ระยะหลัก:

### **Phase 1: Real-time Ingestion & Decoupling (Node.js)**

* **Input:** Meta Webhooks (Messenger, Lead Ads), LINE Webhooks.  
* **Action:** ตรวจสอบ Signature (Security) \-\> รับ Payload \-\> ยัดลง BullMQ (Redis) ทันที  
* **Result:** ตอบกลับ Facebook ภายใน \< 200ms (NFR1) เพื่อรักษาความเสถียรของ Webhook

### **Phase 2: Identity Resolution & State Persistence (Node.js \+ Prisma)**

* **Input:** Jobs จาก BullMQ.  
* **Action:**  
  1. **Normalization:** แปลงเบอร์โทรเป็น E.164.  
  2. **The Glue Logic:** ตรวจสอบ Identity ข้ามช่องทาง (PSID vs Phone).  
  3. **Resolution:** สร้าง/ผูก UUID (Global User ID) ใน Postgres.  
* **Result:** ข้อมูลลูกค้าถูกรวมศูนย์ (SSOT) และบันทึกลงฐานข้อมูลหลักอย่างถูกต้อง (Transactional Integrity)

### **Phase 3: Intelligence & Heavy Processing (Python Worker)**

* **Input:** Scheduled Cron Jobs หรือ Events จาก Redis.  
* **Action:**  
  1. **Ad Sync:** ดึงข้อมูล Spend/Performance จาก Marketing API (Ad-level first).  
  2. **AI Analysis:** ส่งประวัติแชท \+ ข้อมูลการซื้อให้ Gemini วิเคราะห์ Intent/Score.  
  3. **Attribution:** คำนวณ ROI/ROAS รายชิ้นงานโฆษณา.  
* **Result:** ข้อมูลเชิงลึก (Intelligence) ที่พร้อมสำหรับการทำ Dashboard และ AI Recommendations.

### **Phase 4: High-Performance Presentation (Redis Cache-Aside)**
* **Input:** ข้อมูลล่าสุดจาก Postgres.  
* **Action:** API Handlers ใช้ Redis `getOrSet` pattern ในการทำ caching ข้อมูลที่มีการคำนวณซับซ้อน (e.g., Executive Analytics) โดยมี TTL 5 นาที  
* **Result:** UI Dashboard โหลดข้อมูลภายใน < 50ms (Cache HIT) และรักษาความเสถียรของ Database

## **📊 Pipeline Work Flow Diagram**

\[META / LINE / WEB\]  
       |  
       v (Phase 1: Ingestion)  
\+-----------------------+      \+-----------------+  
| Fastify Webhook       | \---\> | Redis (BullMQ)  |  
| (Signature Check)     |      \+-----------------+  
\+-----------------------+              |  
                                       v (Phase 2: Identity)  
\+-----------------------+      \+-----------------+  
| Identity Service      | \<--- | Node.js Worker  |  
| (PSID \+ Phone Match)  |      \+-----------------+  
\+-----------------------+              |  
       |                               |  
       v (Phase 3: Intelligence)        | (Write SSOT)  
\+-----------------------+              v  
| Python AI Worker      | \<--- \[ PostgreSQL \]  
| (Gemini / Marketing)  |      (Supabase)  
\+-----------------------+              |  
       |                               |  
       v (Phase 4: Presentation)       | (Read SSOT)  
\+-----------------------+              v  
| Local JSON Cache      | \<--- \[ Cache Sync Utility \]  
| (Atomic Write)        |  
\+-----------------------+  
       |  
       v  
\[ CRM Dashboard UI \] \<--- (Socket.io Real-time Updates)

## **🏗️ Architecture Decisions**

👉 [**View ADR Directory**](http://docs.google.com/adr/)

| ADR | Title | Summary |
| :---- | :---- | :---- |
| **015** | Scalable Sync | การแยก Stack Node/Python เพื่อประสิทธิภาพสูงสุด |
| **033** | Unified Inbox | การรวมระบบแชท Facebook + LINE ไว้ที่เดียว |
| **034** | Redis Cache | การใช้ Redis เป็น Caching Layer สำหรับ Analytics |
| **Protocol** | [API Testing](docs/guide/API_TEST_PROTOCOL.md) | มาตรฐาน 10 มิติเพื่อความปลอดภัยและเสถียรภาพของ API |
| **023** | 4-Phase Work Flow | มาตรฐานการแบ่งระยะการทำงานของข้อมูลในระบบ CRM (Current) |

## **📂 Directories at a Glance**

* crm-app/: Core Web App & API.  
* crm-app/cache/: Internal local data mirror (Atomic JSON).  
* docs/: Technical documentation (arc42).  
* scripts/: Maintenance & Python sync utilities.