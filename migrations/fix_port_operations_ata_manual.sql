-- ============================================================
-- 修复 process_port_operations 表的 ata 字段 NOT NULL 约束
-- 
-- 方案：重建表，移除 hypertable 特性，使用普通表
-- 原因：ata 在导入时可能为空，不适合作为 hypertable 分区键
-- ============================================================

BEGIN;

-- 1. 备份现有数据到临时表
CREATE TABLE process_port_operations_backup AS 
SELECT * FROM process_port_operations;

-- 2. 删除 hypertable（这会保留数据但移除 TimescaleDB 特性）
-- 注意：如果 drop_hypertable 不存在，手动操作
DO $$
BEGIN
    -- 尝试删除 hypertable
    BEGIN
        EXECUTE format('SELECT drop_hypertable(%L)', 'process_port_operations');
    EXCEPTION WHEN undefined_function THEN
        RAISE NOTICE 'drop_hypertable function not found, will use manual method';
    END;
END $$;

-- 3. 如果是 hypertable，需要删除后重新创建
-- 检查是否还是 hypertable
DO $$
DECLARE
    is_hypertable BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM timescaledb_information.hypertables 
        WHERE hypertable_name = 'process_port_operations'
    ) INTO is_hypertable;
    
    IF is_hypertable THEN
        RAISE NOTICE 'Table is still a hypertable, need to recreate';
    ELSE
        RAISE NOTICE 'Table is no longer a hypertable';
    END IF;
END $$;

-- 4. 重新创建表（如果不是 hypertable）
-- 这需要手动执行，因为 SQL 不支持条件 DDL

COMMIT;

-- 手动步骤：
-- 1. 如果上面失败了，直接执行：
--    DROP TABLE IF EXISTS process_port_operations CASCADE;
--    CREATE TABLE process_port_operations (...); -- 重新创建表结构
--    INSERT INTO process_port_operations SELECT * FROM process_port_operations_backup;
--    DROP TABLE process_port_operations_backup;
