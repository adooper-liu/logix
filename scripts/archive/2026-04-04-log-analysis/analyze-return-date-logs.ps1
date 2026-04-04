# =====================================================
# 还箱日计算算法 - 日志分析脚本 (PowerShell 版本)
# =====================================================
# 用途：分析排产日志中的还箱日计算情况
# 使用场景：开发环境、生产环境
# =====================================================

param(
    [string]$LogFile = "backend/logs/combined.log",
    [switch]$Export
)

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "📊 还箱日计算算法 - 日志分析" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 检查日志文件是否存在
if (-not (Test-Path $LogFile)) {
    Write-Host "❌ 错误：日志文件不存在：$LogFile" -ForegroundColor Red
    Write-Host "提示：请指定正确的日志文件路径"
    Write-Host "用法：.\analyze-return-date-logs.ps1 [-LogFile <路径>] [-Export]"
    exit 1
}

# 创建输出目录
$outputDir = "backend/logs/analysis"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# ============================================
# 1. 基础统计
# ============================================
Write-Host "📈 基础统计" -ForegroundColor Blue
Write-Host "-----------------------------------------"

$content = Get-Content $LogFile -Raw

# Step 1 成功次数（当天还箱）
$step1Count = ([regex]::Matches($content, '\[ReturnDateCalc\] ✅ Step 1 passed')).Count
Write-Host "Step 1 成功 (当天还箱): $($step1Count)" -ForegroundColor Green

# Step 2 成功次数（次日还箱）
$step2Count = ([regex]::Matches($content, '\[ReturnDateCalc\] ✅ Step 2 passed')).Count
Write-Host "Step 2 成功 (次日还箱): $($step2Count)" -ForegroundColor Yellow

# Step 3 成功次数（顺延还箱）
$step3Count = ([regex]::Matches($content, '\[ReturnDateCalc\] ✅ Step 3 passed')).Count
Write-Host "Step 3 成功 (顺延还箱): $($step3Count)" -ForegroundColor Red

# 总成功次数
$totalSuccess = $step1Count + $step2Count + $step3Count
Write-Host ""
Write-Host "总成功次数：$($totalSuccess)" -ForegroundColor Blue

# 计算百分比
if ($totalSuccess -gt 0) {
    $step1Pct = [math]::Round($step1Count * 100 / $totalSuccess, 2)
    $step2Pct = [math]::Round($step2Count * 100 / $totalSuccess, 2)
    $step3Pct = [math]::Round($step3Count * 100 / $totalSuccess, 2)
    
    Write-Host ""
    Write-Host "分布比例:"
    Write-Host "  Step 1: $($step1Pct)% (最优解)" -ForegroundColor Green
    Write-Host "  Step 2: $($step2Pct)% (标准 Drop off)" -ForegroundColor Yellow
    Write-Host "  Step 3: $($step3Pct)% (能力不足)" -ForegroundColor Red
}

Write-Host ""
Write-Host "-----------------------------------------"

# ============================================
# 2. Live load 模式调整统计
# ============================================
Write-Host "🔄 Live load 模式调整统计" -ForegroundColor Blue
Write-Host "-----------------------------------------"

$liveLoadAdjust = ([regex]::Matches($content, 'Adjusted unload date.*due to return capacity')).Count
Write-Host "卸柜日调整次数：$($liveLoadAdjust)" -ForegroundColor Yellow

Write-Host ""
Write-Host "-----------------------------------------"

# ============================================
# 3. 性能统计（如果有性能日志）
# ============================================
Write-Host "⏱️  性能统计" -ForegroundColor Blue
Write-Host "-----------------------------------------"

$perfLogs = Select-String -Path $LogFile -Pattern '\[Performance\] findEarliestAvailableReturnDate' | Select-Object -ExpandProperty Line

if ($perfLogs) {
    # 提取耗时数据
    $durations = $perfLogs | ForEach-Object {
        if ($_ -match '(\d+)ms') {
            [int]$matches[1]
        }
    }
    
    if ($durations) {
        $count = $durations.Count
        $sum = ($durations | Measure-Object -Sum).Sum
        $avg = [math]::Round($sum / $count, 2)
        $max = ($durations | Measure-Object -Maximum).Maximum
        $min = ($durations | Measure-Object -Minimum).Minimum
        
        Write-Host "查询次数：$count"
        Write-Host "平均耗时：${avg}ms"
        Write-Host "最大耗时：${max}ms"
        Write-Host "最小耗时：${min}ms"
        Write-Host "总耗时：${sum}ms"
    } else {
        Write-Host "未找到耗时数据"
    }
} else {
    Write-Host "未启用性能监控日志"
}

Write-Host ""
Write-Host "-----------------------------------------"

# ============================================
# 4. 最近 10 条详细日志
# ============================================
Write-Host "📋 最近 10 条详细日志" -ForegroundColor Blue
Write-Host "-----------------------------------------"

