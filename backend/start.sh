#!/bin/bash

# LogiX 主服务启动脚本

set -e

echo "╔════════════════════════════════════════════════════════╗"
echo "║     LogiX Main Service Startup Script                ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18 or higher."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js version: $NODE_VERSION"

# 检查 npm 是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm version: $NPM_VERSION"
echo ""

# 创建日志目录
if [ ! -d "logs" ]; then
    echo "📁 Creating logs directory..."
    mkdir -p logs
    echo "✅ Logs directory created"
fi

# 检查 .env 文件
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please configure it as needed."
fi

# 检查依赖
echo ""
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# 检查微服务
echo ""
echo "🔗 Checking Logistics Path microservice..."
if curl -s http://localhost:4000/health > /dev/null 2>&1; then
    echo "✅ Logistics Path microservice is running at http://localhost:4000"
else
    echo "⚠️  Logistics Path microservice is not running at http://localhost:4000"
    echo "⚠️  Please start the logistics-path-system first:"
    echo "   cd ../../logistics-path-system/backend"
    echo "   npm run dev"
fi

# 启动服务
echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     Starting LogiX Main Service...                 ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

npm run dev
