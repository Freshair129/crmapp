---
name: sync-docs
description: >
  Sync context documentation files after completing any work in V School CRM v2.
  Use this skill after every git commit, feature completion, bug fix, or phase milestone.
  ALWAYS invoke after any code change to keep CLAUDE.md, GEMINI.md, GOAL.md, and CHANGELOG.md
  in sync with the actual codebase state. Trigger on phrases like "อัปเดตเอกสาร", "sync docs",
  "update context", "เสร็จแล้ว commit", or whenever a phase or task is marked done.
---

# Sync-Docs Protocol — V School CRM v2

คุณคือ Lead Architect ที่รับผิดชอบให้ context files ตรงกับ codebase จริงเสมอ
เมื่อ skill นี้ถูกเรียก ให้ทำตาม 5 ขั้นตอนต่อไปนี้โดยไม่ต้องรอให้สั่งซ้ำ

---

## Step 1 — Gather Evidence

รัน commands เหล่านี้เพื่อเข้าใจ current state:

```bash
cd /Users/ideab/Desktop/crm
git log --oneline -10          # งานล่าสุด 10 commit
git status --short             # ไฟล์ที่เปลี่ยน
date "+%Y-%m-%d"               # วันที่วันนี้
ls docs/adr/                   # ADR ที่มีอยู่
```

อ่านไฟล์เหล่านี้:
- `CLAUDE.md` — Version Status table, ADR table, สิ่งที่ทำแล้ว section
- `GEMINI.md` — Version table, Architecture Phases block, Directory section
- `GOAL.md` — Project Status table, Phase detail sections
- `Project Overview.md` — Pipeline phases, ADR table, Directories
- `docs/adr/` — ADR ล่าสุด (ดู 2-3 ไฟล์ที่ใหม่ที่สุด)

---

## Step 2 — Detect Discrepancies

เปรียบเทียบ git log กับ docs และตอบคำถามเหล่านี้:

| คำถาม | ดูจาก |
|---|---|
| version ล่าสุดที่ release คืออะไร? | git tags + CHANGELOG.md |
| phase ปัจจุบันคือ phase ไหน? | git log commit messages |
| มี API routes ใหม่ไหม? | `src/app/api/` directory |
| มี component ใหม่ไหม? | `src/components/` directory |
| มี Known Gotcha ใหม่ที่ควรบันทึกไหม? | จาก bug fix commits |
| มี ADR ใหม่ที่ยังไม่อยู่ใน CLAUDE.md / Project Overview? | `ls docs/adr/` vs CLAUDE.md ADR table |
| Pipeline phases ใน Project Overview ยังตรงกับ stack จริงไหม? | เทียบกับ tech stack ปัจจุบัน |

---

## Step 3 — Update CLAUDE.md

อัปเดตเฉพาะส่วนที่ไม่ตรง:

**Version Status table:**
```
| `vX.Y.Z` | Milestone | ✅ released | ← ถ้า tag มีแล้ว
| `vX.Y.Z` | Next      | 🔲 planned  | ← phase ถัดไป
```

**"สิ่งที่ทำแล้ว" section:**
- เพิ่ม/อัปเดต rows ที่สะท้อน commits จริง
- เพิ่ม Known Gotcha ถ้ามี bug fix สำคัญ

**อัปเดตวันที่:** `## Version Status (อัพเดท: YYYY-MM-DD)`

---

## Step 4 — Update GEMINI.md

อัปเดต 3 จุดเสมอ:

**1. Version table** (บรรทัดบนสุด):
```
| `vX.Y.Z` | Milestone | ✅ released ← HEAD |
| `vX.Y+1.0` | Next Milestone | 🔲 planned |
```

**2. Architecture Phases block:**
```
Phase N:   [DONE]    คำอธิบาย → tagged vX.Y.Z
Phase N+1: [CURRENT] งานถัดไป (→ vX.Y+1.0)
```

**3. Directory section** — เพิ่ม route/component ใหม่:
```
app/api/
  new-route/route.js    ✅ done (vX.Y.Z)
components/
  NewComponent.js       ✅ done (vX.Y.Z)
```

---

## Step 5 — Update GOAL.md

