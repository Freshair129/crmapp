# DOPPLER_SETUP.md — คู่มือตั้งค่า Doppler บน Windows

> อ่านไฟล์นี้แล้วทำตามทุกขั้นตอนตามลำดับ

---

## ทำไมต้องทำ

Doppler คือ source of truth สำหรับ secrets ทุกตัว (.env)  
ทั้ง Mac และ Windows ต้องดึง .env จาก Doppler project เดียวกัน: **`vschool-crm`**

---

## ขั้นตอน 1 — ติดตั้ง Doppler CLI

```powershell
winget install Doppler.doppler
# รีสตาร์ท terminal หลังติดตั้ง
doppler --version   # ต้องขึ้น version เช่น 3.75.x
```

---

## ขั้นตอน 2 — Login

```powershell
doppler login
# จะเปิด browser → เลือก "Log in with GitHub" → authorize
# กลับมาที่ terminal ต้องขึ้น "Welcome, ..."
```

> ⚠️ ต้องใช้ **account เดียวกัน** กับที่ Mac ใช้ (GitHub: Freshair129)

---

## ขั้นตอน 3 — Setup Project ใน folder crm

```powershell
cd C:\path\to\crm   # เปลี่ยนเป็น path จริงของ crm folder

doppler setup --project vschool-crm --config dev
# ต้องขึ้นตารางแบบนี้:
# | project | vschool-crm | C:\path\to\crm |
# | config  | dev         | C:\path\to\crm |
```

> ⚠️ ห้ามเลือก `prd` หรือ `example-project` — ต้องเป็น `vschool-crm` + `dev` เท่านั้น

---

## ขั้นตอน 4 — ตรวจสอบว่า secrets ครบ

```powershell
doppler secrets 2>$null | Select-String "FB_APP_ID|PUSHER|DATABASE_URL|NEXTAUTH"
# ต้องเห็นทุกตัว ถ้าไม่เห็นแสดงว่า setup ผิด project
```

---

## ขั้นตอน 5 — Download .env

```powershell
doppler secrets download --no-file --format env | Out-File -Encoding utf8 .env
# ตรวจ:
Get-Content .env | Select-String "FB_APP_ID|PUSHER_APP_ID"
```

---

## ขั้นตอน 6 — ตั้ง alias syncenv (ทำครั้งเดียว)

```powershell
# เปิด PowerShell profile
notepad $PROFILE

# เพิ่มบรรทัดนี้ในไฟล์ แล้ว save:
function syncenv { cd C:\path\to\crm; doppler secrets download --no-file --format env | Out-File -Encoding utf8 .env; Write-Host "✅ .env synced from Doppler (vschool-crm/dev)" }
```

หลังจากนี้รัน `syncenv` ได้เลยเมื่อต้องการ sync .env ใหม่

---

## Workflow ประจำวัน

```powershell
# เริ่ม session ใหม่ทุกครั้ง:
syncenv                  # pull .env ล่าสุดจาก Doppler
git pull origin master   # pull code ล่าสุดจาก GitHub

# พัฒนาตามปกติ...

# เมื่อแก้ secret ใหม่ → แก้ที่ Doppler dashboard แล้วรัน syncenv อีกครั้ง
```

---

## ❌ ข้อผิดพลาดที่พบบ่อย

| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| `doppler secrets` แสดง `example-project` | setup ผิด project | รัน `doppler setup --project vschool-crm --config dev` ใหม่ |
| Login แล้วแต่ไม่มี `vschool-crm` | ใช้ account ผิด | `doppler logout` แล้ว login ใหม่ด้วย GitHub: Freshair129 |
| `.env` ว่างเปล่าหลัง download | format ผิด | ใช้ `--format env` และ `Out-File -Encoding utf8` |
| `doppler` ไม่รู้จัก command | PATH ไม่อัปเดต | รีสตาร์ท terminal หลังติดตั้ง |

---

## ตรวจสอบสุดท้าย — Checklist

- [ ] `doppler --version` ขึ้น version ได้
- [ ] `doppler me` แสดงชื่อ account ถูกต้อง
- [ ] `doppler setup` ชี้ไป `vschool-crm / dev`
- [ ] `doppler secrets` แสดง FB_APP_ID, PUSHER_APP_ID, DATABASE_URL ครบ
- [ ] `.env` ถูก generate และมีค่าครบ

---

*อัปเดตล่าสุด: 2026-03-26 | สร้างโดย Claude (Mac)*
