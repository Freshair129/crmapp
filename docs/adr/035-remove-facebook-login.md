# ADR 035: Remove Facebook Login from Employee Authentication

**Date:** 2026-03-15
**Status:** Accepted
**Decider:** Claude (Lead Architect)
**Phase:** Phase 15 (retroactive — applied during Phase 14 cleanup)

## Context

FR1.1 specified Facebook Meta Login as an authentication method for employees, with the goal of resolving admin PSID for message attribution (connecting Facebook Page admin identities to employee records). The implementation was completed in v0.9.0.

After several weeks of operation, a fundamental limitation of the Facebook Graph API became clear: when an admin sends a message through Business Suite or the Facebook Page inbox, the Graph API returns the **Page PSID of the customer** as the sender — not the admin's personal PSID. Facebook deliberately hides the admin's personal PSID from the conversation payload.

As a result:
- `employee.facebookSub` (OAuth subject) could not be matched to any field in the webhook payload
- Attribution logic (ADR-021, ADR-022) was based on `facebookName` string matching and `message.text` prefix scanning, not PSID
- Facebook Login added OAuth complexity, a dependency on `FACEBOOK_APP_ID`/`FACEBOOK_APP_SECRET`, and a PKCE flow that served zero practical purpose once PSID attribution was proven impossible via OAuth

The fallback attribution strategy (ADR-022 — global message text search with `[AOI]`/`[FAH]` prefix or embedded sender pattern) works independently of Facebook Login and is already in production.

## Options Considered

| Option | ข้อดี | ข้อเสีย |
|---|---|---|
| A: Keep Facebook Login, continue investigating PSID | ไม่ต้องเปลี่ยน auth flow | Attribution ไม่มีทางทำได้ — PSID ถูกซ่อนโดย Facebook by design. OAuth complexity ยังคงอยู่ |
| B: Remove Facebook Login entirely | Auth flow เรียบง่าย — email+password เท่านั้น. ลบ dependency ที่ไม่จำเป็น | Employee ที่เคย login ด้วย FB ต้องตั้ง password ใหม่ |
| C: Keep as optional secondary login | ลดผลกระทบต่อ users | ยังคง maintain code path ที่ไม่ได้ใช้ประโยชน์ |

## Decision

เลือก **Option B — ลบ Facebook Login ออก** เพราะ:

1. Attribution problem ไม่สามารถแก้ได้ด้วย Facebook OAuth — ไม่ใช่ implementation bug แต่เป็น platform design decision ของ Facebook
2. `employee.facebookName` string matching (ADR-022) ทำงานได้โดยไม่ต้องใช้ OAuth
3. Email+password auth เพียงพอสำหรับ internal employee tool ที่มีพนักงาน < 20 คน
4. การลบ OAuth provider ลด attack surface และ secret management overhead (`FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`)

`employee.facebookSub` field ยังคงอยู่ใน schema เพื่อ backward compatibility แต่จะไม่ถูก populate โดย auth flow อีกต่อไป

## Consequences

### ผลดี
- Auth flow ลดความซับซ้อน — NextAuth config ไม่ต้องมี FacebookProvider
- ลด env vars ที่ต้องจัดการ: `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` ไม่จำเป็นสำหรับ auth (ยังจำเป็นสำหรับ Graph API/webhook verification)
- ไม่มี OAuth redirect loop bugs ใน production
- `employee.facebookSub` ยังคงอยู่ในกรณีที่ Facebook เปิด API ให้ access PSID ในอนาคต

### ผลเสีย / Trade-offs
- Employee ที่เคยใช้ Facebook Login เท่านั้นต้องตั้ง password ใหม่ผ่าน Admin
- BKL-01 (FB Login bug) ใน backlog ถูก close เป็น "won't fix — by design"

### Rollback
ถ้าต้อง revert decision นี้ (เช่น Facebook เปิด admin PSID API):
1. เพิ่ม `FacebookProvider` กลับใน `src/app/api/auth/[...nextauth]/route.js`
2. เพิ่ม `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` กลับใน `.env`
3. สร้าง migration script เพื่อ populate `employee.facebookSub` จาก OAuth session
4. ทดสอบ PSID extraction จาก new Graph API endpoint
