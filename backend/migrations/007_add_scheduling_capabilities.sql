-- ============================================================
-- Migration: Add intelligent scheduling capabilities
-- 智能排柜新增参数与能力（对照 Java 算法补齐）
-- ============================================================
-- Date: 2026-03-17
-- Reference: public/docs-temp/logix-scheduling-params-db-changes.md
-- Priority: P0 (Critical for Drop mode & warehouse capacity)
-- ============================================================

BEGIN;

-- ============================================================
-- Part 1: dict_trucking_companies - 车队送还能力与堆场
-- ============================================================

-- 1.1 每日还箱能力（Drop 模式关键）
ALTER TABLE dict_trucking_companies
ADD COLUMN IF NOT EXISTS daily_return_capacity INTEGER DEFAULT NULL;

COMMENT ON COLUMN dict_trucking_companies.daily_return_capacity IS 
'每日可还箱数量（柜数），用于 Drop 模式还箱日约束；NULL 表示与 daily_capacity 共用';

-- 1.2 是否有堆场（判断是否支持 Drop 模式）
ALTER TABLE dict_trucking_companies
ADD COLUMN IF NOT EXISTS has_yard BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN dict_trucking_companies.has_yard IS 
'是否有堆场：true=支持 Drop 模式（提<送）；false=必须 Live 模式（提=送=卸）';

-- 1.3 堆场日容量
ALTER TABLE dict_trucking_companies
ADD COLUMN IF NOT EXISTS yard_daily_capacity INTEGER DEFAULT NULL;

COMMENT ON COLUMN dict_trucking_companies.yard_daily_capacity IS 
'堆场每日可容纳柜数（有堆场时有效）';

-- ============================================================
-- Part 2: dict_warehouses - 仓库卸柜能力（与实体对齐）
-- ============================================================

-- 2.1 每日卸柜容量
ALTER TABLE dict_warehouses
ADD COLUMN IF NOT EXISTS daily_unload_capacity INTEGER DEFAULT 10;

COMMENT ON COLUMN dict_warehouses.daily_unload_capacity IS 
'仓库每日卸柜容量（柜数），默认 10';

-- ============================================================
-- Part 3: ext_trucking_slot_occupancy - 区分送柜/还箱
-- ============================================================

-- 3.1 添加 slot_type 字段（若表已存在）
-- 注意：此部分需要手动执行或使用 psql 命令行，因为 pgAdmin 的 DO 块可能有问题

-- 先检查表是否存在，如果存在则添加字段
-- 方法 A：直接执行（如果表已存在）
ALTER TABLE ext_trucking_slot_occupancy
ADD COLUMN IF NOT EXISTS slot_type VARCHAR(16) DEFAULT 'delivery';

COMMENT ON COLUMN ext_trucking_slot_occupancy.slot_type IS 
'档期类型：delivery=送柜，return=还箱';

-- 更新现有记录为 delivery
UPDATE ext_trucking_slot_occupancy 
SET slot_type = 'delivery' 
WHERE slot_type IS NULL OR slot_type = '';

-- 如果需要删除旧约束并创建新约束，请手动执行以下 SQL：
-- ALTER TABLE ext_trucking_slot_occupancy 
-- DROP CONSTRAINT IF EXISTS ext_trucking_slot_occupancy_trucking_company_id_date_port_code_key;
-- 
-- ALTER TABLE ext_trucking_slot_occupancy
-- ADD CONSTRAINT ext_trucking_slot_occupancy_unique_slot 
-- UNIQUE(trucking_company_id, date, slot_type, COALESCE(port_code,''), COALESCE(warehouse_code,''));

-- ============================================================
-- Part 4: ext_trucking_return_slot_occupancy - 还箱档期专用表
-- ============================================================

CREATE TABLE IF NOT EXISTS ext_trucking_return_slot_occupancy (
    id SERIAL PRIMARY KEY,
    trucking_company_id VARCHAR(50) NOT NULL,
    slot_date DATE NOT NULL,
    planned_count INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 0,
    remaining INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT ext_trucking_return_slot_occupancy_unique 
        UNIQUE(trucking_company_id, slot_date)
);

