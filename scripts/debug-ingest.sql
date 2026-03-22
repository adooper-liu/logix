-- 检查是否有调用 ingestFromExtFeituoStatusEvents 的日志
-- 或者检查 updated_at 时间来推断最后一次更新

-- 查看所有涉及 ECMU5381817 的表更新时间
SELECT 
    'biz_containers' as table_name,
    container_number as key_col,
    updated_at
FROM biz_containers 
WHERE container_number = 'ECMU5381817'

UNION ALL

SELECT 
    'process_port_operations' as table_name,
    container_number as key_col,
    updated_at
FROM process_port_operations 
WHERE container_number = 'ECMU5381817'

UNION ALL

SELECT 
    'process_sea_freight' as table_name,
    bill_of_lading_number as key_col,
    updated_at
FROM process_sea_freight 
WHERE bill_of_lading_number = 'NGP3069047'

ORDER BY table_name;
