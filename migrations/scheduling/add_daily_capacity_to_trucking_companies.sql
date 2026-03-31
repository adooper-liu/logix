-- 车队日容量可配置
-- 用于 ext_trucking_slot_occupancy 新建记录时的 capacity 默认值，无则用 10

ALTER TABLE dict_trucking_companies
ADD COLUMN IF NOT EXISTS daily_capacity INT DEFAULT 10;

COMMENT ON COLUMN dict_trucking_companies.daily_capacity IS '日容量（趟/天），用于智能排产占用校验，无则默认 10';
