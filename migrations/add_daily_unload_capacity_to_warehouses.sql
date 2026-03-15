-- 仓库日卸柜能力
-- 用于智能排产 ext_warehouse_daily_occupancy 新建记录时的 capacity 默认值

ALTER TABLE dict_warehouses
ADD COLUMN IF NOT EXISTS daily_unload_capacity INT DEFAULT 10;

COMMENT ON COLUMN dict_warehouses.daily_unload_capacity IS '日卸柜能力（柜/天），用于智能排产占用校验，无则默认 10';
