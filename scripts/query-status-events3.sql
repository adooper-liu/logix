-- 查询 ext_container_status_events 数据
SELECT container_number, status_code, status_name, occurred_at, location, description
FROM ext_container_status_events
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399586')
ORDER BY container_number, occurred_at
LIMIT 30;
