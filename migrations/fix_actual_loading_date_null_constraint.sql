-- ============================================================
-- 修复 actual_loading_date 字段的 NOT NULL 约束问题
-- 该字段应该允许 NULL 值，因为不是所有海运记录都有装船时间
-- ============================================================

-- 由于 actual_loading_date 是 hypertable 的分区键，不能直接修改约束
-- 需要重建表或接受当前设计（要求必须有装船时间）

-- 方案 1：如果业务上确实应该有装船时间，保持现状
-- 方案 2：如果业务上允许没有装船时间，需要创建迁移脚本处理历史数据

-- 检查有多少条记录的 actual_loading_date 为 NULL
SELECT 
    COUNT(*) AS total_records,
    COUNT(actual_loading_date) AS with_loading_date,
    COUNT(*) - COUNT(actual_loading_date) AS null_loading_date
FROM process_sea_freight;

-- 如果需要修复，先更新 NULL 值为一个合理的默认值（如 CURRENT_DATE）
-- UPDATE process_sea_freight 
-- SET actual_loading_date = CURRENT_DATE 
-- WHERE actual_loading_date IS NULL;

-- 然后尝试删除 NOT NULL 约束（但这在 hypertable 上可能不可行）
-- ALTER TABLE process_sea_freight 
-- ALTER COLUMN actual_loading_date DROP NOT NULL;

-- 建议：保持当前设计，确保导入数据时提供 actual_loading_date 字段
