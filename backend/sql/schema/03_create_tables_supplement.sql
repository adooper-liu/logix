-- ============================================================
-- Supplement: Tables missing from 03_create_tables.sql
-- 补充 03_create_tables.sql 中缺失的表定义
-- ============================================================
-- Date: 2026-03-17
-- These tables exist in entities and 01_drop_all_tables.sql, 
-- but were missing in 03_create_tables.sql
-- ============================================================

-- ============================================================
-- Table 1: ext_warehouse_daily_occupancy - 仓库日产能占用
-- ============================================================

CREATE TABLE IF NOT EXISTS ext_warehouse_daily_occupancy (
    id SERIAL PRIMARY KEY,
    warehouse_code VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    planned_count INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 0,
    remaining INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ext_warehouse_daily_occupancy_unique 
        UNIQUE(warehouse_code, date)
);

COMMENT ON TABLE ext_warehouse_daily_occupancy IS 
'仓库日产能占用表（记录每日卸柜计划与容量）';

COMMENT ON COLUMN ext_warehouse_daily_occupancy.warehouse_code IS 
'仓库编码（关联 dict_warehouses.warehouse_code）';

COMMENT ON COLUMN ext_warehouse_daily_occupancy.date IS 
'日期';

COMMENT ON COLUMN ext_warehouse_daily_occupancy.planned_count IS 
'已计划卸柜数量';

COMMENT ON COLUMN ext_warehouse_daily_occupancy.capacity IS 
'总容量（来自 daily_unload_capacity）';

COMMENT ON COLUMN ext_warehouse_daily_occupancy.remaining IS 
'剩余可用容量';

-- 索引加速查询
CREATE INDEX IF NOT EXISTS idx_warehouse_occupancy_date 
ON ext_warehouse_daily_occupancy(date);

CREATE INDEX IF NOT EXISTS idx_warehouse_occupancy_warehouse 
ON ext_warehouse_daily_occupancy(warehouse_code);

-- ============================================================
-- Table 2: ext_trucking_slot_occupancy - 拖车送柜档期占用
-- ============================================================

CREATE TABLE IF NOT EXISTS ext_trucking_slot_occupancy (
    id SERIAL PRIMARY KEY,
    trucking_company_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    port_code VARCHAR(50),
    warehouse_code VARCHAR(50),
    planned_trips INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 0,
    remaining INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ext_trucking_slot_occupancy_unique 
        UNIQUE(trucking_company_id, date, COALESCE(port_code,''), COALESCE(warehouse_code,''))
);

COMMENT ON TABLE ext_trucking_slot_occupancy IS 
'拖车送柜档期占用表（记录每日送柜计划与容量）';

COMMENT ON COLUMN ext_trucking_slot_occupancy.trucking_company_id IS 
'车队 ID（关联 dict_trucking_companies.id）';

COMMENT ON COLUMN ext_trucking_slot_occupancy.date IS 
'送柜日期';

COMMENT ON COLUMN ext_trucking_slot_occupancy.port_code IS 
'目的港代码（可选，按港口×车队约束）';

COMMENT ON COLUMN ext_trucking_slot_occupancy.warehouse_code IS 
'仓库代码（可选，按仓库×车队约束）';

COMMENT ON COLUMN ext_trucking_slot_occupancy.planned_trips IS 
'已计划送柜次数';

COMMENT ON COLUMN ext_trucking_slot_occupancy.capacity IS 
'总容量（来自 daily_capacity）';

COMMENT ON COLUMN ext_trucking_slot_occupancy.remaining IS 
'剩余可用容量';

-- 索引加速查询
CREATE INDEX IF NOT EXISTS idx_trucking_slot_date 
ON ext_trucking_slot_occupancy(date);

CREATE INDEX IF NOT EXISTS idx_trucking_slot_company 
ON ext_trucking_slot_occupancy(trucking_company_id);

-- ============================================================
-- Table 3: ext_trucking_return_slot_occupancy - 拖车还箱档期占用
-- ============================================================

