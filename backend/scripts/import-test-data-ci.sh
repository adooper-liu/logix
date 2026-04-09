#!/bin/bash
# 在 CI 环境中导入测试数据到 logix_ci
# Import test data to logix_ci in CI environment

set -e

# 配置
CI_DB="logix_ci"
TEST_DATA_DIR="backend/tests/integration/test-data"

echo "=========================================="
echo "在 CI 环境中导入测试数据"
echo "Target DB: $CI_DB"
echo "Data Dir: $TEST_DATA_DIR"
echo "=========================================="

# 检查数据文件是否存在
if [ ! -d "$TEST_DATA_DIR" ]; then
  echo "❌ 错误: 测试数据目录不存在: $TEST_DATA_DIR"
  echo "请先运行: bash backend/scripts/export-test-data.sh"
  exit 1
fi

# 1. 导入字典表数据
if [ -f "$TEST_DATA_DIR/dictionaries.sql" ]; then
  echo "1. 导入字典表数据..."
  PGPASSWORD=postgres psql -h postgres -U postgres -d "$CI_DB" < "$TEST_DATA_DIR/dictionaries.sql"
  echo "   ✓ 字典表数据已导入"
else
  echo "   ⚠️  警告: 未找到 dictionaries.sql，跳过字典数据导入"
fi

# 2. 导入业务数据（CSV 格式）
if [ -f "$TEST_DATA_DIR/containers.csv" ]; then
  echo "2. 导入货柜数据..."
  PGPASSWORD=postgres psql -h postgres -U postgres -d "$CI_DB" -c "
    COPY biz_containers FROM STDIN WITH CSV HEADER
  " < "$TEST_DATA_DIR/containers.csv"
  echo "   ✓ 货柜数据已导入"
else
  echo "   ⚠️  警告: 未找到 containers.csv，跳过货柜数据导入"
fi

if [ -f "$TEST_DATA_DIR/sea_freight.csv" ]; then
  echo "3. 导入海运数据..."
  PGPASSWORD=postgres psql -h postgres -U postgres -d "$CI_DB" -c "
    COPY process_sea_freight FROM STDIN WITH CSV HEADER
  " < "$TEST_DATA_DIR/sea_freight.csv"
  echo "   ✓ 海运数据已导入"
else
  echo "   ⚠️  警告: 未找到 sea_freight.csv，跳过海运数据导入"
fi

# 3. 验证导入结果
echo ""
echo "4. 验证导入结果..."
PGPASSWORD=postgres psql -h postgres -U postgres -d "$CI_DB" -c "
  SELECT 
    'dict_countries' as table_name, COUNT(*) as row_count FROM dict_countries
  UNION ALL
  SELECT 'dict_ports', COUNT(*) FROM dict_ports
  UNION ALL
  SELECT 'dict_container_types', COUNT(*) FROM dict_container_types
  UNION ALL
  SELECT 'biz_containers', COUNT(*) FROM biz_containers
  UNION ALL
  SELECT 'process_sea_freight', COUNT(*) FROM process_sea_freight
  ORDER BY table_name;
"

echo ""
echo "=========================================="
echo "测试数据导入完成！"
echo "=========================================="
