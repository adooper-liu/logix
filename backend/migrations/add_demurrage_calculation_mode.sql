-- ============================================================================
-- 滞港费计算模式支持
-- Demurrage Calculation Mode Support
--
-- 目标：支持两种计算模式（actual/forecast）并标注计算来源
-- ============================================================================
-- Author: AI Assistant
-- Date: 2025-03-11
-- Description:
--   1. 增加修正ETA字段（process_port_operations.revised_eta_dest_port）
--   2. 增加计算模式标注字段（ext_demurrage_records）
--   3. 支持实际模式和预测模式的区分
-- ============================================================================

-- 1. 增加修正ETA字段到港口操作表
-- 用于存储船公司更新的预计到港日，优先级高于原始ETA
ALTER TABLE process_port_operations
ADD COLUMN IF NOT EXISTS revised_eta_dest_port TIMESTAMP;

COMMENT ON COLUMN process_port_operations.revised_eta_dest_port IS '修正ETA（船公司更新的预计到港日），优先级：ATA > 实际卸船日 > 修正ETA > 原始ETA';

-- 2. 增加计算模式标注字段到滞港费记录表
-- 用于区分实际滞港费和预测滞港费
ALTER TABLE ext_demurrage_records
ADD COLUMN IF NOT EXISTS calculation_mode VARCHAR(10);

COMMENT ON COLUMN ext_demurrage_records.calculation_mode IS '计算模式：actual（实际滞港费）或 forecast（预测/预警）';

-- 3. 增加起算日模式标注
ALTER TABLE ext_demurrage_records
ADD COLUMN IF NOT EXISTS start_date_mode VARCHAR(10);

COMMENT ON COLUMN ext_demurrage_records.start_date_mode IS '起算日来源模式：actual（实际时间：ATA/实际卸船日）或 forecast（预测时间：修正ETA/原始ETA）';

-- 4. 增加最晚免费日模式标注
ALTER TABLE ext_demurrage_records
ADD COLUMN IF NOT EXISTS last_free_date_mode VARCHAR(10);

COMMENT ON COLUMN ext_demurrage_records.last_free_date_mode IS '最晚免费日计算模式：actual（基于实际时间计算）或 forecast（基于ETA计算）';

-- 5. 增加截止日模式标注
ALTER TABLE ext_demurrage_records
ADD COLUMN IF NOT EXISTS end_date_mode VARCHAR(10);

COMMENT ON COLUMN ext_demurrage_records.end_date_mode IS '截止日来源模式：actual（实际日期）或 forecast（预测日期）';

-- 6. 为计算模式字段添加索引（用于快速筛选）
CREATE INDEX IF NOT EXISTS idx_ext_demurrage_records_calculation_mode
ON ext_demurrage_records(calculation_mode);

COMMENT ON INDEX idx_ext_demurrage_records_calculation_mode IS '滞港费记录计算模式索引';

-- 7. 数据迁移：将现有记录标记为 actual 模式
-- 假设现有记录都是基于实际数据计算的实际滞港费
UPDATE ext_demurrage_records
SET calculation_mode = 'actual',
    start_date_mode = 'actual',
    last_free_date_mode = 'actual',
    end_date_mode = 'actual'
WHERE calculation_mode IS NULL;

-- ============================================================================
-- 验证脚本（可选）
-- ============================================================================

-- 验证新字段是否创建成功
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name IN ('process_port_operations', 'ext_demurrage_records')
AND column_name IN ('revised_eta_dest_port', 'calculation_mode', 'start_date_mode', 'last_free_date_mode', 'end_date_mode')
ORDER BY table_name, ordinal_position;

-- 验证索引是否创建成功
SELECT
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE indexname = 'idx_ext_demurrage_records_calculation_mode';

-- 统计计算模式分布
SELECT
    calculation_mode,
    COUNT(*) AS record_count,
    COUNT(DISTINCT container_number) AS unique_containers
FROM ext_demurrage_records
WHERE calculation_mode IS NOT NULL
GROUP BY calculation_mode;

-- ============================================================================
-- 回滚脚本（如需回滚，取消注释并执行）
-- ============================================================================

/*
-- 删除索引
DROP INDEX IF EXISTS idx_ext_demurrage_records_calculation_mode;

-- 删除新增字段
ALTER TABLE ext_demurrage_records DROP COLUMN IF EXISTS calculation_mode;
ALTER TABLE ext_demurrage_records DROP COLUMN IF EXISTS start_date_mode;
ALTER TABLE ext_demurrage_records DROP COLUMN IF EXISTS last_free_date_mode;
ALTER TABLE ext_demurrage_records DROP COLUMN IF EXISTS end_date_mode;

ALTER TABLE process_port_operations DROP COLUMN IF EXISTS revised_eta_dest_port;
*/
