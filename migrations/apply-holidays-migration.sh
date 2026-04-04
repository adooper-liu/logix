#!/bin/bash
# Phase 2 Task 2: 执行节假日配置表迁移
# 作者：刘志高
# 创建时间：2026-04-01

echo "=== 执行节假日字典表迁移 ==="
echo ""

# 方法 1: 使用 docker-compose 执行
echo "方式 1: 通过 Docker Compose 执行..."
docker-compose exec -T timescaledb psql -U logix_user -d logix_db -f /migrations/system/create_dict_holidays.sql

if [ $? -eq 0 ]; then
  echo "✅ 迁移成功！"
else
  echo "❌ Docker Compose 方式失败，尝试直接执行..."
  
  # 方法 2: 使用本地 psql（如果已安装）
  if command -v psql &> /dev/null; then
    echo "方式 2: 通过本地 psql 执行..."
    export PGPASSWORD=logix_password
    psql -h localhost -U logix_user -d logix_db -f migrations/system/create_dict_holidays.sql
    
    if [ $? -eq 0 ]; then
      echo "✅ 迁移成功！"
    else
      echo "❌ 迁移失败！请检查数据库连接配置。"
      exit 1
    fi
  else
    echo "❌ psql 未安装，请手动执行以下命令："
    echo ""
    echo "docker-compose exec timescaledb psql -U logix_user -d logix_db -f /migrations/system/create_dict_holidays.sql"
    echo ""
    exit 1
  fi
fi

echo ""
echo "=== 验证迁移结果 ==="
echo "执行以下 SQL 验证："
echo "SELECT country_code, COUNT(*) as holiday_count FROM dict_holidays GROUP BY country_code;"
