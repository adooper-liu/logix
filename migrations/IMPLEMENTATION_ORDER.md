# 智能排产数据库迁移实施顺序

## 迁移文件列表

### P0 - 必须执行（核心功能）
1. **add_daily_unload_capacity_to_warehouses.sql** ✓
   - 已存在，添加仓库日卸柜能力
   - 表：dict_warehouses.daily_unload_capacity

2. **add_daily_capacity_to_trucking_companies.sql** ✓
   - 已存在，添加车队日提柜能力
   - 表：dict_trucking_companies.daily_capacity

3. **create_resource_occupancy_tables.sql** ✓
   - 已存在，创建基础占用表
   - 包含：ext_warehouse_daily_occupancy、ext_trucking_slot_occupancy、ext_yard_daily_occupancy（基础版本）
   - **注意**：此文件创建的是基础版本，ext_yard_daily_occupancy 使用 yard_code 而非 yard_id

4. **add_trucking_return_and_yard_capacity.sql** ✓
   - 新建，补充车队还箱能力和完整堆场支持
   - 包含：
     - dict_trucking_companies.daily_return_capacity
     - dict_trucking_companies.has_yard
     - dict_trucking_companies.yard_daily_capacity
     - ext_trucking_return_slot_occupancy（新建）
     - dict_yards（新建，堆场字典）
     - ext_yard_daily_occupancy（新建，完整版本，含 yard_id 外键）
     - dict_scheduling_config（新建，系统配置）
   - **重要**：此文件中的 ext_yard_daily_occupancy 与 create_resource_occupancy_tables.sql 中的不冲突，是更完整的版本

### P1 - 推荐执行（性能优化）
5. **add_scheduling_config_indexes.sql** ✓
   - 新建，优化查询性能
   - 索引：仓库、车队提柜、车队还箱、堆场占用复合索引

## 执行顺序

```bash
# 1. 执行 P0 核心迁移（按顺序）
psql -U logix_user -d logix_db -f migrations/add_daily_unload_capacity_to_warehouses.sql
psql -U logix_user -d logix_db -f migrations/add_daily_capacity_to_trucking_companies.sql
psql -U logix_user -d logix_db -f migrations/add_trucking_return_and_yard_capacity.sql
psql -U logix_user -d logix_db -f migrations/create_resource_occupancy_tables.sql

# 2. 执行 P1 性能优化
psql -U logix_user -d logix_db -f migrations/add_scheduling_config_indexes.sql

# 3. 验证数据
psql -U logix_user -d logix_db -c "\dt ext_*"
psql -U logix_user -d logix_db -c "\d dict_trucking_companies"
psql -U logix_user -d logix_db -c "\d dict_warehouses"
psql -U logix_user -d logix_db -c "SELECT * FROM dict_scheduling_config"
```

## 验证 SQL

### 检查表结构
```sql
-- 检查车队表
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'dict_trucking_companies'
AND column_name IN ('daily_capacity', 'daily_return_capacity', 'has_yard', 'yard_daily_capacity');

-- 检查仓库表
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'dict_warehouses'
AND column_name = 'daily_unload_capacity';

-- 检查新建表
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
  'ext_trucking_return_slot_occupancy',
  'dict_yards',
  'ext_yard_daily_occupancy',
  'dict_scheduling_config'
);
```

### 检查索引
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN (
  'ext_warehouse_daily_occupancy',
  'ext_trucking_slot_occupancy',
  'ext_trucking_return_slot_occupancy',
  'ext_yard_daily_occupancy'
)
AND indexname LIKE 'idx_%';
```

### 检查默认配置
```sql
SELECT config_key, config_value, config_type, description
FROM dict_scheduling_config
ORDER BY config_key;
```

## 回滚方案

如果需要回滚：

```bash
# 删除新建表（注意：会丢失数据）
psql -U logix_user -d logix_db -c "DROP TABLE IF EXISTS ext_trucking_return_slot_occupancy"
psql -U logix_user -d logix_db -c "DROP TABLE IF EXISTS ext_yard_daily_occupancy"
psql -U logix_user -d logix_db -c "DROP TABLE IF EXISTS dict_yards"
psql -U logix_user -d logix_db -c "DROP TABLE IF EXISTS dict_scheduling_config"

# 删除字段（注意：会丢失数据）
psql -U logix_user -d logix_db -c "ALTER TABLE dict_trucking_companies DROP COLUMN IF EXISTS daily_return_capacity"
psql -U logix_user -d logix_db -c "ALTER TABLE dict_trucking_companies DROP COLUMN IF EXISTS has_yard"
psql -U logix_user -d logix_db -c "ALTER TABLE dict_trucking_companies DROP COLUMN IF EXISTS yard_daily_capacity"
```

## 注意事项

1. **备份数据**：执行迁移前备份数据库
2. **执行环境**：建议在测试环境先验证
3. **并发控制**：迁移期间避免有其他排产操作
4. **默认值**：新增字段都有合理默认值，不影响现有功能
5. **索引创建**：P1 索引优化建议在数据量较大时执行，可能耗时较长

## 后续步骤

迁移完成后，需要：

1. **更新实体**：backend/src/entities/ 中对应实体添加新字段
2. **更新服务**：intelligentScheduling.service.ts 使用新参数
3. **测试验证**：执行智能排产，验证占用逻辑正确性
4. **文档更新**：更新 API 文档和配置说明
