-- 为现有货柜创建港口操作记录（目的港）
INSERT INTO process_port_operations (id, container_number, port_type, port_sequence, eta, free_storage_days, free_detention_days, created_at, updated_at)
SELECT 
    c.container_number || '-destination-1' as id,
    c.container_number,
    'destination' as port_type,
    1 as port_sequence,
    sf.eta as eta,
    0 as free_storage_days,
    0 as free_detention_days,
    NOW() as created_at,
    NOW() as updated_at
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
WHERE NOT EXISTS (
    SELECT 1 FROM process_port_operations po 
    WHERE po.container_number = c.container_number
);

-- 验证插入结果
SELECT container_number, port_type, port_sequence, eta FROM process_port_operations;
