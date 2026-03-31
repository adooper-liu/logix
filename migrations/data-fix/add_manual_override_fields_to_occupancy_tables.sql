-- 扩展占用表字段以支持手动能力设置
-- Add fields to occupancy tables for manual capacity override

-- 仓库占用表添加手动标记和原因字段
ALTER TABLE ext_warehouse_daily_occupancy 
ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reason TEXT;

-- 车队占用表添加手动标记和原因字段  
ALTER TABLE ext_trucking_slot_occupancy 
ADD COLUMN IF NOT EXISTS manual_override BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reason TEXT;

-- 添加注释
COMMENT ON COLUMN ext_warehouse_daily_occupancy.manual_override IS '是否手动覆盖能力值';
COMMENT ON COLUMN ext_warehouse_daily_occupancy.reason IS '手动覆盖的原因（如：春节假期、设备维护等）';

COMMENT ON COLUMN ext_trucking_slot_occupancy.manual_override IS '是否手动覆盖能力值';
COMMENT ON COLUMN ext_trucking_slot_occupancy.reason IS '手动覆盖的原因（如：春节假期、设备维护等）';

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_warehouse_manual_override 
ON ext_warehouse_daily_occupancy(manual_override, date) WHERE manual_override = TRUE;

CREATE INDEX IF NOT EXISTS idx_trucking_manual_override 
ON ext_trucking_slot_occupancy(manual_override, date) WHERE manual_override = TRUE;
