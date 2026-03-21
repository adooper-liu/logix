-- ============================================================
-- 飞驼导入数据清理脚本
-- 删除指定 batch_id 的飞驼导入数据及所有关联记录
-- ============================================================

-- 使用方式：将 :batch_id 替换为实际的批次 ID，或直接修改 WHERE 条件
-- 示例：DELETE FROM ext_feituo_import_batch WHERE id = 1;

BEGIN;

-- ============================================================
-- 0. 查看待删除的批次（先执行此查询确认）
-- ============================================================
-- SELECT id, file_name, import_type, record_count, created_at 
-- FROM ext_feituo_import_batch 
-- ORDER BY id DESC 
-- LIMIT 10;

-- ============================================================
-- 1. 获取要删除的 container_number 和 mbl_number 列表
-- ============================================================
CREATE TEMP TABLE IF NOT EXISTS temp_feituo_keys AS
SELECT DISTINCT container_number, mbl_number 
FROM ext_feituo_import_table1;

-- ============================================================
-- 2. 删除 ext_feituo_status_events（通过 container_number）
-- ============================================================
DELETE FROM ext_feituo_status_events 
WHERE container_number IN (SELECT container_number FROM temp_feituo_keys);

-- ============================================================
-- 3. 删除 ext_feituo_places（通过 mbl_number）
-- ============================================================
DELETE FROM ext_feituo_places 
WHERE mbl_number IN (SELECT mbl_number FROM temp_feituo_keys);

-- ============================================================
-- 4. 删除 ext_feituo_vessels（通过 bill_of_lading_number）
-- ============================================================
DELETE FROM ext_feituo_vessels 
WHERE bill_of_lading_number IN (SELECT mbl_number FROM temp_feituo_keys);

-- ============================================================
-- 5. 删除 ext_feituo_import_table1（通过 batch_id）
-- ============================================================
-- 注意：此表有 batch_id 外键
-- DELETE FROM ext_feituo_import_table1 WHERE batch_id = :batch_id;
DELETE FROM ext_feituo_import_table1 WHERE batch_id = 1;

-- ============================================================
-- 6. 删除 ext_feituo_import_table2（通过 batch_id）
-- ============================================================
-- 注意：此表有 batch_id 外键
-- DELETE FROM ext_feituo_import_table2 WHERE batch_id = :batch_id;
DELETE FROM ext_feituo_import_table2 WHERE batch_id = 1;

-- ============================================================
-- 7. 删除 ext_feituo_import_batch（最后删除主表）
-- ============================================================
-- DELETE FROM ext_feituo_import_batch WHERE id = :batch_id;
DELETE FROM ext_feituo_import_batch WHERE id = 1;

-- ============================================================
-- 8. 清理临时表
-- ============================================================
DROP TABLE IF EXISTS temp_feituo_keys;

COMMIT;

-- ============================================================
-- 验证删除结果
-- ============================================================
SELECT 'ext_feituo_import_batch' AS table_name, COUNT(*) AS record_count FROM ext_feituo_import_batch
UNION ALL
SELECT 'ext_feituo_import_table1', COUNT(*) FROM ext_feituo_import_table1
UNION ALL
SELECT 'ext_feituo_import_table2', COUNT(*) FROM ext_feituo_import_table2
UNION ALL
SELECT 'ext_feituo_places', COUNT(*) FROM ext_feituo_places
UNION ALL
SELECT 'ext_feituo_status_events', COUNT(*) FROM ext_feituo_status_events
UNION ALL
SELECT 'ext_feituo_vessels', COUNT(*) FROM ext_feituo_vessels;
