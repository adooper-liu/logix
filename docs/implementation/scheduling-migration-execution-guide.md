# 智能排柜数据库迁移执行指南

**日期**: 2026-03-17  
**状态**: ✅ 已修复（分步版本）

---

## ⚠️ 问题说明

原迁移脚本 `007_add_scheduling_capabilities.sql` 在 pgAdmin 中执行时遇到语法错误：

```
ERROR: syntax error at or near "CONSTRAINT"
```

**原因**: pgAdmin 的 DO 块中不能使用 `DROP CONSTRAINT IF EXISTS` 语法。

**解决方案**: 已将迁移脚本拆分为多个独立的步骤，便于分步执行和验证。

---

## 📋 执行步骤

### ✅ 步骤 1：为现有表添加字段

**文件**: `backend/migrations/007_step1_add_columns.sql`

**内容**:

- dict_trucking_companies: daily_return_capacity, has_yard, yard_daily_capacity
- dict_warehouses: daily_unload_capacity
- 初始化数据（复制 daily_capacity 到 daily_return_capacity）

**执行方式**:

```bash
# 方法 A: psql 命令行
psql -U postgres -d logix -f backend/migrations/007_step1_add_columns.sql

# 方法 B: pgAdmin
# 1. 打开 Query Tool
# 2. 加载文件：File → Open File → 选择 007_step1_add_columns.sql
# 3. 点击 Execute (F5)
```

**预期结果**:

```
dict_trucking_companies.daily_return_capacity - ADDED
dict_trucking_companies.has_yard - ADDED
dict_trucking_companies.yard_daily_capacity - ADDED
dict_warehouses.daily_unload_capacity - ADDED
```

**验证 SQL**:

```sql
SELECT
    table_name,
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name IN ('dict_trucking_companies', 'dict_warehouses')
  AND column_name IN (
    'daily_return_capacity', 'has_yard', 'yard_daily_capacity',
    'daily_unload_capacity'
  )
ORDER BY table_name, column_name;
```

---

### ✅ 步骤 2：创建新表

**文件**: `backend/migrations/007_step2_create_tables.sql`

**内容**:

- ext_trucking_return_slot_occupancy（还箱档期表）
- dict_scheduling_config（系统配置表）
- 插入默认配置（skip_weekends 等）

**执行方式**:

```bash
# psql 命令行
psql -U postgres -d logix -f backend/migrations/007_step2_create_tables.sql

# pgAdmin
# 加载并执行 007_step2_create_tables.sql
```

**预期结果**:

```
ext_trucking_return_slot_occupancy - CREATED
dict_scheduling_config - CREATED
```

**验证 SQL**:

```sql
SELECT
    table_name,
    'CREATED' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'ext_trucking_return_slot_occupancy',
    'dict_scheduling_config'
  );
```

---

### ⚠️ 步骤 3：修改现有表（可选）

**文件**: `backend/migrations/007_step3_modify_slot_table.sql`

**用途**: 仅当 `ext_trucking_slot_occupancy` 表已存在时才需要执行

**内容**:

- 添加 slot_type 字段（区分送柜/还箱）
- 更新现有记录为 'delivery'
- （可选）删除旧约束并添加新约束

**注意**: 此脚本包含多个子步骤，建议手动分步执行：

```sql
-- Step 3.1: 添加字段
ALTER TABLE ext_trucking_slot_occupancy
ADD COLUMN IF NOT EXISTS slot_type VARCHAR(16) DEFAULT 'delivery';

-- Step 3.2: 添加注释
COMMENT ON COLUMN ext_trucking_slot_occupancy.slot_type IS
'档期类型：delivery=送柜，return=还箱';

-- Step 3.3: 更新现有记录
UPDATE ext_trucking_slot_occupancy
SET slot_type = 'delivery'
WHERE slot_type IS NULL OR slot_type = '';

-- Step 3.4: 删除旧约束（如果需要）
-- 先在 pgAdmin 中查看表的 Constraints，然后手动删除
-- ALTER TABLE ext_trucking_slot_occupancy
-- DROP CONSTRAINT IF EXISTS ext_trucking_slot_occupancy_trucking_company_id_date_port_code_key;

-- Step 3.5: 添加新约束（如果需要）
-- ALTER TABLE ext_trucking_slot_occupancy
-- ADD CONSTRAINT ext_trucking_slot_occupancy_unique_slot
-- UNIQUE(trucking_company_id, date, slot_type, COALESCE(port_code,''), COALESCE(warehouse_code,''));
```

