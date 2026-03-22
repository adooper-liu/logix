-- 查询 process_trucking_transport 数据（修正字段名）
SELECT container_number, pickup_date, delivery_date
FROM process_trucking_transport
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399586');

-- 查询所有表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'process_%' 
ORDER BY table_name;
