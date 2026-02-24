@echo off
echo ========================================
echo   LogiX 开发环境 - 停止服务
echo   Stop LogiX Development Environment
echo ========================================
echo.

echo [1/3] 停止数据库管理工具...
docker-compose -f docker-compose.admin-tools.yml down

echo [2/3] 停止数据库服务...
docker-compose -f docker-compose.timescaledb.prod.yml down

echo [3/3] 关闭开发服务器窗口...
taskkill /F /IM node.exe 2>nul

echo.
echo ========================================
echo   ✅ 所有服务已停止!
echo   All Services Stopped!
echo ========================================
echo.
echo 📝 提示:
echo   - Docker 容器已停止
echo   - Node.js 进程已关闭
echo   - 数据库数据已保留 (volumes)
echo.
pause
