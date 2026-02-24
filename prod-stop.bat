@echo off
REM LogiX Production Environment Stop Script (Windows)

echo ===================================
echo LogiX Production Environment
echo ===================================
echo.

echo [1/2] Stopping services...
docker-compose -f docker-compose.timescaledb.prod.yml down

if %errorlevel% neq 0 (
    echo [ERROR] Failed to stop
    pause
    exit /b 1
)

echo.
echo [2/2] Checking status...
docker-compose -f docker-compose.timescaledb.prod.yml ps

echo.
echo ===================================
echo Production environment stopped!
echo ===================================
echo.
pause
