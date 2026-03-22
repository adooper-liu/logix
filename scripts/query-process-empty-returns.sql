-- 查询 process_empty_returns 数据
SELECT container_number, return_time, return_terminal, return_type
FROM process_empty_returns
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399586');

-- 查询 process_trucking_transport 数据
SELECT container_number, pickup_date, delivery_date, gate_in_time, gate_out_time
FROM process_trucking_transport
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399586');

-- 查询 biz_containers 的物流状态
SELECT container_number, logistics_status
FROM biz_containers
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399586');
