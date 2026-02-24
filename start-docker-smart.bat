@echo off
echo Starting Docker Desktop...
start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo Waiting for Docker daemon to be ready...
:waitloop
docker info >nul 2>&1
if %errorlevel% equ 0 (
    echo Docker is ready!
    goto :startcontainers
)
timeout /t 2 /nobreak >nul
goto :waitloop

:startcontainers
echo Starting containers...
docker-compose -f docker-compose.timescaledb.prod.yml --env-file .env up -d postgres redis

echo Done!
pause
