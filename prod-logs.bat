@echo off
REM LogiX Production Environment Logs Script (Windows)

echo ===================================
echo LogiX Production Environment Logs
echo ===================================
echo Press Ctrl+C to exit
echo.

docker-compose -f docker-compose.timescaledb.prod.yml logs -f backend
