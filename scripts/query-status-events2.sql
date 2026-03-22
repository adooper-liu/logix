-- 查询 ext_container_status_events 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ext_container_status_events'
ORDER BY ordinal_position;

-- 查询 ext_container_status_events 数据（不查location_code）
SELECT container_number, status_code, occurred_at, description_cn
FROM ext_container_status_events
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399586')
ORDER BY container_number, occurred_at
LIMIT 30;
