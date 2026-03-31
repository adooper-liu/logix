-- 修复 process_port_operations 表中 port_code 和 port_name 语义颠倒问题
-- 问题：port_code 存储了港口名称，port_name 存储了港口代码
-- 解决方案：交换这两个字段的值

-- 1. 备份当前数据（可选）
-- CREATE TABLE process_port_operations_backup AS SELECT * FROM process_port_operations;

-- 2. 交换 port_code 和 port_name 的值
UPDATE process_port_operations
SET 
    port_code = port_name,
    port_name = port_code
WHERE port_code IS NOT NULL AND port_name IS NOT NULL
AND port_code ~ '^[A-Z]{3,5}$' AND port_name !~ '^[A-Z]{3,5}$';

-- 3. 验证修改结果
SELECT 
    container_number,
    port_type,
    port_code,
    port_name
FROM process_port_operations
LIMIT 10;

-- 4. 统计修改行数
SELECT COUNT(*) AS updated_rows
FROM process_port_operations
WHERE port_code IS NOT NULL AND port_name IS NOT NULL
AND port_code ~ '^[A-Z]{3,5}$' AND port_name !~ '^[A-Z]{3,5}$';

-- 5. 说明
-- 此脚本根据以下规则判断是否需要交换：
-- - port_code 看起来像代码（3-5个大写字母）
-- - port_name 看起来不像代码（不是3-5个大写字母）
-- 这样可以避免误交换已经正确的数据
