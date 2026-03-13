-- =============================================================================
-- 飞驼导入表与物流路径数据流验证脚本
-- Verify: ext_feituo_import_* → 物流路径 的数据流
-- =============================================================================
-- 结论：ext_feituo_import_batch / table1 / table2 仅作导入时的原始存储，
--       物流路径系统不直接读取这三张表，只读取合并后的核心表。
-- =============================================================================

\echo '========== 1. 飞驼导入表（原始存储，物流路径不读取）=========='
\echo '批次表'
SELECT id, table_type, file_name, total_rows, success_count, error_count, created_at
FROM ext_feituo_import_batch
ORDER BY id DESC
LIMIT 5;

\echo ''
\echo '表一（船公司维度）示例'
SELECT id, batch_id, mbl_number, container_number, created_at
FROM ext_feituo_import_table1
ORDER BY id DESC
LIMIT 3;

\echo ''
\echo '表二（码头维度）示例'
SELECT id, batch_id, bill_number, container_number, port_code, created_at
FROM ext_feituo_import_table2
ORDER BY id DESC
LIMIT 3;

\echo ''
\echo '========== 2. 物流路径实际读取的表 =========='
\echo 'ext_container_status_events（状态事件：装船、离港、抵港等）'
SELECT container_number, status_code, occurred_at, data_source
FROM ext_container_status_events
ORDER BY occurred_at DESC
LIMIT 5;

\echo ''
\echo 'process_port_operations（抵港、卸船、可提货、提柜）'
SELECT container_number, port_type, ata_dest_port, dest_port_unload_date, available_time, gate_out_time
FROM process_port_operations
WHERE port_type = 'destination'
ORDER BY port_sequence DESC
LIMIT 5;

\echo ''
\echo 'process_trucking_transport（提柜日期）'
SELECT container_number, pickup_date
FROM process_trucking_transport
WHERE pickup_date IS NOT NULL
LIMIT 5;

\echo ''
\echo 'process_empty_return（还箱日期）'
SELECT container_number, return_time
FROM process_empty_return
WHERE return_time IS NOT NULL
LIMIT 5;

\echo ''
\echo '========== 3. 单柜验证：以 MSKU0627486 为例 =========='
\echo 'ext_feituo_import_table2 有数据？'
SELECT COUNT(*) AS t2_count FROM ext_feituo_import_table2 WHERE container_number = 'MSKU0627486';

\echo ''
\echo 'ext_container_status_events 有数据？（物流路径用）'
SELECT COUNT(*) AS events_count FROM ext_container_status_events WHERE container_number = 'MSKU0627486';

\echo ''
\echo 'process_port_operations 有数据？（物流路径用）'
SELECT container_number, ata_dest_port, dest_port_unload_date, available_time, gate_out_time
FROM process_port_operations
WHERE container_number = 'MSKU0627486' AND port_type = 'destination';

\echo ''
\echo '========== 4. 数据流关系总结 =========='
\echo '导入时: Excel → ext_feituo_import_* (写入) → mergeTableXToCore(row) → 核心表写入'
\echo '物流路径: 只读 ext_container_status_events + process_port_operations + process_trucking_transport + process_empty_return'
\echo 'ext_feituo_import_* 不被物流路径读取，仅作审计/原始留存'
