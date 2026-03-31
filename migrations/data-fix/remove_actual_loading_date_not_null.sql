-- ============================================================
-- 移除 actual_loading_date 字段的 NOT NULL 约束
-- 
-- 原因：实际装船时间在导入时可能还不知道
-- 场景：订舱阶段只有预计出运日期，实际装船时间要等货物装船后才能确定
-- ============================================================

-- 检查当前约束情况
SELECT 
    column_name, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'process_sea_freight' 
  AND column_name = 'actual_loading_date';

-- 由于 actual_loading_date 是 hypertable 的分区键，直接修改约束可能不可行
-- 需要先检查是否有依赖

-- 方案 1：如果可以直接修改（非分区键或 TimescaleDB 允许）
-- ALTER TABLE process_sea_freight 
-- ALTER COLUMN actual_loading_date DROP NOT NULL;

-- 方案 2：如果需要保留分区键的 NOT NULL 约束，使用默认值
-- ALTER TABLE process_sea_freight 
-- ALTER COLUMN actual_loading_date SET DEFAULT CURRENT_DATE;

-- 推荐方案：保持现有设计，在应用层处理
-- 1. 飞驼导入：使用 fallback 链 + 默认值 new Date()
-- 2. 普通货柜导入：添加字段映射，允许用户不提供该字段

-- 验证脚本
SELECT 
    COUNT(*) AS total_records,
    COUNT(actual_loading_date) AS with_loading_date,
    COUNT(*) - COUNT(actual_loading_date) AS null_loading_date
FROM process_sea_freight;
