# Security Policy — V School CRM v2

---

## Authentication & Authorization

### Authentication
- ใช้ **NextAuth.js** — JWT strategy, session-based
- Password hash ด้วย **bcrypt** (salt rounds = 12)
- Session หมดอายุ: 24 ชั่วโมง (configurable ใน `NEXTAUTH_SECRET`)

### Authorization — RBAC 6-tier (ADR-026)

| Role | Level | สิทธิ์ |
|---|---|---|
| `DEVELOPER` | 5 | ทุกอย่าง รวม system config |
| `MANAGER` | 4 | ข้อมูล employee, analytics, marketing |
| `SUPERVISOR` | 3 | Marketing, analytics, chat |
| `ADMIN` | 2 | ลูกค้า, คำสั่งซื้อ, แชท |
| `AGENT` | 1 | แชท, ลูกค้า (read) |
| `GUEST` | 0 | ไม่มีสิทธิ์ |

Route matrix (middleware.js):
```
/api/employees/*    → MANAGER+
/api/marketing/*    → SUPERVISOR+
/api/analytics/*    → SUPERVISOR+
/api/customers/*    → AGENT+
/api/webhooks/*     → skip (signature auth)
```

---

## API Security

### Webhook Verification
- **Facebook:** HMAC-SHA256 signature ตรวจสอบทุก request (`FB_APP_SECRET`)
- **LINE:** HMAC-SHA256 signature (`LINE_CHANNEL_SECRET`)
- ทั้งสองตอบ 200 ทันที < 200ms แล้ว process async (NFR1)

### API Tokens
- `FB_PAGE_ACCESS_TOKEN` — Long-lived (~90 days) ต้องต่ออายุก่อนหมด
- `GEMINI_API_KEY` — Google AI Studio
- `LINE_CHANNEL_ACCESS_TOKEN` — Long-lived LINE token
- ทุก token เก็บใน `.env` เท่านั้น — **ห้าม commit ขึ้น git**

---

## Secrets Management

### การจัดการ Credentials
- `.env` อยู่ใน `.gitignore` — ไม่ถูก commit
- ใช้ `.env.example` เป็น template สำหรับ developer ใหม่
- Production: ใช้ environment variables จาก hosting platform (Vercel/VPS)

### การต่ออายุ Token
| Token | หมดอายุ | วิธีต่ออายุ |
|---|---|---|
| `FB_PAGE_ACCESS_TOKEN` | ~90 วัน | Meta Developer Console → Generate |
| `FB_ACCESS_TOKEN` | ~60 วัน | Exchange short-lived → long-lived via Graph API |
| `LINE_CHANNEL_ACCESS_TOKEN` | ไม่หมด (stateless) | Reissue จาก LINE Console ถ้า revoke |

---

## Data Privacy (PDPA)

- ข้อมูลลูกค้า (ชื่อ, เบอร์, Facebook ID) เก็บในฐานข้อมูลส่วนกลาง
- ไม่ export ข้อมูลลูกค้าออกนอกระบบโดยไม่มีเหตุจำเป็น
- AuditLog บันทึกทุก CREATE/UPDATE/DELETE บน sensitive models
- Slip image URL เก็บใน `Transaction.slipImageUrl` — ไม่เก็บไฟล์ในระบบ

---

## Database Security

- Connection ผ่าน Prisma driver adapter (`@prisma/adapter-pg`)
- `DATABASE_URL` เก็บใน `.env` เท่านั้น
- Identity upsert ทุกครั้งต้องใน `prisma.$transaction` (NFR5)
- ไม่มี raw SQL โดยไม่ผ่าน parameterization

---

## Known Vulnerabilities / Limitations

| Issue | Severity | Status |
|---|---|---|
| FB token expire ไม่มี auto-refresh | MEDIUM | Manual — ต้องต่ออายุทุก ~90 วัน |
| node-cron รันใน same process กับ Next.js | LOW | Planned fix: ย้ายไป BullMQ worker (Phase 13) |

---

## Reporting a Vulnerability

แจ้งผ่าน LINE หรือ email โดยตรงถึง team lead
**ห้าม** report ผ่าน GitHub issues สำหรับ security vulnerabilities
