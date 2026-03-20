# ============================================================
# LogiX 数据库一键初始化脚本
# ============================================================
# Description: 一键执行所有数据库迁移脚本
# Usage: .\init-database.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$CONTAINER_NAME = "logix-timescaledb-prod"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path  # migrations/
$BACKEND_DIR = Join-Path $SCRIPT_DIR "backend"
$MIGRATIONS_DIR = $SCRIPT_DIR  # migrations/

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LogiX Database Initialization" -ForegroundColor Cyan
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
# Step 1: 基础表创建 (backend/)
# ============================================================
Write-Host "`n[1/5] Creating base tables..." -ForegroundColor Yellow

$baseScripts = @(
    "01_drop_all_tables.sql",
    "03_create_tables.sql",
    "02_init_dict_tables_final.sql",
    "04_fix_constraints.sql",
    "05_init_warehouses.sql"
)

foreach ($script in $baseScripts) {
    $scriptPath = Join-Path $BACKEND_DIR $script
    if (Test-Path $scriptPath) {
        Write-Host "  - Executing $script..." -ForegroundColor Gray
        docker cp "$scriptPath" ${CONTAINER_NAME}:/tmp/$script
        docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/$script 2>&1 | Out-Null
    }
}
Write-Host "✓ Base tables created" -ForegroundColor Green

# ============================================================
# Step 2: 核心迁移脚本 (migrations/)
# ============================================================
Write-Host "`n[2/5] Running core migrations..." -ForegroundColor Yellow

$coreMigrations = @(
    # 滞港费相关
    "add_demurrage_standards_and_records.sql",
    "add_destination_port_to_demurrage_records.sql",
    "add_demurrage_record_permanence.sql",
    "add_demurrage_calculation_mode.sql",
    
    # 飞驼数据
    "add_feituo_import_tables.sql",
    "add_feituo_raw_data_by_group.sql",
    "add_feituo_port_operation_fields.sql",
    "add_ext_feituo_places.sql",
    "add_ext_feituo_status_events.sql",
    
    # 系统表
    "add_sys_data_change_log.sql",
    "create_universal_dict_mapping.sql",
    "add_inspection_records.sql",
    
    # 智能排产 - 核心
    "create_resource_occupancy_tables.sql",
    "add_schedule_status.sql",
    "add_daily_unload_capacity_to_warehouses.sql",
    "add_daily_capacity_to_trucking_companies.sql",
    "add_trucking_return_and_yard_capacity.sql",
    "add_trucking_port_mapping.sql",
    "add_scheduling_config_indexes.sql"
)

foreach ($script in $coreMigrations) {
    $scriptPath = Join-Path $MIGRATIONS_DIR $script
    if (Test-Path $scriptPath) {
        Write-Host "  - Executing $script..." -ForegroundColor Gray
        docker cp "$scriptPath" ${CONTAINER_NAME}:/tmp/$script
        docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/$script 2>&1 | Out-Null
    }
}
Write-Host "✓ Core migrations completed" -ForegroundColor Green

# ============================================================
# Step 3: 数据修复与扩展 (migrations/)
# ============================================================
Write-Host "`n[3/5] Running data fixes..." -ForegroundColor Yellow

$dataFixes = @(
    # 国家相关
    "add_country_to_dict_tables.sql",
    "add_country_to_warehouse_trucking_mapping.sql",
    "normalize_country_uk_to_gb.sql",
    "add_country_concept_comments.sql",
    
    # 清关公司国家
    "006_add_customs_broker_country.sql",
    "add_country_to_customs_brokers.sql",
    
    # 日期类型
    "convert_date_to_timestamp.sql",
    "unify-datetime-types.sql",
    "add_actual_loading_date.sql",
    "add_last_free_date_mode.sql",
    
    # 状态修复
    "fix-at-port-status.sql",
    "update-container-statuses.sql",
    "batch-update-all-statuses.sql"
)

foreach ($script in $dataFixes) {
    $scriptPath = Join-Path $MIGRATIONS_DIR $script
    if (Test-Path $scriptPath) {
        Write-Host "  - Executing $script..." -ForegroundColor Gray
        docker cp "$scriptPath" ${CONTAINER_NAME}:/tmp/$script
        docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/$script 2>&1 | Out-Null
    }
}
Write-Host "✓ Data fixes completed" -ForegroundColor Green

# ============================================================
# Step 4: 港口数据 (migrations/)
# ============================================================
Write-Host "`n[4/5] Adding port data..." -ForegroundColor Yellow

$portScripts = @(
    "add_common_ports.sql",
    "add_savannah_port.sql",
    "fix_port_field_length.sql"
)

foreach ($script in $portScripts) {
    $scriptPath = Join-Path $MIGRATIONS_DIR $script
    if (Test-Path $scriptPath) {
        Write-Host "  - Executing $script..." -ForegroundColor Gray
        docker cp "$scriptPath" ${CONTAINER_NAME}:/tmp/$script
        docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/$script 2>&1 | Out-Null
    }
}
Write-Host "✓ Port data added" -ForegroundColor Green

# ============================================================
# Step 5: 智能处理与其他 (migrations/)
# ============================================================
Write-Host "`n[5/5] Running additional migrations..." -ForegroundColor Yellow

$additionalScripts = @(
    # 智能处理
    "008_add_intelligent_processing.sql",
    
    # 流程表
    "create_flow_definitions_table.sql",
    "create_flow_instances_table.sql",
    
    # 数据回填
    "backfill_customer_code_from_sell_to_country.sql",
    "backfill_last_free_date.sql",
    "backfill_last_return_date.sql",
    
    # 其他
    "add_container_number_to_replenishment_orders.sql",
    "add_hold_date_fields.sql",
    "add_status_event_terminal_name.sql",
    "insert_empty_return_data.sql"
)

foreach ($script in $additionalScripts) {
    $scriptPath = Join-Path $MIGRATIONS_DIR $script
    if (Test-Path $scriptPath) {
        Write-Host "  - Executing $script..." -ForegroundColor Gray
        docker cp "$scriptPath" ${CONTAINER_NAME}:/tmp/$script
        docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/$script 2>&1 | Out-Null
    }
}
Write-Host "✓ Additional migrations completed" -ForegroundColor Green

# ============================================================
# Verification
# ============================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Verification Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$tableCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';" | ForEach-Object { $_.Trim() }
$portCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_ports;" | ForEach-Object { $_.Trim() }
$warehouseCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_warehouses;" | ForEach-Object { $_.Trim() }

Write-Host "Total Tables: $tableCount" -ForegroundColor White
Write-Host "Total Ports: $portCount" -ForegroundColor White
Write-Host "Total Warehouses: $warehouseCount" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Database Initialization Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
