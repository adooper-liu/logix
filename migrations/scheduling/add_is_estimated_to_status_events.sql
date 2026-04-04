-- ============================================================
-- 为 ext_container_status_events 表添加 is_estimated 字段
-- ============================================================

-- 用途：
-- 1. 标记状态事件是否为预计状态（非实际发生）
-- 2. 用于前端显示"预计"标签
-- 3. 支持物流路径三模式功能

-- 作者：刘志高
-- 日期：2026-04-02

-- ============================================================
-- Step 1: 添加 is_estimated 字段
-- ============================================================

ALTER TABLE ext_container_status_events
ADD COLUMN IF NOT EXISTS is_estimated BOOLEAN DEFAULT false;

-- 添加索引（可选，用于查询优化）
CREATE INDEX IF NOT EXISTS idx_status_events_estimated 
ON ext_container_status_events(is_estimated);

-- ============================================================
-- Step 2: 更新现有数据（可选）
-- ============================================================

-- 如果需要将某些特定事件标记为预计状态，可以执行 UPDATE
-- 示例：将飞驼导入的事件标记为预计

-- UPDATE ext_container_status_events
-- SET is_estimated = true
-- WHERE data_source = 'FeiTuO' 
--   AND status_code IN ('STSP', 'GITM', 'GTIN');

-- 默认所有现有事件的 is_estimated = false

-- ============================================================
-- Step 3: 验证
-- ============================================================

-- 检查字段是否添加成功
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'ext_container_status_events'
  AND column_name = 'is_estimated';

-- 检查数据
SELECT container_number, status_code, description_cn, is_estimated, data_source
FROM ext_container_status_events
WHERE container_number = 'HMMU6232153'
ORDER BY event_time;

-- ============================================================
-- 回滚脚本（如果需要）
-- ============================================================

-- DROP INDEX IF EXISTS idx_status_events_estimated;
-- ALTER TABLE ext_container_status_events DROP COLUMN IF EXISTS is_estimated;

