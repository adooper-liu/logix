-- 诊断脚本：检查 DictManageController 查询失败的原因

-- 1. 检查表是否存在以及记录数
SELECT 
    'dict_trucking_port_mapping' as table_name,
    COUNT(*) as record_count
FROM dict_trucking_port_mapping
UNION ALL
SELECT 
    'dict_trucking_companies' as table_name,
    COUNT(*) as record_count
FROM dict_trucking_companies;

-- 2. 检查外键约束状态
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as referenced_table,
    contype as constraint_type
FROM pg_constraint
WHERE conname = 'fk_trucking_company';

-- 3. 检查字段类型和长度
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('dict_trucking_port_mapping', 'dict_trucking_companies')
AND column_name IN ('trucking_company_id', 'company_code')
ORDER BY table_name, column_name;

-- 4. 尝试直接查询（模拟 DictManageController 的查询）
SELECT * FROM dict_trucking_port_mapping 
ORDER BY created_at DESC 
LIMIT 20 OFFSET 0;

-- 5. 检查是否有任何锁或阻塞
SELECT 
    pid,
    usename,
    query,
    state,
    wait_event_type
FROM pg_stat_activity
WHERE query LIKE '%dict_trucking_port_mapping%'
AND state != 'idle';
