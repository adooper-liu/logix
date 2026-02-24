@echo off
REM ============================================
REM LogiX TimescaleDB 开发环境停止脚本
REM LogiX TimescaleDB Development Environment Stop Script
REM ============================================

echo.
echo ========================================
echo Stopping TimescaleDB Dev Environment
echo ========================================
echo.

echo [1/3] Stopping services...
docker-compose -f docker-compose.timescaledb.yml down

echo.
echo [2/3] Checking for remaining containers...
docker ps -a --filter "name=logix-" --format "table {{.Names}}\t{{.Status}}" 2>nul

echo.
echo [3/3] TimescaleDB development environment stopped.
echo.
echo ========================================
echo Services stopped successfully!
echo ========================================
echo.
pause
