# ============================================================
# LogiX 后端日志查看脚本
# ============================================================
# 用途：实时查看后端服务日志（支持关键字过滤）
# 用法：.\scripts\view-backend-logs.ps1 [-Keyword "pickupFreeDays"]
# ============================================================

param(
    [string]$Keyword = "",
    [int]$Lines = 200
)

$ErrorActionPreference = "Stop"

# 切换到 backend 目录
Push-Location $PSScriptRoot\..\backend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LogiX 后端日志查看器" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($Keyword) {
    Write-Host "🔍 搜索关键字：$Keyword" -ForegroundColor Yellow
    Write-Host "📄 显示行数：$Lines" -ForegroundColor Yellow
    Write-Host ""
    
    # 实时跟踪日志并搜索关键字
    Get-Content "logs\*.log" -Tail $Lines -Wait | ForEach-Object {
        if ($_ -match [regex]::Escape($Keyword)) {
            Write-Host $_ -ForegroundColor Green
        }
    }
} else {
    Write-Host "📄 显示最新的 $Lines 行日志" -ForegroundColor Yellow
    Write-Host "按 Ctrl+C 停止跟踪" -ForegroundColor Gray
    Write-Host ""
    
    # 实时跟踪日志
    Get-Content "logs\*.log" -Tail $Lines -Wait
}

Pop-Location
