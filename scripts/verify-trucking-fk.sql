-- 验证脚本：检查车队相关表的外键约束和索引

-- 1. 检查外键约束（简化视图）
SELECT 
    tc.table_name AS '表名',
    kcu.column_name AS '列名',
    ccu.table_name AS '引用表',
    ccu.column_name AS '引列列',
    rc.update_rule AS '更新规则',
    rc.delete_rule AS '删除规则'
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('dict_trucking_port_mapping', 'dict_warehouse_trucking_mapping')
ORDER BY tc.table_name;

-- 2. 检查索引
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('dict_trucking_port_mapping', 'dict_warehouse_trucking_mapping')
AND indexname LIKE '%company%'
ORDER BY tablename, indexname;

-- 3. 查看表结构（验证字段长度） - 使用标准 SQL
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name IN ('dict_trucking_companies', 'dict_trucking_port_mapping', 'dict_warehouse_trucking_mapping')
AND column_name LIKE '%company%'
ORDER BY table_name, ordinal_position;
