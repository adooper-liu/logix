# ============================================================
# LogiX 数据库一键初始化脚本
# ============================================================
# Description: 一键执行所有数据库迁移脚本
# Usage: .\reinit_database_docker.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$CONTAINER_NAME = "logix-timescaledb-prod"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path  # backend/
$BACKEND_DIR = $SCRIPT_DIR                                      # backend/
$SQL_DIR = Join-Path $BACKEND_DIR "sql"                          # backend/sql/
$MIGRATIONS_DIR = Join-Path (Split-Path -Parent $SCRIPT_DIR) "migrations"  # migrations/

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
# Step 1: 基础表创建 (sql/schema/ & sql/data/)
# ============================================================
Write-Host "`n[1/6] Creating base tables..." -ForegroundColor Yellow

# 脚本分类：
# - sql/schema/: 表结构脚本 (CREATE TABLE, ALTER, CONSTRAINT)
# - sql/data/: 初始化数据脚本 (INSERT)
# - migrations/: 增量迁移脚本 (ALTER, ADD COLUMN, INDEX, etc.)

$baseScripts = @(
    # Schema scripts (sql/schema/)
    "sql/schema/01_drop_all_tables.sql",
    "sql/schema/03_create_tables.sql",
    "sql/schema/03_create_tables_supplement.sql",
    "sql/schema/04_fix_constraints.sql",
    # Data scripts (sql/data/) - 使用完整版字典数据
    "sql/data/02_init_dict_tables_complete.sql",
    "sql/data/05_init_warehouses.sql"
)

foreach ($script in $baseScripts) {
    $scriptPath = Join-Path $BACKEND_DIR $script
    if (Test-Path $scriptPath) {
        Write-Host "  - Executing $script..." -ForegroundColor Gray
        docker cp "$scriptPath" ${CONTAINER_NAME}:/tmp/$(Split-Path $script -Leaf)
        docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/$(Split-Path $script -Leaf) 2>&1 | Out-Null
    }
}
Write-Host "✓ Base tables created" -ForegroundColor Green

# ============================================================
# Step 2: 核心迁移脚本 (migrations/)
# ============================================================
Write-Host "`n[2/6] Running core migrations..." -ForegroundColor Yellow

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
    "add_ext_feituo_vessels.sql",
    "fix_ext_feituo_places_nullable.sql",
    "fix_ext_feituo_status_events_nullable.sql",
    
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
    "add_scheduling_config_indexes.sql",
    
    # 其他重要迁移
    "add_train_port_operation_fields.sql",
    "add_trucking_foreign_keys.sql",
    "add_last_free_date_source.sql"
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
# Step 3: 配置与索引迁移 (migrations/)
# ============================================================
Write-Host "`n[3/6] Running configuration and index migrations..." -ForegroundColor Yellow

$configMigrations = @(
    # 成本优化配置
    "add_cost_optimization_config.sql",
    "add_cost_optimization_mapping_fields.sql",
    
    # 日历能力配置
    "add_calendar_based_capacity.sql",
    
    # 排产优化配置
    "001_add_scheduling_optimization_config.sql"
)

foreach ($script in $configMigrations) {
    $scriptPath = Join-Path $MIGRATIONS_DIR $script
    if (Test-Path $scriptPath) {
        Write-Host "  - Executing $script..." -ForegroundColor Gray
        docker cp "$scriptPath" ${CONTAINER_NAME}:/tmp/$script
        docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/$script 2>&1 | Out-Null
    }
}
Write-Host "✓ Configuration and index migrations completed" -ForegroundColor Green

# ============================================================
# Step 4: 数据修复与扩展 (migrations/)
# ============================================================
Write-Host "`n[4/6] Running data fixes..." -ForegroundColor Yellow

$dataFixes = @(
    # 国家相关
    "add_country_to_dict_tables.sql",
    "add_country_to_warehouse_trucking_mapping.sql",
    "normalize_country_uk_to_gb.sql",
    "add_country_concept_comments.sql",
    
    # 清关公司国家
    "006_add_customs_broker_country.sql",
    "add_country_to_customs_brokers.sql",
    "006_add_customs_broker_country_data.sql",
    
    # 日期类型
    "convert_date_to_timestamp.sql",  # 只保留一个日期转换脚本
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
# Step 5: 港口数据 (migrations/)
# ============================================================
Write-Host "`n[5/6] Adding port data..." -ForegroundColor Yellow

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
# Step 6: 智能处理与其他 (migrations/)
# ============================================================
Write-Host "`n[6/6] Running additional migrations..." -ForegroundColor Yellow

$additionalScripts = @(
    # 智能处理
    "008_add_intelligent_processing.sql",
    
    # 日期时间类型统一（重要）
    "unify-datetime-types.sql",
    
    # 运输费用字段（注意：add_transport_fee_to_mapping.sql 为重复脚本，已废弃）
    "add_transport_fee_to_warehouse_trucking_mapping.sql",
    "add_transport_fee_to_trucking_port_mapping.sql",
    
    # 手动覆盖字段
    "add_manual_override_fields_to_occupancy_tables.sql",
    
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
# Step 7: 其他脚本目录的迁移 (scripts/)
# ============================================================
Write-Host "`n[7/7] Running scripts directory migrations..." -ForegroundColor Yellow

$scriptsMigrations = @(
    # 车队合作关系级别
    "scripts/add-trucking-partnership-level.sql"
)

foreach ($script in $scriptsMigrations) {
    $scriptPath = Join-Path $BACKEND_DIR $script
    if (Test-Path $scriptPath) {
        Write-Host "  - Executing $script..." -ForegroundColor Gray
        docker cp "$scriptPath" ${CONTAINER_NAME}:/tmp/$(Split-Path $script -Leaf)
        docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/$(Split-Path $script -Leaf) 2>&1 | Out-Null
    }
}
Write-Host "✓ Scripts directory migrations completed" -ForegroundColor Green

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

# 关键字段检查
Write-Host "`n[Key Fields Check]" -ForegroundColor Yellow
$keyFields = @(
    @{Table="dict_trucking_companies"; Field="partnership_level"; Description="Trucking partnership level"}
)

foreach ($check in $keyFields) {
    $exists = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '$($check.Table)' AND column_name = '$($check.Field)');" | ForEach-Object { $_.Trim() }
    if ($exists -eq "t") {
        Write-Host "  ✓ $($check.Description) field exists" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $($check.Description) field missing" -ForegroundColor Red
    }
}

# 配置项检查
Write-Host "`n[Configuration Check]" -ForegroundColor Yellow
$configCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_scheduling_config;" | ForEach-Object { $_.Trim() }
Write-Host "  Scheduling config items: $configCount" -ForegroundColor White

# 外键约束检查
Write-Host "`n[Foreign Key Check]" -ForegroundColor Yellow
$fkCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';" | ForEach-Object { $_.Trim() }
Write-Host "  Foreign key constraints: $fkCount" -ForegroundColor White

# 索引检查
Write-Host "`n[Index Check]" -ForegroundColor Yellow
$indexCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public';" | ForEach-Object { $_.Trim() }
Write-Host "  Indexes: $indexCount" -ForegroundColor White

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Database Initialization Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
