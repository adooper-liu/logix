-- ==========================================
-- container_loading_records 表结构更新
-- Container Loading Records Table Update
-- ==========================================
-- 日期: 2026-02-24
-- 说明: 添加缺失的11个字段，以匹配实体类 ContainerLoadingRecord
-- ==========================================

-- 1. 添加船舶信息
ALTER TABLE container_loading_records ADD COLUMN IF NOT EXISTS vessel_name VARCHAR(200);
ALTER TABLE container_loading_records ADD COLUMN IF NOT EXISTS voyage_number VARCHAR(50);

-- 2. 添加提单和订舱信息
ALTER TABLE container_loading_records ADD COLUMN IF NOT EXISTS bill_of_lading_number VARCHAR(100);
ALTER TABLE container_loading_records ADD COLUMN IF NOT EXISTS booking_number VARCHAR(100);

-- 3. 添加时间节点（与接口保持一致）
ALTER TABLE container_loading_records ADD COLUMN IF NOT EXISTS eta_origin TIMESTAMP;
ALTER TABLE container_loading_records ADD COLUMN IF NOT EXISTS ata_origin TIMESTAMP;
ALTER TABLE container_loading_records ADD COLUMN IF NOT EXISTS loading_date TIMESTAMP;
ALTER TABLE container_loading_records ADD COLUMN IF NOT EXISTS discharge_date TIMESTAMP;

-- 4. 添加航线和船公司信息
ALTER TABLE container_loading_records ADD COLUMN IF NOT EXISTS route_code VARCHAR(50);
ALTER TABLE container_loading_records ADD COLUMN IF NOT EXISTS carrier_code VARCHAR(50);
ALTER TABLE container_loading_records ADD COLUMN IF NOT EXISTS carrier_name VARCHAR(200);
ALTER TABLE container_loading_records ADD COLUMN IF NOT EXISTS operator VARCHAR(200);

-- 5. 重命名列以匹配实体类
ALTER TABLE container_loading_records RENAME COLUMN origin_code TO origin_port_code;
ALTER TABLE container_loading_records RENAME COLUMN destination_code TO dest_port_code;

-- 6. 添加注释
COMMENT ON COLUMN container_loading_records.vessel_name IS '船名';
COMMENT ON COLUMN container_loading_records.voyage_number IS '航次号';
COMMENT ON COLUMN container_loading_records.bill_of_lading_number IS '提单号';
COMMENT ON COLUMN container_loading_records.booking_number IS '订舱号';
COMMENT ON COLUMN container_loading_records.eta_origin IS '起运港预计到港时间';
COMMENT ON COLUMN container_loading_records.ata_origin IS '起运港实际到港时间';
COMMENT ON COLUMN container_loading_records.loading_date IS '装船日期';
COMMENT ON COLUMN container_loading_records.discharge_date IS '卸船日期';
COMMENT ON COLUMN container_loading_records.route_code IS '航线编码';
COMMENT ON COLUMN container_loading_records.carrier_code IS '船公司编码';
COMMENT ON COLUMN container_loading_records.carrier_name IS '船公司名称';
COMMENT ON COLUMN container_loading_records.operator IS '操作人';

-- 完成
SELECT 'container_loading_records table updated successfully!' AS status;
