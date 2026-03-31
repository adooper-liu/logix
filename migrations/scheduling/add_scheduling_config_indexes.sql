-- 智能排产相关索引优化
-- 用于提升 ext_warehouse_daily_occupancy、ext_trucking_slot_occupancy、ext_trucking_return_slot_occupancy 查询性能

-- 仓库占用表索引优化
CREATE INDEX IF NOT EXISTS idx_warehouse_occupancy_composite 
ON ext_warehouse_daily_occupancy(country, slot_date, warehouse_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_occupancy_date_range 
ON ext_warehouse_daily_occupancy(slot_date, warehouse_id) 
WHERE slot_type = 'UNLOAD';

-- 车队提柜档期索引优化
CREATE INDEX IF NOT EXISTS idx_trucking_slot_composite 
ON ext_trucking_slot_occupancy(country, slot_date, trucking_company_id);

CREATE INDEX IF NOT EXISTS idx_trucking_slot_date_range 
ON ext_trucking_slot_occupancy(slot_date, trucking_company_id) 
WHERE slot_type = 'PICKUP';

-- 车队还箱档期索引优化
CREATE INDEX IF NOT EXISTS idx_trucking_return_slot_composite 
ON ext_trucking_return_slot_occupancy(country, slot_date, trucking_company_id);

CREATE INDEX IF NOT EXISTS idx_trucking_return_slot_date_range 
ON ext_trucking_return_slot_occupancy(slot_date, trucking_company_id) 
WHERE slot_type = 'RETURN';

-- 堆场占用索引优化
CREATE INDEX IF NOT EXISTS idx_yard_occupancy_composite 
ON ext_yard_daily_occupancy(country, occupancy_date, yard_id);

-- 查询性能注释
COMMENT ON INDEX idx_warehouse_occupancy_composite IS 
'智能排产：按国家+日期+仓库查询占用';

COMMENT ON INDEX idx_trucking_slot_composite IS 
'智能排产：按国家+日期+车队查询提柜占用';

COMMENT ON INDEX idx_trucking_return_slot_composite IS 
'智能排产：按国家+日期+车队查询还箱占用';
