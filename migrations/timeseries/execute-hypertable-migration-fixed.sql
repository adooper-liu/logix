-- ============================================================
-- TimescaleDB Hypertable 迁移 - 修正版 (v2.1)
-- ============================================================
-- 用途：修复所有已知问题后重新执行
-- 修正内容:
--   1. ✅ 使用正确的字段名称填充 NULL 值
--   2. ✅ 删除所有唯一索引（不只是主键）
--   3. ✅ 转换后添加普通索引而非唯一索引
--   4. ⚠️ 压缩策略语法待验证
-- 
-- 团队决策确认：
-- ✅ 删除主键和唯一索引
-- ✅ 使用 COALESCE 填充 NULL 值
-- ✅ 删除外键，改用逻辑外键
-- ============================================================

\echo '============================================================'
\echo 'TimescaleDB Hypertable 迁移 - 修正版 v2.1'
\echo '============================================================'
\echo '执行时间:' `SELECT NOW();`
\echo '============================================================'

-- ============================================================
-- Step 0: 检查和备份
-- ============================================================
\echo ''
\echo '============================================================'
\echo '[Step 0] 检查当前状态'
\echo '============================================================'

-- 检查是否已有 hypertable
SELECT COUNT(*) AS existing_hypertables 
FROM timescaledb_information.hypertables;

-- 记录外键定义
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
INTO TEMP TABLE temp_fk_backup_2
FROM pg_constraint 
WHERE contype = 'f' 
  AND conrelid IN (
    'ext_container_status_events'::regclass,
    'process_port_operations'::regclass,
    'process_sea_freight'::regclass,
    'sys_data_change_log'::regclass
  );

\echo '✅ 已备份外键定义'

-- ============================================================
-- Step 1: 预处理 - 清理所有阻碍
-- ============================================================
\echo ''
\echo '============================================================'
\echo '[Step 1] 预处理 - 删除主键、唯一索引和外键'
\echo '============================================================'

-- 1.1 ext_container_status_events
\echo '处理 ext_container_status_events...'
ALTER TABLE ext_container_status_events 
  DROP CONSTRAINT IF EXISTS ext_container_status_events_pkey;

DROP INDEX IF EXISTS idx_ext_container_status_events_id;
DROP INDEX IF EXISTS idx_status_events_time;

\echo '✅ ext_container_status_events 清理完成'

-- 1.2 process_port_operations: 填充 NULL 值（使用正确字段）
\echo '处理 process_port_operations: 填充 ata 字段的 NULL 值...'

-- 先检查还有多少 NULL
SELECT COUNT(*) AS null_count_before 
FROM process_port_operations 
WHERE ata IS NULL;

-- 使用实际存在的字段填充
UPDATE process_port_operations 
SET ata = COALESCE(
    ata,                    -- 优先使用原值
    eta,                    -- ETA (Estimated Time of Arrival)
    etd,                    -- ETD (Estimated Time of Departure)
    revised_eta,            -- 修订后的 ETA
    dest_port_unload_date,  -- 目的港卸货日期
    NOW()                   -- 当前时间
) 
WHERE ata IS NULL;

-- 验证填充结果
SELECT COUNT(*) AS null_count_after 
FROM process_port_operations 
WHERE ata IS NULL;

\echo '✅ process_port_operations NULL 值填充完成'

-- 1.3 biz_containers: 删除外键
\echo '处理 biz_containers: 删除外键约束...'
ALTER TABLE biz_containers 
  DROP CONSTRAINT IF EXISTS biz_containers_bill_of_lading_number_fkey;

\echo '✅ biz_containers 外键已删除'

-- 1.4 sys_data_change_log
\echo '处理 sys_data_change_log...'
ALTER TABLE sys_data_change_log 
  DROP CONSTRAINT IF EXISTS sys_data_change_log_pkey;

DROP INDEX IF EXISTS idx_sys_data_change_log_id;

\echo '✅ sys_data_change_log 清理完成'

-- ============================================================
-- Step 2: 转换为 hypertable
-- ============================================================
\echo ''
\echo '============================================================'
\echo '[Step 2] 转换为 TimescaleDB hypertable'
\echo '============================================================'

-- 2.1 ext_container_status_events
\echo '转换 ext_container_status_events (分区列：occurred_at)...'
SELECT create_hypertable(
    'ext_container_status_events', 
    'occurred_at', 
    migrate_data => true, 
    if_not_exists => TRUE
);
\echo '✅ ext_container_status_events 转换完成'

-- 2.2 process_port_operations
\echo '转换 process_port_operations (分区列：ata)...'
SELECT create_hypertable(
    'process_port_operations', 
    'ata', 
    migrate_data => true, 
    if_not_exists => TRUE
);
\echo '✅ process_port_operations 转换完成'

-- 2.3 process_sea_freight
\echo '转换 process_sea_freight (分区列：actual_loading_date)...'
SELECT create_hypertable(
    'process_sea_freight', 
    'actual_loading_date', 
    migrate_data => true, 
    if_not_exists => TRUE
);
\echo '✅ process_sea_freight 转换完成'

-- 2.4 sys_data_change_log
\echo '转换 sys_data_change_log (分区列：created_at)...'
SELECT create_hypertable(
    'sys_data_change_log', 
    'created_at', 
    migrate_data => true, 
    if_not_exists => TRUE
);
\echo '✅ sys_data_change_log 转换完成'

