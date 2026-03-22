-- 详细检查 destination 记录的所有时间字段
SELECT 
    container_number, 
    port_type, 
    port_code, 
    port_name,
    port_sequence,
    ata, 
    eta, 
    gate_in_time, 
    gate_out_time, 
    dest_port_unload_date,
    available_time,
    updated_at
FROM process_port_operations 
WHERE container_number = 'ECMU5381817'
AND port_type = 'destination';

-- 检查海运表的时间字段
SELECT 
    bill_of_lading_number,
    shipment_date,
    eta,
    atd,
    ata
FROM process_sea_freight
WHERE bill_of_lading_number IN (
    SELECT bill_of_lading_number FROM ext_feituo_status_events 
    WHERE container_number = 'ECMU5381817' LIMIT 1
);
