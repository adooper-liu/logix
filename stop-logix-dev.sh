#!/bin/bash

echo "========================================"
echo "  LogiX 开发环境 - 停止服务"
echo "  Stop LogiX Development Environment"
echo "========================================"
echo ""

echo "[1/3] 停止数据库管理工具..."
docker-compose -f docker-compose.admin-tools.yml down 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  数据库管理工具已停止"
else
    echo "  跳过：未运行或Docker未启动"
fi

echo "[2/3] 停止数据库服务..."
docker-compose -f docker-compose.timescaledb.prod.yml down 2>/dev/null
if [ $? -eq 0 ]; then
    echo "  数据库服务已停止"
else
    echo "  跳过：未运行或Docker未启动"
fi

echo "[3/3] 关闭Node.js进程..."
node_processes=$(pgrep node)
if [ -n "$node_processes" ]; then
    pkill node
    echo "  已停止Node.js进程"
else
    echo "  未找到运行的Node.js进程"
fi

echo ""
echo "========================================"
echo "  所有服务已停止!"
echo "  All Services Stopped!"
echo "========================================"
echo ""
echo "提示:"
echo "  - Docker 容器已停止"
echo "  - Node.js 进程已关闭"
echo "  - 数据库数据已保留 (volumes)"
echo ""
