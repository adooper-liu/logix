# ============================================================
# LogiX 数据库一键初始化脚本（自动化版本）
# ============================================================
# Description: 自动发现并执行所有迁移脚本，确保零遗漏
# Usage: .\reinit_database_docker_auto.ps1
# Features:
#   - 自动扫描 migrations/ 目录
#   - 智能分类执行（基础→业务→配置→修复）
#   - 完整验证报告
#   - 自动生成迁移清单
# ============================================================

$ErrorActionPreference = "Stop"

$CONTAINER_NAME = "logix-timescaledb-prod"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path  # backend/
$BACKEND_DIR = $SCRIPT_DIR                                      # backend/
$SQL_DIR = Join-Path $BACKEND_DIR "sql"                          # backend/sql/
$MIGRATIONS_DIR = Join-Path (Split-Path -Parent $SCRIPT_DIR) "migrations"  # migrations/
$REPORT_FILE = Join-Path $BACKEND_DIR "migration_execution_report.md"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LogiX Database Initialization (Auto)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 检查容器是否运行
$containerRunning = docker ps | Select-String $CONTAINER_NAME
if (-not $containerRunning) {
    Write-Host "Error: Container $CONTAINER_NAME is not running" -ForegroundColor Red
    Write-Host "Please start the container first with: docker start $CONTAINER_NAME" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Container $CONTAINER_NAME is running" -ForegroundColor Green

# ============================================================
# Helper Functions
# ============================================================

function Execute-SqlFile {
    param(
        [string]$ScriptPath,
        [string]$Category = "Unknown",
        [ref]$SuccessCount,
        [ref]$FailCount
    )
    
    if (-not (Test-Path $ScriptPath)) {
        Write-Host "  ✗ File not found: $ScriptPath" -ForegroundColor Red
        $FailCount.Value++
        return $false
    }
    
    try {
        $fileName = Split-Path $ScriptPath -Leaf
        docker cp "$ScriptPath" ${CONTAINER_NAME}:/tmp/$fileName 2>&1 | Out-Null
        
        $output = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/$fileName 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ [$Category] $fileName" -ForegroundColor Green
            $SuccessCount.Value++
            return $true
        } else {
            Write-Host "  ✗ [$Category] $fileName - Error: $($output | Out-String)" -ForegroundColor Red
            $FailCount.Value++
            return $false
        }
    } catch {
        Write-Host "  ✗ [$Category] $fileName - Exception: $_" -ForegroundColor Red
        $FailCount.Value++
        return $false
    }
}

function Get-MigrationFiles {
    param(
        [string]$Pattern = "*.sql",
        [bool]$Recurse = $true
    )
    
    if ($Recurse) {
        return Get-ChildItem -Path $MIGRATIONS_DIR -Filter $Pattern -Recurse -File | Sort-Object FullName
    } else {
        return Get-ChildItem -Path $MIGRATIONS_DIR -Filter $Pattern -File | Sort-Object Name
    }
}

function Generate-Manifest {
    param(
        [array]$ExecutedScripts,
        [array]$FailedScripts,
        [int]$TotalTime
    )
    
    $manifest = @"
# 数据库迁移执行报告

**执行时间**：$(Get-Date -Format "yyyy-MM-dd HH:mm:ss")  
**总耗时**：${TotalTime}秒  
**容器**：$CONTAINER_NAME

## 📊 统计摘要

| 项目 | 数量 |
|------|------|
| 总脚本数 | $($ExecutedScripts.Count + $FailedScripts.Count) |
| 成功执行 | $($ExecutedScripts.Count) |
| 执行失败 | $($FailedScripts.Count) |
| 成功率 | $([math]::Round(($ExecutedScripts.Count / ($ExecutedScripts.Count + $FailedScripts.Count)) * 100, 2))% |

## ✅ 成功执行的迁移

"@

    foreach ($script in $ExecutedScripts) {
        $manifest += "- [x] $($script.Name)`n"
    }

    if ($FailedScripts.Count -gt 0) {
        $manifest += "`n## ❌ 执行失败的迁移`n`n"
        foreach ($script in $FailedScripts) {
            $manifest += "- [ ] $($script.Name) - 失败原因：$($script.Error)`n"
        }
    }

    $manifest += "`n## 📁 按类别统计`n`n"
    
    # 按子目录分组
    $grouped = $ExecutedScripts | Group-Object { 
        $dir = Split-Path $_.DirectoryName -Leaf
        if ($dir -eq "migrations") { "root" } else { $dir }
    }
    
    foreach ($group in $grouped) {
        $manifest += "| $($group.Name) | $($group.Count) |`n"
    }

    $manifest | Out-File -FilePath $REPORT_FILE -Encoding utf8
    Write-Host "`n✓ Manifest generated: $REPORT_FILE" -ForegroundColor Green
}

