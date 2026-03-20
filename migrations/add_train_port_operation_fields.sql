-- 添加火车/海铁联运专用字段到process_port_operations表
-- 用于支持海铁联运场景下的火车到站、卸箱、最后免费日等时间跟踪

ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS train_arrival_date TIMESTAMP;
ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS train_discharge_date TIMESTAMP;
ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS train_departure_time TIMESTAMP;
ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS rail_last_free_date TIMESTAMP;
ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS last_free_date_invalid BOOLEAN DEFAULT FALSE;
ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS last_free_date_remark TEXT;

-- 添加索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_port_ops_train_arrival ON process_port_operations(train_arrival_date) WHERE train_arrival_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_port_ops_rail_lfd ON process_port_operations(rail_last_free_date) WHERE rail_last_free_date IS NOT NULL;

COMMIT;
