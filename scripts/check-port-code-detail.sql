-- 详细检查 port_code 字段
SELECT port_type, port_code, port_name, port_sequence
FROM process_port_operations
WHERE container_number = 'ECMU5381817'
ORDER BY port_sequence;
