-- ============================================================
-- TimescaleDB 迁移 - 最终修复补丁
-- ============================================================
-- 用途：处理剩余未成功的表
-- 当前状态:
--   ✅ ext_container_status_events - 已成功
--   ✅ sys_data_change_log - 已成功  
--   ❌ process_port_operations - 主键未删除
--   ❌ process_sea_freight - 可能有唯一索引
-- ============================================================

\echo '============================================================'
\echo 'TimescaleDB 迁移 - 最终修复补丁'
\echo '============================================================'
\echo '执行时间:' `SELECT NOW();`
\echo '============================================================'

-- ============================================================
-- Step 1: 检查当前状态
-- ============================================================
\echo ''
\echo '[Step 1] 检查当前 hypertable 状态...'

SELECT hypertable_name, compression_enabled
FROM timescaledb_information.hypertables 
ORDER BY hypertable_name;

-- ============================================================
-- Step 2: 修复 process_port_operations
-- ============================================================
\echo ''
\echo '[Step 2] 修复 process_port_operations...'

-- 删除主键
ALTER TABLE process_port_operations 
  DROP CONSTRAINT IF EXISTS process_port_operations_pkey;

-- 检查是否还有其他唯一索引
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'process_port_operations' 
  AND indexdef LIKE '%UNIQUE%';

-- 重新转换为 hypertable
\echo '重新转换 process_port_operations...'
SELECT create_hypertable(
    'process_port_operations', 
    'ata', 
    migrate_data => true, 
    if_not_exists => TRUE
);

\echo '✅ process_port_operations 修复完成'

-- ============================================================
-- Step 3: 修复 process_sea_freight
-- ============================================================
\echo ''
\echo '[Step 3] 修复 process_sea_freight...'

-- 检查是否有主键或唯一索引
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'process_sea_freight' 
  AND indexdef LIKE '%UNIQUE%';

-- 删除可能的主键
ALTER TABLE process_sea_freight 
  DROP CONSTRAINT IF EXISTS process_sea_freight_pkey;

-- 重新转换为 hypertable
\echo '重新转换 process_sea_freight...'
SELECT create_hypertable(
    'process_sea_freight', 
    'actual_loading_date', 
    migrate_data => true, 
    if_not_exists => TRUE
);

\echo '✅ process_sea_freight 修复完成'

-- ============================================================
-- Step 4: 创建索引（不使用 CONCURRENTLY）
-- ============================================================
\echo ''
\echo '[Step 4] 创建优化索引（普通方式）...'

-- process_port_operations 索引
CREATE INDEX IF NOT EXISTS idx_process_port_ops_ata_only
ON process_port_operations(ata DESC);

CREATE INDEX IF NOT EXISTS idx_process_port_ops_id
ON process_port_operations(id);

-- process_sea_freight 索引
CREATE INDEX IF NOT EXISTS idx_process_sea_freight_loading_only
ON process_sea_freight(actual_loading_date DESC);

CREATE INDEX IF NOT EXISTS idx_process_sea_freight_id
ON process_sea_freight(id);

\echo '✅ 索引创建完成'

-- ============================================================
-- Step 5: 最终验证
-- ============================================================
\echo ''
\echo '============================================================'
\echo '[Step 5] 最终验证'
\echo '============================================================'

-- 检查所有 hypertables
\echo '所有 hypertables:'
SELECT 
    hypertable_name,
    num_dimensions,
    compression_enabled
FROM timescaledb_information.hypertables 
ORDER BY hypertable_name;

-- 数据量统计
\echo '数据量:'
SELECT 
    'ext_container_status_events' AS table_name, COUNT(*) AS rows
FROM ext_container_status_events
UNION ALL SELECT 'process_port_operations', COUNT(*) FROM process_port_operations
UNION ALL SELECT 'process_sea_freight', COUNT(*) FROM process_sea_freight
UNION ALL SELECT 'sys_data_change_log', COUNT(*) FROM sys_data_change_log
ORDER BY table_name;

\echo ''
\echo '============================================================'
\echo '🎉 所有表迁移完成！'
\echo '执行时间:' `SELECT NOW();`
\echo '============================================================'
