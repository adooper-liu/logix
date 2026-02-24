@echo off
REM ============================================
REM LogiX TimescaleDB 清理脚本
REM LogiX TimescaleDB Cleanup Script
REM WARNING: This will delete all data!
REM ============================================

echo.
echo ========================================
echo WARNING: This will delete all data!
echo ========================================
echo.

set /p confirm="Are you sure you want to delete all TimescaleDB data? (yes/no): "
if /i not "%confirm%"=="yes" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo [1/5] Stopping services...
docker-compose -f docker-compose.timescaledb.yml down

echo.
echo [2/5] Removing containers...
docker-compose -f docker-compose.timescaledb.yml rm -f

echo.
echo [3/5] Removing volumes...
docker volume rm logix_timescaledb-dev_data 2>nul
docker volume rm logix_redis_dev_data 2>nul
docker volume rm logix_prometheus_data 2>nul
docker volume rm logix_grafana_data 2>nul

echo.
echo [4/5] Removing networks...
docker network rm logix-timescaledb-network 2>nul

echo.
echo [5/5] Cleanup complete!

echo.
echo ========================================
echo All TimescaleDB data has been deleted!
echo ========================================
echo.
echo To start fresh, run: tsdb-start.bat
echo.
pause
