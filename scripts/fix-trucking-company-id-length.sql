-- 修复 dict_trucking_port_mapping 表的字段长度
-- 确保 trucking_company_id 与 dict_trucking_companies.company_code 长度一致 (VARCHAR(100))

BEGIN;

-- 1. 检查当前字段类型
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'dict_trucking_port_mapping'
AND column_name = 'trucking_company_id';

-- 2. 修改字段长度为 VARCHAR(100)
ALTER TABLE dict_trucking_port_mapping
ALTER COLUMN trucking_company_id TYPE VARCHAR(100);

-- 3. 同样修复 warehouse-trucking-mapping 表
ALTER TABLE dict_warehouse_trucking_mapping
ALTER COLUMN trucking_company_id TYPE VARCHAR(100);

-- 4. 验证修改结果
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('dict_trucking_port_mapping', 'dict_warehouse_trucking_mapping')
AND column_name = 'trucking_company_id'
ORDER BY table_name;

COMMIT;
