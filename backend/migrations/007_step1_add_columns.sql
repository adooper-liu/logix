-- ============================================================
-- Step 1: Add columns to existing tables
-- 步骤 1：为现有表添加新字段
-- ============================================================
-- Execute this first / 首先执行此脚本
-- ============================================================

-- 1. dict_trucking_companies - 车队送还能力与堆场
ALTER TABLE dict_trucking_companies
ADD COLUMN IF NOT EXISTS daily_return_capacity INTEGER DEFAULT NULL;

COMMENT ON COLUMN dict_trucking_companies.daily_return_capacity IS 
'每日可还箱数量（柜数），用于 Drop 模式还箱日约束；NULL 表示与 daily_capacity 共用';

ALTER TABLE dict_trucking_companies
ADD COLUMN IF NOT EXISTS has_yard BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN dict_trucking_companies.has_yard IS 
'是否有堆场：true=支持 Drop 模式（提<送）；false=必须 Live 模式（提=送=卸）';

ALTER TABLE dict_trucking_companies
ADD COLUMN IF NOT EXISTS yard_daily_capacity INTEGER DEFAULT NULL;

COMMENT ON COLUMN dict_trucking_companies.yard_daily_capacity IS 
'堆场每日可容纳柜数（有堆场时有效）';

-- 2. dict_warehouses - 仓库卸柜能力
ALTER TABLE dict_warehouses
ADD COLUMN IF NOT EXISTS daily_unload_capacity INTEGER DEFAULT 10;

COMMENT ON COLUMN dict_warehouses.daily_unload_capacity IS 
'仓库每日卸柜容量（柜数），默认 10';

-- 3. Initialize data / 初始化数据
UPDATE dict_trucking_companies
SET daily_return_capacity = daily_capacity
WHERE daily_return_capacity IS NULL AND daily_capacity IS NOT NULL;

-- 4. Verification / 验证
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
