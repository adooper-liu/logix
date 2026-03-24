-- 添加 transport_fee 字段到 dict_trucking_port_mapping 表
ALTER TABLE dict_trucking_port_mapping
ADD COLUMN transport_fee DECIMAL(10,2) DEFAULT 0;

-- 添加字段注释
COMMENT ON COLUMN dict_trucking_port_mapping.transport_fee IS '拖卡费（每次运输总费用 USD）';

-- 更新现有记录的字段值
UPDATE dict_trucking_port_mapping SET transport_fee = 0 WHERE transport_fee IS NULL;

-- 验证字段添加成功
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'dict_trucking_port_mapping' AND column_name = 'transport_fee';
