# ============================================================
# LogiX Database Complete Re-initialization Script (Windows Docker)
# ============================================================
# Description: Re-initialize LogiX database using Docker container
#              This script is 100% aligned with TypeORM entities and Excel import mappings
# Usage: .\reinit_database_docker.ps1
# Date: 2026-02-26
# ============================================================

$ErrorActionPreference = "Stop"

# Container name
$CONTAINER_NAME = "logix-timescaledb-prod"
$BACKEND_DIR = "d:\Gihub\logix\backend"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "LogiX Database Re-initialization" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if container is running
$containerRunning = docker ps | Select-String $CONTAINER_NAME
if (-not $containerRunning) {
    Write-Host "Error: Container $CONTAINER_NAME is not running" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Container $CONTAINER_NAME is running" -ForegroundColor Green

# Copy SQL files to container
Write-Host "`n[1/8] Copying SQL files to container..." -ForegroundColor Yellow
docker cp "$BACKEND_DIR\01_drop_all_tables.sql" ${CONTAINER_NAME}:/tmp/01_drop_all_tables.sql
docker cp "$BACKEND_DIR\03_create_tables.sql" ${CONTAINER_NAME}:/tmp/03_create_tables.sql
docker cp "$BACKEND_DIR\02_init_dict_tables_final.sql" ${CONTAINER_NAME}:/tmp/02_init_dict_tables.sql
docker cp "$BACKEND_DIR\05_init_warehouses.sql" ${CONTAINER_NAME}:/tmp/05_init_warehouses.sql
docker cp "$BACKEND_DIR\04_fix_constraints.sql" ${CONTAINER_NAME}:/tmp/04_fix_constraints.sql
docker cp "$BACKEND_DIR\..\migrations\convert_date_to_timestamp.sql" ${CONTAINER_NAME}:/tmp/06_convert_date_to_timestamp.sql
docker cp "$BACKEND_DIR\..\migrations\create_universal_dict_mapping.sql" ${CONTAINER_NAME}:/tmp/07_universal_dict_mapping.sql
docker cp "$BACKEND_DIR\..\migrations\fix_port_field_length.sql" ${CONTAINER_NAME}:/tmp/08_fix_port_field_length.sql
docker cp "$BACKEND_DIR\..\migrations\add_container_number_to_replenishment_orders.sql" ${CONTAINER_NAME}:/tmp/09_add_container_number.sql
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

Write-Host "`n[5/9] Initializing warehouse data..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/05_init_warehouses.sql
Write-Host "✓ Warehouse data initialized" -ForegroundColor Green

Write-Host "`n[6/9] Fixing constraints and indexes..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/04_fix_constraints.sql
Write-Host "✓ Constraints and indexes fixed" -ForegroundColor Green

Write-Host "`n[7/9] Converting date fields to timestamp..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/06_convert_date_to_timestamp.sql
Write-Host "✓ Date fields converted to timestamp" -ForegroundColor Green

Write-Host "`n[8/9] Creating universal dictionary mapping tables..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/07_universal_dict_mapping.sql
Write-Host "✓ Universal dictionary mapping tables created" -ForegroundColor Green

Write-Host "`n[8/9] Fixing port field length..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/08_fix_port_field_length.sql
Write-Host "✓ Port field length fixed" -ForegroundColor Green

Write-Host "`n[9/9] Adding container_number field to replenishment_orders..." -ForegroundColor Yellow
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/09_add_container_number.sql
Write-Host "✓ Container number field added" -ForegroundColor Green

# Verify results
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Verifying Initialization Results" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$tableCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';"
$portCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_ports;"
$warehouseCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_warehouses;"
$mappingCount = docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_universal_mapping;"

Write-Host "Total Tables: $tableCount (Expected: 23+)"
Write-Host "Total Ports: $portCount (Expected: 67)"
Write-Host "Total Warehouses: $warehouseCount (Expected: 129)"
Write-Host "Universal Mappings: $mappingCount (Expected: 30+)"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Database Initialization Completed!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
