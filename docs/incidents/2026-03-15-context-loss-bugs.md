# Incident Report: Context Loss Bugs (2026-03-15)

**Severity:** HIGH — 1 crash bug + 2 broken features ใน production branch
**Discovered by:** Claude (Lead Architect) — post-Antigravity audit
**Resolved:** 2026-03-15, commit `4f8f659`

---

## What Happened

Antigravity ทำงานต่อเนื่องหลาย tasks ใน session เดียวโดยไม่มี Claude คุม
Context window บวมจนเต็ม → system prompt (ANTIGRAVITY.md / CLAUDE.md) ถูก Gemini ตัดออก
Agent เขียน code ต่อโดยไม่รู้ว่า ADR rules หายไปจาก context
เมื่อจบ session Antigravity เขียน MEMORY.md ว่า "Phase 14 DONE" — แต่ bugs ยังอยู่ใน code จริง

---

## Root Cause

```
Gemini IDE ไม่มี auto-compaction (ต่างจาก Claude Code)
↓
Session ยาว → context เต็ม → ตัด system prompt ออกเงียบๆ
↓
ADR-031 (ห้าม FontAwesome) หาย → เขียน FA icons
DB pattern (await getPrisma()) หาย → prisma ไม่ถูก init
↓
Bugs ผ่าน lint แต่ล้มที่ runtime (functional but wrong)
```

**Key difference:** Claude Code มี conversation compaction — compress context อัตโนมัติก่อนถึง limit
Gemini ไม่มี feature นี้ → ต้องจัดการ context ด้วยมือ

---

## Bugs Found & Fixed

| ID | ไฟล์ | Bug | ผลกระทบ |
|---|---|---|---|
| C1 | `src/app/api/inbox/conversations/route.js:18` | `prisma` ถูกใช้โดยไม่มี `await getPrisma()` | **Inbox crash** ทุกครั้งที่เปิด |
| C2 | `src/components/PremiumPOS.js` | FontAwesome 10 icons ไม่มี import (ADR-031) | ไอคอน POS หายหมด |
| S2 | `src/app/api/marketing/sheets/sync/route.js` | `cache.set(..., 0)` TTL=0 + unused import | Sheets sync timestamp ไม่เคย cache |

**False positives** (audit agent รายงาน แต่ code จริงถูกแล้ว):
- D1: `insights/route.js` reach calculation — ถูกต้อง (`acc.reach` ไม่ใช่ `acc.impressions`)
- D2: `Analytics.js` timeframe mapping — ถูกต้อง (ใช้ `'all_time'` แล้ว)
- C3: `PremiumPOS.js` phone lookup — ถูกต้อง (ใช้ `?search=` แล้ว)

> ⚠️ **Note on audit agents:** Explore subagents อาจ hallucinate bugs ที่ไม่มีจริง — ต้อง read ไฟล์จริงก่อนแก้เสมอ

---

## Solutions Implemented

### 1. Pre-commit Hook (`scripts/check-adr.sh`)

ติดตั้งแล้ว — ตรวจ staged files ก่อน commit ทุกครั้ง:

```bash
# Block FontAwesome ใน components ใหม่
grep -rl "fas fa-|far fa-|fab fa-" <staged components>

# Block route ที่ใช้ prisma โดยไม่มี getPrisma()
grep "await prisma\." <route> && ! grep "getPrisma()" <route>

# Block cache.set TTL=0 (ยกเว้น comment // Permanent)
grep "cache\.set(.*,\s*0)" <file> | grep -iv "permanent"
```

ติดตั้งบนเครื่องใหม่:
```bash
cp scripts/check-adr.sh .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

### 2. Context Limit Rule (ใน `ANTIGRAVITY.md`)

```
⚠️ กฎบังคับสำหรับ Gemini/Antigravity:
- ทุก 3–4 tasks → บังคับ /checkpoint (commit + จบ session)
- ห้ามทำงานเกิน 1 phase ต่อ session
- ก่อน claim DONE → รัน verify checklist ก่อน
- ห้าม claim phase DONE โดยไม่มี Claude verify
```

### 3. Verify Skill (`.claude/skills/verify-adr.md`)

Checklist ที่ Antigravity ต้องรันก่อนเขียน MEMORY.md ว่าเสร็จ:
- ADR-031 check (no FA)
- getPrisma() pattern
- Cache TTL
- Error handling
- camelCase

---

## Lessons Learned

1. **Gemini context ≠ Claude context** — Gemini ตัด context เงียบๆ ไม่แจ้ง → ต้อง checkpoint บ่อย
2. **"DONE" ใน MEMORY.md ≠ จริง** — ต้อง verify code จริงก่อนเชื่อ entry ของ Antigravity
3. **Audit agents hallucinate** — Explore subagents อาจรายงาน bugs ที่ไม่มี → อ่าน file จริงเสมอ
4. **Lint ผ่าน ≠ ถูกต้อง** — bugs ประเภท "functional but wrong" ผ่าน linter แต่ล้มที่ runtime
5. **Pre-existing debt ≠ regression** — 35 components มี FA เดิมอยู่แล้ว → hook ตรวจแค่ staged files

---

## Prevention Checklist สำหรับ Agent ทุกตัว

ก่อนเริ่มแต่ละ session:
- [ ] อ่าน MEMORY.md — ดู entry ล่าสุด
- [ ] โหลด domain skill ที่เกี่ยวข้อง
- [ ] ตรวจสอบว่า pre-commit hook ติดตั้งอยู่: `cat .git/hooks/pre-commit`

ก่อน commit:
- [ ] รัน `sh scripts/check-adr.sh` (หรือปล่อย hook ทำงานเอง)

ก่อนเขียน MEMORY.md ว่า "DONE":
- [ ] รัน verify checklist จาก `.claude/skills/verify-adr.md`
- [ ] Mark เป็น "ต้อง review" เสมอ — ไม่ใช่ "DONE" ทันที

---

*บันทึกโดย Claude (Lead Architect) — 2026-03-15*
*Commits: `4f8f659` (bug fixes) · `a004616` (ADR guard) · `59cdcf8` (gitignore)*
