---
name: catchup
description: >
  Catch up on project progress. Read MEMORY.md and GOAL.md to understand what
  other agents did, what changed, and what needs attention. Use at session start
  or when Boss asks for a status update.
---

# Catchup Protocol

## Steps

### 1. Read Handover Log
Read `MEMORY.md` — focus on entries newer than your last entry.

### 2. Read Project Status
Read `GOAL.md` — check Project Status table for current phase and any new tasks.

### 3. Check for Breaking Changes
In MEMORY.md entries, look for:
- **Breaking Changes** that affect your domain
- **ต้อง review** items directed at you

### 4. Quick Codebase Check
```bash
git log --oneline -10
git status --short
```

### 5. Report Summary
Output a concise summary:

```
## Catchup Summary — [date]

### Since my last session:
- [Who] did [what] — [key files]
- [Who] did [what] — [key files]

### Breaking Changes:
- [list or "none"]

### Needs my review:
- [list or "none"]

### Current Phase: [N] — [name] ([status])
### Next action: [what to do next]
```

## Rules
- ห้ามแก้ไขไฟล์ใดๆ — อ่านอย่างเดียว
- ถ้า MEMORY.md มี entry ที่ต้อง review → แจ้ง Boss ด้วย
- ถ้าไม่มีอะไรเปลี่ยน → ตอบว่า "ไม่มีอะไรใหม่ พร้อมทำงานต่อ"
