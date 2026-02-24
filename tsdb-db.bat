@echo off
REM ============================================
REM LogiX TimescaleDB 数据库连接脚本
REM LogiX TimescaleDB Database Connection Script
REM ============================================

echo.
echo ========================================
echo TimescaleDB Database Connection
echo ========================================
echo.

REM 检查容器是否运行
docker ps --filter "name=logix-timescaledb-dev" --format "{{.Names}}" | findstr "logix-timescaledb-dev" >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: TimescaleDB container is not running!
    echo Please run tsdb-start.bat first.
    pause
    exit /b 1
)

echo [OK] TimescaleDB container is running
echo.
echo Connecting to TimescaleDB...
echo.
echo ========================================
echo TimescaleDB Command Line Interface
echo ========================================
echo.
echo Useful commands:
echo   \l                     - List all databases
echo   \dt                    - List all tables
echo   \d table_name          - Describe table structure
echo   SELECT version();      - Show PostgreSQL version
echo   SELECT extversion FROM pg_extension WHERE extname='timescaledb'; - Show TimescaleDB version
echo   \dx                    - List all extensions
echo   \q                     - Quit
echo.
echo TimescaleDB specific commands:
echo   SELECT * FROM timescaledb_information.hypertables; - List hypertables
echo   SELECT * FROM timescaledb_information.continuous_aggregates; - List continuous aggregates
echo.
echo ========================================
echo.

docker exec -it logix-timescaledb-dev psql -U postgres -d logix_db

echo.
echo ========================================
echo Disconnected from TimescaleDB
echo ========================================
echo.
pause
