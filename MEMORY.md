# MEMORY.md — Shared Handover Log (Claude ↔ Antigravity)

> **ทั้ง Claude และ Antigravity ต้องอ่านไฟล์นี้ก่อนเริ่มงานทุกครั้ง**
> และเขียนสรุปลงไฟล์นี้ทุกครั้งที่จบงาน

---

## Protocol

### เมื่อเริ่ม session (ทั้ง Claude และ Antigravity)
1. อ่าน MEMORY.md → ดู Last Entry → เข้าใจว่าอีกฝ่ายทำอะไรไป
2. ถ้ามี Breaking Changes → ต้อง review ก่อนทำงานต่อ
3. ถ้า entry เก่ากว่า 1 phase → archive ลง CHANGELOG.md แล้วลบออก

### เมื่อจบ session (ทั้ง Claude และ Antigravity)
เพิ่ม entry ใหม่ที่ **ด้านบน** ของ Handover Log ด้วย format:

```
### [YYYY-MM-DD HH:MM] Agent Name — สรุปสั้น
- **สิ่งที่ทำ**: (bullet list)
- **ไฟล์ที่เปลี่ยน**: (list key files)
- **Breaking Changes**: (ถ้ามี — schema, API contract, env vars)
- **ต้อง review**: (ถ้า architectural decision ที่อีกฝ่ายควรตรวจ)
- **ทำต่อ**: (next step สำหรับ session หน้า)
```

---

## Handover Log (ใหม่สุดอยู่บน)

### [2026-03-14 18:30] Claude — Phase 13 verified + Agent protocols established
- **สิ่งที่ทำ**:
    - Verified Phase 13 (Antigravity's work) — all 4 tasks confirmed in codebase
    - Updated CLAUDE.md, GEMINI.md, GOAL.md, CHANGELOG.md with Phase 13 completion
    - Added Session Start Protocol + Conflict Resolution to CLAUDE.md
    - Added Domain Routing + Conflict Resolution to ANTIGRAVITY.md
    - Committed: `353aca9` (Phase 13 + accumulated changes) + `9e2d91e` (cleanup)
    - Made MEMORY.md bi-directional (both agents read/write)
- **ไฟล์ที่เปลี่ยน**: CLAUDE.md, GEMINI.md, GOAL.md, CHANGELOG.md, ANTIGRAVITY.md, agent group.md
- **Breaking Changes**: ไม่มี
- **ต้อง review**: ไม่มี — เป็น docs update เท่านั้น
- **ทำต่อ**: Phase 14 (Production Hardening) หรือ task ที่ Boss สั่ง

---

### [2026-03-14 15:39] Antigravity — Phase 13 complete (NotificationRules + LINE)
- **สิ่งที่ทำ**:
    - NotificationRule model + migration
    - CRUD API: `api/notifications/rules` (GET/POST/DELETE)
    - `notificationEngine.js` — rule evaluation with BullMQ queue
    - `notificationWorker.mjs` — BullMQ worker for LINE push
    - Vitest unit tests (4 cases) PASSED
    - Integrated notificationEngine into FB + LINE webhooks
    - Created domain skill files (4 ไฟล์)
- **ไฟล์ที่เปลี่ยน**: prisma/schema.prisma, src/lib/notificationEngine.js, src/workers/notificationWorker.mjs, src/lib/queue.js, webhooks/facebook+line, .claude/skills/domain-*.md
- **Breaking Changes**: LINE webhook now records messages in Message table (was missing before)
- **ต้อง review**: Claude should verify notificationEngine architecture
- **ทำต่อ**: Phase 14 or UI integration for notification rules

---

### [2026-03-14 15:05] Antigravity — Agent context separation
- **สิ่งที่ทำ**: Created ANTIGRAVITY.md, refined GEMINI.md, updated CLAUDE.md hierarchy
- **Breaking Changes**: ไม่มี
- **ทำต่อ**: Phase 13

---

## Architectural Soft Knowledge

> บันทึกสิ่งที่ไม่ใหญ่พอจะเป็น ADR แต่สำคัญ

- **Customer model ไม่มี `channel`** — ใช้ `conversation.channel` เสมอ
- **Prisma ต้องใช้ adapter-pg** — `new PrismaClient()` เปล่าจะ fail
- **`updated_at` ไม่มี DB default** — ต้อง supply `now()` ใน raw INSERT
- **node-cron อยู่ใน instrumentation.js** — ยังไม่ย้ายไป BullMQ (scheduled jobs ≠ notification jobs)
- **fd tool ใช้ไม่ได้บน macOS** — ใช้ ls หรือ glob แทน
- **Agent rules เป็น workspace-specific** — ไม่ share ข้าม project

---

*Note: เมื่อ entry เก่ากว่า 1 phase → archive ลง CHANGELOG.md แล้วลบ entry ออกเพื่อประหยัด token*
