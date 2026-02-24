@echo off
chcp 65001 >nul
echo ========================================
echo   LogiX Development Environment
echo ========================================
echo.

REM Check Docker status
echo [1/5] Checking Docker status...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo   [X] Docker not running
    echo   Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

    echo   Waiting for Docker to start...
    :waitdocker
    docker info >nul 2>&1
    if %errorlevel% equ 0 (
        echo   [OK] Docker ready
        goto :startdb
    )
    timeout /t 2 /nobreak >nul
    goto :waitdocker
) else (
    echo   [OK] Docker running
)

:startdb
echo.
echo [2/5] Starting database services...
docker-compose -f docker-compose.timescaledb.prod.yml --env-file .env up -d postgres redis

REM Wait for database
echo   Waiting for database initialization...
timeout /t 10 /nobreak >nul

:starttools
echo.
echo [3/5] Starting database tools...
docker-compose -f docker-compose.timescaledb.prod.yml -f docker-compose.admin-tools.yml --env-file .env up -d adminer pgadmin

:startbackend
echo.
echo [4/5] Starting backend service...
cd backend
start "LogiX Backend" npm run dev
cd ..

:startfrontend
echo.
echo [5/5] Starting frontend service...
cd frontend
start "LogiX Frontend" npm run dev
cd ..

:done
echo.
echo ========================================
echo   [OK] All services started!
echo ========================================
echo.
echo Service Access URLs:
echo.
echo   Database Services:
echo     TimescaleDB:  localhost:5432
echo     Redis:       localhost:6379
echo.
echo   Management Tools:
echo     Adminer:     http://localhost:8080
echo     pgAdmin:     http://localhost:5050
echo.
echo   Application Services:
echo     Frontend:     http://localhost:5173
echo     Backend:      http://localhost:3001
echo.
echo Notes:
echo   - Frontend and backend run in separate windows
echo   - Database tools require first-time login setup
echo   - To stop services, run stop-logix-dev.bat
echo.
pause
