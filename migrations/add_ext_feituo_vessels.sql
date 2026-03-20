-- 飞驼船舶信息表
-- 用于存储飞驼Excel导入的船舶信息数据子集
-- 与 ext_feituo_places, ext_feituo_status_events 配合使用

CREATE TABLE IF NOT EXISTS ext_feituo_vessels (
  id SERIAL PRIMARY KEY,
  bill_of_lading_number VARCHAR(50) NOT NULL,
  vessel_name VARCHAR(100) NOT NULL,
  
  -- 船舶基本信息
  imo_number VARCHAR(20),
  mmsi_number VARCHAR(20),
  build_date DATE,
  flag VARCHAR(50),
  container_size VARCHAR(20),
  operator VARCHAR(100),
  
  -- 扩展信息
  vessel_name_en VARCHAR(100),
  vessel_name_cn VARCHAR(100),
  call_sign VARCHAR(50),
  vessel_type VARCHAR(50),
  
  -- 元数据
  sync_request_id VARCHAR(100),
  data_source VARCHAR(50) DEFAULT 'Excel',
  raw_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT uk_vessels_bol_vessel UNIQUE (bill_of_lading_number, vessel_name)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_feituo_vessels_bol ON ext_feituo_vessels(bill_of_lading_number);
CREATE INDEX IF NOT EXISTS idx_feituo_vessels_name ON ext_feituo_vessels(vessel_name);
CREATE INDEX IF NOT EXISTS idx_feituo_vessels_created ON ext_feituo_vessels(created_at);

COMMENT ON TABLE ext_feituo_vessels IS '飞驼船舶信息表 - 存储船舶信息数据子集';
COMMENT ON COLUMN ext_feituo_vessels.bill_of_lading_number IS '提单号';
COMMENT ON COLUMN ext_feituo_vessels.vessel_name IS '船名';
COMMENT ON COLUMN ext_feituo_vessels.imo_number IS 'IMO号';
COMMENT ON COLUMN ext_feituo_vessels.mmsi_number IS 'MMSI号';
