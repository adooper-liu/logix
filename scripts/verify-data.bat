@echo off
REM LogiX 数据验证脚本 - Windows批处理版本
REM 用途：验证Excel导入数据与数据库数据的一致性

setlocal enabledelayedexpansion

REM 默认值（可以通过命令行参数覆盖）
set ORDER_NUMBER=24DSC4914
set CONTAINER_NUMBER=FANU3376528
set BILL_OF_LADING=HLCUNG12501WPWJ9
set CONTAINER_NAME=logix-timescaledb-prod

REM 解析命令行参数
if "%~1" neq "" set ORDER_NUMBER=%~1
if "%~2" neq "" set CONTAINER_NUMBER=%~2
if "%~3" neq "" set BILL_OF_LADING=%~3

echo ==========================================
echo 数据验证脚本
echo ==========================================
echo 备货单号: %ORDER_NUMBER%
echo 货柜号: %CONTAINER_NUMBER%
echo 提单号: %BILL_OF_LADING%
echo ==========================================
echo.

REM 检查容器是否运行
docker ps --filter "name=%CONTAINER_NAME%" --format "{{.Status}}" | findstr "Up" >nul
if %errorlevel% neq 0 (
    echo 错误: 容器 %CONTAINER_NAME% 未运行!
    exit /b 1
)

echo 正在执行验证...
echo.

REM 创建临时SQL文件
set TEMP_SQL=%TEMP%\verify_%RANDOM%.sql
copy /b "%~dp0verify_excel_data_consistency.sql" "%TEMP_SQL%" >nul

REM 执行验证
docker exec -i %CONTAINER_NAME% psql -U logix_user -d logix_db -v order_number="'%ORDER_NUMBER%'" -v container_number="'%CONTAINER_NUMBER%'" -v bill_of_lading="'%BILL_OF_LADING%'" -f /dev/stdin < "%TEMP_SQL%"

REM 清理临时文件
del "%TEMP_SQL%" >nul 2>&1

echo.
echo ==========================================
echo 验证完成!
echo ==========================================

endlocal
