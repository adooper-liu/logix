# 智能排产 API 超时修复 - 执行清单

## 修复目标

解决前端访问智能排产页面时的 120 秒超时问题。

**受影响的 API**:

- [ ] `GET /api/v1/countries` - 获取国家列表
- [ ] `GET /api/v1/scheduling/overview` - 获取排产概览

**预期效果**:

- 响应时间从 >120 秒降低到 <3 秒
- 数据库 CPU 使用率从 ~100% 降低到 <30%

---

## 执行前检查

### 1. 环境检查

- [ ] PostgreSQL 服务已启动
- [ ] 可以连接到 `logix` 数据库
- [ ] 有数据库管理员权限（可以创建索引）
- [ ] 后端服务已停止（避免迁移冲突）

**验证命令**:

```bash
# 测试数据库连接
psql -U postgres -d logix -c "SELECT version();"

# 或者使用 PowerShell
cd migrations/scheduling
.\apply-indexes.ps1 -VerifyOnly
```

### 2. 备份检查

- [ ] 确认数据库最近有备份（可选但推荐）
- [ ] 记录当前性能基线（用于对比）

**记录当前性能**:

```bash
# 使用 curl 测试（记录时间）
time curl http://localhost:3001/api/v1/countries
time curl "http://localhost:3001/api/v1/scheduling/overview?country=IT"
```

---

## 正式执行

### 步骤 1: 执行索引创建脚本 (5 分钟)

**选择一种方式执行**:

#### 方式 A: PowerShell 脚本（推荐 Windows）

```powershell
cd d:\Gihub\logix\migrations\scheduling
.\apply-indexes.ps1
```

#### 方式 B: 批处理脚本（Windows CMD）

```cmd
cd d:\Gihub\logix\migrations\scheduling
apply-indexes.bat
```

#### 方式 C: 手动执行 SQL（跨平台）

```bash
psql -U postgres -d logix -f add_scheduling_performance_indexes.sql
```

**执行成功的标志**:

- 输出显示创建了 16+ 个索引
- 没有严重错误（忽略"索引已存在"的警告）
- 最后显示"统计信息更新完成"

---

### 步骤 2: 验证索引创建 (2 分钟)

```sql
-- 连接到数据库
psql -U postgres -d logix

-- 查看新创建的索引
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname LIKE 'idx_%scheduling%'
   OR indexname LIKE 'idx_%containers%'
   OR indexname LIKE 'idx_%port_ops%'
ORDER BY tablename;

-- 应该看到 16+ 条记录
```

**预期输出**:

```
indexname                          | tablename
-----------------------------------+----------------------------------
idx_containers_schedule_status     | biz_containers
idx_containers_number              | biz_containers
idx_port_ops_container_port_type   | process_port_operations
... (共 16+ 行)
```

---

### 步骤 3: 重启后端服务 (1 分钟)

```bash
# 进入后端目录
cd d:\Gihub\logix\backend

# 如果是开发模式（先 Ctrl+C 停止）
npm run dev

# 如果是生产模式
npm run start
```

**验证后端启动成功**:

- 日志显示数据库连接成功
- 没有报错
- 监听在正确的端口（默认 3001）

---

### 步骤 4: 测试 API 性能 (3 分钟)

#### 方式 A: 使用 PowerShell 测试脚本

```powershell
cd d:\Gihub\logix\migrations\scheduling
.\test-api-performance.ps1 -Detailed
```

#### 方式 B: 手动测试

```bash
# 测试 Countries API（应该 < 100ms）
curl -w "\n响应时间：%{time_total}s\n" http://localhost:3001/api/v1/countries

# 测试 Scheduling Overview API（应该 < 3s）
curl -w "\n响应时间：%{time_total}s\n" "http://localhost:3001/api/v1/scheduling/overview?country=IT&startDate=2026-01-01&endDate=2026-04-02"
```

#### 方式 C: 浏览器测试

1. 打开浏览器，访问 `http://localhost:3001`
2. 按 F12 打开开发者工具
3. 切换到 Network 标签
4. 点击智能排产菜单
5. 查看 `/api/v1/countries` 和 `/api/v1/scheduling/overview` 的响应时间

**性能达标标准**:

- [ ] `/countries` API: < 100ms
- [ ] `/scheduling/overview` API: < 3000ms (3 秒)
- [ ] 没有超时错误
- [ ] 页面正常加载

---

### 步骤 5: 验证查询计划优化 (可选，2 分钟)

