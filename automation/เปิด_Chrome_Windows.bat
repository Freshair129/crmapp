@echo off
set "PROFILE_DIR=%USERPROFILE%\.chrome-vschool-crm"
set "DEBUG_PORT=9222"

echo 🚀 Opening Chrome for V School CRM (Windows)...
echo Target: https://business.facebook.com/latest/inbox/all
echo Debug Port: %DEBUG_PORT%

start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --remote-debugging-port=%DEBUG_PORT% ^
  --user-data-dir="%PROFILE_DIR%" ^
  --no-first-run ^
  --no-default-browser-check ^
  "https://business.facebook.com/latest/inbox/all"

pause
