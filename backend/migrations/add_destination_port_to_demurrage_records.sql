-- 滞港费记录表增加目的港字段（写回时保存，高费用货柜分组时直接读取，避免二次查询）
ALTER TABLE ext_demurrage_records
  ADD COLUMN IF NOT EXISTS destination_port VARCHAR(100);

COMMENT ON COLUMN ext_demurrage_records.destination_port IS '货柜目的港（写回时从 process_port_operations/process_sea_freight 解析，用于高费用货柜分组）';

-- 滞港费记录表增加物流状态字段（写回时保存，高费用货柜卡片展示）
ALTER TABLE ext_demurrage_records
  ADD COLUMN IF NOT EXISTS logistics_status VARCHAR(50);

COMMENT ON COLUMN ext_demurrage_records.logistics_status IS '货柜物流状态（写回时从 biz_containers.logistics_status 保存，用于高费用货柜卡片展示）';
