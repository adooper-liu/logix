-- ============================================
-- 智能排柜系统性能优化配置
-- ============================================
-- 用途：添加批量优化和缓存相关配置项
-- 执行时间：部署前执行
-- 依赖表：dict_scheduling_config
-- ============================================

-- 1. 批量优化配置
INSERT INTO dict_scheduling_config (config_key, config_value, description, created_at, updated_at)
VALUES
  ('batch_optimization_enabled', 'true', '是否启用批量优化（true=启用，false=禁用）', NOW(), NOW()),
  ('batch_size_limit', '50', '批量处理最大柜数（超过此数则分批处理）', NOW(), NOW()),
  ('optimization_concurrency', '10', '并发计算数量（用于 Promise.all 并发控制）', NOW(), NOW())
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 2. 缓存配置
INSERT INTO dict_scheduling_config (config_key, config_value, description, created_at, updated_at)
VALUES
  ('cache_occupancy_enabled', 'true', '是否启用档期查询缓存（true=启用，false=禁用）', NOW(), NOW()),
  ('cache_ttl_seconds', '300', '缓存过期时间（秒），默认 5 分钟', NOW(), NOW()),
  ('cache_max_size', '1000', '缓存最大条目数', NOW(), NOW())
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 3. 车队评分权重配置（Phase 2 任务）
INSERT INTO dict_scheduling_config (config_key, config_value, description, created_at, updated_at)
VALUES
  ('trucking_score_weight_cost', '0.4', '车队评分 - 成本权重（0-1 之间）', NOW(), NOW()),
  ('trucking_score_weight_capacity', '0.3', '车队评分 - 能力权重（0-1 之间）', NOW(), NOW()),
  ('trucking_score_weight_relationship', '0.3', '车队评分 - 关系权重（0-1 之间）', NOW(), NOW())
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 4. 边界问题修复配置
INSERT INTO dict_scheduling_config (config_key, config_value, description, created_at, updated_at)
VALUES
  ('skip_weekends_on_deadline', 'true', 'lastFreeDate 为周末时是否顺延至周一（true=顺延）', NOW(), NOW()),
  ('holiday_calendar_enabled', 'false', '是否启用节假日日历（true=启用，false=禁用）', NOW(), NOW())
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- 5. 性能监控配置
INSERT INTO dict_scheduling_config (config_key, config_value, description, created_at, updated_at)
VALUES
  ('performance_logging_enabled', 'true', '是否记录性能日志（true=启用，false=禁用）', NOW(), NOW()),
  ('slow_query_threshold_ms', '1000', '慢查询阈值（毫秒）', NOW(), NOW()),
  ('batch_performance_target_ms', '15000', '批量排产目标耗时（毫秒），100 柜<15s', NOW(), NOW())
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ============================================
-- 验证插入结果
-- ============================================
SELECT config_key, config_value, description 
FROM dict_scheduling_config 
WHERE config_key IN (
  'batch_optimization_enabled',
  'optimization_concurrency',
  'cache_occupancy_enabled',
  'trucking_score_weight_cost',
  'skip_weekends_on_deadline'
)
ORDER BY config_key;
