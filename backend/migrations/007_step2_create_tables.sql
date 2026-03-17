-- ============================================================
-- Step 2: Create new tables
-- 步骤 2：创建新表（还箱档期、配置表）
-- ============================================================
-- Execute this after step 1 / 在步骤 1 之后执行
-- ============================================================

-- 1. ext_trucking_return_slot_occupancy - 还箱档期专用表
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

-- 2. dict_scheduling_config - 系统配置表
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

-- 3. Verification / 验证
SELECT 
    table_name,
    'CREATED' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'ext_trucking_return_slot_occupancy',
    'dict_scheduling_config'
  );
