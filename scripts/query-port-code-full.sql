-- 查询 port_code 字段值
SELECT event_code, event_time, event_place, port_code, terminal_name
FROM ext_feituo_status_events 
WHERE container_number = 'ECMU5381817'
ORDER BY event_time;