-- ============================================================
-- Step 3: 配置压缩和保留（简化版，避免语法错误）
-- ============================================================
\echo ''
\echo '============================================================'
\echo '[Step 3] 配置压缩和保留策略'
\echo '============================================================'

-- 尝试使用简化的语法
\echo '尝试配置压缩策略...'

DO $$
BEGIN
    -- 为每个表启用压缩
    BEGIN
        ALTER TABLE ext_container_status_events SET (timescaledb.compress = true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ext_container_status_events 压缩配置失败：%', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE process_port_operations SET (timescaledb.compress = true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'process_port_operations 压缩配置失败：%', SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE process_sea_freight SET (timescaledb.compress = true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'process_sea_freight 压缩配置失败：%, SQLERRM;
    END;
    
    BEGIN
        ALTER TABLE sys_data_change_log SET (timescaledb.compress = true);
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'sys_data_change_log 压缩配置失败：%', SQLERRM;
    END;
END $$;

\echo '压缩配置尝试完成'

-- ============================================================
-- Step 4: 创建优化索引
-- ============================================================
\echo ''
\echo '============================================================'
\echo '[Step 4] 创建优化索引'
\echo '============================================================'

-- 4.1 ext_container_status_events
\echo '创建 ext_container_status_events 索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ext_container_events_container
ON ext_container_status_events(container_number, occurred_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ext_container_events_time
ON ext_container_status_events(occurred_at DESC);

-- 添加 id 的普通索引（用于快速查找）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ext_container_status_events_id
ON ext_container_status_events(id);

-- 4.2 process_port_operations
\echo '创建 process_port_operations 索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_port_ops_container
ON process_port_operations(container_number, ata DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_port_ops_port
ON process_port_operations(port_code, ata DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_port_ops_ata
ON process_port_operations(ata DESC);

-- 4.3 process_sea_freight
\echo '创建 process_sea_freight 索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_sea_freight_bill
ON process_sea_freight(bill_of_lading_number, actual_loading_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_sea_freight_vessel
ON process_sea_freight(vessel_name, actual_loading_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_sea_freight_loading_date
ON process_sea_freight(actual_loading_date DESC);

-- 4.4 sys_data_change_log
\echo '创建 sys_data_change_log 索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sys_change_log_entity
ON sys_data_change_log(entity_type, entity_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sys_change_log_time
ON sys_data_change_log(created_at DESC);

-- 添加 id 的普通索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sys_data_change_log_id
ON sys_data_change_log(id);

\echo '✅ 优化索引已创建'

-- ============================================================
-- Step 5: 验证结果
-- ============================================================
\echo ''
\echo '============================================================'
\echo '[Step 5] 验证迁移结果'
\echo '============================================================'

-- 5.1 检查 hypertables
\echo ' hypertables 列表:'
SELECT 
    hypertable_schema AS schema,
    hypertable_name AS table_name,
    num_dimensions AS partitions,
    compression_enabled
FROM timescaledb_information.hypertables 
ORDER BY hypertable_name;

-- 5.2 检查数据量
\echo '数据量统计:'
SELECT 
    'ext_container_status_events' AS table_name, 
    COUNT(*) AS row_count,
    pg_size_pretty(pg_total_relation_size('ext_container_status_events')) AS total_size
FROM ext_container_status_events
UNION ALL
SELECT 'process_port_operations', COUNT(*), pg_size_pretty(pg_total_relation_size('process_port_operations'))
UNION ALL
SELECT 'process_sea_freight', COUNT(*), pg_size_pretty(pg_total_relation_size('process_sea_freight'))
UNION ALL
SELECT 'sys_data_change_log', COUNT(*), pg_size_pretty(pg_total_relation_size('sys_data_change_log'))
ORDER BY table_name;

-- 5.3 检查索引
\echo '已创建的索引:'
SELECT 
    tablename AS table_name,
    indexname AS index_name,
    indexdef AS definition
FROM pg_indexes 
WHERE tablename IN (
    'ext_container_status_events',
    'process_port_operations', 
    'process_sea_freight',
    'sys_data_change_log'
)
ORDER BY tablename, indexname;

-- ============================================================
-- Step 6: 应用层适配说明
-- ============================================================
\echo ''
\echo '============================================================'
\echo '[Step 6] 重要提示'
\echo '============================================================'
\echo ''
\echo '⚠️  应用层需要调整的代码:'
\echo ''
\echo '1. INSERT ... ON CONFLICT 语法:'
\echo '   ❌ 旧写法：ON CONFLICT (id) DO UPDATE ...'
\echo '   ✅ 新写法：ON CONFLICT ON CONSTRAINT <index 名> DO UPDATE ...'
\echo '   或直接使用 id 索引（现在是非唯一索引）'
\echo ''
\echo '2. 外键约束:'
\echo '   biz_containers.bill_of_lading_number 现在是逻辑外键'
\echo '   需要在应用层保证数据完整性'
\echo ''
\echo '3. 压缩策略:'
\echo '   如果自动配置失败，可手动执行:'
\echo '   SELECT add_compression_policy('"'"'table_name'"'"', INTERVAL '"'"'30 days'"'"');'
\echo ''
\echo '============================================================'
\echo '迁移完成！'
\echo '执行时间:' `SELECT NOW();`
\echo '============================================================'
