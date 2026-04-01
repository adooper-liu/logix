#!/bin/bash
# 周末产能字段修复 - 功能验证测试脚本 (Bash 版本)
# Weekend Capacity Fix - Functional Verification Test Script (Bash Version)

echo "========================================"
echo "周末产能字段修复 - 功能验证测试"
echo "========================================"
echo ""

# 1. 检查 Docker 容器是否运行
echo "[1/5] 检查 PostgreSQL 容器状态..."
if ! docker ps --filter "name=logix-postgres" --format "{{.Names}}" | grep -q logix-postgres; then
    echo "❌ PostgreSQL 容器未运行！"
    echo "请执行：docker-compose up -d postgres"
    exit 1
fi

echo "✅ PostgreSQL 容器运行正常"
echo ""

# 2. 插入测试数据
echo "[2/5] 插入测试仓库数据..."
cat << 'EOF' | docker exec -i logix-postgres psql -U logix_user -d logix_db
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
EOF

if [ $? -eq 0 ]; then
    echo "✅ 测试仓库数据插入成功"
else
    echo "❌ 插入测试数据失败"
    exit 1
fi
echo ""

# 3. 验证测试数据
echo "[3/5] 验证测试数据..."
echo ""
echo "仓库数据:"
docker exec -it logix-postgres psql -U logix_user -d logix_db -c "
SELECT 
    warehouse_code, 
    warehouse_name, 
    daily_unload_capacity,
    status
FROM dict_warehouses 
WHERE warehouse_code IN ('TEST_WH_001', 'TEST_WH_002');"
echo ""

# 4. 检查智能日历配置
echo "[4/5] 检查智能日历配置..."
echo ""
echo "智能日历配置:"
docker exec -it logix-postgres psql -U logix_user -d logix_db -c "
SELECT 
    config_key, 
    config_value, 
    description
FROM dict_scheduling_config 
WHERE config_key IN ('enable_smart_calendar_capacity', 'weekend_days', 'weekday_capacity_multiplier');"
echo ""

# 5. 运行自动化测试
echo "[5/5] 运行自动化测试..."
echo ""

cd "$(dirname "$0")"
npm test -- smartCalendarCapacity.verification.test.ts --verbose

testResult=$?

echo ""
echo "========================================"
echo "测试完成"
echo "========================================"

if [ $testResult -eq 0 ]; then
    echo "✅ 所有测试通过！"
else
    echo "❌ 部分测试失败，请检查测试结果"
    echo ""
    echo "常见问题:"
    echo "1. 测试失败 'Warehouse not found' -> 测试数据未正确插入"
    echo "2. 测试失败 'Cannot connect to database' -> PostgreSQL 未启动"
    echo "3. 周末产能不为 0 -> 智能日历配置未启用"
    echo ""
    echo "详细测试指南请参考："
    echo "backend/docs-temp/WEEKEND_CAPACITY_FIX_TEST_GUIDE.md"
fi

echo ""
echo "清理测试数据命令:"
echo "docker exec -i logix-postgres psql -U logix_user -d logix_db -c \"DELETE FROM dict_warehouses WHERE warehouse_code IN ('TEST_WH_001', 'TEST_WH_002');\""
echo ""
