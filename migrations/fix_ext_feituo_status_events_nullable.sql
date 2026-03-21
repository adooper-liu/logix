-- ============================================================
-- 修复 ext_feituo_status_events 表 NOT NULL 约束
-- 原因：Excel 导入数据没有 status_index（API 数组索引）
--       和 raw_json（API 原始 JSON），但表定义为 NOT NULL
-- 修改：status_index 和 raw_json 均改为可 NULL
-- 日期：2026-03-20
-- ============================================================

BEGIN;

-- 修改 status_index 为可 NULL
ALTER TABLE ext_feituo_status_events
ALTER COLUMN status_index DROP NOT NULL;

-- 修改 raw_json 为可 NULL（Excel 导入没有原始 API JSON）
ALTER TABLE ext_feituo_status_events
ALTER COLUMN raw_json DROP NOT NULL;

-- 添加注释
COMMENT ON COLUMN ext_feituo_status_events.status_index IS
'API 同步时的数组索引，Excel 导入时为 NULL';
COMMENT ON COLUMN ext_feituo_status_events.raw_json IS
'API 同步时的原始 JSON，Excel 导入时为 NULL';

COMMIT;
