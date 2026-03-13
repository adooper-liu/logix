#!/bin/bash

# 检查Docker状态
echo "========================================"
echo "  LogiX 开发环境 - 启动服务"
echo "  LogiX Development Environment"
echo "========================================"
echo ""

echo "[1/6] 检查Docker状态..."
docker info > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "  Docker正在运行"
else
    echo "  Docker未运行，请先启动Docker"
    exit 1
fi

# 启动数据库与监控服务
echo ""
echo "[2/6] 启动数据库与监控服务..."
docker-compose -f docker-compose.timescaledb.prod.yml --env-file .env up -d postgres redis prometheus grafana
if [ $? -eq 0 ]; then
    echo "  数据库服务已启动"
    # 等待数据库就绪（最多等待60秒）
    echo "  等待数据库就绪..."
    max_attempts=60
    attempt=0
    while [ $attempt -lt $max_attempts ]; do
        docker logs logix-timescaledb-prod 2>&1 | grep -q "ready to accept connections"
        if [ $? -eq 0 ]; then
            echo "  数据库已就绪"
            break
        fi
        attempt=$((attempt + 1))
        if [ $((attempt % 5)) -eq 0 ]; then
            echo "    等待中... ($attempt/$max_attempts)"
        fi
        sleep 1
    done
    if [ $attempt -ge $max_attempts ]; then
        echo "  警告: 数据库可能未完全就绪，但继续启动应用"
    fi
else
    echo "  数据库启动失败"
fi

# 启动数据库工具
echo ""
echo "[3/6] 启动数据库管理工具..."
docker-compose -f docker-compose.timescaledb.prod.yml -f docker-compose.admin-tools.yml --env-file .env up -d adminer pgadmin
if [ $? -eq 0 ]; then
    echo "  数据库管理工具已启动"
else
    echo "  数据库管理工具启动失败"
fi

# 启动后端服务
echo ""
echo "[4/6] 启动后端服务..."
(cd backend && npm run dev) &
echo "  后端服务已启动"

# 启动前端服务
echo ""
echo "[5/6] 启动前端服务..."
(cd frontend && npm run dev) &
echo "  前端服务已启动"

# 启动 logistics-path 微服务（物流路径可视化）
echo ""
echo "[6/6] 启动 logistics-path 微服务..."
logistics_path="$PWD/logistics-path-system/backend"
if [ -f "$logistics_path/package.json" ]; then
    (cd "$logistics_path" && npm run dev) &
    echo "  logistics-path 已在 port 4000 启动"
else
    echo "  跳过: logistics-path-system 目录不存在"
fi

# 完成
echo ""
echo "========================================"
echo "  所有服务已启动!"
echo "  All Services Started!"
echo "========================================"
echo ""
echo "服务访问地址:"
echo ""
echo "  数据库服务:"
echo "    TimescaleDB:  localhost:5432"
echo "    Redis:       localhost:6379"
echo ""
echo "  管理工具:"
echo "    Adminer:     http://localhost:8080"
echo "    pgAdmin:     http://localhost:5050"
echo ""
echo "  监控:"
echo "    Prometheus:  http://localhost:9090"
echo "    Grafana:     http://localhost:3000 (admin/admin)"
echo ""
echo "  应用服务:"
echo "    Frontend:     http://localhost:5173"
echo "    Backend:      http://localhost:3001"
echo "    Logistics:    http://localhost:4000 (物流路径微服务)"
echo ""
echo "提示:"
echo "  - 所有服务在后台运行"
echo "  - 数据库工具需要首次登录设置"
echo "  - 停止服务请运行: ./stop-logix-dev.sh"
echo ""
