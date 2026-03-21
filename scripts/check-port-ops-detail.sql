-- 查看港口操作表完整数据
SELECT container_number, port_type, port_code, port_name, port_sequence, eta, ata, free_storage_days 
FROM process_port_operations;