```sql
-- 分析查询计划，确认使用索引
EXPLAIN ANALYZE
SELECT
  COUNT(*) FILTER (WHERE c.schedule_status IN ('initial', 'issued')) as pending_count,
  COUNT(*) FILTER (WHERE c.schedule_status = 'initial') as initial_count,
  COUNT(*) FILTER (WHERE c.schedule_status = 'issued') as issued_count
FROM biz_containers c
WHERE c.schedule_status IN ('initial', 'issued');
```

**预期输出**（关键看是否使用索引）:

```
Aggregate  (cost=234.56..234.57 rows=1 width=8) (actual time=1.234..1.235 ms)
  ->  Index Scan using idx_containers_schedule_status on biz_containers c  (cost=0.43..230.00 rows=1000 width=1) (actual time=0.123..1.000 ms)
        Index Cond: ((schedule_status)::ANY(ARRAY['initial'::character varying, 'issued'::character varying]))
Planning Time: 0.500 ms
Execution Time: 1.500 ms  -- 应该在几毫秒级别
```

如果看到 `Seq Scan` 而不是 `Index Scan`，执行：

```sql
ANALYZE biz_containers;
```

---

## 执行后验证

### 功能验证

- [ ] 访问智能排产页面，页面正常加载
- [ ] 国家筛选器正常显示国家列表
- [ ] 排产概览卡片显示正确数据
- [ ] 港口下拉选择器显示港口列表
- [ ] 仓库和车队列表正常显示
- [ ] 没有控制台错误

### 性能验证

- [ ] 页面加载时间 < 5 秒
- [ ] API 响应时间 < 3 秒
- [ ] 数据库 CPU < 50%
- [ ] 没有慢查询日志（>1 秒）

---

## 故障排查

### 问题 1: 索引创建失败

**错误**: `ERROR: relation "biz_containers" does not exist`

**原因**: 表不存在或数据库名称错误

**解决**:

```sql
-- 确认当前数据库
SELECT current_database();

-- 查看所有表
\dt

-- 如果表不存在，需要先运行建表脚本
psql -U postgres -d logix -f backend/sql/schema/03_create_tables.sql
```

### 问题 2: 性能没有提升

**检查**:

```sql
-- 查看索引是否被使用
SELECT indexname, idx_scan
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%';

-- 如果 idx_scan 为 0，说明索引未被使用
```

**解决**:

```sql
-- 强制更新统计信息
ANALYZE VERBOSE;

-- 或者重启 PostgreSQL 服务
pg_ctl restart -D "C:\Program Files\PostgreSQL\data"
```

### 问题 3: 后端启动失败

**错误**: `Cannot connect to database`

**解决**:

```bash
# 检查数据库连接配置
cd backend
cat .env

# 确认 DATABASE_URL 正确
DATABASE_URL=postgresql://postgres:password@localhost:5432/logix
```

---

## 回滚步骤（如果需要）

### 回滚索引

```sql
-- 方式一：删除所有新增索引
psql -U postgres -d logix -f rollback-scheduling-indexes.sql

-- 方式二：手动删除
psql -U postgres -d logix <<EOF
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
EOF
```

### 恢复代码

如果优化后的代码有问题，可以从 Git 恢复：

```bash
cd d:\Gihub\logix
git checkout HEAD -- backend/src/controllers/scheduling.controller.ts
```

---

## 执行总结

### 完成情况

- [ ] 步骤 1: 执行索引创建脚本
- [ ] 步骤 2: 验证索引创建
- [ ] 步骤 3: 重启后端服务
- [ ] 步骤 4: 测试 API 性能
- [ ] 步骤 5: 验证查询计划（可选）

### 性能对比

| API                    | 优化前 | 优化后   | 改善    |
| ---------------------- | ------ | -------- | ------- |
| `/countries`           | >120s  | **\_**ms | **\_**x |
| `/scheduling/overview` | >120s  | **\_**ms | **\_**x |

### 遇到的问题

记录执行过程中遇到的问题和解决方法：

```
问题 1: ________________________________
解决：________________________________

问题 2: ________________________________
解决：________________________________
```

---

**执行人**: ******\_\_******  
**执行日期**: ******\_\_******  
**总耗时**: ******\_\_****** 分钟  
**结果**: [ ] 成功 [ ] 部分成功 [ ] 失败

---

**相关文档**:

- 详细方案：`README-scheduling-performance.md`
- 修复总结：`FIX-SUMMARY.md`
- 问题排查：`../../public/docs-temp/scheduling-api-timeout-issue.md`
