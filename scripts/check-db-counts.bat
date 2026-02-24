@echo off
chcp 65001 >nul
echo ============================================
echo   LogiX 数据库记录统计
echo ============================================
echo.

set DB_USER=logix_user
set DB_NAME=logix_db

echo 【业务表】
echo.

for %%i in (biz_replenishment_orders biz_containers process_sea_freight process_port_operations process_trucking process_warehouse_operations process_empty_returns container_charges container_status_events container_loading_records container_hold_records) do (
    for /f "tokens=*" %%a in ('docker exec -i logix-timescaledb-prod psql -U %DB_USER% -d %DB_NAME% -t -c "SELECT COUNT(*) FROM %%i;" 2^>nul') do set count=%%a
    set count=!count: =!
    echo %%i : !count! 条
)

echo.
echo 查询完成！
pause
