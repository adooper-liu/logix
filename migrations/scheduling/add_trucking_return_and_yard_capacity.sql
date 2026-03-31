-- 补充车队还箱能力和堆场能力
-- 用于智能排产的完整参数支持

-- 1. 添加车队还箱日容量
ALTER TABLE dict_trucking_companies
ADD COLUMN IF NOT EXISTS daily_return_capacity INT DEFAULT NULL;

-- 2. 添加车队堆场标志和容量
ALTER TABLE dict_trucking_companies
ADD COLUMN IF NOT EXISTS has_yard BOOLEAN DEFAULT FALSE;

ALTER TABLE dict_trucking_companies
ADD COLUMN IF NOT EXISTS yard_daily_capacity INT DEFAULT NULL;

-- 添加注释
COMMENT ON COLUMN dict_trucking_companies.daily_return_capacity IS 
'车队还箱日容量（柜/天），用于智能排产还箱档期占用，NULL 表示使用 daily_capacity';

COMMENT ON COLUMN dict_trucking_companies.has_yard IS 
'车队是否有堆场，TRUE 表示有堆场可堆存空柜';

COMMENT ON COLUMN dict_trucking_companies.yard_daily_capacity IS 
'车队堆场日容量（柜/天），NULL 表示无限制或使用默认值';

-- 3. 创建车队还箱档期占用表（如果不存在）
CREATE TABLE IF NOT EXISTS ext_trucking_return_slot_occupancy (
    id SERIAL PRIMARY KEY,
    trucking_company_id VARCHAR(50) NOT NULL,
    trucking_company_name VARCHAR(200),
    country VARCHAR(50) NOT NULL,
    slot_date DATE NOT NULL,
    slot_type VARCHAR(20) DEFAULT 'RETURN',
    used_capacity INTEGER DEFAULT 0,
    max_capacity INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trucking_return_slot_company ON ext_trucking_return_slot_occupancy(trucking_company_id);
CREATE INDEX idx_trucking_return_slot_date ON ext_trucking_return_slot_occupancy(slot_date);
CREATE INDEX idx_trucking_return_slot_type ON ext_trucking_return_slot_occupancy(slot_type);

COMMENT ON TABLE ext_trucking_return_slot_occupancy IS 
'车队还箱档期占用表，记录每日还箱能力占用情况';

COMMENT ON COLUMN ext_trucking_return_slot_occupancy.slot_type IS 
'档期类型：RETURN=还箱，PICKUP=提柜';

-- 4. 补充堆场占用表（如果不存在）
CREATE TABLE IF NOT EXISTS dict_yards (
    id SERIAL PRIMARY KEY,
    yard_code VARCHAR(50) NOT NULL UNIQUE,
    yard_name VARCHAR(200) NOT NULL,
    country VARCHAR(50) NOT NULL,
    trucking_company_id VARCHAR(50),
    trucking_company_name VARCHAR(200),
    daily_capacity INTEGER DEFAULT 20,
    address TEXT,
    contact_info TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_yards_country ON dict_yards(country);
CREATE INDEX idx_yards_company ON dict_yards(trucking_company_id);

COMMENT ON TABLE dict_yards IS 
'堆场字典表，记录可用堆场信息';

-- 5. 创建堆场占用表（如果不存在）
CREATE TABLE IF NOT EXISTS ext_yard_daily_occupancy (
    id SERIAL PRIMARY KEY,
    yard_id INTEGER NOT NULL REFERENCES dict_yards(id),
    yard_code VARCHAR(50) NOT NULL,
    yard_name VARCHAR(200),
    country VARCHAR(50) NOT NULL,
    occupancy_date DATE NOT NULL,
    used_capacity INTEGER DEFAULT 0,
    max_capacity INTEGER DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_yard_occupancy_yard ON ext_yard_daily_occupancy(yard_id);
CREATE INDEX idx_yard_occupancy_date ON ext_yard_daily_occupancy(occupancy_date);

COMMENT ON TABLE ext_yard_daily_occupancy IS 
'堆场日占用表，记录每日堆场容量占用';

-- 6. 创建系统配置表（如果不存在）
CREATE TABLE IF NOT EXISTS dict_scheduling_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'STRING',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE dict_scheduling_config IS 
'智能排产配置表，存放 skip_weekends 等配置参数';

-- 7. 插入默认配置
INSERT INTO dict_scheduling_config (config_key, config_value, config_type, description) VALUES
('skip_weekends', 'true', 'BOOLEAN', '智能排产是否跳过周末'),
('default_pickup_days_before_customs', '1', 'INTEGER', '默认提柜在清关前 N 天'),
('default_delivery_days_after_pickup', '1', 'INTEGER', '默认送仓在提柜后 N 天'),
('default_return_days_after_unload', '7', 'INTEGER', '默认还箱在卸柜后 N 天')
ON CONFLICT (config_key) DO NOTHING;
