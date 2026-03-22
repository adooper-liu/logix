-- 检查导入时序：ext_feituo_status_events 数据是什么时候写入的？
-- 检查 created_at 时间

SELECT container_number, event_code, event_time, created_at
FROM ext_feituo_status_events 
WHERE container_number = 'ECMU5381817'
ORDER BY event_time;

-- 检查 process_port_operations 的 created_at 和 updated_at
SELECT container_number, port_type, port_sequence, created_at, updated_at
FROM process_port_operations 
WHERE container_number = 'ECMU5381817'
ORDER BY port_sequence;
