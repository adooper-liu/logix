-- 检查映射表当前记录数
SELECT COUNT(*) as total FROM dict_trucking_port_mapping;

-- 查看最近的记录（按创建时间）
SELECT 
    id,
    country,
    trucking_company_id,
    trucking_company_name,
    port_code,
    port_name,
    created_at
FROM dict_trucking_port_mapping 
ORDER BY created_at DESC 
LIMIT 10;

-- 检查是否有今天创建的记录
SELECT 
    COUNT(*) as today_count,
    MIN(created_at) as earliest_today,
    MAX(created_at) as latest_today
FROM dict_trucking_port_mapping 
WHERE DATE(created_at) = CURRENT_DATE;
