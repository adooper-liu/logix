@echo off
REM LogiX Production Environment Startup Script (Windows)

echo ===================================
echo LogiX Production Environment
echo ===================================
echo.

REM Check env file
if not exist .env (
    echo [ERROR] .env file not found
    echo.
    echo Please create .env file first:
    echo   copy .env.example .env
    echo   Then edit .env and fill in your actual configuration
    echo.
    pause
    exit /b 1
)

REM Check Docker
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker not installed or not running
    pause
    exit /b 1
)

echo [1/3] Building and starting production services...
docker-compose -f docker-compose.timescaledb.prod.yml --env-file .env up -d --build

if %errorlevel% neq 0 (
    echo [ERROR] Failed to start
    pause
    exit /b 1
)

echo.
echo [2/3] Waiting for services...
timeout /t 15 /nobreak >nul

echo.
echo [3/3] Checking status...
docker-compose -f docker-compose.timescaledb.prod.yml ps

echo.
echo ===================================
echo Production environment is ready!
echo ===================================
echo.
echo Backend API: http://localhost:3001
echo Grafana:     http://localhost:3000 (admin/admin)
echo Prometheus:  http://localhost:9090
echo.
echo Common commands:
echo   View logs:     prod-logs.bat
echo   Stop services: prod-stop.bat
echo   Test env:      test-docker.ps1
echo.
pause
