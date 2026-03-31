-- 添加实际装船时间字段
-- 用于存储飞驼的"实际装船时间"

ALTER TABLE process_sea_freight 
ADD COLUMN IF NOT EXISTS actual_loading_date DATE;
