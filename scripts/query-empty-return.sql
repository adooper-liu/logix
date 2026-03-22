-- 查询 process_empty_return 数据
SELECT container_number, return_time, return_terminal, return_type
FROM process_empty_return
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399586');

-- 查询 process_sea_freight 数据
SELECT container_number, bill_of_lading_number, shipment_date, eta, ata
FROM process_sea_freight
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399586');
