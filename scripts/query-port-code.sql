-- 查询 process_port_operations 的 port_code 字段
SELECT container_number, port_type, port_code, port_name, port_sequence
FROM process_port_operations
WHERE container_number = 'ECMU5381817'
ORDER BY port_sequence;
