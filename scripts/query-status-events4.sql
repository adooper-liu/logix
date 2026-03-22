-- 查询 is_estimated 字段值
SELECT container_number, event_code, event_time, is_estimated
FROM ext_feituo_status_events
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399586')
ORDER BY container_number, event_time;
