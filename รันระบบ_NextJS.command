#!/bin/bash
cd "$(dirname "$0")"

echo "------------------------------------------------"
echo "V School CRM v2 — Next.js Dev Server"
echo "------------------------------------------------"

# 1. Check node_modules
if [ ! -d "node_modules" ]; then
    echo "First time setup: Installing dependencies..."
    npm install || { echo "Failed to install dependencies"; exit 1; }
fi

# 2. Start Docker infrastructure (Postgres + Redis)
if command -v docker &> /dev/null && [ -f "docker-compose.yml" ]; then
    echo "Starting infrastructure (Postgres + Redis)..."
    docker compose up -d
else
    echo "Warning: Docker not found. DB/Redis features may fail."
fi

# 3. Open browser after server is ready
(sleep 6 && open "http://localhost:3000") &

echo "------------------------------------------------"
echo "Server starting at http://localhost:3000"
echo "Press Ctrl+C to stop."
echo "------------------------------------------------"

npm run dev