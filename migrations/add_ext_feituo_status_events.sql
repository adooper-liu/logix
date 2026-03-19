-- ============================================================
-- 飞驼状态节点原始数据表 (ext_feituo_status_events)
-- 定位：存储飞驼API status[] 原始数据，支持完整审计
-- 版本：v1.0
-- 日期：2026-03-19
-- ============================================================
CREATE TABLE IF NOT EXISTS ext_feituo_status_events (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    bill_of_lading_number VARCHAR(50),
    
    -- 状态基本信息
    status_index INT NOT NULL,
    event_code VARCHAR(20) NOT NULL,
    description_cn VARCHAR(200),
    description_en VARCHAR(200),
    event_description_origin VARCHAR(500),
    
    -- 时间信息
    event_time TIMESTAMPTZ NOT NULL,
    is_estimated BOOLEAN DEFAULT false,
    port_timezone VARCHAR(10),
    
    -- 地点信息
    event_place VARCHAR(100),
    event_place_origin VARCHAR(200),
    port_code VARCHAR(50),
    terminal_name VARCHAR(100),
    
    -- 运输信息
    transport_mode VARCHAR(20),
    vessel_name VARCHAR(100),
    voyage_number VARCHAR(50),
    
    -- 关联
    related_place_index INT,
    source INT,
    firms_code VARCHAR(50),
    
    -- 扩展字段（部分状态码特有）
    bill_no VARCHAR(50),
    declaration_no VARCHAR(100),
    
    -- 元数据
    sync_request_id VARCHAR(100),
    data_source VARCHAR(50) DEFAULT 'API',
    raw_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE CASCADE
);

CREATE INDEX idx_feituo_status_container ON ext_feituo_status_events(container_number);
CREATE INDEX idx_feituo_status_bol ON ext_feituo_status_events(bill_of_lading_number);
CREATE INDEX idx_feituo_status_code ON ext_feituo_status_events(event_code);
CREATE INDEX idx_feituo_status_time ON ext_feituo_status_events(event_time DESC);
CREATE INDEX idx_feituo_status_created ON ext_feituo_status_events(created_at DESC);

COMMENT ON TABLE ext_feituo_status_events IS '飞驼API status[] 原始数据，支持完整审计与追溯';
