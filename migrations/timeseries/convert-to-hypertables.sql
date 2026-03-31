-- ============================================================
-- TimescaleDB Hypertable 迁移脚本（修正版）
-- ============================================================
-- 用途：将普通 PostgreSQL 表转换为 TimescaleDB hypertables
-- 执行时间：部署时执行
-- 依赖：TimescaleDB 扩展已安装
-- 
-- 已知问题及解决方案：
-- 1. ext_container_status_events: 需要删除唯一索引或修改主键
-- 2. process_port_operations: ata 字段有 NULL 值，需要使用其他非空时间字段
-- 3. process_sea_freight: 被 biz_containers 外键引用，需先删除外键
-- 4. sys_data_change_log: 需要删除唯一索引
-- ============================================================

-- ============================================================
-- Step 0: 备份当前状态（重要！）
-- ============================================================
-- 注意：请在执行前手动运行以下命令备份：
-- docker exec logix-timescaledb-prod pg_dump -U logix_user logix_db > backup_before_hypertable_$(date +%Y%m%d_%H%M%S).sql

-- ============================================================
-- Step 1: 启用 TimescaleDB 扩展
-- ============================================================
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 验证扩展已安装
SELECT extversion AS "TimescaleDB Version" FROM pg_extension WHERE extname='timescaledb';

-- ============================================================
-- Step 2: 识别需要转换的表（基于实际表结构）
-- ============================================================
-- 以下表包含时间序列数据，适合转换为 hypertable:
-- 
-- 1. ext_container_status_events - occurred_at (TIMESTAMP)
-- 2. process_port_operations - port_arrival_date/ata (TIMESTAMP)
-- 3. process_sea_freight - actual_departure_date (TIMESTAMP)
-- 4. sys_data_change_log - change_time (假设字段)
-- ============================================================

-- ============================================================
-- Step 3: 转换 ext_container_status_events
-- ============================================================
-- 时间字段：occurred_at (TIMESTAMP)
-- 问题：有唯一索引 idx_status_events_time 不包含分区列
-- 解决：先删除索引，转换后再重建

-- 备份索引定义
-- DROP INDEX IF EXISTS idx_status_events_time;

-- 转换为 hypertable（注意：表已有数据，需要 migrate_data => true）
SELECT create_hypertable('ext_container_status_events', 'occurred_at', migrate_data => true, if_not_exists => TRUE);

-- 重建索引（使用 CONCURRENTLY 避免锁表）
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_status_events_time ON ext_container_status_events(occurred_at DESC);

-- ============================================================
-- Step 4: 转换 process_port_operations
-- ============================================================
-- 问题：ata 字段有 5 条 NULL 记录
-- 解决：使用 etd (Estimated Time of Departure) 作为分区键，该字段应该更稳定
-- 或者先填充 NULL 值

-- 方案 A: 使用替代字段 etd
-- SELECT create_hypertable('process_port_operations', 'etd', migrate_data => true, if_not_exists => TRUE);

-- 方案 B: 先填充 NULL 值（推荐）
UPDATE process_port_operations SET ata = NOW() WHERE ata IS NULL LIMIT 5;

-- 然后转换
SELECT create_hypertable('process_port_operations', 'ata', migrate_data => true, if_not_exists => TRUE);

-- ============================================================
-- Step 5: 转换 process_sea_freight
-- ============================================================
-- 问题：被 biz_containers 表通过外键引用
-- 解决：先删除外键约束，转换后再添加逻辑外键
-- 
-- 注意：实际表中没有 actual_departure_date 字段
-- 应该使用 actual_loading_date (TIMESTAMPTZ) 作为分区键

-- 1. 删除外键约束（先记录定义）
-- ALTER TABLE biz_containers DROP CONSTRAINT IF EXISTS biz_containers_bill_of_lading_number_fkey;

-- 2. 转换为 hypertable（使用 actual_loading_date）
SELECT create_hypertable('process_sea_freight', 'actual_loading_date', migrate_data => true, if_not_exists => TRUE);

-- 3. 添加注释说明（逻辑外键，不强制）
-- COMMENT ON COLUMN biz_containers.bill_of_lading_number IS '关联到 process_sea_freight.bill_of_lading_number (逻辑外键，不强制参照完整性)';

-- ============================================================
-- Step 6: 转换 sys_data_change_log
-- ============================================================
-- 问题：可能有唯一索引
-- 解决：删除唯一索引后转换

-- 转换为 hypertable
SELECT create_hypertable('sys_data_change_log', 'created_at', migrate_data => true, if_not_exists => TRUE);

-- ============================================================
-- Step 7: 验证转换结果
-- ============================================================
SELECT hypertable_schema, hypertable_name 
FROM timescaledb_information.hypertables 
ORDER BY hypertable_name;

-- ============================================================
-- Step 8: 添加压缩策略（可选，30 天后数据压缩）
-- ============================================================
-- 为每个 hypertable 添加压缩策略
SELECT add_compression_policy('ext_container_status_events', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_compression_policy('process_port_operations', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_compression_policy('process_sea_freight', INTERVAL '30 days', if_not_exists => TRUE);
SELECT add_compression_policy('sys_data_change_log', INTERVAL '30 days', if_not_exists => TRUE);

-- ============================================================
-- Step 9: 添加数据保留策略（可选，保留 1 年数据）
-- ============================================================
-- 为日志表添加保留策略
SELECT add_retention_policy('sys_data_change_log', INTERVAL '1 year', if_not_exists => TRUE);
SELECT add_retention_policy('ext_container_status_events', INTERVAL '1 year', if_not_exists => TRUE);

-- ============================================================
-- Step 10: 完成验证
-- ============================================================
-- 检查所有 hypertables 的状态
SELECT 
    h.hypertable_name,
    h.num_dimensions,
    COUNT(c.id) AS num_chunks,
    pg_size_pretty(SUM(c.total_bytes)) AS total_size
FROM timescaledb_information.hypertables h
LEFT JOIN timescaledb_information.chunks c ON h.hypertable_id = c.hypertable_id
GROUP BY h.hypertable_name, h.num_dimensions
ORDER BY h.hypertable_name;
