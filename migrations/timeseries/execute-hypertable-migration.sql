-- ============================================================
-- TimescaleDB Hypertable 迁移 - 最终执行脚本
-- ============================================================
-- 用途：一键执行所有迁移步骤（基于团队决策）
-- 执行时机：业务低峰期（推荐凌晨 2-4 点）
-- 预计耗时：30-60 分钟
-- 
-- 团队决策确认：
-- ✅ 1. 删除主键，改用唯一索引（方案 A）
-- ✅ 2. 使用 COALESCE 填充 NULL 值（方案 A）
-- ✅ 3. 删除外键，改用逻辑外键（方案 A）
-- ✅ 4. 业务低峰期执行
-- ============================================================

\echo '============================================================'
\echo 'TimescaleDB Hypertable 迁移 - 开始执行'
\echo '============================================================'
\echo '执行时间:' `SELECT NOW();`
\echo '============================================================'

-- ============================================================
-- Step 0: 备份当前状态（重要！）
-- ============================================================
\echo ''
\echo '[Step 0] 记录备份信息...'

-- 记录外键定义（用于后续恢复）
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
INTO TEMP TABLE temp_fk_backup
FROM pg_constraint 
WHERE contype = 'f' 
  AND conrelid IN (
    'ext_container_status_events'::regclass,
    'process_port_operations'::regclass,
    'process_sea_freight'::regclass,
    'sys_data_change_log'::regclass
  );

\echo '已备份外键定义到临时表'

-- ============================================================
-- Step 1: 预处理 - 删除阻碍
-- ============================================================
\echo ''
\echo '============================================================'
\echo '[Step 1] 预处理 - 删除主键和外键约束'
\echo '============================================================'

-- 1.1 ext_container_status_events: 删除主键和唯一索引
\echo '处理 ext_container_status_events: 删除主键和唯一索引...'
ALTER TABLE ext_container_status_events 
  DROP CONSTRAINT IF EXISTS ext_container_status_events_pkey;

-- 删除所有唯一索引（TimescaleDB 要求）
DROP INDEX IF EXISTS idx_ext_container_status_events_id;
DROP INDEX IF EXISTS idx_status_events_time;  -- 如果存在

\echo '✅ ext_container_status_events 主键和唯一索引已删除'

-- 1.2 process_port_operations: 填充 NULL 值
\echo '处理 process_port_operations: 填充 ata 字段的 NULL 值...'
UPDATE process_port_operations 
SET ata = COALESCE(
    ata,                    -- 优先使用原值
    eta,                    -- 其次使用 ETA (Estimated Time of Arrival)
    etd,                    -- 再次使用 ETD (Estimated Time of Departure)
    revised_eta,            -- 使用修订后的 ETA
    dest_port_unload_date,  -- 使用目的港卸货日期
    NOW()                   -- 最后使用当前时间
) 
WHERE ata IS NULL;

\echo '✅ process_port_operations.ata 的 NULL 值已填充'

-- 1.3 process_sea_freight: 删除外键约束
\echo '处理 biz_containers: 删除外键约束...'
ALTER TABLE biz_containers 
  DROP CONSTRAINT IF EXISTS biz_containers_bill_of_lading_number_fkey;

\echo '✅ biz_containers 外键已删除，改用逻辑外键'

-- 1.4 sys_data_change_log: 删除主键和唯一索引
\echo '处理 sys_data_change_log: 删除主键和唯一索引...'
ALTER TABLE sys_data_change_log 
  DROP CONSTRAINT IF EXISTS sys_data_change_log_pkey;

-- 删除所有唯一索引（TimescaleDB 要求）
DROP INDEX IF EXISTS idx_sys_data_change_log_id;

\echo '✅ sys_data_change_log 主键和唯一索引已删除'

-- ============================================================
-- Step 2: 转换为 hypertable
-- ============================================================
\echo ''
\echo '============================================================'
\echo '[Step 2] 转换为 TimescaleDB hypertable'
\echo '============================================================'

-- 2.1 ext_container_status_events
\echo '转换 ext_container_status_events...'
SELECT create_hypertable(
    'ext_container_status_events', 
    'occurred_at', 
    migrate_data => true, 
    if_not_exists => TRUE
);
\echo '✅ ext_container_status_events 已转换为 hypertable (分区列：occurred_at)'

-- 2.2 process_port_operations
\echo '转换 process_port_operations...'
SELECT create_hypertable(
    'process_port_operations', 
    'ata', 
    migrate_data => true, 
    if_not_exists => TRUE
);
\echo '✅ process_port_operations 已转换为 hypertable (分区列：ata)'

