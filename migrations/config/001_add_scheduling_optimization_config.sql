-- =====================================================
-- 智能排柜系统重构与优化 - Phase 1 数据库配置
-- =====================================================
-- 制定日期：2026-03-17
-- 实施方案：智能排柜系统重构与优化方案.md
-- 评审报告：智能排柜系统重构与优化方案 - 评审报告.md
-- =====================================================

-- =====================================================
-- 1. 新增调度配置项（dict_scheduling_config）
-- 使用 ON CONFLICT DO UPDATE 保证幂等性
-- =====================================================

-- 成本优化相关配置
INSERT INTO dict_scheduling_config (config_key, config_value, description)
VALUES
  ('cost_optimization_enabled', 'false', '是否启用成本优化（true=启用，false=禁用）'),
  ('demurrage_warning_threshold', '500', '滞港费预警阈值 (USD)'),
  ('drop_off_cost_comparison_threshold', '300', 'Drop off 成本对比触发阈值 (USD)'),
  ('search_window_days', '7', '卸柜日搜索窗口（天数）'),
  ('external_storage_daily_rate', '50', '外部堆场日费率 (USD/天）'),
  ('expedited_handling_fee', '50', '加急操作费 (USD)')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description;

-- 免费期保护相关配置
INSERT INTO dict_scheduling_config (config_key, config_value, description)
VALUES
  ('prioritize_free_period', 'true', '优先安排在免费期内（true/false）'),
  ('free_period_buffer_days', '1', '免费期缓冲天数（提前安排）')
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  description = EXCLUDED.description;

-- =====================================================
-- 2. 创建索引（使用正确的表名和字段名）
-- =====================================================

-- 滞港费标准表索引（注意：表名是复数形式 ext_demurrage_standards）
CREATE INDEX IF NOT EXISTS idx_demurrage_standard_port_company
ON ext_demurrage_standards(destination_port_code, shipping_company_code, is_chargeable);

-- 仓库档期占用表索引（注意：表名是 ext_warehouse_daily_occupancy，字段是 date 和 warehouse_code）
CREATE INDEX IF NOT EXISTS idx_warehouse_occupancy_date
ON ext_warehouse_daily_occupancy(date, warehouse_code);

-- 车队档期占用表索引
CREATE INDEX IF NOT EXISTS idx_trucking_slot_occupancy
ON ext_trucking_slot_occupancy(date, trucking_company_id, port_code);

-- =====================================================
-- 3. 验证配置插入
-- =====================================================

-- 检查配置是否成功插入
SELECT config_key, config_value, description 
FROM dict_scheduling_config 
WHERE config_key IN (
  'cost_optimization_enabled',
  'demurrage_warning_threshold',
  'drop_off_cost_comparison_threshold',
  'search_window_days',
  'external_storage_daily_rate',
  'expedited_handling_fee',
  'prioritize_free_period',
  'free_period_buffer_days'
)
ORDER BY config_key;

-- =====================================================
-- 4. 回滚脚本（可选）
-- =====================================================

/*
-- 删除新增的配置项
DELETE FROM dict_scheduling_config 
WHERE config_key IN (
  'cost_optimization_enabled',
  'demurrage_warning_threshold',
  'drop_off_cost_comparison_threshold',
  'search_window_days',
  'external_storage_daily_rate',
  'expedited_handling_fee',
  'prioritize_free_period',
  'free_period_buffer_days'
);

-- 删除新增的索引
DROP INDEX IF EXISTS idx_demurrage_standard_port_company;
DROP INDEX IF EXISTS idx_warehouse_occupancy_date;
DROP INDEX IF EXISTS idx_trucking_slot_occupancy;
*/

-- =====================================================
-- 执行说明
-- =====================================================
/*
1. 在开发环境执行此脚本
2. 验证配置插入成功
3. 验证索引创建成功
4. 备份到 migrations 目录
5. 在生产环境执行

注意：
- 表名使用复数形式：ext_demurrage_standards
- 字段名使用正确的名称：date, warehouse_code
- 所有索引都使用 IF NOT EXISTS 保证幂等性
*/
