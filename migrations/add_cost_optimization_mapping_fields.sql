-- ============================================
-- 任务 3.5 Phase 2 - 成本优化映射表增强
-- ============================================
-- 用途：为 trucking_port_mapping 表添加必要字段
-- 执行时间：部署前执行
-- 依赖表：dict_trucking_port_mapping
-- ============================================
-- 说明：请在 psql 命令行执行以获得友好提示，或在 GUI 工具中直接运行

-- 1. 添加拖卡费字段（每一次的总运输费用）
ALTER TABLE dict_trucking_port_mapping 
ADD COLUMN IF NOT EXISTS transport_fee DECIMAL(10,2) DEFAULT 0;

-- 添加字段注释
COMMENT ON COLUMN dict_trucking_port_mapping.transport_fee IS '拖卡费（每次运输总费用 USD）';

-- 2. 添加堆场操作费字段（一个货柜收取一次）
-- 已存在 yard_operation_fee，确认其用途
COMMENT ON COLUMN dict_trucking_port_mapping.yard_operation_fee IS '堆场操作费（每个货柜一次性收费 USD）';

-- 3. 确认 standard_rate 字段用途（每天费用）
COMMENT ON COLUMN dict_trucking_port_mapping.standard_rate IS '堆场收费标准（每天费用 USD/天）';

-- 4. 确认 yard_capacity 字段用途（每天最多可接受的 Drop 模式货柜量）
COMMENT ON COLUMN dict_trucking_port_mapping.yard_capacity IS '堆场容量（每天最多可接受的 Drop 模式货柜量）';

-- 5. 更新示例数据（如果字段存在）
DO $$
BEGIN
  -- 检查 transport_fee 字段是否存在
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'dict_trucking_port_mapping' 
    AND column_name = 'transport_fee'
  ) THEN
    UPDATE dict_trucking_port_mapping 
    SET 
      transport_fee = 150.00,  -- 示例：每次运输$150
      standard_rate = 50.00,   -- 示例：每天$50
      yard_operation_fee = 100.00  -- 示例：每个货柜$100
    WHERE is_active = true;
  ELSE
    RAISE NOTICE 'transport_fee 字段不存在，跳过数据更新';
  END IF;
END $$;

-- 6. 验证字段已添加
-- 如果使用 psql 命令行，会显示友好的提示信息
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'dict_trucking_port_mapping'
  AND column_name IN (
    'transport_fee',
    'standard_rate',
    'yard_operation_fee',
    'yard_capacity'
  )
ORDER BY ordinal_position;

-- ============================================
-- 索引优化
-- ============================================

-- 7. 为查询优化添加索引
CREATE INDEX IF NOT EXISTS idx_trucking_port_mapping_country 
ON dict_trucking_port_mapping(country, is_active);

CREATE INDEX IF NOT EXISTS idx_trucking_port_mapping_port 
ON dict_trucking_port_mapping(port_code, country, is_active);

-- ============================================
-- 完成提示
-- ============================================
-- 如果使用 psql 命令行执行，会显示以下提示：
-- ====================================
-- 任务 3.5 Phase 2 - 执行完成!
-- ====================================
-- 
-- 费用结构说明：
-- ① 运输费 (transport_fee): 每一次的总运输费用，示例：$150/次
-- ② 外部堆场费用:
--    - standard_rate: 每天费用 ($50/天)
--    - yard_operation_fee: 一次性操作费 ($100/柜)
--    - 总堆场费 = standard_rate × 天数 + yard_operation_fee
-- ③ 堆场容量 (yard_capacity): 每天最多可接受的 Drop 模式货柜量
