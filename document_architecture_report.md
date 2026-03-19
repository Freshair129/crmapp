# V School CRM v2 — Documentation Architecture Report

**Date:** 2026-03-19
**Prepared by:** Antigravity (AI Architect)

จากการทบทวนเอกสารทั้งหมดในโฟลเดอร์ `docs/`, `docs/architecture/`, และ `docs/adr/` นี่คือรายงานการจัดระเบียบเอกสาร แบ่งตาม Domain ความเข้ากันได้ และข้อเสนอแนะในการปรับปรุง (Merge, Separate, Add, Delete) เพื่อให้ Source of Truth ของโปรเจคมีความชัดเจนและไม่อ้างอิงเนื้อหาที่ล้าสมัย (Stale content)

---

## 1. การแบ่งหมวดหมู่เอกสารตาม Domain และความเข้ากัน (Current Mapping)

โครงสร้างระบบถูกแบ่งออกเป็น 6 Domains หลักตามที่ระบุใน `domain-boundaries.md` เอกสารปัจจุบันสามารถจับกลุ่มได้ดังนี้:

### 🌟 Core Architecture & Overview (Global)
เอกสารระดับบนสุดที่อธิบายภาพรวมทั้งหมด:
- `docs/overview.md` (หน้าแรกที่ควรอ่าน)
- `docs/architecture/arc42-main.md` (ภาพรวม C4 Model)
- `docs/architecture/domain-boundaries.md` (สโคปและกฎของแต่ละ Domain)
- `docs/architecture/domain-flows.md` (Sequence & Flow diagram)
- `docs/database_erd.md` (Database Schema 全체)
- `docs/id_standards.yaml` / `id-mapping.yaml` (มาตรฐาน ID ของระบบ)
- `docs/API_REFERENCE.md`

### 🔵 INBOX DOMAIN (Chat & Communication)
- **ADRs:** ADR-028 (FB Messaging), ADR-033 (Unified Inbox), ADR-016 (LINE Messaging)

### 🟠 MARKETING DOMAIN (Ads & Campaigns)
- `docs/attribution_tree.md` (การไหลของ Conversion/ROAS)
- `docs/ad_analytics_tree.md`
- **Audit/Reports (Legacy):** `agency_data_audit_feb_2026.md`, `agency_report_audit_findings.md`, `true_performance_report_feb_2026.md`, `performance_evaluation_feb_1_22.md`, `lead_source_summary_feb_1_22.md`
- **ADRs:** ADR-024 (Marketing Pipeline), ADR-019 (Business Suite Agent), ADR-030 (Revenue Split)

### 🟡 CUSTOMER DOMAIN (Identity & Revenue)
- `docs/attribution_tree.md` (Share กับ Marketing เพราะเป็นส่วน Revenue)
- **ADRs:** ADR-025 (Cross-Platform Identity Resolution)

### 🟢 OPERATIONS DOMAIN (Enrollment, Kitchen, Stock)
- `docs/vschool_course_stock_flow.pptx` (Flow ครัว)
- **ADRs:** ADR-038 (Recipe-Package Stock), ADR-037 (Product as Catalog), ADR-042 (Product ID Sheet)

### 🔴 ANALYTICS DOMAIN (Dashboard)
- **ADRs:** เหมารวมอยู่ใน Marketing (ADR-024)

### ⚙️ INFRA DOMAIN (Tech Stack, DB, Cache, Workers)
- `docs/WINDOWS_SETUP.md` (การ Setup — ปัจจุบันอาจล้าสมัยเพราะย้ายไป Upstash/Vercel)
- `docs/system_requirements.yaml`
- **ADRs:** ADR-040 (Upstash Migration), ADR-034 (Redis), ADR-027 (DB Init), ADR-026 (RBAC)

---

## 2. ข้อเสนอแนะในการจัดระเบียบ (Recommendations)

### 🛠️ สิ่งที่ควรอัปเดต (Update)
1. **`arc42-main.md` ล้าสมัยในหลายจุด:**
   - ยังมีภาพ C4 Model ที่อ้างถึง **Python Worker**, **BullMQ**, และเรดิสใน **Docker** ซึ่งปัจจุบัน Phase 27 ได้ย้ายไปใช้ **Vercel Serverless (QStash + Upstash Redis)** เต็มรูปแบบแล้ว
   - **Action:** อัปเดต diagram ใน Section 5, 6, 7 ให้สะท้อน ADR-040 (การลบ Local Infrastructure)
2. **`API_REFERENCE.md`:** 
   - จำเป็นต้องเช็คว่าครอบคลุม Endpoint ใหม่ๆ ใน Phase ล่าสุดแล้วหรือยัง (เช่น `/api/workers/notification`, `/api/packages/*`, `/api/payments/verify/*`)

