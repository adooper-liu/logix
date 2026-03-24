# ============================================================
# LogiX 开发环境停止脚本
# ============================================================
# 用途：停止完整的开发环境（清理容器 + Node.js 进程）
# 层级：应用层（Layer 3 - Application Layer）
# 依赖：Docker Desktop、PowerShell
# ============================================================
# 使用场景：
#   - 结束一天工作
#   - 需要重启服务
#   - 系统资源不足时
# ============================================================
# 清理内容：
#   ✅ Docker 容器（数据库、监控、管理工具）
#   ✅ Node.js 进程（后端、前端、微服务）
#   ✅ 保留数据卷（volumes），不会丢失数据
# ============================================================
# 配套脚本：
#   - .\start-logix-dev.ps1       # 启动所有服务
#   - tsdb-stop.bat               # 仅停止数据库（基础设施层）
#   - prod-stop.bat               # 停止生产环境（服务层）
# ============================================================
# 快速命令：
#   .\stop-logix-dev.ps1          # 停止开发环境
#   make dev-down                 # Makefile 等价命令
# ============================================================

Write-Host "========================================"  -ForegroundColor Cyan
Write-Host "  LogiX 开发环境 - 停止服务"  -ForegroundColor Cyan
Write-Host "  Stop LogiX Development Environment"  -ForegroundColor Cyan
Write-Host "========================================"  -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] 停止数据库管理工具..." -ForegroundColor Yellow
docker-compose -f docker-compose.admin-tools.yml down 2>$null
if ($?) {
    Write-Host "  数据库管理工具已停止" -ForegroundColor Green
} else {
    Write-Host "  跳过：未运行或Docker未启动" -ForegroundColor Gray
}

Write-Host "[2/3] 停止数据库服务..." -ForegroundColor Yellow
docker-compose -f docker-compose.timescaledb.prod.yml down 2>$null
if ($?) {
    Write-Host "  数据库服务已停止" -ForegroundColor Green
} else {
    Write-Host "  跳过：未运行或Docker未启动" -ForegroundColor Gray
}

Write-Host "[3/3] 关闭Node.js进程..." -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Stop-Process -Name node -Force -ErrorAction SilentlyContinue
    Write-Host "  已停止 $($nodeProcesses.Count) 个Node.js进程" -ForegroundColor Green
} else {
    Write-Host "  未找到运行的Node.js进程" -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================"  -ForegroundColor Green
Write-Host "  所有服务已停止!"  -ForegroundColor Green
Write-Host "  All Services Stopped!"  -ForegroundColor Green
Write-Host "========================================"  -ForegroundColor Green
Write-Host ""
Write-Host "提示:" -ForegroundColor Cyan
Write-Host "  - Docker 容器已停止" -ForegroundColor White
Write-Host "  - Node.js 进程已关闭" -ForegroundColor White
Write-Host "  - 数据库数据已保留 (volumes)" -ForegroundColor White
Write-Host ""