**Project Status table** — อัปเดต phase rows:
```
| Phase N   | ชื่อ Phase | ✅ Done | X/X |
| Phase N+1 | ชื่อ Phase | 🔲 Planned | 0/Y |
```

**Phase detail sections** — ถ้า phase เสร็จ ให้เพิ่ม section ใหม่:
```markdown
## ✅ Phase N: ชื่อ Phase
> **Goal:** ...

| # | Task | Who | Status |
|---|---|---|---|
| N.1 | งาน | 🧠 Claude | ✅ |
```

---

## Step 6 — Update ADR Index (ถ้ามี ADR ใหม่)

**เมื่อไหร่ต้องทำ:** มีไฟล์ใหม่ใน `docs/adr/` ที่ยังไม่อยู่ใน CLAUDE.md หรือ Project Overview.md

**อัปเดต CLAUDE.md — Architecture Decisions table:**
```markdown
| ADR-0XX | ชื่อ Decision | สรุปสั้น |
```

**อัปเดต Project Overview.md — ADR table:**
```markdown
| **0XX** | ชื่อ ADR | สรุป 1 บรรทัด |
```

ถ้าไม่มี ADR ใหม่ → ข้ามขั้นตอนนี้

---

## Step 7 — Update Project Overview.md (ถ้า pipeline/stack เปลี่ยน)

**เมื่อไหร่ต้องทำ:** stack จริงเปลี่ยน เช่น เพิ่ม technology ใหม่, เปลี่ยน architecture phase, หรือ directory structure เปลี่ยน

**สิ่งที่ต้องตรวจ:**
- Phase descriptions (Phase 1-4) ยังตรงกับ implementation จริงไหม?
- Directories ที่ list ไว้ (`crm-app/`, `docs/`, `scripts/`) ยังตรงไหม?
- ADR table ครบไหม? (ดู step 6)

ถ้าไม่มีอะไรเปลี่ยน → ข้ามขั้นตอนนี้

---

## Step 8 — Update CHANGELOG.md (ถ้ามี feature/fix สำคัญ)

เพิ่ม entry เฉพาะเมื่อมี commit ที่สำคัญ (feature ใหม่, breaking fix, phase milestone):

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Phase N — ชื่อ Phase

#### หมวดหมู่ (เช่น Bug Fixes / New Features)
- **`path/to/file.js`**: อธิบายสิ่งที่เปลี่ยน — เหตุผล + ผลลัพธ์
```

---

## Step 9 — Report

หลังอัปเดตเสร็จ สรุปสั้นๆ:

```
✅ sync-docs เสร็จแล้ว

อัปเดต:
- CLAUDE.md        : [สิ่งที่เปลี่ยน หรือ "ไม่มีการเปลี่ยน"]
- GEMINI.md        : [สิ่งที่เปลี่ยน หรือ "ไม่มีการเปลี่ยน"]
- GOAL.md          : [สิ่งที่เปลี่ยน หรือ "ไม่มีการเปลี่ยน"]
- ADR index        : [ADR ที่เพิ่ม หรือ "ไม่มี ADR ใหม่"]
- Project Overview : [สิ่งที่เปลี่ยน หรือ "ไม่มีการเปลี่ยน"]
- CHANGELOG.md     : [เพิ่ม/ไม่เพิ่ม + เหตุผล]
```

---

## Rules (ห้ามละเมิด)

- **ห้ามแก้ code files** — แค่ docs เท่านั้น
- **ห้าม hardcode วันที่** — อ่านจาก `date` command เสมอ
- **GOAL.md:** Claude เป็นคนเดียวที่ tick ✅ tasks
- **ไม่เพิ่ม CHANGELOG** ถ้าเป็นแค่ doc update หรือ refactor เล็กน้อย
- **ยึด git log เป็น source of truth** — ไม่ใช่ความจำ

---

## สำหรับ Gemini CLI

ถ้า invoke ผ่าน Gemini CLI ให้รัน:

```bash
cd /Users/ideab/Desktop/crm
cat .claude/skills/sync-docs.md | gemini -p "execute all 7 steps in this protocol. code and file edits only, no explanation"
```
