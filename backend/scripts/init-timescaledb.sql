-- ============================================
-- LogiX TimescaleDB 集成脚本
-- TimescaleDB Integration Script
-- ============================================
-- 此脚本用于将 LogiX 数据库升级为 TimescaleDB
-- This script upgrades LogiX database to TimescaleDB
-- ============================================

-- 1. 启用 TimescaleDB 扩展
-- 1. Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- ============================================
-- 2. 创建超表 (Hypertables) - 时间序列表
-- 2. Create Hypertables - Time-series tables
-- ============================================

-- 2.1 容器状态事件表 - 核心时间序列表
-- 2.1 Container Status Events table - Core time-series table
SELECT create_hypertable(
    'container_status_events',
    'occurred_at',
    chunk_time_interval => INTERVAL '1 week',
    if_not_exists => TRUE
);

-- 为容器号创建空间分区索引（可选，用于快速查询特定货柜）
-- Create spatial partition index for container_number (optional, for fast container-specific queries)
SELECT create_hypertable(
    'container_status_events',
    'occurred_at',
    chunk_time_interval => INTERVAL '1 week',
    partitioning_column => 'container_number',
    number_partitions => 4,
    if_not_exists => TRUE
);

-- 创建复合索引优化查询性能
-- Create composite indexes for query optimization
CREATE INDEX IF NOT EXISTS idx_container_status_events_container_time
    ON container_status_events (container_number, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_container_status_events_status_time
    ON container_status_events (status_code, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_container_status_events_location_time
    ON container_status_events (location_code, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_container_status_events_source_time
    ON container_status_events (data_source, occurred_at DESC);

-- 2.2 港口操作表 - 多港经停场景
-- 2.2 Port Operations table - Multi-port transit scenarios
SELECT create_hypertable(
    'process_port_operations',
    'gate_in_time',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);

-- 创建港口操作相关索引
-- Create port operation related indexes
CREATE INDEX IF NOT EXISTS idx_port_operations_container_type_time
    ON process_port_operations (container_number, port_type, gate_in_time DESC);

CREATE INDEX IF NOT EXISTS idx_port_operations_port_sequence_time
    ON process_port_operations (port_code, port_sequence, gate_in_time DESC);

CREATE INDEX IF NOT EXISTS idx_port_operations_eta_time
    ON process_port_operations (eta_dest_port DESC NULLS LAST);

-- ============================================
-- 3. 数据压缩策略
-- 3. Data compression policies
-- ============================================

-- 3.1 容器状态事件表压缩 - 压缩 30 天前的数据
-- 3.1 Container status events compression - Compress data older than 30 days
ALTER TABLE container_status_events SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'container_number,status_code'
);

SELECT add_compression_policy(
    'container_status_events',
    INTERVAL '30 days',
    if_not_exists => TRUE
);

-- 3.2 港口操作表压缩 - 压缩 90 天前的数据
-- 3.2 Port operations compression - Compress data older than 90 days
ALTER TABLE process_port_operations SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'container_number,port_type'
);

SELECT add_compression_policy(
    'process_port_operations',
    INTERVAL '90 days',
    if_not_exists => TRUE
);

-- ============================================
-- 4. 数据保留策略
-- 4. Data retention policies
-- ============================================

-- 4.1 容器状态事件保留 2 年
-- 4.1 Container status events retain for 2 years
SELECT add_retention_policy(
    'container_status_events',
    INTERVAL '2 years',
    if_not_exists => TRUE
);

-- 4.2 港口操作保留 3 年（用于历史分析）
-- 4.2 Port operations retain for 3 years (for historical analysis)
SELECT add_retention_policy(
    'process_port_operations',
    INTERVAL '3 years',
    if_not_exists => TRUE
);

-- ============================================
-- 5. 连续聚合视图 - 预聚合统计信息
-- 5. Continuous aggregate views - Pre-aggregated statistics
-- ============================================

-- 5.1 每日货柜状态统计
-- 5.1 Daily container status statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS container_status_daily_stats
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', occurred_at) AS bucket,
    container_number,
    status_code,
    COUNT(*) AS event_count,
    COUNT(DISTINCT location_code) AS unique_locations,
    MIN(occurred_at) AS first_event_time,
    MAX(occurred_at) AS last_event_time,
    AVG(EXTRACT(EPOCH FROM (MAX(occurred_at) - MIN(occurred_at))) / 60) AS avg_duration_minutes
FROM container_status_events
GROUP BY bucket, container_number, status_code;

-- 刷新连续聚合视图 - 每小时刷新一次
-- Refresh continuous aggregate view - Refresh every hour
SELECT add_continuous_aggregate_policy(
    'container_status_daily_stats',
    start_offset => INTERVAL '3 months',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- 为连续聚合视图创建索引
-- Create indexes for continuous aggregate view
CREATE INDEX IF NOT EXISTS idx_container_status_daily_stats_bucket
    ON container_status_daily_stats (bucket DESC, container_number);

-- 5.2 每日港口操作统计
-- 5.2 Daily port operations statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS port_operations_daily_stats
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', gate_in_time) AS bucket,
    port_code,
    port_type,
    COUNT(*) AS container_count,
    COUNT(DISTINCT container_number) AS unique_containers,
    COUNT(*) FILTER (WHERE ata_dest_port IS NOT NULL) AS arrived_count,
    COUNT(*) FILTER (WHERE gate_out_time IS NOT NULL) AS departed_count,
    AVG(EXTRACT(EPOCH FROM (gate_out_time - gate_in_time)) / 3600) FILTER (
        WHERE gate_in_time IS NOT NULL AND gate_out_time IS NOT NULL
    ) AS avg_stay_hours
FROM process_port_operations
WHERE gate_in_time IS NOT NULL
GROUP BY bucket, port_code, port_type;

-- 刷新连续聚合视图 - 每天刷新一次
-- Refresh continuous aggregate view - Refresh daily
SELECT add_continuous_aggregate_policy(
    'port_operations_daily_stats',
    start_offset => INTERVAL '6 months',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- 5.3 每周物流效率统计
-- 5.3 Weekly logistics efficiency statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS logistics_weekly_efficiency
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 week', occurred_at) AS bucket,
    container_number,
    COUNT(*) AS total_events,
    COUNT(DISTINCT status_code) AS unique_status_changes,
    COUNT(*) FILTER (WHERE status_code IN ('DLPT', 'ARVD', 'DICH')) AS key_events,
    MIN(occurred_at) AS first_event,
    MAX(occurred_at) AS last_event,
    EXTRACT(EPOCH FROM (MAX(occurred_at) - MIN(occurred_at))) / 86400 AS total_days
FROM container_status_events
GROUP BY bucket, container_number;

-- 刷新连续聚合视图 - 每天刷新一次
-- Refresh continuous aggregate view - Refresh daily
SELECT add_continuous_aggregate_policy(
    'logistics_weekly_efficiency',
    start_offset => INTERVAL '3 months',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- ============================================
-- 6. 性能优化设置
-- 6. Performance optimization settings
-- ============================================

-- 6.1 设置查询优化级别
-- 6.1 Set query optimization level
ALTER DATABASE logix_db SET timescaledb.enable_materialization_only_mode = false;

-- 6.2 启用后台工作进程
-- 6.2 Enable background workers
ALTER DATABASE logix_db SET max_worker_processes = 8;
ALTER DATABASE logix_db SET max_parallel_workers_per_gather = 4;

-- ============================================
-- 7. 实用函数
-- 7. Utility functions
-- ============================================

-- 7.1 获取货柜最新状态
-- 7.1 Get latest container status
CREATE OR REPLACE FUNCTION get_latest_container_status(p_container_number VARCHAR)
RETURNS TABLE (
    status_code VARCHAR,
    occurred_at TIMESTAMP,
    location_name VARCHAR,
    is_estimated BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        se.status_code,
        se.occurred_at,
        COALESCE(se.location_name_cn, se.location_name_en, se.location_code) AS location_name,
        se.is_estimated
    FROM container_status_events se
    WHERE se.container_number = p_container_number
    ORDER BY se.occurred_at DESC, se.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 7.2 计算货柜在各港口停留时间
-- 7.2 Calculate container dwell time at each port
CREATE OR REPLACE FUNCTION calculate_container_dwell_time(p_container_number VARCHAR)
RETURNS TABLE (
    port_name VARCHAR,
    port_type VARCHAR,
    gate_in_time TIMESTAMP,
    gate_out_time TIMESTAMP,
    dwell_hours NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        po.port_name,
        po.port_type,
        po.gate_in_time,
        po.gate_out_time,
        EXTRACT(EPOCH FROM (po.gate_out_time - po.gate_in_time)) / 3600 AS dwell_hours
    FROM process_port_operations po
    WHERE po.container_number = p_container_number
      AND po.gate_in_time IS NOT NULL
      AND po.gate_out_time IS NOT NULL
    ORDER BY po.gate_in_time;
END;
$$ LANGUAGE plpgsql;

-- 7.3 检测异常状态事件（长时间无更新）
-- 7.3 Detect abnormal status events (long time without updates)
CREATE OR REPLACE FUNCTION detect_stagnant_containers(threshold_hours INTEGER DEFAULT 24)
RETURNS TABLE (
    container_number VARCHAR,
    last_status VARCHAR,
    last_update TIMESTAMP,
    hours_since_update NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cse1.container_number,
        cse1.status_code AS last_status,
        cse1.occurred_at AS last_update,
        EXTRACT(EPOCH FROM (NOW() - cse1.occurred_at)) / 3600 AS hours_since_update
    FROM (
        SELECT DISTINCT ON (container_number) container_number, occurred_at, status_code
        FROM container_status_events
        ORDER BY container_number, occurred_at DESC
    ) cse1
    WHERE EXTRACT(EPOCH FROM (NOW() - cse1.occurred_at)) / 3600 > threshold_hours
    ORDER BY cse1.occurred_at ASC;
END;
$$ LANGUAGE plpgsql;

-- 7.4 获取货柜完整时间线
-- 7.4 Get complete container timeline
CREATE OR REPLACE FUNCTION get_container_timeline(p_container_number VARCHAR)
RETURNS TABLE (
    event_time TIMESTAMP,
    status_code VARCHAR,
    status_name VARCHAR,
    location VARCHAR,
    event_type VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        occurred_at AS event_time,
        status_code,
        COALESCE(description_cn, description_en, status_code) AS status_name,
        COALESCE(location_name_cn, location_name_en, location_code) AS location,
        'STATUS_EVENT' AS event_type
    FROM container_status_events
    WHERE container_number = p_container_number

    UNION ALL

    SELECT
        gate_in_time AS event_time,
        'GATE_IN' AS status_code,
        '进港' AS status_name,
        port_name AS location,
        'PORT_OPERATION' AS event_type
    FROM process_port_operations
    WHERE container_number = p_container_number AND gate_in_time IS NOT NULL

    ORDER BY event_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 8. TimescaleDB 信息查询函数
-- 8. TimescaleDB information query functions
-- ============================================

-- 8.1 获取所有超表信息
-- 8.1 Get all hypertables information
CREATE OR REPLACE FUNCTION get_hypertables_info()
RETURNS TABLE (
    hypertable_name TEXT,
    total_size NUMERIC,
    compressed_size NUMERIC,
    compression_ratio NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.hypertable_name,
        pg_size_pretty(pg_total_relation_size(h.hypertable_schema || '.' || h.hypertable_name))::NUMERIC AS total_size,
        pg_size_pretty(SUM(pg_total_relation_size(c.schema_name || '.' || c.table_name)))::NUMERIC AS compressed_size,
        CASE
            WHEN SUM(pg_total_relation_size(c.schema_name || '.' || c.table_name)) > 0 THEN
                (SUM(pg_total_relation_size(c.schema_name || '.' || c.table_name))::NUMERIC /
                 pg_total_relation_size(h.hypertable_schema || '.' || h.hypertable_name)::NUMERIC) * 100
            ELSE 0
        END AS compression_ratio
    FROM timescaledb_information.hypertables h
    LEFT JOIN timescaledb_information.chunks c ON c.hypertable_name = h.hypertable_name
      AND c.schema_name = h.hypertable_schema
    GROUP BY h.hypertable_name, h.hypertable_schema;
END;
$$ LANGUAGE plpgsql;

-- 8.2 获取压缩统计信息
-- 8.2 Get compression statistics
CREATE OR REPLACE FUNCTION get_compression_stats()
RETURNS TABLE (
    hypertable_name TEXT,
    total_chunks BIGINT,
    compressed_chunks BIGINT,
    uncompressed_chunks BIGINT,
    compression_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        h.hypertable_name,
        COUNT(*)::BIGINT AS total_chunks,
        COUNT(*) FILTER (WHERE c.compressed = true)::BIGINT AS compressed_chunks,
        COUNT(*) FILTER (WHERE c.compressed = false)::BIGINT AS uncompressed_chunks,
        ROUND((COUNT(*) FILTER (WHERE c.compressed = true)::NUMERIC / COUNT(*)::NUMERIC * 100), 2) AS compression_percentage
    FROM timescaledb_information.hypertables h
    JOIN timescaledb_information.chunks c ON c.hypertable_name = h.hypertable_name
      AND c.schema_name = h.hypertable_schema
    GROUP BY h.hypertable_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. 权限设置（可选）
-- 9. Permission settings (optional)
-- ============================================

-- 授予应用用户必要的 TimescaleDB 权限
-- Grant necessary TimescaleDB permissions to application user
-- GRANT USAGE ON SCHEMA timescaledb_information TO ${DB_USERNAME};
-- GRANT SELECT ON ALL TABLES IN SCHEMA timescaledb_information TO ${DB_USERNAME};

-- ============================================
-- 10. 验证安装
-- 10. Verify installation
-- ============================================

-- 显示 TimescaleDB 版本
-- Show TimescaleDB version
\echo '========================================'
\echo 'TimescaleDB Integration Complete!'
\echo '========================================'
\echo ''
SELECT
    'TimescaleDB Version: ' || extversion AS info
FROM pg_extension
WHERE extname = 'timescaledb';

-- 显示已创建的超表
-- Show created hypertables
SELECT 'Hypertables:' AS info;
SELECT
    hypertable_schema || '.' || hypertable_name AS hypertable
FROM timescaledb_information.hypertables
ORDER BY hypertable_name;

-- 显示连续聚合视图
-- Show continuous aggregate views
SELECT 'Continuous Aggregates:' AS info;
SELECT
    view_schema || '.' || view_name AS continuous_aggregate
FROM timescaledb_information.continuous_aggregates
ORDER BY view_name;

-- 显示压缩策略
-- Show compression policies
SELECT 'Compression Policies:' AS info;
SELECT
    hypertable_name,
    compress_after::TEXT AS compress_after_days
FROM timescaledb_information.jobs j
JOIN timescaledb_information.hypertables h ON h.hypertable_name::TEXT = j.hypertable_name::TEXT
WHERE j.proc_name = 'policy_compression'
ORDER BY hypertable_name;

-- 显示数据保留策略
-- Show retention policies
SELECT 'Retention Policies:' AS info;
SELECT
    hypertable_name,
    drop_after::TEXT AS retain_duration
FROM timescaledb_information.jobs j
JOIN timescaledb_information.hypertables h ON h.hypertable_name::TEXT = j.hypertable_name::TEXT
WHERE j.proc_name = 'policy_retention'
ORDER BY hypertable_name;

\echo ''
\echo '========================================'
\echo 'TimescaleDB setup completed successfully!'
\echo '========================================'
