# 🛠️ รายงานทางเทคนิค: การดักจับข้อมูลจาก Meta (Technical Scraping Report)

เอกสารฉบับนี้สรุปความพยายามและแนวทางทางเทคนิคในการดึงข้อมูลจาก Facebook Business Suite เพื่อใช้ในระบบ CRM

---

## 🔒 0. Prerequisite: Chrome Remote Debugging (Dev Mode)

เพื่อให้เครื่องมือ Playwright สามารถ "Attach" หรือเชื่อมต่อเข้ากับเบราเซอร์ที่เปิดอยู่ได้ จำเป็นต้องเปิด Chrome ในโหมด **Remote Debugging** (หรือที่ทั่วไปเรียกว่า **Dev Mode**) ผ่านพอร์ต `9222`:
*   สคริปต์จะไม่รันหากไม่พบเบราเซอร์ที่เปิดพอร์ตนี้ไว้
*   โหมดนี้ช่วยให้เราใช้ Session (Cookies/Login) ของแอดมินคนนั้นได้โดยไม่ต้อง Re-login ทุกครั้ง

---

หน้าจอ Inbox ของ Facebook ใช้เทคนิค **Virtual Rendering** (แสดงผลเฉพาะส่วนที่มองเห็นบนจอ) ทำให้การ Scrape แบบปกติทำได้ยาก:

*   **Sidebar (Thread List):** ใช้คลาสเช่น `._4bl9` หรือ `div[role="row"]` โดย ID ของแชท (Thread ID) ไม่ได้เขียนอยู่ใน `href` ของลิงก์โดยตรง แต่จะถูกซ่อนไว้ในหน่วยความจำของ React
*   **Chat Log (Message Area):** ข้อความถูกแสดงผลใน `div[data-testid="mw_message_bubble"]` หรือ `[role="article"]` การระบุตัวตนแอดมินใช้การค้นหาคำว่า **"ส่งโดย" (Sent by)** ซึ่งเป็นเพียง Label ที่วางอยู่เหนือข้อความ (ไม่ใช่ Field ในฐานข้อมูลที่ดึงผ่าน API ได้)

---

## 🧬 2. เทคนิค React Fiber Scraping

เนื่องจากข้อมูลสำคัญถูกซ่อนไว้ใน State ของ React เราจึงใช้เทคนิค **React Fiber** เพื่อเจาะเข้าไปอ่าน Property ของ Element:

*   **กลไก:** เข้าถึง Object ที่ขึ้นต้นด้วย `__reactFiber...` บน DOM Element
*   **สิ่งที่ดึงได้:**
    *   `memoizedProps.threadID`: ID ของบทสนทนาที่แท้จริง
    *   `memoizedProps.message.id`: ID ของข้อความแต่ละบรรทัด
    *   `memoizedProps.message.sender_name`: ชื่อแอดมิน (บางเวอร์ชันของ FB)

---

## 🚫 3. ประวัติความพยายามสรุปรายวิธี (Attempts Summary)

| วิธีการ (Method) | สถานะ (Status) | เหตุผลที่ไม่ใช้เป็นหลัก (Limitation) |
| :--- | :--- | :--- |
| **Facebook Graph API** | ❌ ล้มเหลว | ไม่ระบุชื่อแอดมินรายบุคคล (เห็นแค่ Page ตอบ), ติด Rate Limit ง่าย |
| **Network Interception** | ⚠️ ส่วนเสริม | Facebook ใช้โปรโตคอลสตรีมมิ่งที่ซับซ้อน (MQTT/JSON-Stream) แกะข้อมูลยาก |
| **React State Scraping** | ✅ ใช้ร่วม | แม่นยำที่สุดในการดึง ID แต่เสี่ยงต่อการเปลี่ยนชื่อคลาส (Obfuscation) ของ FB |
| **Visual DOM/Text** | ✅ ใช้หลัก | ใช้ Strategy A/B/C เพื่ออ่าน "ส่งโดย [ชื่อ]" จากหน้าจอโดยตรง (เหมือนตาคนเห็น) |

---

## 🛡️ 4. กลยุทธ์การป้องกัน (Anti-Bot & Robustness)

1.  **Human Simulation:** ใช้ Playwright จำลองการเลื่อนเมาส์ (Mouse Wheel) และการรอ (Random Wait) เพื่อไม่ให้โดนแบน
2.  **Strategy A/B/C:**
    *   **A (Closest Sibling):** หาข้อความที่อยู่ใกล้ Label "ส่งโดย" มากที่สุด
    *   **B (Parent Text):** กวาดข้อความทั้งหมดในกรอบเดียวกันมาลบชื่อแอดมินออก
    *   **C (Direct Fiber):** หาก A และ B พลาด จะลองเจาะ Property ลึกถึงระดับ React Component

## 🧩 5. การจัดเก็บข้อมูลและกลยุทธ์ Text Matching

### **หัวใจของการเชื่อมข้อมูล (The Bridge)**
เนื่องจาก **Facebook Graph API** ให้ข้อมูลที่ "แม่นยำเรื่อง ID" แต่ "ขาดชื่อคนตอบ" ในขณะที่ **Scraper** ให้ข้อมูลที่ "เห็นชื่อคนตอบ" แต่ "บางครั้งหา ID จริงไม่เจอ":

1.  **การใช้ ID ในการจัดเก็บ:**
    *   `conversation_id` (Thread ID): ใช้ระบุห้องแชท (เช่น `t_1016...`)
    *   `message_id`: ID ระดับข้อความจาก Meta (ใช้ป้องกันข้อมูลซ้ำ)
    *   `responder_id`: UUID ของพนักงาน (ผูกกับตาราง `employees`) เพื่อใช้ทำ KPI

2.  **ทำไมต้องใช้ Text Matching?**
    เราใช้เนื้อหาข้อความ (**Message Content**) เป็นตัวเชื่อม (Key) เนื่องจาก:
    *   **API Data:** มี `mid` (Message ID) ที่แน่นอน แต่ขาดข้อมูลผู้ตอบ (Responder)
    *   **Scraper Data:** มีข้อมูลผู้ตอบจาก Label "ส่งโดย" แต่บ่อยครั้งดึง `mid` ออกมาจาก DOM/Fiber ไม่ได้โดยตรง
    *   **Matching Result:** เราจึงใช้เนื้อหาข้อความที่หุ่นยนต์เห็น ไป "จับคู่" กับเนื้อหาในฐานข้อมูลที่มี `mid` กำกับอยู่แล้ว เพื่อนำข้อมูลชื่อคนตอบไปอัปเดตใส่ record นั้นได้อย่างแม่นยำครับ

---

## 📝 หมายเหตุสำหรับทีมพัฒนา
หากโครงสร้างหน้าเว็บ Facebook มีการอัปเดต (UI Update) สิ่งแรกที่จะพังคือ **CSS Selectors** (เช่น `._4bl9`) ทีมงานต้องรีบตรวจสอบและอัปเดต Selector ในไฟล์ `sync_agents_v2.js` ทันที