### 🔄 สิ่งที่ควรรวมเข้าด้วยกัน (Merge)
1. **Attribution & Ad Analytics:**
   - มัดรวม `attribution_tree.md` และ `ad_analytics_tree.md` เข้าด้วยกัน เนื่องจากพูดถึงเรื่องการจัดสรรยอดขายและ ROAS ของ Ads เหมือนกัน การแยกกันอาจทำให้ Context กระจัดกระจาย
   - **Target File:** สร้าง/รวมเป็น `docs/architecture/revenue-attribution-model.md`

### ✂️ สิ่งที่ควรแยก (Separate)
1. **`database_erd.md` มีขนาดใหญ่เกินไป (666 บรรทัด):**
   - แม้จะมีการทำหัวข้อย่อยไว้ดี แต่เวลาแก้ไขจะทำได้ยาก 
   - **Action:** ควรสร้างโฟลเดอร์ `docs/database/` และแยกเป็น `schema-marketing.md`, `schema-operations.md`, `schema-customer.md` แล้วให้ `database_erd.md` แปะเฉพาะ Conceptual High-Level Diagram

### 🗑️ สิ่งที่เป็นขยะ/หมดอายุและควรจัดการ (Archive/Delete)
1. **Implementation Plans แบบชั่วคราว:**
   - ไฟล์อย่าง `implement_plan_phase11.md`, `implement_plan_phase15.md`, `docx_report_critique.md` เป็น Temporary artifact ระหว่างการพัฒนา ไม่ใช่ System Documentation
   - **Action:** ย้ายไปโฟลเดอร์ `docs/archive/` หรือลบทิ้งเพื่อไม่ให้รก
2. **Agency Audit Reports แบบเจาะจงเวลา:**
   - `agency_data_audit_feb_2026.md`, `true_performance_report_feb_2026.md`, เป็นต้น
   - ข้อมูลพวกนี้เป็นรายงาน Business/Audit analysis แบบ One-off ไม่เกี่ยวกับ Architecture ปัจจุบัน
   - **Action:** สร้างโฟลเดอร์ `docs/business_reports/` และย้ายไฟล์เหล่านี้เข้าไป
3. **`WINDOWS_SETUP.md`:** 
   - จาก ADR-040 การ setup worker บน Windows นั้นถูกตัดทิ้ง (Skip Phase 23) ระบบสามารถ Run Local ผ่าน Docker แค่ PostgreSQL ได้เลย หรือ Deploy Vercel
   - **Action:** ลบทิ้ง (Delete) หรือตัดเหลือแค่ Windows Local DB Setup

### ➕ สิ่งที่ควรเพิ่ม (Add)
1. **`docs/architecture/infra-deployment.md`:**
   - ควรมีเอกสารที่โฟกัสเฉพาะฝั่ง Cloud Infrastructure โดยเฉพาะ Vercel limits, Upstash Redies REST Quotas, ต้นทุน (Cost), และ Environment variable lifecycle
2. **`docs/testing-strategy.md`:**
   - ปัจจุบันมี Unit Tests หลงเหลือและเพิ่งผ่านการซ่อมแซมครั้งใหญ่ ควรมีเอกสารสั้นๆ กำหนด Guideline สำหรับการ Mock Upstash, Database, การทำ CI/CD 

---

## 3. สรุปโครงสร้างโครงสร้างไฟล์แนะนำ (Proposed Directory Structure)

```text
crm/docs/
├── overview.md                  (Entry point)
├── id_standards.yaml            (SSOT for naming/IDs)
├── system_requirements.yaml     (Global Specs)
├── API_REFERENCE.md
├── architecture/                (Core Tech Docs)
│   ├── arc42-main.md            (C4 Diagrams)
│   ├── domain-boundaries.md     (DDD Boundaries)
│   ├── domain-flows.md          (Sequence flows)
│   ├── revenue-attribution.md   (✨ รวม attribution_tree + ad_analytics)
│   ├── database-erd/            (✨ แตก ERD แยกไฟล์ตาม domain)
│   │   ├── high_level.md
│   │   ├── sales_marketing.md
│   │   └── operations.md
│   └── infra-deployment.md      (✨ รวม deployment/Vercel/Upstash spec)
├── adr/                         (Architecture Decision Records)
│   ├── 001-xxx.md
│   └── ... (44 ไฟล์คงเดิม)
├── business_reports/            (✨ โฟลเดอร์ใหม่เก็บรายงานเก่าๆ ฝั่ง Business)
│   ├── agency_data_audit_feb_2026.md
│   └── ...
└── archive/                     (✨ โฟลเดอร์ใหม่เก็บ implementation plans เก่า)
    ├── implement_plan_phase11.md
    └── ...
```

## สเต็ปต่อไป (Next Steps)
หากคุณ User เห็นด้วยกับข้อเสนอนี้ สามารถสั่งให้ AI ทำการ Refactor/Move ไฟล์ตามโครงสร้าง `Proposed Directory Structure` ได้เลยครับ
