# ============================================================
# LogiX 快速诊断脚本
# ============================================================
# 用途：一键查看后端日志中的关键信息（免费天数、错误等）
# 用法：.\scripts\quick-diagnose.ps1
# ============================================================

$ErrorActionPreference = "Stop"

# 切换到 backend 目录
Push-Location $PSScriptRoot\..\backend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LogiX 快速诊断" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查日志文件是否存在
Write-Host "[1/4] 检查日志文件..." -ForegroundColor Yellow
$logFiles = Get-ChildItem "logs\*.log" -ErrorAction SilentlyContinue
if ($logFiles.Count -eq 0) {
    Write-Host "  ❌ 未找到日志文件" -ForegroundColor Red
    Pop-Location
    exit 1
} else {
    Write-Host "  ✅ 找到 $($logFiles.Count) 个日志文件" -ForegroundColor Green
}
Write-Host ""

# 2. 查看最近的错误
Write-Host "[2/4] 最近的错误日志（最后 10 条）:" -ForegroundColor Yellow
Get-Content "logs\*.log" -Tail 500 | Select-String -Pattern '"level":"error"' -Context 1 -Tail 10 | ForEach-Object {
    Write-Host "  $_" -ForegroundColor Red
}
Write-Host ""

# 3. 查看免费天数相关日志
Write-Host "[3/4] 免费天数相关日志:" -ForegroundColor Yellow
$pickupFreeDaysLogs = Get-Content "logs\*.log" -Tail 500 | Select-String -Pattern "pickupFreeDays|matched.*standards" -Context 2
if ($pickupFreeDaysLogs.Count -eq 0) {
    Write-Host "  ⚠️  未找到免费天数相关日志" -ForegroundColor Yellow
    Write-Host "  提示：可能后端未重新编译或没有执行排产" -ForegroundColor Gray
} else {
    $pickupFreeDaysLogs | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Green
    }
}
Write-Host ""

# 4. 查看 IntelligentScheduling 日志
Write-Host "[4/4] IntelligentScheduling 最近日志:" -ForegroundColor Yellow
$schedulingLogs = Get-Content "logs\*.log" -Tail 500 | Select-String -Pattern "IntelligentScheduling.*Starting|IntelligentScheduling.*Container" -Tail 20
if ($schedulingLogs.Count -eq 0) {
    Write-Host "  ⚠️  未找到排产相关日志" -ForegroundColor Yellow
} else {
    $schedulingLogs | ForEach-Object {
        Write-Host "  $_" -ForegroundColor Cyan
    }
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  诊断完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示:" -ForegroundColor Cyan
Write-Host "  - 查看详细日志：.\scripts\view-backend-logs.ps1 -Keyword 'pickupFreeDays'" -ForegroundColor White
Write-Host "  - 搜索日志：.\scripts\search-backend-logs.ps1 -Keyword '你的关键字'" -ForegroundColor White
Write-Host ""

Pop-Location
