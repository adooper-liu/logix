-- ============================================
-- 任务 3.5 Phase 1 - 成本优化配置项
-- ============================================
-- 用途：为成本优化功能添加必要的配置项
-- 执行时间：部署前执行
-- 依赖表：dict_scheduling_config
-- ============================================

-- 1. 运输费率配置
INSERT INTO dict_scheduling_config (config_key, config_value, description, created_at, updated_at)
VALUES
  ('transport_base_rate_per_mile', '2.5', '运输基础费率 (USD/英里)', NOW(), NOW()),
  ('transport_direct_multiplier', '1.0', 'Direct 模式倍数', NOW(), NOW()),
  ('transport_dropoff_multiplier', '1.2', 'Drop off 模式倍数', NOW(), NOW()),
  ('transport_expedited_multiplier', '1.5', 'Expedited 模式倍数', NOW(), NOW())
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. 堆存费配置
INSERT INTO dict_scheduling_config (config_key, config_value, description, created_at, updated_at)
VALUES
  ('external_storage_daily_rate', '50', '外部堆存日费率 (USD/天)', NOW(), NOW())
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 3. 加急费配置
INSERT INTO dict_scheduling_config (config_key, config_value, description, created_at, updated_at)
VALUES
  ('expedited_handling_fee', '50', '加急处理费 (USD)', NOW(), NOW())
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 验证配置项已添加
SELECT config_key, config_value, description 
FROM dict_scheduling_config 
WHERE config_key IN (
  'transport_base_rate_per_mile',
  'transport_direct_multiplier',
  'transport_dropoff_multiplier',
  'transport_expedited_multiplier',
  'external_storage_daily_rate',
  'expedited_handling_fee'
)
ORDER BY config_key;
