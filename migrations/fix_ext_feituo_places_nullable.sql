-- ============================================================
-- 修复 ext_feituo_places 表 NOT NULL 约束
-- 原因：Excel 导入数据没有 raw_json，但表定义为 NOT NULL
-- 修改：raw_json 改为可 NULL
-- 日期：2026-03-21
-- ============================================================

BEGIN;

-- 修改 raw_json 为可 NULL（Excel 导入没有原始 API JSON）
ALTER TABLE ext_feituo_places
ALTER COLUMN raw_json DROP NOT NULL;

-- 添加注释
COMMENT ON COLUMN ext_feituo_places.raw_json IS
'API 同步时的原始 JSON，Excel 导入时为 NULL';

COMMIT;