Select-String -Path $LogFile -Pattern '\[ReturnDateCalc\]' | 
    Select-Object -Last 10 | 
    ForEach-Object { Write-Host $_.Line }

Write-Host ""
Write-Host "-----------------------------------------"

# ============================================
# 5. 异常情况分析
# ============================================
Write-Host "⚠️  异常情况检测" -ForegroundColor Red
Write-Host "-----------------------------------------"

$failures = Select-String -Path $LogFile -Pattern 'return date calculation.*fail|failed to calculate return date' -CaseSensitive:$false

if ($failures) {
    $failureCount = $failures.Count
    Write-Host "发现 $failureCount 条失败记录:" -ForegroundColor Red
    $failures | Select-Object -Last 5 | ForEach-Object { Write-Host $_.Line }
} else {
    Write-Host "✅ 未发现异常情况" -ForegroundColor Green
}

Write-Host ""
Write-Host "-----------------------------------------"

# ============================================
# 6. 生成分析报告
# ============================================
$reportFile = "$outputDir/return-date-analysis-$(Get-Date -Format 'yyyyMMdd-HHmmss').md"

$reportContent = @"
# 还箱日计算算法 - 日志分析报告

**生成时间**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  
**日志文件**: $LogFile  

## 基础统计

| 指标 | 数值 | 说明 |
|------|------|------|
| Step 1 成功 | $step1Count | 当天还箱（最优解） |
| Step 2 成功 | $step2Count | 次日还箱（标准 Drop off） |
| Step 3 成功 | $step3Count | 顺延还箱（能力不足） |
| **总计** | **$totalSuccess** | 所有成功计算 |

## 分布比例

- Step 1: ${step1Pct}% (最优解)
- Step 2: ${step2Pct}% (标准 Drop off)
- Step 3: ${step3Pct}% (能力不足)

## Live load 模式调整

- 卸柜日调整次数：$liveLoadAdjust

## 性能统计

$(if ($durations) {
@"
| 指标 | 数值 |
|------|------|
| 查询次数 | $count |
| 平均耗时 | ${avg}ms |
| 最大耗时 | ${max}ms |
| 最小耗时 | ${min}ms |
| 总耗时 | ${sum}ms |
"@
} else {
"未启用性能监控日志"
})

## 异常情况

$(if ($failures) {
"⚠️ 发现 $failureCount 条失败记录，详见上方详情"
} else {
"✅ 未发现异常情况"
})

## 建议

$(if ($step3Pct -gt 30) {
@"
⚠️ Step 3 占比较高 ($($step3Pct)%),建议：
1. 检查车队还箱能力配置
2. 考虑增加车队数量
3. 优化排产策略
"@
} elseif ($step1Pct -gt 70) {
"✅ Step 1 占比很高 ($($step1Pct)%)，算法运行良好！"
} else {
"算法运行正常，继续观察。"
})

---
*报告由 analyze-return-date-logs.ps1 自动生成*
"@

Set-Content -Path $reportFile -Value $reportContent

Write-Host "📄 分析报告已生成:" -ForegroundColor Blue
Write-Host $reportFile
Write-Host ""

# ============================================
# 7. 导出详细数据（可选）
# ============================================
if ($Export) {
    $detailedFile = "$outputDir/detailed-logs-$(Get-Date -Format 'yyyyMMdd-HHmmss').csv"
    
    "timestamp,container,type,message" | Set-Content -Path $detailedFile
    
    Select-String -Path $LogFile -Pattern '\[ReturnDateCalc\]' | 
        Select-Object -ExpandProperty Line |
        ForEach-Object {
            $line = $_
            $timestamp = if ($line -match '\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}') { $matches[0] } else { "" }
            $container = if ($line -match 'container[:=] ?([A-Z0-9]+)') { $matches[1] } else { "" }
            $type = if ($line -match '(Step [123]|Live load)') { $matches[1] } else { "" }
            $message = $line -replace ',', ';' | Select-Object -First 1 -Skip 0 | ForEach-Object { $_.Substring(0, [Math]::Min(200, $_.Length)) }
            
            "$timestamp,$container,$type,$message" | Add-Content -Path $detailedFile
        }
    
    Write-Host "📊 详细数据已导出:" -ForegroundColor Blue
    Write-Host $detailedFile
    Write-Host ""
}

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ 分析完成" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 显示使用说明
Write-Host "💡 使用提示:" -ForegroundColor Yellow
Write-Host ""
Write-Host "# 分析默认日志文件"
Write-Host ".\scripts\analyze-return-date-logs.ps1"
Write-Host ""
Write-Host "# 分析指定日志文件"
Write-Host ".\scripts\analyze-return-date-logs.ps1 -LogFile .\path\to\logfile.log"
Write-Host ""
Write-Host "# 导出详细数据"
Write-Host ".\scripts\analyze-return-date-logs.ps1 -Export"
Write-Host ""
Write-Host "# 查看历史报告"
Write-Host "Get-ChildItem backend/logs/analysis/"
Write-Host ""
