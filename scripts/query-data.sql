-- 查询 process_empty_return 数据
SELECT container_number, return_time, return_terminal_name, return_terminal_code
FROM process_empty_return
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399586');

-- 查询 process_sea_freight 数据
SELECT bill_of_lading_number, shipment_date, eta, ata, atd
FROM process_sea_freight
WHERE bill_of_lading_number IN (
  SELECT bill_of_lading_number FROM ext_feituo_status_events 
  WHERE container_number = 'ECMU5381817' LIMIT 1
);
