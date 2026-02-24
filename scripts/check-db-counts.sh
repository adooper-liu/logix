#!/bin/bash

# 查询 LogiX 数据库所有表的记录数

echo "============================================"
echo "  LogiX 数据库记录统计"
echo "============================================"
echo ""

DB_HOST="localhost"
DB_PORT=5432
DB_USER="logix_user"
DB_NAME="logix_db"

# 查询业务表的记录数
echo "【业务表】"
echo ""

total_business=0

# 定义业务表数组
declare -A business_tables=(
    ["备货单"]="biz_replenishment_orders"
    ["货柜"]="biz_containers"
    ["海运信息"]="process_sea_freight"
    ["港口操作"]="process_port_operations"
    ["拖卡运输"]="process_trucking"
    ["仓库操作"]="process_warehouse_operations"
    ["还空箱"]="process_empty_returns"
    ["海运费用"]="container_charges"
    ["状态事件"]="container_status_events"
    ["提柜记录"]="container_loading_records"
    ["滞柜记录"]="container_hold_records"
)

for name in "${!business_tables[@]}"; do
    table="${business_tables[$name]}"
    count=$(docker exec -i logix-timescaledb-prod psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')
    total_business=$((total_business + count))
    printf "%-16s %-18s %10d 条\n" "$name" "$table" "$count"
done

echo ""
printf "%-26s %10d 条\n" "业务表总计" "$total_business"
echo ""

# 查询字典表的记录数
echo "【字典表】"
echo ""

total_dict=0

# 定义字典表数组
declare -A dict_tables=(
    ["港口字典"]="dict_ports"
    ["船公司字典"]="dict_shipping_companies"
    ["柜型字典"]="dict_container_types"
    ["货代公司字典"]="dict_freight_forwarders"
    ["清关公司字典"]="dict_customs_brokers"
    ["拖车公司字典"]="dict_trucking_companies"
    ["仓库字典"]="dict_warehouses"
)

for name in "${!dict_tables[@]}"; do
    table="${dict_tables[$name]}"
    count=$(docker exec -i logix-timescaledb-prod psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ')

    if [ -n "$count" ]; then
        total_dict=$((total_dict + count))
        printf "%-16s %-18s %10d 条\n" "$name" "$table" "$count"
    else
        printf "%-16s %-18s %10d 条\n" "$name" "$table" 0
    fi
done

echo ""
printf "%-26s %10d 条\n" "字典表总计" "$total_dict"
echo ""

total_all=$((total_business + total_dict))
printf "%-26s %10d 条\n" "总记录数" "$total_all"
echo ""

# 显示货柜物流状态分布
echo "【货柜物流状态分布】"
echo ""
docker exec -i logix-timescaledb-prod psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT \"logisticsStatus\", COUNT(*) as count FROM biz_containers GROUP BY \"logisticsStatus\" ORDER BY count DESC;" 2>/dev/null
echo ""

echo "查询完成！"
