# 周末产能字段修复 - 功能验证测试脚本
# Weekend Capacity Fix - Functional Verification Test Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "周末产能字段修复 - 功能验证测试" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. 检查 Docker 容器是否运行
Write-Host "[1/5] 检查 PostgreSQL 容器状态..." -ForegroundColor Yellow
$postgresContainer = docker ps --filter "name=logix-postgres" --format "{{.Names}}"

if (-not $postgresContainer) {
    Write-Host "❌ PostgreSQL 容器未运行！" -ForegroundColor Red
    Write-Host "请执行：docker-compose up -d postgres" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ PostgreSQL 容器运行正常" -ForegroundColor Green
Write-Host ""

# 2. 插入测试数据
Write-Host "[2/5] 插入测试仓库数据..." -ForegroundColor Yellow
$testDataSql = @"
INSERT INTO dict_warehouses (warehouse_code, warehouse_name, property_type, warehouse_type, country, daily_unload_capacity, status)
VALUES 
    ('TEST_WH_001', '测试仓库 001', 'PRIVATE', 'DISTRIBUTION_CENTER', 'US', 10, 'ACTIVE'),
    ('TEST_WH_002', '测试仓库 002', 'PUBLIC', 'CROSS_DOCK', 'US', 15, 'ACTIVE')
ON CONFLICT (warehouse_code) DO UPDATE SET
    warehouse_name = EXCLUDED.warehouse_name,
    property_type = EXCLUDED.property_type,
    warehouse_type = EXCLUDED.warehouse_type,
    daily_unload_capacity = EXCLUDED.daily_unload_capacity,
    status = EXCLUDED.status;
"@

try {
    docker exec -i logix-postgres psql -U logix_user -d logix_db -c $testDataSql | Out-Null
    Write-Host "✅ 测试仓库数据插入成功" -ForegroundColor Green
} catch {
    Write-Host "❌ 插入测试数据失败：$_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 3. 验证测试数据
Write-Host "[3/5] 验证测试数据..." -ForegroundColor Yellow
$verifySql = @"
SELECT 
    warehouse_code, 
    warehouse_name, 
    daily_unload_capacity,
    status
FROM dict_warehouses 
WHERE warehouse_code IN ('TEST_WH_001', 'TEST_WH_002');
"@

Write-Host "`n仓库数据:" -ForegroundColor Cyan
docker exec -it logix-postgres psql -U logix_user -d logix_db -c $verifySql

Write-Host ""

# 4. 检查智能日历配置
Write-Host "[4/5] 检查智能日历配置..." -ForegroundColor Yellow
$configSql = @"
SELECT 
    config_key, 
    config_value, 
    description
FROM dict_scheduling_config 
WHERE config_key IN ('enable_smart_calendar_capacity', 'weekend_days', 'weekday_capacity_multiplier');
"@

Write-Host "`n智能日历配置:" -ForegroundColor Cyan
docker exec -it logix-postgres psql -U logix_user -d logix_db -c $configSql

Write-Host ""

# 5. 运行自动化测试
Write-Host "[5/5] 运行自动化测试..." -ForegroundColor Yellow
Write-Host ""

Set-Location -Path "$PSScriptRoot"
npm test -- smartCalendarCapacity.verification.test.ts --verbose

$testResult = $LASTEXITCODE

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试完成" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($testResult -eq 0) {
    Write-Host "✅ 所有测试通过！" -ForegroundColor Green
} else {
    Write-Host "❌ 部分测试失败，请检查测试结果" -ForegroundColor Red
    Write-Host ""
    Write-Host "常见问题:" -ForegroundColor Yellow
    Write-Host "1. 测试失败 'Warehouse not found' -> 测试数据未正确插入" -ForegroundColor Yellow
    Write-Host "2. 测试失败 'Cannot connect to database' -> PostgreSQL 未启动" -ForegroundColor Yellow
    Write-Host "3. 周末产能不为 0 -> 智能日历配置未启用" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "详细测试指南请参考：" -ForegroundColor Cyan
    Write-Host "backend/docs-temp/WEEKEND_CAPACITY_FIX_TEST_GUIDE.md" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "清理测试数据命令请参考 WEEKEND_CAPACITY_FIX_TEST_GUIDE.md" -ForegroundColor Gray
Write-Host ""
