-- 查询 ext_container_status_events 数据
SELECT container_number, status_code, occurred_at, location_code, description_cn
FROM ext_container_status_events
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399586')
ORDER BY container_number, occurred_at;

-- 查询 process_port_operations 所有时间字段
SELECT container_number, port_type, 
       gate_in_time, gate_out_time, 
       dest_port_unload_date, ata, eta,
       available_time
FROM process_port_operations
WHERE container_number = 'ECMU5381817'
ORDER BY port_sequence;
