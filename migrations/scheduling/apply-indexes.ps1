# ============================================================
# 智能排产性能优化 - 索引创建脚本
# Scheduling Performance Optimization - Index Creation Script
# ============================================================

param(
    [string]$DatabaseHost = "localhost",
    [string]$DatabasePort = "5432",
    [string]$DatabaseName = "logix",
    [string]$DatabaseUser = "postgres",
    [switch]$SkipStats = $false,
    [switch]$VerifyOnly = $false
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  智能排产性能优化 - 索引创建工具" -ForegroundColor Cyan
Write-Host "  Scheduling Performance Optimization Tool" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 检查 psql 是否安装
try {
    $psqlVersion = psql --version 2>&1
    Write-Host "[OK] psql 已安装：$psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] psql 未安装，请确保 PostgreSQL 已正确安装并添加到 PATH" -ForegroundColor Red
    Write-Host "提示：可以从 https://www.postgresql.org/download/windows/ 下载" -ForegroundColor Yellow
    exit 1
}

# 测试数据库连接
Write-Host "`n[1/3] 测试数据库连接..." -ForegroundColor Yellow
$testConnection = psql -h $DatabaseHost -p $DatabasePort -U $DatabaseUser -d $DatabaseName -c "SELECT 1" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "[FAIL] 数据库连接失败！" -ForegroundColor Red
    Write-Host "错误信息：$testConnection" -ForegroundColor Red
    Write-Host ""
    Write-Host "请检查:" -ForegroundColor Yellow
    Write-Host "  1. PostgreSQL 服务是否启动" -ForegroundColor Yellow
    Write-Host "  2. 数据库名称是否正确 ($DatabaseName)" -ForegroundColor Yellow
    Write-Host "  3. 用户名密码是否正确" -ForegroundColor Yellow
    Write-Host "  4. 防火墙设置" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "[OK] 数据库连接成功" -ForegroundColor Green
}

if ($VerifyOnly) {
    # 仅验证模式 - 检查现有索引
    Write-Host "`n[验证模式] 检查现有索引..." -ForegroundColor Yellow
    $indexCheck = psql -h $DatabaseHost -p $DatabasePort -U $DatabaseUser -d $DatabaseName -c @"
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
  AND (tablename LIKE '%container%' OR tablename LIKE '%port%' OR tablename LIKE '%trucking%')
ORDER BY tablename, indexname;
"@
    
    Write-Host $indexCheck
    Write-Host "`n[完成] 验证完成" -ForegroundColor Green
    exit 0
}

# 执行索引创建脚本
Write-Host "`n[2/3] 执行索引创建脚本..." -ForegroundColor Yellow
$scriptPath = Join-Path $PSScriptRoot "add_scheduling_performance_indexes.sql"

if (-not (Test-Path $scriptPath)) {
    Write-Host "[ERROR] 找不到 SQL 脚本文件：$scriptPath" -ForegroundColor Red
    exit 1
}

Write-Host "SQL 脚本路径：$scriptPath" -ForegroundColor Cyan

# 读取并执行 SQL 脚本
$sqlContent = Get-Content $scriptPath -Raw
Write-Host "SQL 脚本大小：$($sqlContent.Length) 字节" -ForegroundColor Cyan

# 分割 SQL 语句（按分号分隔）
$sqlStatements = $sqlContent -split ';' | Where-Object { $_.Trim() -ne -and -not $_.Trim().StartsWith('--') }

$totalStatements = $sqlStatements.Count
$currentStatement = 0
$successCount = 0
$errorCount = 0

