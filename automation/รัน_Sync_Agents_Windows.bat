@echo off
echo 🔄 V School - Agent Sync (Windows)
echo Getting latest code from GitHub...
git pull origin master

echo.
echo ✅ Checking if Chrome is ready...
curl -s http://localhost:9222/json > nul
if errorlevel 1 (
    echo ❌ Chrome Debug Mode is not running!
    echo Please run 'เปิด_Chrome_Windows.bat' first.
    pause
    exit /b
)

echo 🤖 Starting Automation...
node automation/sync_agents_v5.js --attach --limit=9999 --loop --delay=45 --force

pause
