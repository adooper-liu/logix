-- 清理飞驼测试数据

-- 1. 删除港口操作记录
DELETE FROM process_port_operations 
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399797', 'ECMU5399586', 'ECMU5400183');

-- 2. 删除FEITUO_前缀的海运记录
DELETE FROM process_sea_freight 
WHERE bill_of_lading_number LIKE 'FEITUO_%';

-- 3. 重置货柜状态
UPDATE biz_containers 
SET logistics_status = 'not_shipped' 
WHERE container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399797', 'ECMU5399586', 'ECMU5400183');
