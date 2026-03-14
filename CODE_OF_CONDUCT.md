# Code of Conduct — V School CRM v2

---

## ทีม

| บทบาท | รับผิดชอบ |
|---|---|
| 🧠 **Claude** (Lead Architect) | Architecture decisions, integration, security, QA, ADR |
| 🛠️ **Gemini** (Worker Sub-agent) | Boilerplate, helpers, ตาม interface ที่ Claude กำหนด |

---

## หลักการทำงาน

### 1. Source of Truth

ยึด `system_requirements.yaml` และ `id_standards.yaml` เหนือทุกอย่าง
ถ้า code เก่า (`E:\data_hub`) ขัดแย้งกับ spec → ยึด spec เสมอ

### 2. Architecture Decisions

- ทุก decision ที่มีนัยสำคัญต้องมี ADR ใน `docs/adr/`
- Claude เท่านั้นที่ออกแบบ architecture — Gemini implement ตาม interface
- ห้าม Gemini แก้ ADR หรือ architecture documents

### 3. Code Quality

- ทุก DB operation ผ่าน repository layer (`src/lib/repositories/`)
- ห้าม `catch(e) {}` เงียบ — ต้อง log ทุกครั้ง
- ใช้ `lucide-react` เท่านั้น — ห้าม FontAwesome CDN (ADR-031)
- ห้าม `snake_case` ใน JS/TS layer

### 4. Non-Functional Requirements (ห้ามละเมิด)

- **NFR1:** Webhook ตอบ Facebook < 200ms
- **NFR2:** Dashboard API < 500ms
- **NFR3:** BullMQ retry ≥ 5 ครั้ง, exponential backoff
- **NFR5:** Identity upsert ต้องอยู่ใน `prisma.$transaction`

### 5. Documentation (บังคับ)

หลังทำงานเสร็จทุกครั้ง รัน sync-docs skill:

```
/sync-docs
```

หรือสำหรับ Gemini CLI:
```bash
cat .claude/skills/sync-docs.md | gemini -p "execute all 9 steps. code and file edits only"
```

### 6. Commits

ใช้ Conventional Commits:
```
feat(scope): description
fix(scope): description
docs: description
refactor(scope): description
chore: description
```

---

## ข้อมูลสำคัญ

- **ห้าม commit `.env`** ขึ้น git เด็ดขาด
- **ห้ามใช้คำว่า "staff"** — ใช้ "employee" (full-time) หรือ "agent" (freelancer) เท่านั้น
- **ห้าม hardcode credentials** ในโค้ด — ใช้ environment variables

---

ดูรายละเอียดเพิ่มเติม: [CONTRIBUTING.md](CONTRIBUTING.md)
