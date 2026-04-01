-- 检查 dict_warehouses 表结构
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'dict_warehouses'
ORDER BY ordinal_position;
