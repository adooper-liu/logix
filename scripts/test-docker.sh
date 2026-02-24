#!/bin/bash

# LogiX Docker 测试脚本
# 用于验证 Docker 环境是否正常工作

set -e

echo "==================================="
echo "LogiX Docker 环境测试"
echo "==================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试函数
test_service() {
    local service=$1
    local url=$2
    echo -n "测试 $service... "
    if curl -s -f "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ 通过${NC}"
        return 0
    else
        echo -e "${RED}✗ 失败${NC}"
        return 1
    fi
}

# 检查 Docker 环境
echo "1. 检查 Docker 环境..."
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker 已安装${NC}"
    docker --version
else
    echo -e "${RED}✗ Docker 未安装${NC}"
    exit 1
fi

if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    echo -e "${GREEN}✓ Docker Compose 已安装${NC}"
else
    echo -e "${RED}✗ Docker Compose 未安装${NC}"
    exit 1
fi

echo ""

# 检查容器状态
echo "2. 检查容器状态..."
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ 有容器正在运行${NC}"
    docker-compose ps
else
    echo -e "${YELLOW}⚠ 没有容器正在运行${NC}"
    echo "提示: 使用 'make dev' 或 'make prod' 启动环境"
    exit 0
fi

echo ""

# 测试服务健康状态
echo "3. 测试服务健康状态..."

# 测试 PostgreSQL
echo -n "检查 PostgreSQL... "
if docker-compose exec -T postgres pg_isready -U postgres &> /dev/null; then
    echo -e "${GREEN}✓ 正常${NC}"
else
    echo -e "${RED}✗ 异常${NC}"
fi

# 测试 Redis
echo -n "检查 Redis... "
if docker-compose exec -T redis redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✓ 正常${NC}"
else
    echo -e "${RED}✗ 异常${NC}"
fi

# 测试后端 API
echo -n "检查后端 API... "
if docker-compose exec -T backend curl -s http://localhost:3001/health | grep -q "OK"; then
    echo -e "${GREEN}✓ 正常${NC}"
else
    echo -e "${RED}✗ 异常${NC}"
fi

echo ""

# 测试数据库连接
echo "4. 测试数据库连接..."
if docker-compose exec -T postgres psql -U postgres -d logix_db -c "SELECT 1;" &> /dev/null; then
    echo -e "${GREEN}✓ 数据库连接正常${NC}"
else
    echo -e "${RED}✗ 数据库连接失败${NC}"
fi

echo ""

# 检查表结构
echo "5. 检查数据库表结构..."
TABLE_COUNT=$(docker-compose exec -T postgres psql -U postgres -d logix_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)
echo -e "数据库表数量: ${GREEN}${TABLE_COUNT}${NC}"

if [ "$TABLE_COUNT" -ge 20 ]; then
    echo -e "${GREEN}✓ 表结构完整${NC}"
else
    echo -e "${YELLOW}⚠ 表数量偏少，可能未完成初始化${NC}"
fi

echo ""

# 检查数据卷
echo "6. 检查数据卷..."
VOLUMES=$(docker volume ls --filter "name=logix" --format "{{.Name}}")
if [ -n "$VOLUMES" ]; then
    echo -e "${GREEN}✓ 数据卷已创建${NC}"
    echo "$VOLUMES"
else
    echo -e "${YELLOW}⚠ 未找到数据卷${NC}"
fi

echo ""

# 检查网络
echo "7. 检查网络..."
NETWORK=$(docker network ls --filter "name=logix" --format "{{.Name}}")
if [ -n "$NETWORK" ]; then
    echo -e "${GREEN}✓ 网络已创建${NC}"
else
    echo -e "${YELLOW}⚠ 未找到网络${NC}"
fi

echo ""

# 资源使用情况
echo "8. 资源使用情况..."
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

echo ""
echo "==================================="
echo -e "${GREEN}测试完成!${NC}"
echo "==================================="
