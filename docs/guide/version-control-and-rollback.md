# Version Control & Rollback Guide
### V School CRM v2

---

## 1. Version Naming Convention

### รูปแบบ: `vMAJOR.PHASE.PATCH`

```
v  MAJOR  .  PHASE  .  PATCH
│    │         │          │
│    │         │          └─ bug fix, hotfix, docs (ไม่เปลี่ยน behavior)
│    │         └──────────── phase เสร็จสมบูรณ์ (feature ใหม่)
│    └────────────────────── breaking change (DB schema เปลี่ยน, auth ใหม่)
└─────────────────────────── prefix มาตรฐาน
```

### ตัวอย่างในโปรเจคนี้

| Version | ชื่อ Milestone | เนื้อหา |
|---|---|---|
| `v0.9.0` | **Auth Stable** | Auth system ทำงานได้ครบ |
| `v0.10.0` | **API Connected** | Phase 11 — UI ต่อ real API ทุกหน้า |
| `v0.11.0` | **Revenue Split** | แยก Ads/Store Revenue ด้วย conversationId |
| `v0.12.0` | **UI Enhanced** | Sidebar icon, Charts, Motion, Lucide, Node 22 |
| `v0.13.0` | **Unified Inbox** *(planned)* | รวม FB + LINE inbox |
| `v0.14.0` | **Notification Rules** *(planned)* | Phase 13 |
| `v1.0.0` | **Production Ready** *(planned)* | Deploy จริง, QA ผ่าน, data migration สมบูรณ์ |

### กฎการขึ้น version

```
PATCH (+0.0.1):  git commit → แก้ bug, อัพ docs, cleanup ไม่เปลี่ยน feature
PHASE (+0.1.0):  Phase เสร็จ → tag ใหม่ + เลื่อน branch stable
MAJOR (+1.0.0):  DB migration break, auth redesign, หรือ production launch
```

---

## 2. Branch Strategy

```
master  ──●──●──●──●──●──●──●  ← งานประจำวัน, Gemini ทำงานที่นี่
               ↑
            stable              ← อัพเดทเมื่อ phase เสร็จ + QA ผ่านเท่านั้น
```

**กฎ:**
- `master` — push ได้ตลอด
- `stable` — เลื่อนได้เฉพาะเมื่อ tag ใหม่พร้อม: `git branch -f stable HEAD`
- ห้าม force push ทั้งสอง branch

---

## 3. Rollback Playbook

### 🟢 Case 1: ดูว่า version ไหนมีอะไร (safe — ไม่เปลี่ยนอะไร)

```bash
# ดู version ทั้งหมด
git tag -l --sort=-version:refname

# ดู commit ที่อยู่ใน version นั้น
git show v0.11.0 --stat

# เปรียบเทียบ 2 version
git diff v0.11.0 v0.12.0 --stat

# ดู changelog ณ จุดนั้น
git show v0.11.0:CHANGELOG.md | head -50
```

---

### 🟡 Case 2: ดู/ทดสอบ version เก่า (safe — ไม่แตะ master)

```bash
# ไป checkout version เก่า (detached HEAD — อ่านอย่างเดียว)
git checkout v0.11.0

# รัน dev ทดสอบได้ตามปกติ
npm run dev

# กลับมา master เมื่อเสร็จ
git checkout master
```

---

### 🟠 Case 3: สร้าง hotfix จาก version เก่า

```bash
# สร้าง branch hotfix จาก version ที่ต้องการ
git checkout -b hotfix/fix-revenue-calc v0.11.0

# แก้ไข code
# ... แก้ไข ...

# commit
git add -p
git commit -m "fix: revenue calculation edge case"

# merge กลับ master
git checkout master
git merge hotfix/fix-revenue-calc

# tag hotfix version
git tag -a v0.11.1 -m "v0.11.1 — hotfix: revenue calc edge case"

# ลบ branch hotfix
git branch -d hotfix/fix-revenue-calc
```

---

### 🔴 Case 4: Rollback master กลับ version เก่า (destructive — ระวัง)

> ⚠️ ใช้เฉพาะกรณี master พัง และต้องการทิ้ง commit ใหม่ทั้งหมด

```bash
# 1. ดู commit hash ของ version ที่ต้องการ
git log --oneline v0.11.0

# 2. สร้าง backup branch ก่อนเสมอ
git branch backup/before-rollback-$(date +%Y%m%d)

# 3. Reset master กลับไป (ลบ commit หลัง v0.11.0)
git reset --hard v0.11.0

# 4. Force push (ต้องได้รับอนุญาตเท่านั้น)
git push origin master --force-with-lease
```

---

### 🔴 Case 5: Rollback Database (ระวังที่สุด)

> ⚠️ ทำได้เฉพาะกรณีมี migration ที่ยังไม่ได้ใช้งาน production

```bash
# ดู migrations ทั้งหมด
npx prisma migrate status

# Rollback migration ล่าสุด (dev เท่านั้น)
npx prisma migrate reset   # ⚠️ ลบ data ทั้งหมด

# สำหรับ production — ต้องเขียน rollback migration ด้วยมือเสมอ
# ไม่มี built-in rollback ใน Prisma production mode
```

---

## 4. Workflow ประจำ Phase

```bash
# ─── เมื่อ Phase ใหม่เสร็จ ───────────────────────────────────

# 1. ตรวจสอบว่า dev server รันผ่าน
npm run dev

# 2. Tag version ใหม่
git tag -a v0.13.0 -m "v0.13.0 — Unified Inbox: FB + LINE combined"

# 3. เลื่อน stable branch
git branch -f stable HEAD

# 4. Push ทุกอย่าง (รวม tags)
git push origin master stable --tags

# 5. อัพเดท GEMINI.md — เปลี่ยน CURRENT phase
# 6. อัพเดท CHANGELOG.md — เพิ่ม entry ใหม่
# 7. อัพเดท docs/overview.md — ADR table
```

---

## 5. Quick Reference

```bash
# ดู tags ทั้งหมด (ล่าสุดก่อน)
git tag -l --sort=-version:refname

# ดูว่าตอนนี้อยู่ version ไหน
git describe --tags --abbrev=0

# เปรียบเทียบกับ stable
git diff stable..master --stat

# undo commit ล่าสุด (ยัง staged ไว้)
git reset --soft HEAD~1

# undo commit ล่าสุด (ทิ้งการเปลี่ยนแปลงด้วย)
git reset --hard HEAD~1
```

---

## 6. Version Map ปัจจุบัน

```
v0.9.0  ──── Auth Stable
v0.10.0 ──── API Connected      (Phase 11 done)
v0.11.0 ──── Revenue Split
v0.12.0 ──── UI Enhanced        ← stable, current
               │
             master              ← HEAD (2026-03-13)
```
