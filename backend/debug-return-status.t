-- 检查已还箱货柜的实际情况
SELECT 
  c.container_number,
  c.logistics_status as current_status,
  er.return_time,
  wo.wms_status,
  wo.ebs_status,
  wo.wms_confirm_date,
  CASE 
    WHEN er.return_time IS NOT NULL THEN '已还箱'
    WHEN wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL THEN '已卸柜'
    ELSE '其他'
  END as expected_status
FROM biz_containers c
LEFT JOIN process_empty_return er ON c.container_number = er.container_number
LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
WHERE er.return_time IS NOT NULL
LIMIT 20;
