# ============================================================
# 智能排产 API 性能测试脚本
# Scheduling API Performance Test Script
# ============================================================

param(
    [string]$ApiBaseUrl = "http://localhost:3001/api/v1",
    [switch]$Detailed = $false
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  智能排产 API 性能测试" -ForegroundColor Cyan
Write-Host "  Scheduling API Performance Test" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "API 基址：$ApiBaseUrl" -ForegroundColor Cyan
Write-Host ""

# 测试函数
function Test-ApiPerformance {
    param(
        [string]$Name,
        [string]$Url,
        [string]$Method = "GET",
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    Write-Host "`n[测试] $Name" -ForegroundColor Yellow
    Write-Host "URL: $Url" -ForegroundColor Gray
    
    try {
        # 第一次请求（预热）
        if ($Method -eq "GET") {
            $null = Invoke-RestMethod -Uri $Url -Method GET -Headers $Headers -ErrorAction Stop
        } else {
            $null = Invoke-RestMethod -Uri $Url -Method POST -Headers $Headers -Body $Body -ErrorAction Stop
        }
        
        # 第二次请求（计时）
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        if ($Method -eq "GET") {
            $response = Invoke-RestMethod -Uri $Url -Method GET -Headers $Headers
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method POST -Headers $Headers -Body $Body
        }
        
        $stopwatch.Stop()
        $elapsedMs = $stopwatch.ElapsedMilliseconds
        
        # 评估性能
        $status = "OK"
        $color = "Green"
        if ($elapsedMs -gt 3000) {
            $status = "SLOW"
            $color = "Red"
        } elseif ($elapsedMs -gt 1000) {
            $status = "WARNING"
            $color = "Yellow"
        }
        
        Write-Host "  响应时间：${elapsedMs}ms [$status]" -ForegroundColor $color
        
        if ($Detailed) {
            if ($response.success -ne $null) {
                Write-Host "  成功：$($response.success)" -ForegroundColor Cyan
            }
            if ($response.data -ne $null) {
                if ($response.data -is [array]) {
                    Write-Host "  数据条数：$($response.data.Count)" -ForegroundColor Cyan
                } elseif ($response.data -is [psobject]) {
                    Write-Host "  数据字段：$($response.data.PSObject.Properties.Name -join ', ')" -ForegroundColor Cyan
                }
            }
        }
        
        return @{
            Name = $Name
            ElapsedMs = $elapsedMs
            Status = $status
        }
        
    } catch {
        Write-Host "  [ERROR] $_" -ForegroundColor Red
        if ($Detailed) {
            Write-Host "  详细信息：$($_.Exception.Message)" -ForegroundColor Red
        }
        return @{
            Name = $Name
            ElapsedMs = -1
            Status = "ERROR"
        }
    }
}

# 收集测试结果
$results = @()

# 测试 1: Countries API
$results += Test-ApiPerformance -Name "Countries API (国家列表)" `
                               -Url "$ApiBaseUrl/countries"

# 测试 2: Scheduling Overview API (无参数)
$results += Test-ApiPerformance -Name "Scheduling Overview (无参数)" `
                               -Url "$ApiBaseUrl/scheduling/overview" `
                               -Detailed:$Detailed

# 测试 3: Scheduling Overview API (带国家参数)
$results += Test-ApiPerformance -Name "Scheduling Overview (country=IT)" `
                               -Url "$ApiBaseUrl/scheduling/overview?country=IT" `
                               -Detailed:$Detailed

# 测试 4: Scheduling Overview API (带日期范围)
$results += Test-ApiPerformance -Name "Scheduling Overview (日期范围)" `
                               -Url "$ApiBaseUrl/scheduling/overview?startDate=2026-01-01&endDate=2026-04-02" `
                               -Detailed:$Detailed

# 测试 5: Scheduling Overview API (完整参数)
$results += Test-ApiPerformance -Name "Scheduling Overview (完整参数)" `
                               -Url "$ApiBaseUrl/scheduling/overview?startDate=2026-01-01&endDate=2026-04-02&country=IT" `
                               -Detailed:$Detailed

# 显示汇总报告
Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  性能测试汇总报告" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$totalTests = $results.Count
$successTests = ($results | Where-Object { $_.Status -eq "OK" }).Count
$warningTests = ($results | Where-Object { $_.Status -eq "WARNING" }).Count
$slowTests = ($results | Where-Object { $_.Status -eq "SLOW" }).Count
$errorTests = ($results | Where-Object { $_.Status -eq "ERROR" }).Count

$avgTime = ($results | Where-Object { $_.ElapsedMs -gt 0 } | Measure-Object -Property ElapsedMs -Average).Average

Write-Host "总测试数：$totalTests" -ForegroundColor White
Write-Host "成功 (< 1s): $successTests" -ForegroundColor Green
Write-Host "警告 (1-3s): $warningTests" -ForegroundColor Yellow
Write-Host "缓慢 (> 3s): $slowTests" -ForegroundColor Red
Write-Host "错误：$errorTests" -ForegroundColor $(if ($errorTests -eq 0) { "Green" } else { "Red" })
Write-Host ""
Write-Host "平均响应时间：$([math]::Round($avgTime, 2))ms" -ForegroundColor Cyan
Write-Host ""

# 详细结果表
Write-Host "详细结果:" -ForegroundColor Cyan
Write-Host ""

$results | Format-Table -AutoSize @{
    Label = "测试项"
    Expression = { $_.Name }
}, @{
    Label = "响应时间 (ms)"
    Expression = { 
        if ($_.ElapsedMs -gt 0) { 
            [math]::Round($_.ElapsedMs, 2) 
        } else { 
            "N/A" 
        }
    }
    Alignment = "Right"
}, @{
    Label = "状态"
    Expression = { 
        switch ($_.Status) {
            "OK" { "[OK]" }
            "WARNING" { "[WARN]" }
            "SLOW" { "[SLOW]" }
            "ERROR" { "[FAIL]" }
        }
    }
    Width = 8
} | Out-String | Write-Host

# 性能评级
Write-Host "`n性能评级:" -ForegroundColor Cyan
if ($errorTests -gt 0) {
    Write-Host "  FAIL - 存在错误，需要修复" -ForegroundColor Red
} elseif ($slowTests -gt 0) {
    Write-Host "  POOR - 性能较差，建议优化" -ForegroundColor Red
} elseif ($warningTests -gt 0) {
    Write-Host "  FAIR - 性能一般，可以接受" -ForegroundColor Yellow
} else {
    Write-Host "  EXCELLENT - 性能优秀！" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 如果性能不达标，提供建议
if ($slowTests -gt 0 -or $errorTests -gt 0) {
    Write-Host "优化建议:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. 执行数据库索引迁移:" -ForegroundColor Cyan
    Write-Host "   cd migrations/scheduling" -ForegroundColor Gray
    Write-Host "   .\apply-indexes.ps1" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. 更新数据库统计信息:" -ForegroundColor Cyan
    Write-Host "   psql -U postgres -d logix -c 'ANALYZE;'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. 重启后端服务:" -ForegroundColor Cyan
    Write-Host "   cd backend" -ForegroundColor Gray
    Write-Host "   npm run dev" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. 查看详细文档:" -ForegroundColor Cyan
    Write-Host "   migrations/scheduling/README-scheduling-performance.md" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "测试完成！" -ForegroundColor Green
Write-Host ""
