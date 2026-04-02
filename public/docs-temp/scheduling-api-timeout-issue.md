# 排产 API 超时问题排查与修复

## 问题描述

前端访问智能排产页面时出现 120 秒超时错误：

- `/api/v1/countries` - 获取国家列表超时
- `/api/v1/scheduling/overview` - 获取排产概览超时

错误日志：
```
AxiosError: timeout of 120000ms exceeded
```

## 根本原因分析

### 1. /countries API 超时

可能原因：
- 数据库连接池耗尽
- PostgreSQL 服务未启动或连接中断
- `dict_countries` 表被锁

### 2. /scheduling/overview API 超时（主要原因）

该接口执行了以下复杂查询：

1. **待排产数量统计**（3 次 COUNT 查询）
   - 涉及 `biz_containers` + `process_port_operations` + `biz_replenishment_orders` + `biz_customers` + `process_trucking_transport`
   - 缺少索引的字段：
     - `biz_containers.schedule_status`
     - `process_port_operations.container_number` + `port_type`
     - `biz_replenishment_orders.container_number` + `customer_code`
     - `process_trucking_transport.container_number` + `pickup_date`

2. **映射关系查询**
   - `dict_warehouse_trucking_mapping` - 仓库 - 车队映射
   - `dict_trucking_port_mapping` - 车队 - 港口映射

3. **资源信息查询**
   - `dict_warehouses` - 仓库列表
   - `dict_trucking_companies` - 车队列表

4. **港口分布统计**
   - GROUP BY 聚合查询，无索引优化

## 解决方案

### 方案一：添加数据库索引（推荐）

在 `backend/03_create_tables.sql` 中添加以下索引：

```sql
-- === 智能排产相关索引 ===

-- 货柜状态索引（用于快速过滤 initial/issued 状态）
CREATE INDEX IF NOT EXISTS idx_containers_schedule_status 
ON biz_containers(schedule_status);

-- 港口操作表索引（用于快速定位目的港操作）
CREATE INDEX IF NOT EXISTS idx_port_ops_container_port_type 
ON process_port_operations(container_number, port_type);

-- 补货订单索引（用于快速关联客户信息）
CREATE INDEX IF NOT EXISTS idx_replenishment_container_customer 
ON biz_replenishment_orders(container_number, customer_code);

-- 拖卡运输索引（用于快速排除已提柜）
CREATE INDEX IF NOT EXISTS idx_trucking_transport_container_pickup 
ON process_trucking_transport(container_number, pickup_date);

-- 客户国家索引（用于按国家过滤）
CREATE INDEX IF NOT EXISTS idx_customers_country 
ON biz_customers(customer_code, country);

-- 仓库映射索引（用于按国家快速过滤）
CREATE INDEX IF NOT EXISTS idx_warehouse_trucking_country_active 
ON dict_warehouse_trucking_mapping(country, is_active);

-- 车队港口映射索引（用于按国家快速过滤）
CREATE INDEX IF NOT EXISTS idx_trucking_port_country_active 
ON dict_trucking_port_mapping(country, is_active);

-- 港口统计优化索引（用于 GROUP BY 优化）
CREATE INDEX IF NOT EXISTS idx_port_ops_code_name 
ON process_port_operations(port_code, port_name);
```

### 方案二：优化 SQL 查询逻辑

修改 `backend/src/controllers/scheduling.controller.ts` 中的 `getSchedulingOverview` 方法：

1. **合并重复查询** - 将 3 个 COUNT 查询合并为 1 个
2. **简化日期过滤** - 使用 COALESCE 改为可选过滤
3. **添加查询缓存** - 对相同参数的查询结果缓存 5 分钟

示例优化后的 pendingCount 查询：

```typescript
// 优化前：3 次独立查询
const pendingCountResult = await containerRepo.query(`...`, params);
const initialCountResult = await containerRepo.query(`...`, params);
const issuedCountResult = await containerRepo.query(`...`, params);

// 优化后：1 次查询同时返回 3 个值
const statsResult = await containerRepo.query(`
  SELECT 
    COUNT(*) FILTER (WHERE c.schedule_status IN ('initial', 'issued')) as pending_count,
    COUNT(*) FILTER (WHERE c.schedule_status = 'initial') as initial_count,
    COUNT(*) FILTER (WHERE c.schedule_status = 'issued') as issued_count
  FROM biz_containers c
  WHERE ...
`, params);
```

### 方案三：后端添加超时保护

在 `backend/src/database/index.ts` 中配置查询超时：

```typescript
export const AppDataSource = new DataSource({
  // ... 其他配置
  extra: {
    statement_timeout: 30000, // 30 秒超时
    query_timeout: 30000,
  },
});
```

## 验证步骤

1. **检查数据库连接**
   ```bash
   # 进入 backend 目录
   cd backend
   
   # 测试数据库连接
   npm run db:test-connection
   ```

2. **查看慢查询日志**
   ```sql
   -- 启用慢查询日志
   ALTER SYSTEM SET log_min_duration_statement = 1000; -- 记录超过 1 秒的查询
   SELECT pg_reload_conf();
   
   -- 查看慢查询
   SELECT query, calls, total_exec_time, mean_exec_time
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. **手动测试 API**
   ```bash
   # 测试 countries API
   curl http://localhost:3001/api/v1/countries
   
   # 测试 scheduling overview API（带计时）
   time curl http://localhost:3001/api/v1/scheduling/overview?startDate=2026-01-01&endDate=2026-04-02&country=IT
   ```

4. **应用索引后验证**
   ```sql
   -- 查看索引使用情况
   SELECT schemaname, tablename, indexname, indexdef
   FROM pg_indexes
   WHERE tablename IN ('biz_containers', 'process_port_operations', 'biz_replenishment_orders')
   ORDER BY tablename, indexname;
   
   -- 分析查询计划
   EXPLAIN ANALYZE
   SELECT COUNT(*) FROM biz_containers c
   WHERE c.schedule_status IN ('initial', 'issued')
   AND EXISTS (
     SELECT 1 FROM process_port_operations po
     WHERE po.container_number = c.container_number
   );
   ```

## 临时规避措施

如果无法立即添加索引，可以采取以下临时措施：

1. **增加前端超时时间**
   ```typescript
   // frontend/src/services/container.ts
   const api = axios.create({
     baseURL: VITE_API_BASE_URL,
     timeout: 300000, // 从 120 秒增加到 300 秒
   });
   ```

2. **限制数据范围**
   - 默认不加载全部数据，要求用户先选择国家和日期
   - 缩短默认日期范围（如最近 30 天而非 90 天）

3. **分页加载**
   - 先加载概览统计数据
   - 用户点击详情时再加载具体列表

## 修复优先级

1. **高优先级** - 添加数据库索引（影响最大，开发成本最低）
2. **中优先级** - 优化 SQL 查询逻辑（减少数据库压力）
3. **低优先级** - 添加查询缓存（需要额外的缓存管理）

## 后续监控

修复后持续监控：

- API 响应时间 < 3 秒
- 数据库 CPU 使用率 < 50%
- 慢查询数量 < 10 次/分钟

---

**创建时间**: 2026-04-02  
**状态**: 待修复  
**负责人**: 刘志高
