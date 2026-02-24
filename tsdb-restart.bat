@echo off
REM ============================================
REM LogiX TimescaleDB 重启脚本
REM LogiX TimescaleDB Restart Script
REM ============================================

echo.
echo ========================================
echo Restarting TimescaleDB Dev Environment
echo ========================================
echo.

echo [1/4] Stopping services...
docker-compose -f docker-compose.timescaledb.yml down
echo.

echo [2/4] Starting services...
docker-compose -f docker-compose.timescaledb.yml up -d
echo.

echo [3/4] Waiting for services to be ready...
timeout /t 10 /nobreak >nul
echo.

echo [4/4] Checking service status...
docker-compose -f docker-compose.timescaledb.yml ps

echo.
echo ========================================
echo TimescaleDB Dev Environment Restarted!
echo ========================================
echo.
pause