COMMENT ON TABLE ext_trucking_return_slot_occupancy IS 
'拖车还箱档期占用表（Drop 模式下还箱日使用）';

COMMENT ON COLUMN ext_trucking_return_slot_occupancy.trucking_company_id IS 
'车队 ID（关联 dict_trucking_companies.id）';

COMMENT ON COLUMN ext_trucking_return_slot_occupancy.slot_date IS 
'还箱日期';

COMMENT ON COLUMN ext_trucking_return_slot_occupancy.planned_count IS 
'已计划还箱数量';

COMMENT ON COLUMN ext_trucking_return_slot_occupancy.capacity IS 
'总容量（来自 daily_return_capacity）';

COMMENT ON COLUMN ext_trucking_return_slot_occupancy.remaining IS 
'剩余可用容量';

-- 创建索引加速查询
CREATE INDEX IF NOT EXISTS idx_trucking_return_slot_date 
ON ext_trucking_return_slot_occupancy(slot_date);

CREATE INDEX IF NOT EXISTS idx_trucking_return_slot_company 
ON ext_trucking_return_slot_occupancy(trucking_company_id);

-- ============================================================
-- Part 5: 系统配置表（周末跳过等）
-- ============================================================

CREATE TABLE IF NOT EXISTS dict_scheduling_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(64) UNIQUE NOT NULL,
    config_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE dict_scheduling_config IS 
'智能排柜系统配置表';

-- 插入默认配置
INSERT INTO dict_scheduling_config (config_key, config_value, description) VALUES
('skip_weekends', 'true', '卸柜/还箱日是否跳过周末（周六、周日）'),
('weekend_days', '[0,6]', '周末对应的星期几数组，0=周日，6=周六'),
('default_free_container_days', '7', '默认免费用箱天数（天）'),
('planning_horizon_days', '30', '排产计划展望期（天）')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- Part 6: 初始化数据（示例）
-- ============================================================

-- 6.1 初始化车队的还箱能力（若无数据，复制 daily_capacity）
UPDATE dict_trucking_companies
SET daily_return_capacity = daily_capacity
WHERE daily_return_capacity IS NULL AND daily_capacity IS NOT NULL;

-- 6.2 初始化有堆场的车队（示例：假设某些车队有堆场）
-- 注意：实际值需要根据业务情况手动配置
-- UPDATE dict_trucking_companies
-- SET has_yard = TRUE, yard_daily_capacity = 50
-- WHERE id IN ('TRUCK_001', 'TRUCK_002');

-- ============================================================
-- Part 7: 验证查询
-- ============================================================

-- 检查所有修改是否成功
SELECT 
    'dict_trucking_companies' as table_name,
    COUNT(*) as new_columns
FROM information_schema.columns 
WHERE table_name = 'dict_trucking_companies' 
  AND column_name IN ('daily_return_capacity', 'has_yard', 'yard_daily_capacity')

UNION ALL

SELECT 
    'dict_warehouses' as table_name,
    COUNT(*) as new_columns
FROM information_schema.columns 
WHERE table_name = 'dict_warehouses' 
  AND column_name = 'daily_unload_capacity'

UNION ALL

SELECT 
    'ext_trucking_return_slot_occupancy' as table_name,
    1 as exists_flag
FROM information_schema.tables 
WHERE table_name = 'ext_trucking_return_slot_occupancy';

COMMIT;

-- ============================================================
-- Rollback 脚本（如需回滚）
-- ============================================================
/*
BEGIN;

-- 删除新表
DROP TABLE IF EXISTS ext_trucking_return_slot_occupancy CASCADE;
DROP TABLE IF EXISTS dict_scheduling_config CASCADE;

-- 恢复 ext_trucking_slot_occupancy（删除 slot_type）
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
*/
