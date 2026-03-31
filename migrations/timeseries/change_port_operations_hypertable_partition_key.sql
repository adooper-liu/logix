-- ============================================================
-- 修改 process_port_operations 表的 hypertable 分区键
-- 从 ata 改为 created_at
-- 
-- 原因：ata（实际到港日期）在导入时可能为空，
--       TimescaleDB 要求 hypertable 分区键不能为 NULL
--       使用 created_at 作为分区键更合理
-- ============================================================

BEGIN;

-- 1. 检查当前 hypertable 配置
SELECT 
    hypertable_schema,
    hypertable_name
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'process_port_operations';

-- 2. 检查当前的维度（分区键）
SELECT 
    hypertable_name,
    column_name,
    column_type,
    dimension_type
FROM timescaledb_information.dimensions
WHERE hypertable_name = 'process_port_operations';

-- 3. 删除现有的 hypertable（但保留表结构和数据）
-- 注意：这不会删除数据，只是移除 TimescaleDB 的 hypertable 特性
SELECT drop_hypertable('public.process_port_operations');

-- 4. 确认 ata 字段的 NOT NULL 约束已移除
-- （drop_hypertable 后应该可以修改约束）
ALTER TABLE public.process_port_operations 
ALTER COLUMN ata DROP NOT NULL;

-- 5. 重新创建 hypertable，使用 created_at 作为分区键
SELECT create_hypertable(
    'public.process_port_operations',
    'created_at',                    -- 时间分区列
    if_not_exists => TRUE,           -- 如果已存在则跳过
    migrate_data => TRUE,            -- 迁移现有数据
    chunk_time_interval => INTERVAL '7 days'  -- 每个 chunk 包含 7 天的数据
);

-- 6. 验证新的 hypertable 配置
SELECT 
    hypertable_schema,
    hypertable_name
FROM timescaledb_information.hypertables
WHERE hypertable_name = 'process_port_operations';

-- 7. 验证新的维度（分区键）
SELECT 
    hypertable_name,
    column_name,
    column_type,
    dimension_type
FROM timescaledb_information.dimensions
WHERE hypertable_name = 'process_port_operations';

-- 8. 验证 ata 字段现在可以为 NULL
SELECT 
    column_name, 
    is_nullable,
    data_type
FROM information_schema.columns 
WHERE table_name = 'process_port_operations' 
  AND column_name = 'ata';

COMMIT;

-- ============================================================
-- 回滚脚本（如果需要）:
-- ============================================================
/*
BEGIN;

-- 1. 删除 hypertable
SELECT drop_hypertable('public.process_port_operations');

-- 2. 恢复 ata 的 NOT NULL 约束（可选）
-- ALTER TABLE public.process_port_operations 
-- ALTER COLUMN ata SET NOT NULL;

-- 3. 重新使用 ata 作为分区键
SELECT create_hypertable(
    'public.process_port_operations',
    'ata',
    if_not_exists => TRUE,
    migrate_data => TRUE,
    chunk_time_interval => INTERVAL '7 days'
);

COMMIT;
*/
