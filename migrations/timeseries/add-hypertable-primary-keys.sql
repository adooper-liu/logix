-- ============================================================
-- TimescaleDB 主键优化脚本
-- ============================================================
-- 用途：解决 hypertable 主键必须包含分区列的问题
-- 执行时机：在 convert-to-hypertables.sql 成功执行后
-- 依赖：所有目标表已转换为 hypertable
-- ============================================================

-- ============================================================
-- 背景说明
-- ============================================================
-- TimescaleDB 要求：
-- 1. hypertable 的主键（如果有）必须包含时间分区列
-- 2. 唯一索引也必须包含分区列
-- 
-- 当前状态：
-- - ext_container_status_events: 主键 (id), 分区列 (occurred_at)
-- - process_port_operations: 主键 (id), 分区列 (ata)
-- - process_sea_freight: 主键 (id), 分区列 (actual_loading_date)
-- - sys_data_change_log: 主键 (id), 分区列 (created_at)
-- 
-- 影响：
-- - 无法创建不包含分区列的唯一索引
-- - 可能导致应用层查询性能下降
-- ============================================================

-- ============================================================
-- Step 1: 检查当前主键和索引状态
-- ============================================================
SELECT 
    schemaname AS table_schema,
    tablename AS table_name,
    indexname AS index_name,
    indexdef AS index_definition
FROM pg_indexes 
WHERE tablename IN (
    'ext_container_status_events',
    'process_port_operations', 
    'process_sea_freight',
    'sys_data_change_log'
)
AND indexdef LIKE '%UNIQUE%'
ORDER BY tablename, indexname;

-- ============================================================
-- Step 2: 方案 A - 删除主键，改用唯一索引（推荐）
-- ============================================================
-- 优点：简单快速，不影响现有数据
-- 缺点：失去主键的强制约束（但唯一索引也有类似效果）

-- 2.1 ext_container_status_events
ALTER TABLE ext_container_status_events 
    DROP CONSTRAINT IF EXISTS ext_container_status_events_pkey;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ext_container_status_events_id 
ON ext_container_status_events(id);

-- 2.2 process_port_operations
ALTER TABLE process_port_operations 
    DROP CONSTRAINT IF EXISTS process_port_operations_pkey;

CREATE UNIQUE INDEX IF NOT EXISTS idx_process_port_operations_id 
ON process_port_operations(id);

-- 2.3 process_sea_freight
ALTER TABLE process_sea_freight 
    DROP CONSTRAINT IF EXISTS process_sea_freight_pkey;

CREATE UNIQUE INDEX IF NOT EXISTS idx_process_sea_freight_id 
ON process_sea_freight(id);

-- 2.4 sys_data_change_log
ALTER TABLE sys_data_change_log 
    DROP CONSTRAINT IF EXISTS sys_data_change_log_pkey;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sys_data_change_log_id 
ON sys_data_change_log(id);

-- ============================================================
-- Step 3: 方案 B - 添加复合主键（备选）
-- ============================================================
-- 优点：保持主键约束
-- 缺点：需要重建所有外键引用，可能影响应用层代码

-- 如果选择此方案，请注释掉 Step 2，取消下面的注释：

-- 3.1 ext_container_status_events
-- ALTER TABLE ext_container_status_events 
--     DROP CONSTRAINT IF EXISTS ext_container_status_events_pkey,
--     ADD PRIMARY KEY (id, occurred_at);

-- 3.2 process_port_operations
-- ALTER TABLE process_port_operations 
--     DROP CONSTRAINT IF EXISTS process_port_operations_pkey,
--     ADD PRIMARY KEY (id, ata);

-- 3.3 process_sea_freight
-- ALTER TABLE process_sea_freight 
--     DROP CONSTRAINT IF EXISTS process_sea_freight_pkey,
--     ADD PRIMARY KEY (id, actual_loading_date);

-- 3.4 sys_data_change_log
-- ALTER TABLE sys_data_change_log 
--     DROP CONSTRAINT IF EXISTS sys_data_change_log_pkey,
--     ADD PRIMARY KEY (id, created_at);

-- ============================================================
-- Step 4: 创建包含分区列的复合索引（性能优化）
-- ============================================================
-- 目的：提高常用查询的性能

-- 4.1 ext_container_status_events
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ext_container_events_lookup
ON ext_container_status_events(container_number, occurred_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ext_container_events_time_only
ON ext_container_status_events(occurred_at DESC);

-- 4.2 process_port_operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_port_ops_container
ON process_port_operations(container_number, ata DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_port_ops_port
ON process_port_operations(port_code, ata DESC);

-- 4.3 process_sea_freight
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_sea_freight_bill
ON process_sea_freight(bill_of_lading_number, actual_loading_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_process_sea_freight_vessel
ON process_sea_freight(vessel_name, actual_loading_date DESC);

-- 4.4 sys_data_change_log
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sys_change_log_entity
ON sys_data_change_log(entity_type, entity_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sys_change_log_time
ON sys_data_change_log(created_at DESC);

-- ============================================================
-- Step 5: 验证结果
-- ============================================================
-- 检查 hypertables 的主键情况

SELECT 
    h.hypertable_name,
    c.constraint_name,
    c.constraint_type,
    pg_get_constraintdef(c.oid) AS constraint_definition
FROM timescaledb_information.hypertables h
LEFT JOIN pg_constraint c ON c.conrelid = (h.hypertable_schema || '.' || h.hypertable_name)::regclass
WHERE c.contype = 'p'  -- Primary key
ORDER BY h.hypertable_name;

-- 检查唯一索引

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN (
    'ext_container_status_events',
    'process_port_operations', 
    'process_sea_freight',
    'sys_data_change_log'
)
AND indexdef LIKE '%UNIQUE%'
ORDER BY tablename, indexname;

-- ============================================================
-- Step 6: 应用层适配建议
-- ============================================================
-- 如果删除了主键，应用层需要注意：

-- 1. INSERT ... ON CONFLICT 语法需要调整
-- 原来：INSERT INTO table (id, ...) VALUES (...) ON CONFLICT (id) DO UPDATE ...
-- 现在：使用唯一索引名称
-- INSERT INTO table (id, ...) VALUES (...) ON CONFLICT ON CONSTRAINT idx_xxx DO UPDATE ...

-- 2. 外键引用不受影响
-- 即使删除了主键，只要有唯一索引，其他表仍然可以引用

-- 3. ORM 框架配置
-- 某些 ORM 框架依赖主键，可能需要配置使用唯一索引

-- ============================================================
-- 完成
-- ============================================================
-- 提示：执行完成后，请运行测试用例确保应用层逻辑正常
