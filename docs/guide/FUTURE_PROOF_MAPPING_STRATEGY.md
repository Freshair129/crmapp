# Future-Proof Identity Mapping Strategy (Vanity ID)

เนื่องจาก Facebook ไม่เปิดเผย numeric ID (PSID/Responder ID) ของแอดมินใน React Fiber หรือ DOM เราจึงใช้ **"Vanity URL Slug"** เป็นหลักฐานถาวร (Persistent Evidence) ที่น่าเชื่อถือที่สุดในตอนนี้

## Core Philosophy: Vanity-First Mapping
กลยุทธ์ **"เก็บหลักฐานให้ครบ" (Evidence Gathering)** ปรับปรุงใหม่:
1. **fbVanity (Primary)**: ดึงจาก profile URL slug (เช่น `jutamat.sangprakai`) ผ่านแท็ก `<a>` ในฉลาก "ส่งโดย"
2. **Display Name (Secondary)**: ชื่อที่แสดงในแชท (เช่น `Jutamat Fah N'Finn Sangprakai`) สำหรับทำ Fuzzy Match
3. **PSID (Future)**: บล็อกที่เตรียมไว้รอรับ PSID หาก Facebook เปิดเผยในอนาคต

---

## Data Structure Example
ใน `Employee.identities` จะเก็บข้อมูลดังนี้:
```json
{
  "facebook": {
    "vanity": "jutamat.sangprakai",
    "name": "Jutamat Fah N'Finn Sangprakai",
    "psid": null
  }
}
```

---

## Traffic Pattern Analysis (Historical vs. V5)

จากการตรวจสอบ Log เก่าใน `automation/logs/feb_2026_chats/` พบแพทเทิร์นดังนี้:
- **Thread ID/PSID**: เป็นตัวเลข 15-17 หลักที่ใช้ระบุแชทลูกค้า (PSID)
- **Missing Responder ID**: ข้อมูลใน V4 หรือต่ำกว่า มักจะมี `participantId: null` สำหรับแอดมิน ทำให้การระบุตัวตนต้องพึ่งพาชื่อ (Name Matching) เท่านั้น
- **Fallback IDs**: ระบบเดิมมีการใช้ `0 + threadID` เป็น `msgId` ชั่วคราว ซึ่งไม่สามารถนำมาชนกับข้อมูลจริงจาก Webhook หรือ Graph API ได้ในระยะยาว

**V5 Fix:** การใช้ `Responder ID` (fbid) ที่ดึงจาก Hovercards/Fiber จะมาแก้ปัญหานี้โดยตรง ทำให้เรามีตัวเลขถาวร (เช่น `1000...`) ของแอดมินแต่ละคนมาบันทึกเป็นคู่หลักฐาน (Evidence Pair) กับชื่อเสมอ

---

## 🚩 1. ปัญหา (The Problem)
*   **ID Obfuscation:** Meta API และระบบหลังบ้าน มักซ่อน "ไอดีจริง" (FB User ID) ของแอดมิน และส่งกลับมาแค่ "ชื่อหน้าจอ" หรือ "ไอดีของเพจ"
*   **Naming Inconsistency:** หากแอดมินเปลี่ยนชื่อแสดงผล (เช่น "Admin Joy" -> "Joy Sales") ระบบเดิมจะหาประวัติเดิมไม่เจอ
*   **Refactor Risk:** การพึ่งพา ID ที่เราสร้างเอง (Custom UUID) จะมีปัญหาในอนาคตเมื่อเรา "หาวิธีดึงไอดีจริงจาก FB ได้" ข้อมูลจะชนกันไม่ได้ (Collision) และต้องแก้ระบบครั้งใหญ่

---

## 🔬 2. สมมติฐาน (The Hypothesis)
*   **Atomic IDs in DOM:** แม้ Facebook จะพยายามปกปิดไอดี แต่ในหน้าเว็บยังมีจุดที่เก็บไอดีถาวรไว้ เช่น:
    *   `data-hovercard`: ลิงก์ที่โปรไฟล์แอดมิน มักจะมีไอดีถาวรซ่อนอยู่
    *   `React Fiber Props`: ข้อมูลในหน่วยความจำของ React (เช่น `sender_fbid`) มักจะมีไอดีจริงที่ API ไม่ส่งมา
*   **Text Matching Bridge:** เรายังคงใช้ "เนื้อหาข้อความ" เป็นตัวเชื่อม (Bridge) ระหว่าง "หุ่นยนต์เห็นชื่อ" กับ "API เห็น ID ข้อความ (mid)" เสมอ

---

## 🛠️ 3. แนวทางแก้ไข (The Solution)

### **A. การดึงข้อมูล (Scraper V5 - A-ID Edition)**
*   สร้างตัวรับส่งข้อมูลรุ่นล่าสุด **`sync_agents_v5.js`** (เพื่อไม่ให้สับสนกับ v4 เดิม และเก็บ v2 ไว้สำรอง)
*   อัปเกรดให้ดึง **A-ID (Facebook User ID)** จาก `data-hovercard` และ **Vanity Name** (URL โปรไฟล์)

### **B. ระบบ Mapping (API Layer)**
*   อัปเกรด API ให้รองรับ **Responder ID Priority Mapping**:
    1.  **Match by Responder ID (fb_responder_id):** เช็คไอดีดิบที่ดักจับได้จากหน้าเว็บก่อน (แม่นยำที่สุด)
    2.  **Match by Name & Auto-Backfill:** ถ้า Match ด้วยชื่อสำเร็จ ให้เอา Responder ID ที่ดักได้เขียนทับลงใน `Employee.identities.facebook.responder_id` ทันที

### **C. การเก็บหลักฐาน (Audit Metadata)**
*   บันทึก "ข้อมูลดิบจากหน้าจอ" ลงใน `metadata` ของข้อความ เพื่อให้มีหลักฐานเดิมไว้ Re-process ข้อมูลได้ในอนาคต

---

## 🎯 ประโยชน์ที่ได้รับ
*   **Future Resilience:** ระบบรองรับข้อมูลชุดใหม่ที่จะได้ในอนาคตทันที (ไม่ต้อง Refactor)
*   **Data Integrity:** การคิดค่าผลงานแอดมินแม่นยำขึ้นแม้พนักงานเปลี่ยนชื่อหรือลาออก
*   **Auditability:** สามารถพิสูจน์ได้ว่าข้อความไหน ใครเป็นคนตอบจริงผ่านไอดี FB
