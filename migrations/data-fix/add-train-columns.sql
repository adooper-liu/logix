-- 添加火车相关字段到process_port_operations表
ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS train_arrival_date TIMESTAMP;
ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS train_discharge_date TIMESTAMP;
ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS train_departure_time TIMESTAMP;
ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS rail_last_free_date TIMESTAMP;
ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS last_free_date_invalid BOOLEAN;
ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS last_free_date_remark TEXT;

-- 提交更改
COMMIT;