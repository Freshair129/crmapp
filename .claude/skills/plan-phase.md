# Skill: plan-phase
> สร้าง ADR + Implement Plan พร้อม version control ทุกครั้งก่อนเริ่ม phase ใหม่

---

## เมื่อไหร่ใช้ skill นี้
- ก่อนเริ่ม implement phase ใหม่ทุกครั้ง
- เมื่อมี architectural decision ใหม่ที่ต้อง record
- เมื่อ Boss หรือ Claude สั่ง `/plan-phase`

---

## Workflow (ทำตามลำดับ — ห้ามข้าม)

### Step 1: รวบรวม Context
อ่านไฟล์เหล่านี้ก่อนเขียน:
```
GOAL.md          → ดู phase ปัจจุบัน + planned
MEMORY.md        → ดู decisions ที่ตัดสินใจแล้ว
CHANGELOG.md     → ดูว่า version ล่าสุดคืออะไร
docs/adr/        → ls เพื่อรู้ว่า ADR ล่าสุดเลขอะไร (เพื่อต่อเลข)
```

---

### Step 2: เขียน ADR สำหรับทุก decision ใหม่

**สร้างไฟล์:** `docs/adr/[NNN]-[kebab-case-title].md`
(NNN = เลขต่อจาก ADR ล่าสุด)

**Template ADR:**
```markdown
# ADR [NNN]: [Title]

**Date:** [YYYY-MM-DD]
**Status:** Accepted
**Decider:** Claude (Lead Architect)
**Phase:** [Phase number]

## Context
[ปัญหาหรือสถานการณ์ที่ทำให้ต้องตัดสินใจ]

## Options Considered
| Option | ข้อดี | ข้อเสีย |
|---|---|---|
| A: ... | ... | ... |
| B: ... | ... | ... |

## Decision
เลือก **Option [X]** เพราะ [เหตุผล]

## Consequences
### ✅ ผลดี
- ...

### ⚠️ ผลเสีย / Trade-offs
- ...

### 🔄 Rollback
ถ้าต้อง revert decision นี้:
1. ...
2. ...
```

---

### Step 3: เขียน Implement Plan

**สร้างไฟล์:** `docs/implement_plan_phase[NN].md`

**Template:**
```markdown
# Implementation Plan — Phase [NN]: [Title]
_Date: [YYYY-MM-DD]_
_Author: Claude (Lead Architect)_
_Status: PLANNED_

---

## Goal
[อธิบาย phase นี้ทำอะไร ทำไมถึงต้องทำ]

## ADRs ที่เกี่ยวข้อง
- ADR-[NNN]: [Title]
- ADR-[NNN]: [Title]

## Scope

### In Scope ✅
- ...

### Out of Scope ❌
- ...

---

## Database Changes

### New Models
| Model | หน้าที่ | Key Fields |
|---|---|---|
| ModelName | ... | id, field1, field2 |

### Modified Models
| Model | การเปลี่ยนแปลง |
|---|---|
| ModelName | เพิ่ม field X, Y |

### Migration
```bash
npx prisma migrate dev --name phase[NN]-[description]
```

---

## API Routes

| Method | Path | หน้าที่ | Auth |
|---|---|---|---|
| GET | /api/... | ... | Manager+ |
| POST | /api/... | ... | Agent+ |

---

## UI Components

| Component | File | หน้าที่ |
|---|---|---|
| ComponentName | src/components/... | ... |

---

## Task Breakdown

### Phase [NN]a — [Sub-phase name]
- [ ] T1: [task] — `file/path.js`
- [ ] T2: [task] — `file/path.js`

### Phase [NN]b — [Sub-phase name]
- [ ] T3: [task]
- [ ] T4: [task]

---

## Definition of Done
ถือว่า phase เสร็จเมื่อ:
- [ ] Prisma migrate ผ่าน
- [ ] API routes ทุกตัว return ถูกต้อง
- [ ] UI แสดงข้อมูลจริงจาก DB (ไม่ใช่ mock)
- [ ] npm run build ผ่านไม่มี error
- [ ] เขียน unit test อย่างน้อย 3 test cases
- [ ] GOAL.md อัพเดต ✅

---

## Rollback Procedure
ถ้า phase นี้พัง:
```bash
# 1. Revert code
git revert <commit-hash>

# 2. Rollback DB migration
npx prisma migrate resolve --rolled-back [migration-name]
npx prisma db push --force-reset  # ถ้า dev เท่านั้น

# 3. อัพเดต MEMORY.md ว่า rollback แล้ว
```

---

## Version History
| Date | Version | Change | By |
|---|---|---|---|
| [YYYY-MM-DD] | v1.0 | Initial plan | Claude |
```

---

### Step 4: อัพเดต GOAL.md

เพิ่ม phase ใหม่ใน Project Status table:
```markdown
| `v0.X.0` | [Phase Name] | 🔲 planned (Phase NN) |
```

เพิ่ม section รายละเอียด phase ใหม่ที่ด้านล่าง

---

### Step 5: Version Control (บังคับ)

```bash
# Stage เฉพาะ plan files
git add docs/adr/[NNN]-*.md
git add docs/implement_plan_phase[NN].md
git add GOAL.md

# Commit ด้วย format นี้เสมอ
git commit -m "plan: Phase [NN] — [title]

- ADR-[NNN]: [decision 1]
- ADR-[NNN]: [decision 2]
- implement_plan_phase[NN].md: [scope summary]

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

# Push ทันที — plan ต้องอยู่บน remote ก่อน implement
git push origin master
```

---

### Step 6: Report

หลังเสร็จให้รายงาน:
```
✅ Plan committed

ADRs สร้างแล้ว:
  • ADR-[NNN]: [title] → docs/adr/[NNN]-...md
  • ADR-[NNN]: [title] → docs/adr/[NNN]-...md

Implement Plan:
  • docs/implement_plan_phase[NN].md
  • [X] tasks แบ่งเป็น [Y] sub-phases

Commit: [hash]
Push: ✅ origin/master

พร้อม implement Phase [NN] ได้เลย
```

---

## กฎบังคับ

1. **ห้าม implement ก่อน plan commit** — plan ต้องอยู่บน git ก่อนเสมอ
2. **ADR ทุก architectural decision** — ไม่ว่าจะเล็กหรือใหญ่
3. **ทุกครั้งที่แก้ plan** → อัพเดต Version History table + commit ใหม่
4. **Plan ≠ Code** — commit plan แยกจาก commit code เสมอ
5. **Rollback procedure บังคับ** — ทุก plan ต้องมีวิธี undo

---

## การอัพเดต Plan หลัง Implement เริ่มแล้ว

เมื่อ task เสร็จ → อัพเดต implement plan:
```markdown
- [x] T1: [task] ✅ commit abc1234
```

เมื่อ scope เปลี่ยน → เพิ่มใน Version History:
```markdown
| [date] | v1.1 | เพิ่ม T5: [task] เพราะ [เหตุผล] | Claude |
```

แล้ว commit:
```bash
git add docs/implement_plan_phase[NN].md
git commit -m "plan: update Phase [NN] — [สิ่งที่เปลี่ยน]"
```
