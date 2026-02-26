#!/bin/bash
# ============================================================
# LogiX 数据库完整重新初始化脚本 (Docker环境)
# LogiX Database Complete Re-initialization Script (Docker)
# ============================================================
# 说明: 使用Docker容器重新初始化LogiX数据库
# Usage: ./reinit_database_docker.sh
# 日期: 2026-02-25
# ============================================================

set -e  # 遇到错误立即退出

# 容器名称
CONTAINER_NAME="logix-timescaledb-prod"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}LogiX 数据库完整重新初始化${NC}"
echo -e "${YELLOW}========================================${NC}"

# 检查容器是否运行
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo -e "${RED}错误: 容器 $CONTAINER_NAME 未运行${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 容器 $CONTAINER_NAME 正在运行${NC}"

# 复制SQL文件到容器
echo -e "${YELLOW}\n[1/7] 复制SQL文件到容器...${NC}"
docker cp 01_drop_all_tables.sql $CONTAINER_NAME:/tmp/01_drop_all_tables.sql
docker cp 03_create_tables.sql $CONTAINER_NAME:/tmp/03_create_tables.sql
docker cp 02_init_dict_tables.sql $CONTAINER_NAME:/tmp/02_init_dict_tables.sql
docker cp 05_init_warehouses.sql $CONTAINER_NAME:/tmp/05_init_warehouses.sql
docker cp 04_fix_constraints.sql $CONTAINER_NAME:/tmp/04_fix_constraints.sql
docker cp ../migrations/convert_date_to_timestamp.sql $CONTAINER_NAME:/tmp/06_convert_date_to_timestamp.sql
echo -e "${GREEN}✓ SQL文件复制完成${NC}"

# 执行初始化
echo -e "${YELLOW}\n[2/7] 删除所有表...${NC}"
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/01_drop_all_tables.sql
echo -e "${GREEN}✓ 表删除完成${NC}"

echo -e "${YELLOW}\n[3/7] 创建表结构...${NC}"
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/03_create_tables.sql
echo -e "${GREEN}✓ 表结构创建完成${NC}"

echo -e "${YELLOW}\n[4/7] 初始化字典数据...${NC}"
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/02_init_dict_tables.sql
echo -e "${GREEN}✓ 字典数据初始化完成${NC}"

echo -e "${YELLOW}\n[5/7] 初始化仓库数据...${NC}"
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/05_init_warehouses.sql
echo -e "${GREEN}✓ 仓库数据初始化完成${NC}"

echo -e "${YELLOW}\n[6/7] 修复约束与索引...${NC}"
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/04_fix_constraints.sql
echo -e "${GREEN}✓ 约束与索引修复完成${NC}"

echo -e "${YELLOW}\n[7/7] 将日期字段转换为timestamp...${NC}"
docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -f /tmp/06_convert_date_to_timestamp.sql
echo -e "${GREEN}✓ 日期字段已转换为timestamp${NC}"

# 验证结果
echo -e "${YELLOW}\n========================================${NC}"
echo -e "${YELLOW}验证初始化结果${NC}"
echo -e "${YELLOW}========================================${NC}"

TABLE_COUNT=$(docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';")
PORT_COUNT=$(docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_ports;")
WAREHOUSE_COUNT=$(docker exec -i $CONTAINER_NAME psql -U logix_user -d logix_db -t -c "SELECT COUNT(*) FROM dict_warehouses;")

echo -e "表总数: ${GREEN}$TABLE_COUNT${NC} (期望: 22)"
echo -e "港口总数: ${GREEN}$PORT_COUNT${NC} (期望: 67)"
echo -e "仓库总数: ${GREEN}$WAREHOUSE_COUNT${NC} (期望: 129)"

echo -e "${GREEN}\n========================================${NC}"
echo -e "${GREEN}数据库初始化完成！${NC}"
echo -e "${GREEN}========================================${NC}"
