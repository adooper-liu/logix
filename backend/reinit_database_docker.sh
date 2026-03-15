#!/bin/bash
# ============================================================
# LogiX 数据库完整重新初始化脚本 (Docker环境)
# LogiX Database Complete Re-initialization Script (Docker)
# ============================================================
# 说明: 使用Docker容器重新初始化LogiX数据库
#       与 TypeORM 实体及 backend/docs/DATABASE_SCRIPTS_INDEX.md 对齐
# Usage: ./reinit_database_docker.sh (在 backend 目录执行)
# 日期: 2026-03-14
# ============================================================

set -e

CONTAINER_NAME="logix-timescaledb-prod"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_ROOT="$(dirname "$SCRIPT_DIR")/migrations"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}LogiX 数据库完整重新初始化${NC}"
echo -e "${YELLOW}========================================${NC}"

if ! docker ps | grep -q $CONTAINER_NAME; then
    echo -e "${RED}错误: 容器 $CONTAINER_NAME 未运行${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 容器 $CONTAINER_NAME 正在运行${NC}"

echo -e "${YELLOW}\n[1/9] 复制SQL文件到容器...${NC}"
docker cp "$SCRIPT_DIR/01_drop_all_tables.sql" $CONTAINER_NAME:/tmp/01_drop_all_tables.sql
docker cp "$SCRIPT_DIR/03_create_tables.sql" $CONTAINER_NAME:/tmp/03_create_tables.sql
docker cp "$SCRIPT_DIR/02_init_dict_tables_final.sql" $CONTAINER_NAME:/tmp/02_init_dict_tables.sql
docker cp "$SCRIPT_DIR/04_fix_constraints.sql" $CONTAINER_NAME:/tmp/04_fix_constraints.sql
docker cp "$SCRIPT_DIR/05_init_warehouses.sql" $CONTAINER_NAME:/tmp/05_init_warehouses.sql
docker cp "$SCRIPT_DIR/migrations/add_demurrage_standards_and_records.sql" $CONTAINER_NAME:/tmp/mig_demurrage_standards.sql
docker cp "$SCRIPT_DIR/migrations/add_destination_port_to_demurrage_records.sql" $CONTAINER_NAME:/tmp/mig_destination_port.sql
docker cp "$SCRIPT_DIR/migrations/add_demurrage_record_permanence.sql" $CONTAINER_NAME:/tmp/mig_demurrage_permanence.sql
docker cp "$SCRIPT_DIR/migrations/add_feituo_import_tables.sql" $CONTAINER_NAME:/tmp/mig_feituo_import.sql
docker cp "$SCRIPT_DIR/migrations/add_feituo_raw_data_by_group.sql" $CONTAINER_NAME:/tmp/mig_feituo_raw_data.sql
docker cp "$SCRIPT_DIR/migrations/create_universal_dict_mapping.sql" $CONTAINER_NAME:/tmp/mig_universal_dict_mapping.sql
docker cp "$SCRIPT_DIR/migrations/add_inspection_records.sql" $CONTAINER_NAME:/tmp/mig_inspection.sql
docker cp "$SCRIPT_DIR/migrations/add_sys_data_change_log.sql" $CONTAINER_NAME:/tmp/mig_sys_data_change_log.sql
docker cp "$MIGRATIONS_ROOT/create_resource_occupancy_tables.sql" $CONTAINER_NAME:/tmp/mig_resource_occupancy.sql
docker cp "$MIGRATIONS_ROOT/add_schedule_status.sql" $CONTAINER_NAME:/tmp/mig_schedule_status.sql
docker cp "$MIGRATIONS_ROOT/add_daily_unload_capacity_to_warehouses.sql" $CONTAINER_NAME:/tmp/mig_warehouse_capacity.sql
docker cp "$MIGRATIONS_ROOT/add_country_to_dict_tables.sql" $CONTAINER_NAME:/tmp/mig_country_dict.sql
docker cp "$MIGRATIONS_ROOT/convert_date_to_timestamp.sql" $CONTAINER_NAME:/tmp/mig_convert_timestamp.sql
docker cp "$SCRIPT_DIR/migrations/add_common_ports.sql" $CONTAINER_NAME:/tmp/mig_common_ports.sql
docker cp "$SCRIPT_DIR/migrations/add_savannah_port.sql" $CONTAINER_NAME:/tmp/mig_savannah_port.sql
echo -e "${GREEN}✓ SQL文件复制完成${NC}"

echo -e "${YELLOW}\n[2/9] 删除所有表...${NC}"
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/01_drop_all_tables.sql
echo -e "${GREEN}✓ 表删除完成${NC}"

echo -e "${YELLOW}\n[3/9] 创建表结构...${NC}"
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/03_create_tables.sql
echo -e "${GREEN}✓ 表结构创建完成${NC}"

echo -e "${YELLOW}\n[4/9] 初始化字典数据...${NC}"
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/02_init_dict_tables.sql
echo -e "${GREEN}✓ 字典数据初始化完成${NC}"

echo -e "${YELLOW}\n[5/9] 修复约束与索引...${NC}"
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/04_fix_constraints.sql
echo -e "${GREEN}✓ 约束与索引修复完成${NC}"

echo -e "${YELLOW}\n[6/9] 初始化仓库数据...${NC}"
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/05_init_warehouses.sql
echo -e "${GREEN}✓ 仓库数据初始化完成${NC}"

echo -e "${YELLOW}\n[7/9] 执行迁移脚本...${NC}"
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
echo -e "${GREEN}✓ 迁移完成${NC}"

echo -e "${YELLOW}\n[8/9] 添加常用港口数据...${NC}"
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_savannah_port.sql
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/mig_common_ports.sql
echo -e "${GREEN}✓ 港口数据添加完成${NC}"

echo -e "${YELLOW}\n[9/9] 验证结果...${NC}"
TABLE_COUNT=$(docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';")
PORT_COUNT=$(docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_ports;")
WAREHOUSE_COUNT=$(docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_warehouses;")

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}验证初始化结果${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "表总数: ${GREEN}$TABLE_COUNT${NC} (期望: 30+)"
echo -e "港口总数: ${GREEN}$PORT_COUNT${NC}"
echo -e "仓库总数: ${GREEN}$WAREHOUSE_COUNT${NC}"

echo -e "${GREEN}\n========================================${NC}"
echo -e "${GREEN}数据库初始化完成！${NC}"
echo -e "${GREEN}========================================${NC}"
