-- 添加查验记录表和事件履历表
-- 执行顺序：在 03_create_tables.sql 之后执行

-- 查验记录表
CREATE TABLE IF NOT EXISTS ext_inspection_records (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    inspection_notice_date TIMESTAMP,
    inspection_planned_date TIMESTAMP,
    inspection_date TIMESTAMP,
    inspection_type VARCHAR(50),
    inspection_skus JSONB,
    customs_question TEXT,
    customs_requirement TEXT,
    customs_deadline VARCHAR(100),
    pre_shipment_risk_assessment TEXT,
    response_measures TEXT,
    customs_final_decision TEXT,
    latest_status TEXT,
    customs_clearance_status VARCHAR(50),
    demurrage_fee DECIMAL(10,2),
    responsibility_determination TEXT,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100),
    data_source VARCHAR(20),
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number)
);

-- 查验事件履历表
CREATE TABLE IF NOT EXISTS ext_inspection_events (
    id SERIAL PRIMARY KEY,
    inspection_record_id INTEGER NOT NULL,
    event_date TIMESTAMP NOT NULL,
    event_status TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (inspection_record_id) REFERENCES ext_inspection_records(id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_ext_inspection_records_container_number ON ext_inspection_records(container_number);
CREATE INDEX IF NOT EXISTS idx_ext_inspection_events_inspection_record_id ON ext_inspection_events(inspection_record_id);

-- 注释
COMMENT ON TABLE ext_inspection_records IS '查验记录表，存储货柜的查验详细信息';
COMMENT ON TABLE ext_inspection_events IS '查验事件履历表，按时间顺序记录查验的关键节点';
