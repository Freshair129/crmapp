# V School CRM — MCP Guide (AI-Native)

คู่มือการใช้งานและการพัฒนา MCP Server สำหรับเชื่อมต่อ AI เข้ากับระบบ CRM

## 🚀 คืออะไร?
**MCP (Model Context Protocol)** คือโปรโตคอลมาตรฐานที่ช่วยให้ AI (เช่น Claude Desktop) สามารถใช้งาน Tools ของ V School CRM ได้โดยตรง โดยไม่ต้องผ่านหน้าจอ UI พนักงานสามารถสั่งงานด้วยเสียงหรือข้อความผ่าน AI เพื่อจัดการสต็อก หรือสร้างใบสั่งซื้อได้ทันที

## 🛠️ วิธีการติดตั้ง (สำหรับพนักงาน/Dev)

1. **Prerequisites:** ติดตั้ง [Claude Desktop](https://claude.ai/download)
2. **Config:** แก้ไขไฟล์ `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
3. **Add Server:** เพิ่มการตั้งค่าด้านล่างนี้:

```json
{
  "mcpServers": {
    "vschool-crm": {
      "command": "node",
      "args": ["/path/to/crm/src/mcp/vschool-mcp-server.js"],
      "env": {
        "DATABASE_URL": "your_db_url",
        "UPSTASH_REDIS_REST_URL": "...",
        "UPSTASH_REDIS_REST_TOKEN": "..."
      }
    }
  }
}
```

## 📦 Tools ที่พร้อมใช้งานแล้ว

| Tool Name | ความสามารถ |
|---|---|
| `procurement.calculate_class_bom` | คำนวณวัตถุดิบที่ต้องใช้สำหรับคลาสเรียน และหาจุดที่ขาด |
| `procurement.create_po_from_bom` | สร้างใบสั่งซื้อ (PO) อัตโนมัติจากส่วนที่ขาด |
| `procurement.get_po_details` | ดูรายละเอียดเชิงลึกของ PO |

## 👨‍💻 สำหรับ Developer: การเพิ่ม Tool ใหม่

หากต้องการเพิ่มความสามารถให้ AI (เช่น ระบบ Inventory) ให้ทำตามขั้นตอนดังนี้:

1. **เตรียม Repository:** ตรวจสอบว่ามี function ใน `src/lib/repositories/inventoryRepo.js` พร้อมแล้ว
2. **Update MCP Server:** แก้ไข `src/mcp/vschool-mcp-server.js`
    - เพิ่ม Definition ใน `ListToolsRequestSchema`
    - เพิ่ม Handler ใน `CallToolRequestSchema`
3. **Restart Client:** รีสตาร์ท Claude Desktop เพื่อโหลด Tool ใหม่

## ⚠️ ข้อควรระวัง
- **Stdio Only:** ปัจจุบันรองรับการรันผ่าน Standard I/O เท่านั้น
- **Permissions:** AI จะมีสิทธิ์ตาม Environment Variable ที่ตั้งไว้ใน config ไฟล์ (ควรใช้สิทธิ์ที่จำกัด)