# ============================================================
# Step 1: 基础表创建 (sql/schema/ & sql/data/)
# ============================================================
Write-Host "`n[1/6] Creating base tables..." -ForegroundColor Yellow

$baseScripts = @(
    "sql/schema/01_drop_all_tables.sql",
    "sql/schema/03_create_tables.sql",
    "sql/schema/03_create_tables_supplement.sql",
    "sql/schema/04_fix_constraints.sql",
    "sql/data/02_init_dict_tables_complete.sql",
    "sql/data/05_init_warehouses.sql"
)

$successCount = 0
$failCount = 0

foreach ($script in $baseScripts) {
    $scriptPath = Join-Path $BACKEND_DIR $script
    Execute-SqlFile -ScriptPath $scriptPath -Category "Base" -SuccessCount ([ref]$successCount) -FailCount ([ref]$failCount)
}

Write-Host "✓ Base tables created ($successCount success, $failCount failed)" -ForegroundColor Green

# ============================================================
# Step 2-6: 自动发现并执行 migrations/ 中的所有脚本
# ============================================================

Write-Host "`n[2/6] Auto-discovering migration scripts..." -ForegroundColor Yellow

# 获取所有迁移脚本（排除已废弃的）
$allMigrations = Get-MigrationFiles -Pattern "*.sql" -Recurse $true
$excludedFiles = @("README_scheduling_params.md", "IMPLEMENTATION_ORDER.md")  # 排除非 SQL 文件
$migrationScripts = $allMigrations | Where-Object { $_.Name -notin $excludedFiles }

Write-Host "  Found $($migrationScripts.Count) migration scripts" -ForegroundColor Cyan

# 智能分类执行
$categoryMap = @{
    "demurrage" = "Demurrage"
    "scheduling" = "Scheduling"
    "feituo" = "Feituo"
    "ports" = "Ports"
    "system" = "System"
    "timeseries" = "Timeseries"
    "config" = "Config"
    "data-fix" = "Data Fix"
    "intelligent" = "Intelligent"
}

$executedScripts = @()
$failedScripts = @()
$startTime = Get-Date

foreach ($script in $migrationScripts) {
    $category = "root"
    
    # 确定类别
    foreach ($key in $categoryMap.Keys) {
        if ($script.DirectoryName -like "*\$key*") {
            $category = $categoryMap[$key]
            break
        }
    }
    
    $result = Execute-SqlFile -ScriptPath $script.FullName -Category $category -SuccessCount ([ref]$successCount) -FailCount ([ref]$failCount)
    
    if ($result) {
        $executedScripts += $script
    } else {
        $failedScripts += [PSCustomObject]@{
            Name = $script.Name
            Error = "Execution failed"
        }
    }
}

Write-Host "✓ Migrations completed ($successCount success, $failCount failed)" -ForegroundColor Green

# ============================================================
# Verification
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Verification Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 基础验证
$tableCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" | ForEach-Object { $_.Trim() }
$portCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_ports;" | ForEach-Object { $_.Trim() }
$warehouseCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_warehouses;" | ForEach-Object { $_.Trim() }

Write-Host "Total Tables: $tableCount" -ForegroundColor White
Write-Host "Total Ports: $portCount" -ForegroundColor White
Write-Host "Total Warehouses: $warehouseCount" -ForegroundColor White

# 关键表存在性检查
Write-Host "`n[Key Tables Check]" -ForegroundColor Yellow
$keyTables = @(
    "biz_containers",
    "biz_replenishment_orders",
    "ext_demurrage_records",
    "dict_universal_mapping",
    "ext_warehouse_daily_occupancy",
    "ext_trucking_slot_occupancy",
    "ext_yard_daily_occupancy",
    "ext_feituo_places",
    "ext_feituo_status_events"
)

foreach ($table in $keyTables) {
    $exists = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" | ForEach-Object { $_.Trim() }
    if ($exists -eq "t") {
        Write-Host "  ✓ $table exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $table missing" -ForegroundColor Red
    }
}

# 生成执行报告
$endTime = Get-Date
$totalTime = [int]($endTime - $startTime).TotalSeconds

Generate-Manifest -ExecutedScripts $executedScripts -FailedScripts $failedScripts -TotalTime $totalTime

# ============================================================
# Summary
# ============================================================
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Database Initialization Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Total Scripts: $($executedScripts.Count + $failedScripts.Count)" -ForegroundColor White
Write-Host "Success: $($executedScripts.Count)" -ForegroundColor Green
Write-Host "Failed: $($failedScripts.Count)" -ForegroundColor $(if ($failedScripts.Count -eq 0) { "Green" } else { "Red" })
Write-Host "Time Elapsed: ${totalTime}s" -ForegroundColor White

if ($failedScripts.Count -gt 0) {
    Write-Host "`n⚠️  WARNING: Some scripts failed! Check report: $REPORT_FILE" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "`n🎉 All migrations executed successfully!" -ForegroundColor Green
    exit 0
}
