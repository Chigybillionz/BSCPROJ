#!/bin/bash
echo "========================================================"
echo "    UNICLEAR DEFENSE SYSTEM: 1-CLICK STARTUP SCRIPT     "
echo "========================================================"

# 1. Start Docker Containers
echo "[1/4] Starting PostgreSQL and Adminer containers..."
docker compose up -d

# 2. Wait for Database Readiness
echo "[2/4] Waiting for database healthcheck..."
until docker exec uniclear-postgres pg_isready -U uniclear -d uniclear > /dev/null 2>&1; do
    sleep 1
done
echo "Database is ready!"

# 3. Start Backend API
echo "[3/4] Launching UniClear Express Backend (Port 5000)..."
cd uniclear-backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 4. Start Frontend
echo "[4/4] Launching UniClear Next.js Frontend (Port 3000)..."
cd uniclear-frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "========================================================"
echo " SYSTEM ACTIVE & READY FOR DEFENSE!"
echo " - Student & Admin Portal: http://localhost:3000"
echo " - Backend API Server:     http://localhost:5000"
echo " - Adminer Database GUI:   http://localhost:8080"
echo " (Press Ctrl+C to terminate or run ./stop_all.sh)"
echo "========================================================"
wait
