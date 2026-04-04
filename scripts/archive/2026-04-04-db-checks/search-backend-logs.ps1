# ============================================================
# LogiX 后端日志搜索脚本
# ============================================================
# 用途：搜索后端日志中的特定内容（不实时跟踪）
# 用法：.\scripts\search-backend-logs.ps1 -Keyword "pickupFreeDays"
# ============================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$Keyword,
    
    [int]$Context = 2,
    [int]$MaxLines = 1000
)

$ErrorActionPreference = "Stop"

# 切换到 backend 目录
Push-Location $PSScriptRoot\..\backend

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LogiX 后端日志搜索" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 搜索关键字：$Keyword" -ForegroundColor Yellow
Write-Host "📄 上下文行数：$Context" -ForegroundColor Yellow
Write-Host ""

# 搜索日志
Get-Content "logs\*.log" -Tail $MaxLines | Select-String -Pattern $Keyword -Context $Context

Pop-Location
