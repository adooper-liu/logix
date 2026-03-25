# TimescaleDB 迁移问题诊断报告

**诊断时间**: 2026-03-21  
**数据库**: logix-timescaledb-prod  
**状态**: 发现阻碍，需要手动处理

---

## 📊 **当前状态**

### ✅ 已完成

- TimescaleDB 扩展已安装（版本 2.15.1）
- 迁移脚本已创建并更新
- 文档已编写

### ❌ 遇到的阻碍

| 表名                            | 问题                                 | 影响                                                   | 解决方案                             |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------ | ------------------------------------ |
| **ext_container_status_events** | 有唯一索引不包含分区列 `occurred_at` | ERROR: cannot create a unique index without the column | 删除索引或修改主键包含 `occurred_at` |
| **process_port_operations**     | `ata` 字段有 5 条 NULL 记录          | ERROR: column contains null values                     | 填充 NULL 值或使用其他字段           |
| **process_sea_freight**         | 被 `biz_containers` 外键引用         | ERROR: foreign key constraints are not supported       | 先删除外键，改用逻辑外键             |
| **sys_data_change_log**         | 可能有唯一索引                       | ERROR: cannot create unique index                      | 删除唯一索引                         |

---

## 🔍 **详细诊断**

### 问题 1: ext_container_status_events - 唯一索引冲突

**现状**:

```sql
-- 当前索引
ext_container_status_events_pkey | CREATE UNIQUE INDEX ... USING btree (id)
idx_status_events_container      | CREATE INDEX ... USING btree (container_number)
idx_status_events_time           | CREATE INDEX ... USING btree (occurred_at DESC)
```

**问题**: 主键 `id` 不包含分区列 `occurred_at`

**解决方案**:

```sql
-- 方案 A: 删除唯一索引（推荐）
DROP INDEX IF EXISTS ext_container_status_events_pkey;
CREATE UNIQUE INDEX idx_ext_container_status_events_id ON ext_container_status_events(id);

-- 方案 B: 修改主键为复合主键（备选，影响较大）
ALTER TABLE ext_container_status_events
  DROP CONSTRAINT ext_container_status_events_pkey,
  ADD PRIMARY KEY (id, occurred_at);

-- 方案 C: 改用唯一索引（非主键）（推荐）
DROP INDEX IF EXISTS ext_container_status_events_pkey;
CREATE UNIQUE INDEX idx_unique_id ON ext_container_status_events(id);
```

**✅ 已创建补充脚本**: `migrations/add-hypertable-primary-keys.sql`

---

### 问题 2: process_port_operations - ata 字段有 NULL

**检查结果**:

```sql
SELECT COUNT(*) FROM process_port_operations WHERE ata IS NULL;
-- 结果：5 条 NULL 记录
```

**解决方案**:

```sql
-- 方案 A: 填充 NULL 值（推荐）
UPDATE process_port_operations
SET ata = COALESCE(eta, etd, NOW())
WHERE ata IS NULL;

-- 方案 B: 使用其他非空字段作为分区键
SELECT create_hypertable('process_port_operations', 'etd', migrate_data => true);

-- 方案 C: 允许 NULL（不推荐，会影响查询性能）
-- 需要修改 TimescaleDB 源码或配置
```

---

### 问题 3: process_sea_freight - 外键依赖

**现状**:

```sql
-- 外键约束
biz_containers_bill_of_lading_number_fkey
  FOREIGN KEY (bill_of_lading_number)
  REFERENCES process_sea_freight(bill_of_lading_number)
```

**解决方案**:

```sql
-- Step 1: 删除外键约束
ALTER TABLE biz_containers
  DROP CONSTRAINT biz_containers_bill_of_lading_number_fkey;

-- Step 2: 转换为 hypertable
SELECT create_hypertable('process_sea_freight', 'actual_departure_date', migrate_data => true);

-- Step 3: 添加注释说明（逻辑外键）
COMMENT ON COLUMN biz_containers.bill_of_lading_number IS
  '关联到 process_sea_freight.bill_of_lading_number (逻辑外键，应用层保证完整性)';

-- Step 4: （可选）创建触发器模拟外键
-- 参考 TimescaleDB 文档中的 trigger-based foreign keys
```

---

### 问题 4: sys_data_change_log - 唯一索引

**预期问题**: 与 ext_container_status_events 类似

**解决方案**:

```sql
-- 检查索引
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'sys_data_change_log';

-- 删除唯一索引
DROP INDEX IF EXISTS sys_data_change_log_pkey;

-- 转换
SELECT create_hypertable('sys_data_change_log', 'created_at', migrate_data => true);
```

---

## 🛠️ **推荐执行步骤**

### 阶段 1: 准备工作

