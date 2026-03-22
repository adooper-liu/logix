-- 查询 process_empty_return 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'process_empty_return'
ORDER BY ordinal_position;

-- 查询 process_sea_freight 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'process_sea_freight'
ORDER BY ordinal_position;
