-- ============================================================
-- 迁移：为 process_port_operations 表添加飞驼状态码映射所需字段
-- 用途：支持 P1/P2 阶段飞驼状态码集成
-- 用法：
--   1. psql -h <host> -U <user> -d <database> -f migrations/add_feituo_port_operation_fields.sql
--   2. 在 DBeaver / pgAdmin 等客户端中打开本文件并执行
--   3. 在项目根目录：psql $DATABASE_URL -f migrations/add_feituo_port_operation_fields.sql
-- 说明：ALTER TABLE ADD COLUMN IF NOT EXISTS，重复执行不会报错
--
-- 关联状态码：
--   - manifest_release_date: MFR (原始舱单放行)
--   - document_cutoff_date: SICT (截单时间)
--   - customs_cutoff_date: CUCT (截关时间)
--   - port_open_date: CYOP (出口进箱开始时间)
--   - port_close_date: CYCL (出口进箱截止时间)
-- ============================================================

-- 添加 manifest_release_date 字段
ALTER TABLE process_port_operations 
ADD COLUMN IF NOT EXISTS manifest_release_date TIMESTAMP;

-- 添加 document_cutoff_date 字段
ALTER TABLE process_port_operations 
ADD COLUMN IF NOT EXISTS document_cutoff_date TIMESTAMP;

-- 添加 customs_cutoff_date 字段
ALTER TABLE process_port_operations 
ADD COLUMN IF NOT EXISTS customs_cutoff_date TIMESTAMP;

-- 添加 port_open_date 字段
ALTER TABLE process_port_operations 
ADD COLUMN IF NOT EXISTS port_open_date DATE;

-- 添加 port_close_date 字段
ALTER TABLE process_port_operations 
ADD COLUMN IF NOT EXISTS port_close_date DATE;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_port_operations_manifest_release 
ON process_port_operations(manifest_release_date);

CREATE INDEX IF NOT EXISTS idx_port_operations_document_cutoff 
ON process_port_operations(document_cutoff_date);

CREATE INDEX IF NOT EXISTS idx_port_operations_customs_cutoff 
ON process_port_operations(customs_cutoff_date);

CREATE INDEX IF NOT EXISTS idx_port_operations_port_open 
ON process_port_operations(port_open_date);

CREATE INDEX IF NOT EXISTS idx_port_operations_port_close 
ON process_port_operations(port_close_date);

-- 验证字段添加成功
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'process_port_operations'
AND column_name IN (
    'manifest_release_date',
    'document_cutoff_date', 
    'customs_cutoff_date',
    'port_open_date',
    'port_close_date'
)
ORDER BY column_name;
