-- 周末产能字段修复 - 功能验证测试数据
-- Weekend Capacity Fix - Functional Verification Test Data

-- 1. 插入测试仓库
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

-- 2. 验证仓库已插入
SELECT 
    warehouse_code, 
    warehouse_name, 
    daily_unload_capacity,
    status
FROM dict_warehouses 
WHERE warehouse_code IN ('TEST_WH_001', 'TEST_WH_002');

-- 3. 查询周末配置
SELECT 
    config_key, 
    config_value, 
    description
FROM dict_scheduling_config 
WHERE config_key IN ('enable_smart_calendar_capacity', 'weekend_days', 'weekday_capacity_multiplier');

-- 4. 清理测试数据（执行测试后运行）
-- DELETE FROM dict_warehouses WHERE warehouse_code IN ('TEST_WH_001', 'TEST_WH_002');
