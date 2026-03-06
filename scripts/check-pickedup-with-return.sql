-- 检查picked_up状态中WMS已确认的货柜
SELECT
  c.container_number,
  c.logistics_status,
  wo.wms_status,
  wo.ebs_status,
  wo.wms_confirm_date,
  er."returnTime"
FROM biz_containers c
LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
WHERE c.logistics_status = 'picked_up'
  AND (
    wo.wms_status = 'WMS已完成'
    OR wo.ebs_status = '已入库'
    OR wo.wms_confirm_date IS NOT NULL
  )
LIMIT 10;
