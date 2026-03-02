#!/bin/bash

echo "🚀 开始代码质量检查..."

# 检查参数
CHECK_ALL=true
CHECK_TS=false
CHECK_LINT=false
CHECK_FORMAT=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --ts) CHECK_TS=true; CHECK_ALL=false ;;
        --lint) CHECK_LINT=true; CHECK_ALL=false ;;
        --format) CHECK_FORMAT=true; CHECK_ALL=false ;;
        *) echo "未知参数: $1"; exit 1 ;;
    esac
    shift
done

# TypeScript类型检查
if [ "$CHECK_ALL" = true ] || [ "$CHECK_TS" = true ]; then
    echo "🔍 TypeScript类型检查..."
    
    echo "  → 检查后端..."
    cd backend && npm run type-check
    if [ $? -ne 0 ]; then
        echo "❌ 后端TypeScript检查失败"
        exit 1
    fi
    
    echo "  → 检查前端..."
    cd ../frontend && npm run type-check
    if [ $? -ne 0 ]; then
        echo "❌ 前端TypeScript检查失败"
        exit 1
    fi
    
    echo "✅ TypeScript检查通过"
fi

# ESLint代码规范检查
if [ "$CHECK_ALL" = true ] || [ "$CHECK_LINT" = true ]; then
    echo "🔍 ESLint代码规范检查..."
    
    echo "  → 检查后端..."
    cd ../backend && npm run lint
    if [ $? -ne 0 ]; then
        echo "❌ 后端ESLint检查失败"
        exit 1
    fi
    
    echo "  → 检查前端..."
    cd ../frontend && npm run lint
    if [ $? -ne 0 ]; then
        echo "❌ 前端ESLint检查失败"
        exit 1
    fi
    
    echo "✅ ESLint检查通过"
fi

# 代码格式化检查
if [ "$CHECK_ALL" = true ] || [ "$CHECK_FORMAT" = true ]; then
    echo "🔍 代码格式化检查..."
    
    echo "  → 格式化后端..."
    cd ../backend && npm run format
    
    echo "  → 格式化前端..."
    cd ../frontend && npm run format
    
    echo "✅ 代码格式化完成"
fi

echo "🎉 所有代码质量检查通过！"