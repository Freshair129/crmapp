# คู่มือการผูกโดเมน (crm.thevschool.com) เข้ากับเครื่อง Windows 🌐🚀

ตอนนี้คุณสร้าง Subdomain ใน DirectAdmin เรียบร้อยแล้ว ขั้นตอนต่อไปคือการ "เจาะอุโมงค์" เพื่อให้คนทั่วโลกเข้าถึง CRM ที่รันอยู่ในเครื่อง Windows ของคุณได้ครับ

---

## 🛠️ สิ่งที่ต้องทำบนเครื่อง Windows (Backend)

เราจะใช้ **Cloudflare Tunnel** เพราะมันฟรี เสถียร และไม่ต้องยุ่งกับการหา IP จริงของค่ายเน็ตครับ

### 1. ติดตั้งตัวเจาะอุโมงค์ (cloudflared)
เปิด PowerShell แบบ Run as Administrator แล้วรันคำสั่งนี้:
```powershell
# ดาวน์โหลดและติดตั้ง
winget install Cloudflare.cloudflared
```

### 2. ล็อกอินและเชื่อมต่อ
```powershell
# ล็อกอิน (จะมีหน้าต่าง Browser เด้งขึ้นมาให้เลือกโดเมน thevschool.com)
cloudflared tunnel login

# สร้างอุโมงค์ชื่อ vschool-crm
cloudflared tunnel create vschool-crm
```

### 3. ตั้งค่าการชี้ทาง (Mapping)
เราจะสั่งให้ใครก็ตามที่เข้า `crm.thevschool.com` วิ่งมาที่เครื่องเราที่พอร์ต 3000:
```powershell
cloudflared tunnel route dns vschool-crm crm.thevschool.com
```

### 4. เริ่มเดินเครื่อง
```powershell
cloudflared tunnel run --url http://localhost:3000 vschool-crm
```

---

## 📋 สิ่งที่ต้องทำใน DirectAdmin (หน้าจอที่คุณส่งมา)

หลังจากรันคำสั่งด้านบนแล้ว ให้ไปที่เมนู **"DNS Management"**:
1. มองหาชื่อ `crm`
2. ตรวจสอบว่ามันถูกชี้ (CNAME) ไปยังเลขที่ Cloudflare กำหนดให้ (ระบบจะทำให้อัตโนมัติหากคุณจัดการ DNS ผ่าน Cloudflare)
3. **หากไม่ได้ใช้ Cloudflare DNS**: ผมแนะนำให้เปลี่ยนมาระบบ DNS มาไว้ที่ Cloudflare (ฟรี) เพื่อความง่ายในการจัดการระบบกึ่งคลาวด์แบบนี้ครับ

---

## ✅ ผลลัพธ์ที่ได้
- คุณสามารถเข้าเว็บผ่าน **`https://crm.thevschool.com`** ได้จากมือถือหรือจากที่ไหนก็ได้
- ข้อมูลจะวิ่งตรงเข้าเครื่อง Windows ที่บ้านคุณทันที
- **WordPress เดิม** ยังทำงานได้ปกติ 100% ไม่เกี่ยวข้องกันครับ

> [!TIP]
> **ทำไมวิธีนี้ถึงดี?** : เพราะคุณไม่จำเป็นต้องมี Fixed IP หรือแจ้งขอเปิดพอร์ตกับค่ายเน็ตให้ยุ่งยากครับ และความปลอดภัยสูงมากเพราะ Cloudflare จะเป็นคนช่วยกรองแฮกเกอร์ให้ก่อนถึงเครื่องคุณครับ!
