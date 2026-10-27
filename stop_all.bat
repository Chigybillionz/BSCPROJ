@echo off
title UNICLEAR DEFENSE SYSTEM - SHUTDOWN
echo Stopping all running Node processes and Docker containers...
taskkill /f /im node.exe >nul 2>&1
docker compose down
echo All defense services stopped successfully.
pause