CREATE TABLE IF NOT EXISTS ext_trucking_return_slot_occupancy (
    id SERIAL PRIMARY KEY,
    trucking_company_id VARCHAR(50) NOT NULL,
    slot_date DATE NOT NULL,
    planned_count INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 0,
    remaining INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
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

-- 索引加速查询
CREATE INDEX IF NOT EXISTS idx_trucking_return_slot_date 
ON ext_trucking_return_slot_occupancy(slot_date);

CREATE INDEX IF NOT EXISTS idx_trucking_return_slot_company 
ON ext_trucking_return_slot_occupancy(trucking_company_id);

-- ============================================================
-- Table 4: dict_yards - 第三堆场字典
-- ============================================================

CREATE TABLE IF NOT EXISTS dict_yards (
    yard_code VARCHAR(50) PRIMARY KEY,
    yard_name VARCHAR(100) NOT NULL,
    yard_name_en VARCHAR(200),
    port_code VARCHAR(50),
    daily_capacity INTEGER DEFAULT 100,
    fee_per_day DECIMAL(10,2) DEFAULT 0.00,
    address VARCHAR(300),
    contact_phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dict_yards IS 
'第三堆场字典表（独立于车队的公共堆场）';

COMMENT ON COLUMN dict_yards.yard_code IS 
'堆场代码（主键）';

COMMENT ON COLUMN dict_yards.yard_name IS 
'堆场名称（中文）';

COMMENT ON COLUMN dict_yards.yard_name_en IS 
'堆场名称（英文）';

COMMENT ON COLUMN dict_yards.port_code IS 
'所属港口代码';

COMMENT ON COLUMN dict_yards.daily_capacity IS 
'每日可容纳柜数';

COMMENT ON COLUMN dict_yards.fee_per_day IS 
'每柜每天费用';

COMMENT ON COLUMN dict_yards.address IS 
'地址';

COMMENT ON COLUMN dict_yards.contact_phone IS 
'联系电话';

COMMENT ON COLUMN dict_yards.status IS 
'状态：ACTIVE/INACTIVE';

-- ============================================================
-- Table 5: ext_yard_daily_occupancy - 第三堆场日占用
-- ============================================================

CREATE TABLE IF NOT EXISTS ext_yard_daily_occupancy (
    id SERIAL PRIMARY KEY,
    yard_code VARCHAR(50) NOT NULL,
    yard_name VARCHAR(100),
    date DATE NOT NULL,
    planned_count INTEGER DEFAULT 0,
    capacity INTEGER DEFAULT 0,
    remaining INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ext_yard_daily_occupancy_unique 
        UNIQUE(yard_code, date)
);

COMMENT ON TABLE ext_yard_daily_occupancy IS 
'第三堆场日占用表（记录每日堆场使用）';

COMMENT ON COLUMN ext_yard_daily_occupancy.yard_code IS 
'堆场代码（关联 dict_yards.yard_code）';

COMMENT ON COLUMN ext_yard_daily_occupancy.yard_name IS 
'堆场名称（冗余字段，便于查询）';

COMMENT ON COLUMN ext_yard_daily_occupancy.date IS 
'日期';

COMMENT ON COLUMN ext_yard_daily_occupancy.planned_count IS 
'已计划存放柜数';

COMMENT ON COLUMN ext_yard_daily_occupancy.capacity IS 
'总容量（来自 daily_capacity）';

COMMENT ON COLUMN ext_yard_daily_occupancy.remaining IS 
'剩余可用容量';

-- 索引加速查询
CREATE INDEX IF NOT EXISTS idx_yard_occupancy_date 
ON ext_yard_daily_occupancy(date);

CREATE INDEX IF NOT EXISTS idx_yard_occupancy_yard 
ON ext_yard_daily_occupancy(yard_code);

-- ============================================================
-- Table 6: dict_scheduling_config - 智能排柜配置
-- ============================================================

CREATE TABLE IF NOT EXISTS dict_scheduling_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(64) UNIQUE NOT NULL,
    config_value TEXT,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dict_scheduling_config IS 
'智能排柜系统配置表';

-- 初始化默认配置
INSERT INTO dict_scheduling_config (config_key, config_value, description) VALUES
('skip_weekends', 'true', '卸柜/还箱日是否跳过周末（周六、周日）'),
('weekend_days', '[0,6]', '周末对应的星期几数组，0=周日，6=周六'),
('default_free_container_days', '7', '默认免费用箱天数（天）'),
('planning_horizon_days', '30', '排产计划展望期（天）')
ON CONFLICT (config_key) DO NOTHING;

-- ============================================================
-- Verification: Check all tables exist
-- ============================================================

SELECT 
    table_name,
    'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'ext_warehouse_daily_occupancy',
    'ext_trucking_slot_occupancy',
    'ext_trucking_return_slot_occupancy',
    'dict_yards',
    'ext_yard_daily_occupancy',
    'dict_scheduling_config'
  )
ORDER BY table_name;
