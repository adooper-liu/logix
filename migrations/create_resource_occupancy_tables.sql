-- P3 智能排柜 - 资源占用表
-- 用于记录仓库、车队、堆场的日产能/容量占用

-- 1. 仓库日产能占用表
CREATE TABLE IF NOT EXISTS ext_warehouse_daily_occupancy (
    id SERIAL PRIMARY KEY,
    warehouse_code VARCHAR(50) NOT NULL REFERENCES dict_warehouses(warehouse_code) ON DELETE CASCADE,
    date DATE NOT NULL,
    planned_count INT DEFAULT 0,        -- 已计划卸柜数
    capacity INT NOT NULL DEFAULT 0,     -- 日产能上限
    remaining INT GENERATED ALWAYS AS (capacity - planned_count) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(warehouse_code, date)
);

CREATE INDEX idx_warehouse_occupancy_warehouse ON ext_warehouse_daily_occupancy(warehouse_code);
CREATE INDEX idx_warehouse_occupancy_date ON ext_warehouse_daily_occupancy(date);

-- 2. 拖车日容量占用表
CREATE TABLE IF NOT EXISTS ext_trucking_slot_occupancy (
    id SERIAL PRIMARY KEY,
    trucking_company_id VARCHAR(50) NOT NULL REFERENCES dict_trucking_companies(company_code) ON DELETE CASCADE,
    date DATE NOT NULL,
    port_code VARCHAR(50),               -- 港口（可选，用于路线区分）
    warehouse_code VARCHAR(50),          -- 仓库（可选，用于路线区分）
    planned_trips INT DEFAULT 0,         -- 已计划行程数
    capacity INT NOT NULL DEFAULT 0,    -- 日容量上限
    remaining INT GENERATED ALWAYS AS (capacity - planned_trips) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trucking_company_id, date, port_code, warehouse_code)
);

CREATE INDEX idx_trucking_occupancy_company ON ext_trucking_slot_occupancy(trucking_company_id);
CREATE INDEX idx_trucking_occupancy_date ON ext_trucking_slot_occupancy(date);

-- 3. 第三堆场日占用表
CREATE TABLE IF NOT EXISTS ext_yard_daily_occupancy (
    id SERIAL PRIMARY KEY,
    yard_code VARCHAR(50) NOT NULL,
    yard_name VARCHAR(100),
    date DATE NOT NULL,
    planned_count INT DEFAULT 0,         -- 已堆存柜数
    capacity INT NOT NULL DEFAULT 0,    -- 日容量上限
    remaining INT GENERATED ALWAYS AS (capacity - planned_count) STORED,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(yard_code, date)
);

CREATE INDEX idx_yard_occupancy_yard ON ext_yard_daily_occupancy(yard_code);
CREATE INDEX idx_yard_occupancy_date ON ext_yard_daily_occupancy(date);

-- 4. 堆场字典与费用表（用于方案二决策）
CREATE TABLE IF NOT EXISTS dict_yards (
    yard_code VARCHAR(50) PRIMARY KEY,
    yard_name VARCHAR(100) NOT NULL,
    yard_name_en VARCHAR(200),
    port_code VARCHAR(50),               -- 关联港口
    daily_capacity INT NOT NULL DEFAULT 100,
    fee_per_day DECIMAL(10, 2) DEFAULT 0,  -- 每日费用
    address VARCHAR(300),
    contact_phone VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_yards_port ON dict_yards(port_code);