foreach ($statement in $sqlStatements) {
    $statement = $statement.Trim()
    if ($statement -eq '' -or $statement.StartsWith('--')) {
        continue
    }
    
    $currentStatement++
    $percentComplete = [math]::Round(($currentStatement / $totalStatements) * 100, 2)
    
    Write-Progress -Activity "创建索引" `
                   -Status "$percentComplete% 完成 ($currentStatement/$totalStatements)" `
                   -PercentComplete $percentComplete `
                   -CurrentOperation "执行语句 #$currentStatement"
    
    # 执行 SQL 语句
    $result = $statement | psql -h $DatabaseHost -p $DatabasePort -U $DatabaseUser -d $DatabaseName 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        $successCount++
        if ($result -match 'CREATE INDEX|DO') {
            Write-Host "[OK] 语句 #$currentStatement 执行成功" -ForegroundColor Green
        }
    } else {
        # 忽略已存在的索引错误
        if ($result -match 'already exists') {
            Write-Host "[SKIP] 索引已存在：语句 #$currentStatement" -ForegroundColor Yellow
            $successCount++
        } else {
            Write-Host "[ERROR] 语句 #$currentStatement 执行失败" -ForegroundColor Red
            Write-Host "错误：$result" -ForegroundColor Red
            $errorCount++
        }
    }
}

Write-Progress -Activity "创建索引" -Completed

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  索引创建完成统计" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "总语句数：$totalStatements" -ForegroundColor White
Write-Host "成功：$successCount" -ForegroundColor Green
Write-Host "失败：$errorCount" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

# 更新统计信息
if (-not $SkipStats) {
    Write-Host "`n[3/3] 更新数据库统计信息..." -ForegroundColor Yellow
    
    $tables = @(
        'biz_containers',
        'process_port_operations',
        'biz_replenishment_orders',
        'biz_customers',
        'process_trucking_transport',
        'dict_warehouse_trucking_mapping',
        'dict_trucking_port_mapping',
        'dict_warehouses',
        'dict_trucking_companies',
        'dict_countries'
    )
    
    foreach ($table in $tables) {
        Write-Host "  ANALYZE $table..." -NoNewline
        $result = psql -h $DatabaseHost -p $DatabasePort -U $DatabaseUser -d $DatabaseName -c "ANALYZE $table" 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host " [OK]" -ForegroundColor Green
        } else {
            Write-Host " [FAIL]" -ForegroundColor Red
        }
    }
    
    Write-Host "`n[OK] 统计信息更新完成" -ForegroundColor Green
}

# 验证索引
Write-Host "`n[验证] 检查新创建的索引..." -ForegroundColor Yellow
$verificationQuery = @"
SELECT 
    tablename,
    indexname,
    CASE 
        WHEN indexdef LIKE '%schedule_status%' THEN '货柜状态'
        WHEN indexdef LIKE '%container_number%' AND indexdef LIKE '%port%' THEN '货柜港口关联'
        WHEN indexdef LIKE '%replenishment%' THEN '补货订单'
        WHEN indexdef LIKE '%customer%' AND indexdef LIKE '%country%' THEN '客户国家'
        WHEN indexdef LIKE '%port_ops%' THEN '港口操作'
        WHEN indexdef LIKE '%trucking%' AND indexdef LIKE '%pickup%' THEN '拖卡运输'
        WHEN indexdef LIKE '%warehouse_trucking%' THEN '仓库车队映射'
        WHEN indexdef LIKE '%trucking_port%' THEN '车队港口映射'
        ELSE '其他'
    END as index_type
FROM pg_indexes
WHERE indexname LIKE 'idx_%scheduling%' 
   OR indexname LIKE 'idx_%containers%'
   OR indexname LIKE 'idx_%port_ops%'
   OR indexname LIKE 'idx_%trucking%'
   OR indexname LIKE 'idx_%warehouse_trucking%'
ORDER BY tablename, indexname;
"@

psql -h $DatabaseHost -p $DatabasePort -U $DatabaseUser -d $DatabaseName -c $verificationQuery

Write-Host "`n================================================" -ForegroundColor Cyan
Write-Host "  执行完成！" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步操作:" -ForegroundColor Yellow
Write-Host "  1. 重启后端服务：cd backend && npm run dev" -ForegroundColor Cyan
Write-Host "  2. 测试 API 性能：访问智能排产页面" -ForegroundColor Cyan
Write-Host "  3. 查看慢查询日志（可选）：" -ForegroundColor Cyan
Write-Host "     SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;" -ForegroundColor Gray
Write-Host ""
Write-Host "文档参考：migrations/scheduling/README-scheduling-performance.md" -ForegroundColor Cyan
Write-Host ""
