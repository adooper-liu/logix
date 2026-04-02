@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ============================================================
:: 智能排产性能优化 - 快速执行脚本 (Windows CMD)
:: Scheduling Performance Optimization - Quick Fix Script
:: ============================================================

echo ============================================================
echo   智能排产性能优化 - 快速修复工具
echo   Scheduling Performance Optimization Tool
echo ============================================================
echo.

:: 检查 psql 是否可用
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] psql 未找到！请确保 PostgreSQL 已安装并添加到 PATH
    echo.
    echo 提示：
    echo   1. 从 https://www.postgresql.org/download/windows/ 下载安装
    echo   2. 或者设置 PGHOME 环境变量
    echo.
    pause
    exit /b 1
)

echo [OK] psql 已检测到
echo.

:: 设置数据库连接参数（可根据需要修改）
set DB_HOST=localhost
set DB_PORT=5432
set DB_NAME=logix
set DB_USER=postgres

echo 数据库连接信息:
echo   主机：%DB_HOST%:%DB_PORT%
echo   数据库：%DB_NAME%
echo   用户：%DB_USER%
echo.

:: 测试数据库连接
echo [1/4] 测试数据库连接...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 1" >nul 2>&1
if %errorlevel% neq 0 (
    echo [失败] 无法连接到数据库！
    echo.
    echo 请检查:
    echo   1. PostgreSQL 服务是否启动
    echo   2. 数据库名称是否正确 (%DB_NAME%)
    echo   3. 用户名密码是否正确
    echo   4. pg_hba.conf 配置是否允许连接
    echo.
    pause
    exit /b 1
)
echo [成功] 数据库连接正常
echo.

:: 执行索引创建脚本
echo [2/4] 执行索引创建脚本...
set SCRIPT_DIR=%~dp0
set SQL_FILE=%SCRIPT_DIR%add_scheduling_performance_indexes.sql

if not exist "%SQL_FILE%" (
    echo [错误] 找不到 SQL 文件：%SQL_FILE%
    echo.
    pause
    exit /b 1
)

echo SQL 文件：%SQL_FILE%
echo.
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%SQL_FILE%"
if %errorlevel% neq 0 (
    echo [警告] 索引创建过程中出现错误（忽略已存在的索引）
)
echo.

:: 更新统计信息
echo [3/4] 更新数据库统计信息...
echo.

set TABLES=biz_containers process_port_operations biz_replenishment_orders biz_customers process_trucking_transport dict_warehouse_trucking_mapping dict_trucking_port_mapping dict_warehouses dict_trucking_companies dict_countries

for %%t in (%TABLES%) do (
    set /p "=  ANALYZE %%t..." <nul
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "ANALYZE %%t" >nul 2>&1
    if %errorlevel% equ 0 (
        echo [OK]
    ) else (
        echo [FAIL]
    )
)

echo.
echo [完成] 统计信息更新完成
echo.

:: 验证索引
echo [4/4] 验证新创建的索引...
echo.
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT indexname, tablename FROM pg_indexes WHERE indexname LIKE 'idx_%%scheduling%%' OR indexname LIKE 'idx_%%containers%%' OR indexname LIKE 'idx_%%port_ops%%' ORDER BY tablename, indexname;"
echo.

:: 显示汇总
echo ============================================================
echo   修复完成！
echo ============================================================
echo.
echo 下一步操作:
echo   1. 重启后端服务：cd ..\.. ^&^& cd backend ^&^& npm run dev
echo   2. 测试 API: 访问 http://localhost:3001
echo   3. 查看详细文档：README-scheduling-performance.md
echo.
echo 如果需要回滚索引，执行:
echo   psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "DROP INDEX IF EXISTS idx_containers_schedule_status; DROP INDEX IF EXISTS idx_containers_number; ..."
echo.
pause
