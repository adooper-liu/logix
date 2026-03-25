-- ============================================================
-- 修改 process_port_operations 表的 hypertable 分区键
-- 从 ata 改为 created_at
-- 
-- 原因：ata（实际到港日期）在导入时可能为空，
--       TimescaleDB 要求 hypertable 分区键不能为 NULL
--       使用 created_at 作为分区键更合理
-- ============================================================

-- 步骤 1: 删除 hypertable（保留表和数据）
SELECT drop_hypertable('process_port_operations'::regclass);

-- 步骤 2: 移除 NOT NULL 约束
ALTER TABLE process_port_operations ALTER COLUMN ata DROP NOT NULL;

-- 步骤 3: 重新创建 hypertable，使用 created_at 作为分区键
SELECT create_hypertable(
    'process_port_operations'::regclass,
    'created_at',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE,
    migrate_data => TRUE
);

-- 步骤 4: 验证
SELECT 
    hypertable_name,
    column_name,
    column_type
FROM timescaledb_information.dimensions
WHERE hypertable_name = 'process_port_operations';

-- 验证 ata 可以为 NULL
SELECT is_nullable 
FROM information_schema.columns 
WHERE table_name = 'process_port_operations' AND column_name = 'ata';
