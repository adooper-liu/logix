#!/bin/bash
# 从开发数据库导出测试数据用于 CI
# Export test data from development database for CI
# 注意：此脚本假设 PostgreSQL 运行在 Docker 容器中

set -e

# 配置
DEV_DB="logix_db"
DB_USER="logix_user"  # 数据库用户名（从 .env 文件获取）
DB_PASSWORD="LogiX@2024!Secure"  # 数据库密码（从 .env 文件获取）
EXPORT_DIR="backend/tests/integration/test-data"
DB_CONTAINER="logix-timescaledb-prod"  # Docker 容器名称
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=========================================="
echo "从开发数据库导出测试数据"
echo "Source DB: $DEV_DB"
echo "Export Dir: $EXPORT_DIR"
echo "DB Container: $DB_CONTAINER"
echo "=========================================="

# 检查 Docker 是否运行
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装或未在 PATH 中"
    exit 1
fi

# 检查 PostgreSQL 容器是否运行
if ! docker ps --format '{{.Names}}' | grep -q "$DB_CONTAINER"; then
    echo "⚠️  警告: 未找到运行中的容器 '$DB_CONTAINER'"
    echo "尝试查找其他 PostgreSQL 容器..."
    DB_CONTAINER=$(docker ps --filter "ancestor=postgres" --format '{{.Names}}' | head -n 1)
    if [ -z "$DB_CONTAINER" ]; then
        echo "❌ 错误: 未找到运行中的 PostgreSQL 容器"
        echo "请先启动 PostgreSQL 容器，或修改脚本中的 DB_CONTAINER 变量"
        exit 1
    fi
    echo "✓ 找到 PostgreSQL 容器: $DB_CONTAINER"
fi

# 创建导出目录
mkdir -p "$EXPORT_DIR"

# 导出字典表数据（这些是测试必需的）
echo "1. 导出字典表数据..."
docker exec -t $DB_CONTAINER pg_dump \
  -U "$DB_USER" \
  -d "$DEV_DB" \
  --table=dict_countries \
  --table=dict_ports \
  --table=dict_container_types \
  --table=dict_customer_types \
  --table=dict_warehouses \
  --table=dict_trucking_companies \
  --table=dict_customs_brokers \
  --table=dict_shipping_companies \
  --table=dict_freight_forwarders \
  --table=dict_overseas_companies \
  --data-only \
  --inserts \
  --no-owner \
  --no-privileges \
  > "$EXPORT_DIR/dictionaries.sql"

echo "   ✓ 字典表数据已导出"

# 导出少量业务数据（用于集成测试）
echo "2. 导出示例业务数据..."

# 设置 PGPASSWORD 环境变量以避免密码提示
export PGPASSWORD="$DB_PASSWORD"

# 导出最近的 50 个货柜
docker exec -t $DB_CONTAINER psql \
  -U "$DB_USER" \
  -d "$DEV_DB" \
  -c "COPY (
    SELECT * FROM biz_containers 
    ORDER BY created_at DESC 
    LIMIT 50
  ) TO STDOUT WITH CSV HEADER" \
  > "$EXPORT_DIR/containers.csv"

# 导出对应的海运记录
docker exec -t $DB_CONTAINER psql \
  -U "$DB_USER" \
  -d "$DEV_DB" \
  -c "COPY (
    SELECT sf.* FROM process_sea_freight sf
    INNER JOIN biz_containers c ON sf.bill_of_lading_number = c.bill_of_lading_number
    ORDER BY sf.created_at DESC
    LIMIT 50
  ) TO STDOUT WITH CSV HEADER" \
  > "$EXPORT_DIR/sea_freight.csv"

# 清除密码变量
unset PGPASSWORD

echo "   ✓ 业务数据已导出"

# 生成元数据文件
cat > "$EXPORT_DIR/metadata.json" <<EOF
{
  "exported_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "source_database": "$DEV_DB",
  "tables": {
    "dictionaries": [
      "dict_countries",
      "dict_ports",
      "dict_container_types",
      "dict_customer_types",
      "dict_warehouses",
      "dict_trucking_companies",
      "dict_customs_brokers",
      "dict_shipping_companies",
      "dict_freight_forwarders",
      "dict_overseas_companies"
    ],
    "business_data": {
      "containers_count": 50,
      "sea_freight_count": 50
    }
  },
  "usage": "在 CI 环境中先执行 03_create_tables.sql 创建表结构，然后导入此数据"
}
EOF

echo "   ✓ 元数据已生成"

echo ""
echo "=========================================="
echo "导出完成！"
echo "导出文件:"
ls -lh "$EXPORT_DIR/"
echo "=========================================="
echo ""
echo "下一步："
echo "1. 提交导出的数据到 Git: git add $EXPORT_DIR"
echo "2. 在 CI 中使用这些数据初始化 logix_ci 数据库"
