# Contributing — V School CRM v2

---

## สถาปัตยกรรมทีม

| บทบาท | หน้าที่ | เครื่องมือ |
|---|---|---|
| 🧠 **Claude** (Lead Architect) | Architecture decisions, integration, security, QA, ADR | Claude Code |
| 🛠️ **Gemini** (Worker Sub-agent) | Boilerplate, helpers, unit tests | Gemini CLI |

**กฎหลัก:** Gemini implement ตาม interface ที่ Claude กำหนด — ห้าม Gemini ออกแบบ architecture เอง

---

## Commit Convention

ใช้ [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

feat(inbox): add right customer card panel
fix(api): repair inbox height chain
docs: update CLAUDE.md version status
refactor(analytics): extract repository layer
chore: upgrade node 20 → 22 LTS
```

| Type | ใช้เมื่อ |
|---|---|
| `feat` | เพิ่ม feature ใหม่ |
| `fix` | แก้ bug |
| `docs` | แก้ไขเอกสารเท่านั้น |
| `refactor` | ปรับโครงสร้าง ไม่เพิ่ม feature ไม่แก้ bug |
| `chore` | งาน maintenance (deps, config, ci) |
| `test` | เพิ่ม/แก้ tests |

**scope** ตัวอย่าง: `inbox`, `analytics`, `auth`, `api`, `sidebar`, `webhook`

---

## Branch Strategy

```
master  ← งานประจำวัน (push ได้โดยตรง)
stable  ← ชี้ที่ release ล่าสุด (v0.12.0)
```

- งานทั่วไป → push ตรงที่ `master`
- Release → `git tag vX.Y.Z && git push --tags`
- Hotfix → fix บน master → tag ทันที

---

## การเพิ่ม ADR (Architecture Decision Record)

เมื่อมี architecture decision ใหม่ ต้องสร้าง ADR เสมอ:

```bash
# ตั้งชื่อไฟล์: docs/adr/0XX-kebab-case-title.md
# เลข ADR ถัดไปดูจาก: ls docs/adr/ | tail -5
```

**Format:**
```markdown
# ADR-0XX: ชื่อ Decision

**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-0YY
**Date:** YYYY-MM-DD

## Context
ปัญหาหรือ requirement ที่ต้องตัดสินใจ

## Decision
สิ่งที่ตัดสินใจทำ

## Consequences
ผลที่ตามมา — ทั้งด้านบวกและด้านลบ
```

**หลัง ADR เพิ่ม:** อัปเดต CLAUDE.md ADR table + Project Overview.md ADR table

---

## Coding Rules

### Naming
| Context | Convention | ตัวอย่าง |
|---|---|---|
| DB columns / `@map` | `snake_case` | `customer_id` |
| JS/TS code | `camelCase` | `customerId` |
| React Components | `PascalCase` | `UnifiedInbox` |
| Env vars | `SCREAMING_SNAKE` | `FB_PAGE_ACCESS_TOKEN` |

**ห้ามใช้ `snake_case` ใน JS/TS layer เด็ดขาด**

### Database Access
```js
// ✅ ถูก — ผ่าน repository layer
import { getCustomerById } from '@/lib/repositories/customerRepo';

// ❌ ผิด — เรียก Prisma ตรงจาก API route
import { getPrisma } from '@/lib/db';
const prisma = await getPrisma();
await prisma.customer.findMany(); // ← ห้าม
```

### Error Handling
```js
// ✅ ถูก
try {
    // ...
} catch (error) {
    logger.error('[ModuleName]', 'action failed', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}

// ❌ ผิด — catch เงียบ
try { ... } catch (e) {}
```

### Icon Library
- ใช้ `lucide-react` เท่านั้น
- ห้ามใช้ FontAwesome CDN (ADR-031)

---

## Non-Functional Requirements (ห้ามละเมิด)

| NFR | ข้อกำหนด |
|---|---|
| NFR1 | Webhook ตอบ Facebook < 200ms |
| NFR2 | Dashboard API < 500ms |
| NFR3 | BullMQ retry ≥ 5 ครั้ง, exponential backoff |
| NFR5 | Identity upsert ต้องอยู่ใน `prisma.$transaction` |

---

## After Completing Work

รัน sync-docs skill เสมอหลังเสร็จงาน:

**Claude Code:** พิมพ์ `/sync-docs` หรือ "อัปเดตเอกสาร"

**Gemini CLI:**
```bash
cat .claude/skills/sync-docs.md | gemini -p "execute all steps in this protocol. code and file edits only"
```

---

## Sub-agent Protocol (Gemini CLI)

```bash
cd /Users/ideab/Desktop/crm
echo "INTERFACE_SPEC" | gemini -p "implement, code only" -o text
```

- ส่งเฉพาะ **function signature / interface** — ไม่ส่งโค้ดทั้งไฟล์
- Gemini output → Claude review → Claude save to file
- ห้าม Gemini เขียน ADR หรือแก้ไข architecture documents
