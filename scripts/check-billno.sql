-- 检查 ext_feituo_status_events 中的 bill_of_lading_number
SELECT DISTINCT bill_of_lading_number 
FROM ext_feituo_status_events 
WHERE container_number = 'ECMU5381817';

-- 检查 biz_containers 表的 bill_of_lading_number
SELECT container_number, bill_of_lading_number 
FROM biz_containers 
WHERE container_number = 'ECMU5381817';

-- 检查海运表的 bill_of_lading_number
SELECT bill_of_lading_number 
FROM process_sea_freight 
WHERE bill_of_lading_number = 'NGP3069047';
