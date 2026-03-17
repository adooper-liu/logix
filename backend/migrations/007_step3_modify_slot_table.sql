-- ============================================================
-- Step 3: Optional - Modify ext_trucking_slot_occupancy
-- 步骤 3：可选 - 修改现有表添加 slot_type
-- ============================================================
-- Execute ONLY if ext_trucking_slot_occupancy already exists
-- 仅当 ext_trucking_slot_occupancy 表已存在时执行
-- ============================================================

-- 检查表是否存在并添加字段
-- 注意：此脚本需要分两步执行（pgAdmin 可能不支持 DO 块中的 ALTER TABLE）

-- Step 3.1: Add column / 添加字段
ALTER TABLE ext_trucking_slot_occupancy
ADD COLUMN IF NOT EXISTS slot_type VARCHAR(16) DEFAULT 'delivery';

-- Step 3.2: Add comment / 添加注释
COMMENT ON COLUMN ext_trucking_slot_occupancy.slot_type IS 
'档期类型：delivery=送柜，return=还箱';

-- Step 3.3: Update existing records / 更新现有记录
UPDATE ext_trucking_slot_occupancy 
SET slot_type = 'delivery' 
WHERE slot_type IS NULL OR slot_type = '';

-- Step 3.4: Drop old constraints (if they exist) / 删除旧约束
-- 注意：以下语句可能会报错如果约束不存在，这是正常的
-- 请手动检查并删除约束（在 pgAdmin 中查看表的 Constraints）
/*
ALTER TABLE ext_trucking_slot_occupancy 
DROP CONSTRAINT IF EXISTS ext_trucking_slot_occupancy_trucking_company_id_date_port_code_key;

ALTER TABLE ext_trucking_slot_occupancy 
DROP CONSTRAINT IF EXISTS ext_trucking_slot_occupancy_unique_slot;
*/

-- Step 3.5: Add new unique constraint / 添加新约束
-- 注意：需要先删除旧约束才能添加新约束
/*
ALTER TABLE ext_trucking_slot_occupancy
ADD CONSTRAINT ext_trucking_slot_occupancy_unique_slot 
UNIQUE(trucking_company_id, date, slot_type, COALESCE(port_code,''), COALESCE(warehouse_code,''));
*/

-- Verification / 验证
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'ext_trucking_slot_occupancy'
  AND column_name = 'slot_type';
