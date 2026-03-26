-- ============================================
-- 创建 TypeORM 元数据表
-- Create TypeORM Metadata Table
-- ============================================
-- 用途：TypeORM 使用此表跟踪生成列和其他元数据信息
-- 场景：当 DB_SYNCHRONIZE=true 时，TypeORM 需要查询此表
-- ============================================

-- 创建 schema（如果不存在）
CREATE SCHEMA IF NOT EXISTS public;

-- 创建 typeorm_metadata 表
CREATE TABLE IF NOT EXISTS typeorm_metadata (
    id SERIAL PRIMARY KEY,
    type VARCHAR(255) NOT NULL,
    database VARCHAR(255),
    schema VARCHAR(255),
    "table" VARCHAR(255),
    name VARCHAR(255),
    value TEXT
);

-- 添加注释
COMMENT ON TABLE typeorm_metadata IS 'TypeORM metadata table for tracking generated columns and other metadata';
COMMENT ON COLUMN typeorm_metadata.type IS 'Metadata type (e.g., GENERATED_COLUMN)';
COMMENT ON COLUMN typeorm_metadata.database IS 'Database name';
COMMENT ON COLUMN typeorm_metadata.schema IS 'Schema name';
COMMENT ON COLUMN typeorm_metadata."table" IS 'Table name';
COMMENT ON COLUMN typeorm_metadata.name IS 'Column or constraint name';
COMMENT ON COLUMN typeorm_metadata.value IS 'Metadata value';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_typeorm_metadata_type 
ON typeorm_metadata(type);

CREATE INDEX IF NOT EXISTS idx_typeorm_metadata_table 
ON typeorm_metadata("table");

CREATE INDEX IF NOT EXISTS idx_typeorm_metadata_name 
ON typeorm_metadata(name);

-- 授予权限（如果需要）
-- GRANT ALL PRIVILEGES ON typeorm_metadata TO logix_user;

-- 验证表已创建
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename = 'typeorm_metadata';
