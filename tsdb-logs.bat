@echo off
REM ============================================
REM LogiX TimescaleDB 日志查看脚本
REM LogiX TimescaleDB Logs View Script
REM ============================================

echo.
echo ========================================
echo TimescaleDB Logs Viewer
echo ========================================
echo.

REM 显示使用说明
echo Usage:
echo   - View all logs:         tsdb-logs.bat
echo   - View PostgreSQL logs:  tsdb-logs.bat postgres
echo   - View Backend logs:     tsdb-logs.bat backend
echo   - View Redis logs:       tsdb-logs.bat redis
echo   - View Grafana logs:     tsdb-logs.bat grafana
echo.
echo Press Ctrl+C to stop viewing logs
echo ========================================
echo.

REM 检查是否指定了服务名称
if "%~1"=="" (
    echo Viewing all service logs...
    docker-compose -f docker-compose.timescaledb.yml logs -f
) else (
    echo Viewing logs for service: %1
    docker-compose -f docker-compose.timescaledb.yml logs -f %1
)

pause
