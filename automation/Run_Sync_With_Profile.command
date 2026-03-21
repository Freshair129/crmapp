#!/bin/bash
# นำทางไปยังโฟลเดอร์โปรเจกต์
cd "$(dirname "$0")/.."

CHROME_DIR="$HOME/Library/Application Support/Google/Chrome"
echo "🔍 กำลังค้นหาโปรไฟล์ Chrome ในเครื่องของคุณ..."
echo "------------------------------------------------"

# สร้างรายการโปรไฟล์ (Default และ Profile *)
# เราจะหาโฟลเดอร์ที่มีไฟล์ "Preferences" เพื่อยืนยันว่าเป็นโฟลเดอร์โปรไฟล์จริง
profiles=()
while IFS= read -r line; do
    profiles+=("$line")
done < <(find "$CHROME_DIR" -maxdepth 1 -type d \( -name "Default" -o -name "Profile *" \) -exec test -e "{}/Preferences" \; -print)

if [ ${#profiles[@]} -eq 0 ]; then
    echo "❌ ไม่พบโปรไฟล์ Chrome กรุณาตรวจสอบว่าติดตั้ง Chrome ไว้ที่โฟลเดอร์มาตรฐาน"
    exit 1
fi

# แสดงรายชื่อให้ผู้ใช้เลือก
for i in "${!profiles[@]}"; do
    profile_path="${profiles[$i]}"
    profile_id=$(basename "$profile_path")
    
    # พยายามอ่านชื่อโปรไฟล์ที่ผู้ใช้ตั้งไว้ (ถ้ามี)
    display_name=""
    if [ -f "$profile_path/Preferences" ]; then
        display_name=$(grep -o '"name":"[^"]*"' "$profile_path/Preferences" | head -1 | cut -d'"' -f4)
    fi
    
    if [ -n "$display_name" ]; then
        echo "[$i] $display_name ($profile_id)"
    else
        echo "[$i] $profile_id"
    fi
done

echo "------------------------------------------------"
read -p "👉 กรุณาใส่หมายเลขโปรไฟล์ที่ต้องการใช้ (เช่น 0): " choice

# ตรวจสอบว่าเลือกถูกต้องไหม
if [[ -z "${profiles[$choice]}" ]]; then
    echo "❌ หมายเลขไม่ถูกต้อง"
    exit 1
fi

SELECTED_FULL_PATH="${profiles[$choice]}"
SELECTED_ID=$(basename "$SELECTED_FULL_PATH")

echo "✅ คุณเลือกโปรไฟล์: $SELECTED_ID"
echo "⚠️  คำเตือน: กรุณาปิด Chrome หน้าต่างที่ใช้โปรไฟล์นี้ก่อนเริ่มงาน"
echo "🚀 กำลังเริ่มระบบ Sync..."

# รันสคริปต์ V5 
# USER_DATA ต้องเป็นตัวแม่ (Chrome folder) 
# ส่วน --profile จะเป็นตัวระบุโฟลเดอร์ข้างใน
export CHROME_PROFILE_PATH="$CHROME_DIR"
node automation/sync_agents_v5.js --limit=50 --force --profile="$SELECTED_ID"

echo "------------------------------------------------"
read -p "งานเสร็จสิ้น กด Enter เพื่อปิดหน้าต่าง..."
