# 智能排产性能优化 - 执行指南

## 问题描述

前端访问智能排产页面时出现 120 秒超时错误：

- `/api/v1/countries` - 获取国家列表超时
- `/api/v1/scheduling/overview` - 获取排产概览超时

## 解决方案

### 步骤 1: 执行数据库索引迁移（必须）

打开 PostgreSQL 命令行或数据库管理工具，执行：

```bash
# 方式一：使用 psql 命令行
psql -U your_username -d logix -f migrations/scheduling/add_scheduling_performance_indexes.sql

# 方式二：在 backend 目录使用 npm 脚本（如果有）
cd backend
npm run db:migrate:scheduling-indexes

# 方式三：手动复制 SQL 内容到数据库管理工具执行
# 推荐工具：DBeaver, pgAdmin, DataGrip
```

**执行的 SQL 文件**: `migrations/scheduling/add_scheduling_performance_indexes.sql`

该脚本会创建以下关键索引：

- `idx_containers_schedule_status` - 货柜状态索引
- `idx_replenishment_container_customer` - 补货订单关联索引
- `idx_port_ops_container_port_type` - 港口操作查询索引
- `idx_trucking_transport_container_pickup` - 拖卡运输查询索引
- `idx_warehouse_trucking_country_active` - 仓库车队映射索引
- `idx_trucking_port_country_active` - 车队港口映射索引
- 等等...

### 步骤 2: 更新统计信息（必须）

索引创建后，执行 ANALYZE 更新统计信息：

```sql
ANALYZE biz_containers;
ANALYZE process_port_operations;
ANALYZE biz_replenishment_orders;
ANALYZE biz_customers;
ANALYZE process_trucking_transport;
ANALYZE dict_warehouse_trucking_mapping;
ANALYZE dict_trucking_port_mapping;
ANALYZE dict_warehouses;
ANALYZE dict_trucking_companies;
ANALYZE dict_countries;
```

或者简化为：

```sql
ANALYZE;
```

### 步骤 3: 重启后端服务

```bash
# 停止后端
cd backend
npm run stop

# 启动后端
npm run start

# 或者开发模式
npm run dev
```

### 步骤 4: 验证性能提升

#### 方式一：使用 curl 测试

```bash
# 测试 countries API（应该 < 100ms）
time curl http://localhost:3001/api/v1/countries

# 测试 scheduling overview API（应该 < 3 秒）
time curl "http://localhost:3001/api/v1/scheduling/overview?startDate=2026-01-01&endDate=2026-04-02&country=IT"
```

#### 方式二：使用浏览器开发者工具

1. 打开浏览器开发者工具（F12）
2. 切换到 Network 标签
3. 刷新智能排产页面
4. 查看 `/api/v1/countries` 和 `/api/v1/scheduling/overview` 的响应时间

#### 方式三：查看慢查询日志

```sql
-- 启用慢查询日志（PostgreSQL）
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();

-- 查看最近的慢查询
SELECT query, calls, total_exec_time, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

### 步骤 5: 验证索引是否生效

```sql
-- 查看所有新创建的索引
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE indexname LIKE 'idx_%'
  AND (tablename LIKE '%container%' OR tablename LIKE '%port%' OR tablename LIKE '%trucking%')
ORDER BY tablename, indexname;

-- 分析查询计划（确认使用索引）
EXPLAIN ANALYZE
SELECT
  COUNT(*) FILTER (WHERE c.schedule_status IN ('initial', 'issued')) as pending_count,
  COUNT(*) FILTER (WHERE c.schedule_status = 'initial') as initial_count,
  COUNT(*) FILTER (WHERE c.schedule_status = 'issued') as issued_count
FROM biz_containers c
WHERE c.schedule_status IN ('initial', 'issued')
AND EXISTS (
  SELECT 1 FROM process_port_operations po
  WHERE po.container_number = c.container_number
);
```

## 预期效果

### 优化前

- `/countries`: 120 秒超时
- `/scheduling/overview`: 120 秒超时
- 数据库 CPU: 100%
- 查询计划：全表扫描（Seq Scan）

### 优化后

- `/countries`: < 100ms
- `/scheduling/overview`: < 3 秒（取决于数据量）
- 数据库 CPU: < 30%
- 查询计划：索引扫描（Index Scan）

## 故障排查

### 问题 1: 索引创建失败

**错误**: `ERROR: relation "biz_containers" does not exist`

**解决**: 确认数据库名称正确，表已创建

```sql
\dt  -- 查看所有表
```

### 问题 2: 性能没有提升

**检查**: 确认 ANALYZE 已执行

```sql
SELECT relname, last_analyze, last_autoanalyze
FROM pg_stat_user_tables
WHERE relname IN ('biz_containers', 'process_port_operations');
```

**解决**: 手动执行 ANALYZE

```sql
ANALYZE biz_containers;
```

### 问题 3: 索引未被使用

**检查**: 查看查询计划

```sql
EXPLAIN ANALYZE SELECT ...;
```

**解决**:

1. 确认统计信息已更新（执行 ANALYZE）
2. 检查查询条件是否与索引匹配
3. 考虑使用 `SET enable_seqscan = off;` 强制测试索引性能

## 回滚方案

如果需要回滚索引：

```sql
-- 删除所有新增的索引
DROP INDEX IF EXISTS idx_containers_schedule_status;
DROP INDEX IF EXISTS idx_containers_number;
DROP INDEX IF EXISTS idx_replenishment_container_customer;
DROP INDEX IF EXISTS idx_customers_country;
DROP INDEX IF EXISTS idx_port_ops_container_port_type;
DROP INDEX IF EXISTS idx_port_ops_container;
DROP INDEX IF EXISTS idx_port_ops_code_name;
DROP INDEX IF EXISTS idx_trucking_transport_container_pickup;
DROP INDEX IF EXISTS idx_warehouse_trucking_country_active;
DROP INDEX IF EXISTS idx_warehouse_trucking_warehouse_code;
DROP INDEX IF EXISTS idx_warehouse_trucking_trucking_company_id;
DROP INDEX IF EXISTS idx_trucking_port_country_active;
DROP INDEX IF EXISTS idx_trucking_port_trucking_company_id;
DROP INDEX IF EXISTS idx_trucking_port_port_code;
DROP INDEX IF EXISTS idx_warehouses_country_status;
DROP INDEX IF EXISTS idx_trucking_companies_country_status;
DROP INDEX IF EXISTS idx_countries_active_sort;
```

## 后续优化建议

1. **定期维护**: 每月执行一次 VACUUM ANALYZE

   ```sql
   VACUUM ANALYZE biz_containers;
   VACUUM ANALYZE process_port_operations;
   ```

2. **监控慢查询**: 开启 pg_stat_statements 扩展

   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
   ```

3. **容量规划**: 当数据量超过 100 万行时，考虑分区表

4. **缓存策略**: 对不常变化的数据添加 Redis 缓存（5 分钟 TTL）

---

**执行时间**: 预计 5-10 分钟  
**风险等级**: 低（只读操作，不影响现有数据）  
**负责人**: 刘志高  
**创建时间**: 2026-04-02