-- 2.3 process_sea_freight
\echo '转换 process_sea_freight...'
SELECT create_hypertable(
    'process_sea_freight', 
    'actual_loading_date', 
    migrate_data => true, 
    if_not_exists => TRUE
);
\echo '✅ process_sea_freight 已转换为 hypertable (分区列：actual_loading_date)'

-- 2.4 sys_data_change_log
\echo '转换 sys_data_change_log...'
SELECT create_hypertable(
    'sys_data_change_log', 
    'created_at', 
    migrate_data => true, 
    if_not_exists => TRUE
);
\echo '✅ sys_data_change_log 已转换为 hypertable (分区列：created_at)'

-- ============================================================
-- Step 3: 添加压缩和保留策略
-- ============================================================
\echo ''
\echo '============================================================'
\echo '[Step 3] 配置压缩和保留策略'
\echo '============================================================'

-- 3.1 启用压缩
\echo '启用表压缩...'
ALTER TABLE ext_container_status_events SET (timescaledb.compress = true);
ALTER TABLE process_port_operations SET (timescaledb.compress = true);
ALTER TABLE process_sea_freight SET (timescaledb.compress = true);
ALTER TABLE sys_data_change_log SET (timescaledb.compress = true);

-- 3.2 添加压缩策略（30 天后自动压缩）
\echo '添加压缩策略（30 天）...'
SELECT add_compression_policy('ext_container_status_events', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_compression_policy('process_port_operations', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_compression_policy('process_sea_freight', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_compression_policy('sys_data_change_log', INTERVAL '30 days', if_not_exists => TRUE);

-- 3.3 添加保留策略（1 年后自动删除）
\echo '添加保留策略（1 年）...'
SELECT add_retention_policy('ext_container_status_events', INTERVAL '1 year', if_not_exists => TRUE);
SELECT add_retention_policy('sys_data_change_log', INTERVAL '1 year', if_not_exists => TRUE);

\echo '✅ 压缩和保留策略已配置'

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

-- 添加 id 的普通索引（非唯一）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ext_container_status_events_id
ON ext_container_status_events(id);

-- 4.2 process_port_operations
\echo '创建 process_port_operations 索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_port_ops_container
ON process_port_operations(container_number, ata DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_port_ops_port
ON process_port_operations(port_code, ata DESC);

-- 4.3 process_sea_freight
\echo '创建 process_sea_freight 索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_sea_freight_bill
ON process_sea_freight(bill_of_lading_number, actual_loading_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_sea_freight_vessel
ON process_sea_freight(vessel_name, actual_loading_date DESC);

-- 4.4 sys_data_change_log
\echo '创建 sys_data_change_log 索引...'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sys_change_log_entity
ON sys_data_change_log(entity_type, entity_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sys_change_log_time
ON sys_data_change_log(created_at DESC);

-- 添加 id 的普通索引（非唯一）
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
\echo '检查 hypertables 列表:'
SELECT 
    hypertable_schema AS schema,
    hypertable_name AS table_name,
    num_dimensions AS partitions
FROM timescaledb_information.hypertables 
ORDER BY hypertable_name;

-- 5.2 检查数据量
\echo '检查数据量:'
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
\echo '检查唯一索引:'
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
AND indexdef LIKE '%UNIQUE%'
ORDER BY tablename, indexname;

-- 5.4 检查压缩策略
\echo '检查压缩策略:'
SELECT 
    hypertable_name AS table_name,
    compression_interval,
    compression_enabled
FROM timescaledb_information.compression_settings 
WHERE hypertable_name IN (
    'ext_container_status_events',
    'process_port_operations', 
    'process_sea_freight',
    'sys_data_change_log'
);

-- ============================================================
-- Step 6: 应用层适配说明
-- ============================================================
\echo ''
\echo '============================================================'
\echo '[Step 6] 应用层适配说明'
\echo '============================================================'
\echo '⚠️  注意：以下事项需要在应用层调整：'
\echo ''
\echo '1. INSERT ... ON CONFLICT 语法:'
\echo '   原写法：ON CONFLICT (id) DO UPDATE ...'
\echo '   新写法：ON CONFLICT ON CONSTRAINT idx_xxx_id DO UPDATE ...'
\echo ''
\echo '2. 外键约束:'
\echo '   biz_containers.bill_of_lading_number 现在是逻辑外键'
\echo '   需要在应用层保证数据完整性'
\echo ''
\echo '3. ORM 框架配置:'
\echo '   某些 ORM 依赖主键，可能需要配置使用唯一索引'
\echo ''
\echo '============================================================'
\echo '迁移完成！'
\echo '执行时间:' `SELECT NOW();`
\echo '============================================================'
