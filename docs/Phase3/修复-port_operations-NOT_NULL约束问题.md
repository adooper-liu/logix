# 修复 process_port_operations 表的 NOT NULL 约束问题

## 📋 问题描述

在导入普通货柜数据时，遇到以下错误：

```
NULL value in column "ata" violates not-null constraint
```

### 根本原因

`process_port_operations` 表被创建为 TimescaleDB hypertable，使用 `gate_in_time` 作为时间分区键。

**TimescaleDB 要求**：hypertable 的时间分区键必须是 NOT NULL。

但业务场景中：
- `ata`（实际到港日期）在货物未到达前为空
- `gate_in_time`（进场时间）在货物未进场前为空  
- 这些字段在导入时经常为空值

## ✅ 解决方案

### 方案：移除 hypertable 特性，使用普通表

**修改文件**：`backend/scripts/init-timescaledb.sql`

**修改内容**：注释掉 `process_port_operations` 的 hypertable 创建代码

```sql
-- 【已禁用】不再将 process_port_operations 设为 hypertable
-- 原因：ata/gate_in_time 等时间字段在导入时可能为空，不适合作为分区键
-- SELECT create_hypertable(
--     'process_port_operations',
--     'gate_in_time',
--     chunk_time_interval => INTERVAL '1 month',
--     if_not_exists => TRUE
-- );
```

## 🔧 实施步骤

### 选项 1：重新初始化数据库（推荐，适用于开发环境）

```bash
# 1. 删除现有数据库
docker-compose -f docker-compose.timescaledb.prod.yml down -v

# 2. 清理数据卷
docker volume rm logix_timescaledb_data

# 3. 重新启动数据库
docker-compose -f docker-compose.timescaledb.prod.yml up -d timescaledb

# 4. 等待数据库启动后，执行初始化脚本
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -f /docker-entrypoint-initdb.d/03_create_tables.sql
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -f /docker-entrypoint-initdb.d/init-timescaledb.sql

# 5. 验证 ata 字段可以为 NULL
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "SELECT is_nullable FROM information_schema.columns WHERE table_name = 'process_port_operations' AND column_name = 'ata';"
```

### 选项 2：在线修复（适用于生产环境）

```sql
-- 1. 备份数据
CREATE TABLE process_port_operations_backup AS 
SELECT * FROM process_port_operations;

-- 2. 删除 hypertable（保留表和数据）
-- 注意：这需要先删除依赖的压缩策略和连续聚合
SELECT remove_compression_policy('process_port_operations', if_not_exists => TRUE);
SELECT drop_hypertable('process_port_operations');

-- 3. 移除 NOT NULL 约束
ALTER TABLE process_port_operations ALTER COLUMN gate_in_time DROP NOT NULL;

-- 4. 重新创建索引
CREATE INDEX IF NOT EXISTS idx_port_operations_container_type_time
    ON process_port_operations (container_number, port_type, gate_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_port_operations_port_sequence_time
    ON process_port_operations (port_code, port_sequence, gate_in_time DESC);
```

## 📊 影响评估

### 性能影响

**移除 hypertable 后的性能变化**：

✅ **优点**：
- 支持 NULL 值，符合业务需求
- 简化表结构，降低维护成本
- 避免 TimescaleDB 的复杂性

⚠️ **可能的性能影响**：
- 失去自动时间分区功能
- 大数据量查询可能稍慢（但影响有限，因为港口操作数据量通常不大）

### 数据量评估

根据实际业务：
- 单个货柜的港口操作记录：3-5 条（起运港、中转港、目的港）
- 预计年数据量：< 100 万条
- **结论**：普通表完全能够胜任，不需要 hypertable 的分区功能

## 🎯 验证方法

### 1. 检查表结构

```sql
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'process_port_operations'
  AND column_name IN ('ata', 'eta', 'gate_in_time');
```

预期结果：`is_nullable = YES`

### 2. 检查是否还是 hypertable

```sql
SELECT * FROM timescaledb_information.hypertables
WHERE hypertable_name = 'process_port_operations';
```

预期结果：无记录（0 rows）

### 3. 测试导入 NULL 值

```sql
INSERT INTO process_port_operations (id, container_number, port_type, port_sequence, ata)
VALUES ('test-1', 'TEST001', 'destination', 1, NULL);
```

预期：成功插入

## 📝 相关修改

### 前端配置（已完成）

**文件**：`frontend/src/configs/importMappings/container.ts`

添加了 `actual_loading_date` 字段映射，确保飞驼导入时有 fallback 值。

### 后端处理（已完成）

**文件**：`backend/src/controllers/import.controller.ts`

为 `actual_loading_date` 添加了默认值处理逻辑。

## 📚 参考资料

- [TimescaleDB Hypertable 文档](https://docs.timescale.com/api/latest/hypertable/create_hypertable/)
- [PostgreSQL NOT NULL 约束](https://www.postgresql.org/docs/current/ddl-constraints.html)
- 项目文档：`docs/Phase3/飞驼导入-actual_loading_date 字段修复说明.md`

## ⚠️ 注意事项

1. **生产环境谨慎操作**：必须先备份数据
2. **通知相关人员**：数据库结构变更需要通知团队
3. **测试环境验证**：先在测试环境验证后再应用到生产
4. **回滚方案**：准备好回滚脚本以备不时之需

---

**创建时间**：2026-03-24  
**最后更新**：2026-03-24
