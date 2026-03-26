-- ========================================
-- 更新 Drop off 模式运输费倍数配置
-- Update Drop off Mode Transport Multiplier Config
-- ========================================

-- 方案 1: 如果配置已存在，更新值
UPDATE "dict_scheduling_config"
SET 
    config_value = '1.0',
    description = 'Drop off 模式运输费倍数（默认 1.0，可根据实际情况调整）',
    updated_at = NOW()
WHERE config_key = 'transport_dropoff_multiplier';

-- 方案 2: 如果配置不存在，插入新记录
INSERT INTO "dict_scheduling_config" (config_key, config_value, description, created_at, updated_at)
SELECT 
    'transport_dropoff_multiplier',
    '1.0',
    'Drop off 模式运输费倍数（默认 1.0，可根据实际情况调整）',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM "dict_scheduling_config" 
    WHERE config_key = 'transport_dropoff_multiplier'
);

-- 验证更新结果
SELECT 
    config_key,
    config_value,
    description,
    updated_at
FROM "dict_scheduling_config"
WHERE config_key = 'transport_dropoff_multiplier';
