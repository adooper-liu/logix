-- 将 documentTransferDate 字段类型从 date 修改为 timestamp
-- Alter documentTransferDate column type from date to timestamp

-- 1. 备份现有数据
CREATE TABLE IF NOT EXISTS process_port_operations_backup_20250225 AS
SELECT * FROM process_port_operations;

-- 2. 修改列类型为 timestamp
ALTER TABLE process_port_operations
ALTER COLUMN "documentTransferDate" TYPE timestamp USING "documentTransferDate"::timestamp;

-- 3. 更新 MRKU4896861 的传递日期（包含时间部分）
UPDATE process_port_operations
SET "documentTransferDate" = '2025-06-13 21:17:25'::timestamp
WHERE "containerNumber" = 'MRKU4896861';

-- 4. 验证修改结果
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'process_port_operations' AND column_name = 'documentTransferDate';

-- 5. 验证数据
SELECT "containerNumber", "documentTransferDate"
FROM process_port_operations
WHERE "containerNumber" = 'MRKU4896861';