**验证 SQL**:

```sql
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'ext_trucking_slot_occupancy'
  AND column_name = 'slot_type';
```

---

## 🔍 完整验证

执行完所有步骤后，运行以下验证查询：

```sql
-- 1. 检查车队表新字段
SELECT
    'dict_trucking_companies' as table_name,
    COUNT(*) as new_columns
FROM information_schema.columns
WHERE table_name = 'dict_trucking_companies'
  AND column_name IN ('daily_return_capacity', 'has_yard', 'yard_daily_capacity');

-- 2. 检查仓库表新字段
SELECT
    'dict_warehouses' as table_name,
    COUNT(*) as new_columns
FROM information_schema.columns
WHERE table_name = 'dict_warehouses'
  AND column_name = 'daily_unload_capacity';

-- 3. 检查新创建的表
SELECT
    'ext_trucking_return_slot_occupancy' as table_name,
    1 as exists_flag
FROM information_schema.tables
WHERE table_name = 'ext_trucking_return_slot_occupancy';

-- 4. 检查配置表
SELECT
    config_key,
    config_value,
    description
FROM dict_scheduling_config;
```

**期望输出**:

```
table_name                  | new_columns
----------------------------+------------
dict_trucking_companies     | 3
dict_warehouses             | 1
ext_trucking_return_slot_occupancy | 1

config_key                      | config_value
--------------------------------+--------------
skip_weekends                   | true
weekend_days                    | [0,6]
default_free_container_days     | 7
planning_horizon_days           | 30
```

---

## 📁 文件清单

| 文件                                        | 用途               | 执行顺序 |
| ------------------------------------------- | ------------------ | -------- |
| `007_step1_add_columns.sql`                 | 为现有表添加字段   | 第 1 步  |
| `007_step2_create_tables.sql`               | 创建新表           | 第 2 步  |
| `007_step3_modify_slot_table.sql`           | 修改现有表（可选） | 第 3 步  |
| `007_add_scheduling_capabilities_fixed.sql` | 修复版完整脚本     | 备选方案 |

---

## 🔄 回滚脚本（如需撤销）

```sql
BEGIN;

-- 删除新表
DROP TABLE IF EXISTS ext_trucking_return_slot_occupancy CASCADE;
DROP TABLE IF EXISTS dict_scheduling_config CASCADE;

-- 恢复 ext_trucking_slot_occupancy（如果修改了）
ALTER TABLE ext_trucking_slot_occupancy
DROP COLUMN IF EXISTS slot_type CASCADE;

-- 删除新增字段
ALTER TABLE dict_trucking_companies
DROP COLUMN IF EXISTS daily_return_capacity CASCADE,
DROP COLUMN IF EXISTS has_yard CASCADE,
DROP COLUMN IF EXISTS yard_daily_capacity CASCADE;

ALTER TABLE dict_warehouses
DROP COLUMN IF EXISTS daily_unload_capacity CASCADE;

COMMIT;
```

---

## ❓ 常见问题

### Q1: 提示"表不存在"错误

**A**: 步骤 3 仅在 `ext_trucking_slot_occupancy` 表已存在时才需要执行。如果是新环境，请先执行 `03_create_tables_supplement.sql` 创建该表。

### Q2: pgAdmin 执行 DO 块报错

**A**: 已移除所有 DO 块。如果仍有问题，请手动分步执行 SQL 语句。

### Q3: 约束删除失败

**A**: 这是正常的，如果约束不存在会报错。请在 pgAdmin 中先查看表的 Constraints，确认存在后再删除。

### Q4: 如何确认执行成功？

**A**: 执行"完整验证"部分的 SQL，检查输出是否符合预期。

---

## ✅ 下一步

数据库修改完成后，请继续：

1. **更新 TypeORM 实体**

   - TruckingCompany: 添加 dailyReturnCapacity, hasYard, yardDailyCapacity
   - Warehouse: 添加 dailyUnloadCapacity
   - ExtTruckingReturnSlotOccupancy: 新建实体

2. **修改排产逻辑** (`intelligentScheduling.service.ts`)

   - 读取新字段
   - 扣减还箱档期
   - 添加周末跳过逻辑

3. **测试验证**
   - Live load 模式测试
   - Drop off 模式测试
   - 周末跳过测试

---

**总结**: 按步骤执行上述 SQL 脚本，即可完成数据库升级。如有问题，请参考验证 SQL 和常见问题解答。