```bash
# 1. 完整备份
docker exec logix-timescaledb-prod pg_dump -U logix_user logix_db > backup_full_$(date +%Y%m%d_%H%M%S).sql

# 2. 备份关键表结构
docker exec logix-timescaledb-prod pg_dump -U logix_user logix_db --schema-only \
  -t ext_container_status_events \
  -t process_port_operations \
  -t process_sea_freight \
  -t sys_data_change_log \
  > backup_schema_only.sql

# 3. 导出外键定义
docker exec logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'f';
" > backup_fk_definitions.txt
```

### 阶段 2: 手动处理阻碍

```sql
-- 在 psql 中依次执行：

-- 1. ext_container_status_events: 删除唯一主键
ALTER TABLE ext_container_status_events DROP CONSTRAINT ext_container_status_events_pkey;
CREATE UNIQUE INDEX idx_unique_id ON ext_container_status_events(id);

-- 2. process_port_operations: 填充 NULL 值
UPDATE process_port_operations
SET ata = COALESCE(ata, eta, etd, port_arrival_date, NOW())
WHERE ata IS NULL;

-- 3. process_sea_freight: 删除外键
ALTER TABLE biz_containers DROP CONSTRAINT biz_containers_bill_of_lading_number_fkey;

-- 4. sys_data_change_log: 删除主键
ALTER TABLE sys_data_change_log DROP CONSTRAINT sys_data_change_log_pkey;
CREATE UNIQUE INDEX idx_unique_id ON sys_data_change_log(id);
```

### 阶段 3: 执行迁移

```bash
# 方式 1: 使用修正后的脚本
Get-Content migrations\convert-to-hypertables-manual.sql | docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db

# 方式 2: 逐表执行（推荐，便于调试）
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db <<EOF
SELECT create_hypertable('ext_container_status_events', 'occurred_at', migrate_data => true);
SELECT create_hypertable('process_port_operations', 'ata', migrate_data => true);
SELECT create_hypertable('process_sea_freight', 'actual_departure_date', migrate_data => true);
SELECT create_hypertable('sys_data_change_log', 'created_at', migrate_data => true);
EOF
```

### 阶段 4: 验证和恢复

```sql
-- 1. 验证 hypertables
SELECT hypertable_schema, hypertable_name
FROM timescaledb_information.hypertables;

-- 2. 重建索引（如需要）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_events_time
ON ext_container_status_events(occurred_at DESC);

-- 3. 添加压缩策略
ALTER TABLE ext_container_status_events SET (timescaledb.compress = true);
SELECT add_compression_policy('ext_container_status_events', INTERVAL '30 days');

-- 4. 检查数据完整性
SELECT COUNT(*) FROM ext_container_status_events;
SELECT COUNT(*) FROM process_port_operations;
```

---

## ⚠️ **风险提示**

### 高风险操作

1. **删除主键**: 可能影响应用层逻辑
   - 缓解：改用唯一索引，应用层继续使用 id 查询

2. **删除外键**: 可能导致数据不一致
   - 缓解：应用层增加验证逻辑，定期运行一致性检查脚本

3. **填充 NULL 值**: 可能影响业务逻辑
   - 缓解：使用合理的默认值（如当前时间、关联字段等）

### 回滚方案

```sql
-- 如果需要回滚，使用以下命令：

-- 1. 删除 hypertable（保留数据）
SELECT drop_chunks('ext_container_status_events', interval '1 day');

-- 2. 恢复普通表结构（复杂，建议从备份恢复）
-- 最可靠的方式是从备份还原整个数据库
```

---

## 📋 **决策点**

### 需要您决定的问题：

1. **是否删除 ext_container_status_events 的主键？**
   - ✅ 推荐：是，改用唯一索引
   - ❌ 否，需要寻找其他分区字段

2. **如何填充 process_port_operations.ata 的 NULL 值？**
   - ✅ 推荐：使用 COALESCE(ata, eta, etd, NOW())
   - ❌ 或者：使用其他非空字段作为分区键

3. **是否删除 biz_containers 的外键约束？**
   - ✅ 推荐：是，改用逻辑外键 + 应用层验证
   - ❌ 否，保持现状，不转换 process_sea_freight

4. **执行时机？**
   - ✅ 推荐：业务低峰期（如凌晨）
   - ❌ 避免：业务高峰期

---

## ✅ **后续行动清单**

- [ ] 决定上述 4 个决策点
- [ ] 安排维护窗口（预计 1-2 小时）
- [ ] 通知团队和相关方
- [ ] 执行完整备份
- [ ] 手动处理阻碍（删除主键/外键、填充 NULL）
- [ ] 执行迁移脚本
- [ ] 验证转换结果
- [ ] 添加压缩和保留策略
- [ ] 性能测试
- [ ] 更新文档
- [ ] 团队培训

---

**诊断人**: AI Development Team  
**诊断依据**: 实际数据库结构和错误信息  
**下一步**: 等待决策后执行手动处理

---

## 📞 **联系与支持**

如有疑问，请提供：

1. 此诊断报告
2. 业务影响评估
3. 希望的执行时间窗口

我们将根据您的决策提供详细的执行脚本和时间规划。
