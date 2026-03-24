-- ============================================
-- 为 dict_warehouse_trucking_mapping 表添加 transport_fee 字段
-- ============================================
-- 用途：为仓库-车队映射表添加拖卡费字段，记录车队到仓库的运输费用
-- 执行时间：部署前执行
-- 依赖表：dict_warehouse_trucking_mapping
-- ============================================

-- 1. 添加拖卡费字段（每一次的总运输费用）
ALTER TABLE dict_warehouse_trucking_mapping 
ADD COLUMN IF NOT EXISTS transport_fee DECIMAL(10,2) DEFAULT 0;

-- 添加字段注释
COMMENT ON COLUMN dict_warehouse_trucking_mapping.transport_fee IS '拖卡费（每次运输总费用 USD）';

-- 2. 更新示例数据（如果字段存在）
DO $$
BEGIN
  -- 检查 transport_fee 字段是否存在
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dict_warehouse_trucking_mapping' 
    AND column_name = 'transport_fee'
  ) THEN
    UPDATE dict_warehouse_trucking_mapping 
    SET transport_fee = 120.00  -- 示例：每次运输$120
    WHERE is_active = true;
  ELSE
    RAISE NOTICE 'transport_fee 字段不存在，跳过数据更新';
  END IF;
END $$;

-- 3. 验证字段已添加
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'dict_warehouse_trucking_mapping'
  AND column_name = 'transport_fee'
ORDER BY ordinal_position;

-- ============================================
-- 完成提示
-- ============================================
-- 如果使用 psql 命令行执行，会显示以下提示：
-- ===================================
-- 为 dict_warehouse_trucking_mapping 表添加 transport_fee 字段完成!
-- ===================================

-- 费用说明：
-- transport_fee: 每次运输的总费用，示例：$120/次
-- 用于记录车队到仓库的拖卡费用
