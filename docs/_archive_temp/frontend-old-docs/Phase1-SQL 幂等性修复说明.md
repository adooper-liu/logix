# SQL 脚本幂等性修复说明

**修复日期**: 2026-03-17  
**问题**: INSERT 语句导致重复键值错误  
**解决方案**: 使用 `ON CONFLICT DO UPDATE` 保证幂等性

---

## 🔧 问题描述

原 SQL 使用简单的 `INSERT INTO ... VALUES` 语法，当配置项已存在时会报错：

```sql
-- ❌ 会报错的写法
INSERT INTO dict_scheduling_config (config_key, config_value, description) VALUES
('cost_optimization_enabled', 'false', '是否启用成本优化');
```

**错误信息**:
```
ERROR: duplicate key value violates unique constraint "dict_scheduling_config_config_key_key"
DETAIL: Key (config_key)=(cost_optimization_enabled) already exists.
```

---

## ✅ 修复方案

使用 PostgreSQL 的 `ON CONFLICT DO UPDATE` 语法：

```sql
-- ✅ 幂等性写法
INSERT INTO dict_scheduling_config (config_key, config_value, description)
VALUES
  ('cost_optimization_enabled', 'false', '是否启用成本优化（true=启用，false=禁用）')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description;
```

**优点**:
1. ✅ **可重复执行**: 多次执行不会报错
2. ✅ **自动更新**: 如果配置已存在，会自动更新值和描述
3. ✅ **幂等性**: 符合数据库迁移最佳实践
4. ✅ **安全性**: 不会删除已有数据

---

## 📋 修复内容

### 修复的文件

**文件**: `migrations/001_add_scheduling_optimization_config.sql`

**修改部分**:
1. ✅ 成本优化相关配置（6 项）
2. ✅ 免费期保护相关配置（2 项）

**总计**: 8 个配置项全部改为 `ON CONFLICT DO UPDATE` 语法

---

## 🎯 执行结果

### 首次执行

```sql
-- 插入 8 条新记录
INSERT ... ON CONFLICT DO UPDATE
-- 结果：8 rows affected
```

### 再次执行

```sql
-- 更新 8 条已有记录（如果值有变化）
INSERT ... ON CONFLICT DO UPDATE
-- 结果：8 rows updated（或 0 rows 如果值未变）
```

### 验证查询

```sql
SELECT config_key, config_value, description 
FROM dict_scheduling_config 
WHERE config_key IN (
  'cost_optimization_enabled',
  'demurrage_warning_threshold',
  -- ... 其他 6 个
)
ORDER BY config_key;
```

**预期结果**: 8 行配置数据

---

## 📊 索引创建

索引创建本身已经使用了 `IF NOT EXISTS`，具有幂等性：

```sql
CREATE INDEX IF NOT EXISTS idx_demurrage_standard_port_company
ON ext_demurrage_standards(destination_port_code, shipping_company_code, is_chargeable);
```

**执行结果**:
- 第一次执行：创建索引
- 再次执行：跳过（不报错）

---

## ✅ 验证清单

执行以下 SQL 验证修复成功：

```sql
-- 1. 检查配置项（应返回 8 行）
SELECT COUNT(*) FROM dict_scheduling_config 
WHERE config_key IN (
  'cost_optimization_enabled',
  'demurrage_warning_threshold',
  'drop_off_cost_comparison_threshold',
  'search_window_days',
  'external_storage_daily_rate',
  'expedited_handling_fee',
  'prioritize_free_period',
  'free_period_buffer_days'
);

-- 2. 检查索引（应返回 3 行）
SELECT indexname 
FROM pg_indexes 
WHERE indexname IN (
  'idx_demurrage_standard_port_company',
  'idx_warehouse_occupancy_date',
  'idx_trucking_slot_occupancy'
);

-- 3. 重新执行整个脚本（应不报错）
-- \i migrations/001_add_scheduling_optimization_config.sql
```

---

## 🎉 总结

**修复状态**: ✅ 已完成

**修复效果**:
- ✅ 脚本可以重复执行，不再报重复键值错误
- ✅ 配置项会自动更新到最新值
- ✅ 索引创建保持幂等性
- ✅ 符合数据库迁移最佳实践

**下一步**:
1. ✅ 在开发环境重新执行脚本
2. ✅ 验证配置项和索引
3. ✅ 准备 Phase 2 实施

---

**修复负责人**: AI Development Team  
**修复完成时间**: 2026-03-17
