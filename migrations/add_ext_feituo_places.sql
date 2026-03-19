-- ============================================================
-- 飞驼地点原始数据表 (ext_feituo_places)
-- 定位：存储飞驼API places[] 原始数据，支持完整审计
-- 版本：v1.0
-- 日期：2026-03-19
-- ============================================================
CREATE TABLE IF NOT EXISTS ext_feituo_places (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    bill_of_lading_number VARCHAR(50),
    
    -- 地点基本信息
    place_index INT NOT NULL,
    place_type INT NOT NULL,
    port_code VARCHAR(50),
    port_name VARCHAR(100),
    port_name_en VARCHAR(100),
    port_name_cn VARCHAR(100),
    name_origin VARCHAR(200),
    
    -- 原始时间字段（飞驼 API 返回）
    sta TIMESTAMPTZ,
    eta TIMESTAMPTZ,
    ata TIMESTAMPTZ,
    ata_ais TIMESTAMPTZ,
    atb_ais TIMESTAMPTZ,
    disc TIMESTAMPTZ,
    std TIMESTAMPTZ,
    etd TIMESTAMPTZ,
    atd TIMESTAMPTZ,
    atd_ais TIMESTAMPTZ,
    atbd_ais TIMESTAMPTZ,
    load TIMESTAMPTZ,
    
    -- 运输信息
    vessel_name VARCHAR(100),
    voyage_number VARCHAR(50),
    transport_mode_in VARCHAR(20),
    transport_mode_out VARCHAR(20),
    terminal_name VARCHAR(100),
    container_count_in VARCHAR(20),
    container_count_out VARCHAR(20),
    
    -- 坐标与时区
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    port_timezone VARCHAR(10),
    firms_code VARCHAR(50),
    
    -- 元数据
    sync_request_id VARCHAR(100),
    data_source VARCHAR(50) DEFAULT 'API',
    raw_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE CASCADE
);

CREATE INDEX idx_feituo_places_container ON ext_feituo_places(container_number);
CREATE INDEX idx_feituo_places_bol ON ext_feituo_places(bill_of_lading_number);
CREATE INDEX idx_feituo_places_type ON ext_feituo_places(place_type);
CREATE INDEX idx_feituo_places_created ON ext_feituo_places(created_at DESC);

COMMENT ON TABLE ext_feituo_places IS '飞驼API places[] 原始数据，支持完整审计与追溯';
COMMENT ON COLUMN ext_feituo_places.place_type IS '飞驼type: 1=起运港接货, 2=起运港码头, 4=中转港, 5=目的港';
