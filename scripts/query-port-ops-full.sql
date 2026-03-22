-- 查询 process_port_operations 完整数据
SELECT container_number, port_type, port_code, port_name, port_sequence,
       gate_in_time, gate_out_time, 
       dest_port_unload_date, ata, eta,
       available_time, atd, etd
FROM process_port_operations
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399586')
ORDER BY container_number, port_sequence;
