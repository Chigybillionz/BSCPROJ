@echo off
title UNICLEAR DEFENSE SYSTEM - STARTUP
echo ========================================================
echo     UNICLEAR DEFENSE SYSTEM: 1-CLICK STARTUP SCRIPT     
echo ========================================================

echo [1/4] Starting PostgreSQL and Adminer via Docker...
docker compose up -d

echo [2/4] Waiting 5 seconds for database initialization...
timeout /t 5 /nobreak >nul

echo [3/4] Launching Backend API in new window...
start "UniClear Backend API (Port 5000)" cmd /k "cd uniclear-backend && npm run dev"

echo [4/4] Launching Frontend UI in new window...
start "UniClear Frontend Portal (Port 3000)" cmd /k "cd uniclear-frontend && npm run dev"

echo ========================================================
echo  SYSTEM ACTIVE & READY FOR DEFENSE!
echo  - Frontend Portal:  http://localhost:3000
echo  - Backend API:      http://localhost:5000
echo  - Adminer DB GUI:   http://localhost:8080
echo ========================================================
pause
