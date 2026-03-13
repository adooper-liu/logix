-- 查询状态分�?
SELECT 
  logistics_status,
  COUNT(*) as count
FROM biz_containers
GROUP BY logistics_status
ORDER BY logistics_status;

-- 查询已还箱的货柜数量
SELECT COUNT(*) as returned_empty_count 
FROM biz_containers 
WHERE logistics_status = 'returned_empty';

-- 查询已还箱货柜的详细信息（前10条）
SELECT 
  c.container_number,
  c.logistics_status,
  c.destination_port,
  er.return_time,
  er.last_return_date,
  tt.pickup_date,
  wo.wms_status,
  wo.ebs_status
FROM biz_containers c
LEFT JOIN process_empty_returns er ON c.container_number = er.container_number
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
WHERE c.logistics_status = 'returned_empty'
LIMIT 10;
