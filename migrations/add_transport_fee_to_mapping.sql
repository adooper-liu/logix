-- 添加仓库-车队映射表的拖卡费字段
ALTER TABLE dict_warehouse_trucking_mapping 
ADD COLUMN IF NOT EXISTS transport_fee DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN dict_warehouse_trucking_mapping.transport_fee IS '拖卡费用(USD)';
