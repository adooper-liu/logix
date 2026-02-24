@echo off
REM ============================================
REM LogiX TimescaleDB 开发环境启动脚本
REM LogiX TimescaleDB Development Environment Startup Script
REM ============================================

echo.
echo ========================================
echo LogiX TimescaleDB Development
echo ========================================
echo.

REM 检查 Docker Desktop 是否运行
echo [1/4] Checking Docker Desktop status...
docker version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker Desktop is not running!
    echo Please start Docker Desktop first.
    pause
    exit /b 1
)
echo [OK] Docker Desktop is running
echo.

REM 停止现有服务
echo [2/4] Stopping existing services...
docker-compose -f docker-compose.timescaledb.yml down 2>nul
echo [OK] Services stopped
echo.

REM 启动 TimescaleDB 开发环境
echo [3/4] Starting TimescaleDB development environment...
docker-compose -f docker-compose.timescaledb.yml up -d
if %errorlevel% neq 0 (
    echo ERROR: Failed to start TimescaleDB environment!
    pause
    exit /b 1
)
echo [OK] Services started
echo.

REM 等待服务启动
echo [4/4] Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM 检查服务状态
echo.
echo Checking service status...
docker-compose -f docker-compose.timescaledb.yml ps

echo.
echo ========================================
echo TimescaleDB Dev Environment Ready!
echo ========================================
echo.
echo Services:
echo   - TimescaleDB:    http://localhost:5432
echo   - Backend API:   http://localhost:3001
echo   - Redis:         localhost:6379
echo   - Prometheus:     http://localhost:9090
echo   - Grafana:       http://localhost:3000 (admin/admin)
echo.
echo Backend Debugger:  http://localhost:9229
echo.
echo To view TimescaleDB logs:
echo   docker-compose -f docker-compose.timescaledb.yml logs -f postgres
echo.
echo To access TimescaleDB CLI:
echo   docker exec -it logix-timescaledb-dev psql -U postgres -d logix_db
echo.
echo To check TimescaleDB version:
echo   docker exec -it logix-timescaledb-dev psql -U postgres -d logix_db -c "SELECT extversion FROM pg_extension WHERE extname='timescaledb';"
echo.
pause
