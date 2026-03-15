# ============================================================
# LogiX Database Complete Re-initialization Script (Windows Docker)
# ============================================================
# Description: Re-initialize LogiX database using Docker container
#              Aligned with TypeORM entities and backend/docs/DATABASE_SCRIPTS_INDEX.md
# Usage: .\reinit_database_docker.ps1
# Date: 2026-03-14
# ============================================================

$ErrorActionPreference = "Stop"

$CONTAINER_NAME = "logix-timescaledb-prod"
$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$BACKEND_DIR = $SCRIPT_DIR
$MIGRATIONS_ROOT = Join-Path (Split-Path -Parent $BACKEND_DIR) "migrations"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LogiX Database Re-initialization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$containerRunning = docker ps | Select-String $CONTAINER_NAME
if (-not $containerRunning) {
    Write-Host "Error: Container $CONTAINER_NAME is not running" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Container $CONTAINER_NAME is running" -ForegroundColor Green

# Copy SQL files to container
Write-Host "`n[1/9] Copying SQL files to container..." -ForegroundColor Yellow
docker cp "$BACKEND_DIR\01_drop_all_tables.sql" ${CONTAINER_NAME}:/tmp/01_drop_all_tables.sql
docker cp "$BACKEND_DIR\03_create_tables.sql" ${CONTAINER_NAME}:/tmp/03_create_tables.sql
docker cp "$BACKEND_DIR\02_init_dict_tables_final.sql" ${CONTAINER_NAME}:/tmp/02_init_dict_tables.sql
docker cp "$BACKEND_DIR\04_fix_constraints.sql" ${CONTAINER_NAME}:/tmp/04_fix_constraints.sql
docker cp "$BACKEND_DIR\05_init_warehouses.sql" ${CONTAINER_NAME}:/tmp/05_init_warehouses.sql
docker cp "$BACKEND_DIR\migrations\add_demurrage_standards_and_records.sql" ${CONTAINER_NAME}:/tmp/mig_demurrage_standards.sql
docker cp "$BACKEND_DIR\migrations\add_destination_port_to_demurrage_records.sql" ${CONTAINER_NAME}:/tmp/mig_destination_port.sql
docker cp "$BACKEND_DIR\migrations\add_demurrage_record_permanence.sql" ${CONTAINER_NAME}:/tmp/mig_demurrage_permanence.sql
docker cp "$BACKEND_DIR\migrations\add_feituo_import_tables.sql" ${CONTAINER_NAME}:/tmp/mig_feituo_import.sql
docker cp "$BACKEND_DIR\migrations\add_feituo_raw_data_by_group.sql" ${CONTAINER_NAME}:/tmp/mig_feituo_raw_data.sql
docker cp "$BACKEND_DIR\migrations\create_universal_dict_mapping.sql" ${CONTAINER_NAME}:/tmp/mig_universal_dict_mapping.sql
docker cp "$BACKEND_DIR\migrations\add_inspection_records.sql" ${CONTAINER_NAME}:/tmp/mig_inspection.sql
docker cp "$MIGRATIONS_ROOT\create_resource_occupancy_tables.sql" ${CONTAINER_NAME}:/tmp/mig_resource_occupancy.sql
docker cp "$MIGRATIONS_ROOT\add_schedule_status.sql" ${CONTAINER_NAME}:/tmp/mig_schedule_status.sql
docker cp "$MIGRATIONS_ROOT\add_daily_unload_capacity_to_warehouses.sql" ${CONTAINER_NAME}:/tmp/mig_warehouse_capacity.sql
docker cp "$MIGRATIONS_ROOT\add_country_to_dict_tables.sql" ${CONTAINER_NAME}:/tmp/mig_country_dict.sql
docker cp "$MIGRATIONS_ROOT\convert_date_to_timestamp.sql" ${CONTAINER_NAME}:/tmp/mig_convert_timestamp.sql
docker cp "$BACKEND_DIR\migrations\add_sys_data_change_log.sql" ${CONTAINER_NAME}:/tmp/mig_sys_data_change_log.sql
docker cp "$BACKEND_DIR\migrations\add_common_ports.sql" ${CONTAINER_NAME}:/tmp/mig_common_ports.sql
docker cp "$BACKEND_DIR\migrations\add_savannah_port.sql" ${CONTAINER_NAME}:/tmp/mig_savannah_port.sql
Write-Host "✓ SQL files copied" -ForegroundColor Green

# Execute initialization
Write-Host "`n[2/9] Dropping all tables..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/01_drop_all_tables.sql
Write-Host "✓ Tables dropped" -ForegroundColor Green

Write-Host "`n[3/9] Creating table structure..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/03_create_tables.sql
Write-Host "✓ Table structure created" -ForegroundColor Green

Write-Host "`n[4/9] Initializing dictionary data..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/02_init_dict_tables.sql
Write-Host "✓ Dictionary data initialized" -ForegroundColor Green

Write-Host "`n[5/9] Fixing constraints and indexes..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/04_fix_constraints.sql
Write-Host "✓ Constraints and indexes fixed" -ForegroundColor Green

Write-Host "`n[6/9] Initializing warehouses..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/05_init_warehouses.sql
Write-Host "✓ Warehouses initialized" -ForegroundColor Green

Write-Host "`n[7/9] Running migrations..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_demurrage_standards.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_destination_port.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_demurrage_permanence.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_feituo_import.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_feituo_raw_data.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_universal_dict_mapping.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_inspection.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_resource_occupancy.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_schedule_status.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_warehouse_capacity.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_country_dict.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_sys_data_change_log.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_convert_timestamp.sql
Write-Host "✓ Migrations applied" -ForegroundColor Green

Write-Host "`n[8/9] Adding common ports data..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_savannah_port.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_common_ports.sql
Write-Host "✓ Common ports added" -ForegroundColor Green

Write-Host "`n[9/9] Verifying..." -ForegroundColor Yellow

# Verify results
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Verifying Initialization Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$tableCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"
$portCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_ports;"
$warehouseCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_warehouses;"

Write-Host "Total Tables: $tableCount (Expected: 30+ incl. sys_data_change_log, dict_universal_mapping, resource occupancy)"
Write-Host "Total Ports: $portCount (Expected: from dictionary)"
Write-Host "Total Warehouses: $warehouseCount (Expected: from dictionary)"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Database Initialization Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
