-- 修复picked_up状态但WMS已确认的货柜为unloaded
UPDATE biz_containers SET logistics_status = 'unloaded'
WHERE logistics_status = 'picked_up'
  AND EXISTS (
    SELECT 1 FROM process_warehouse_operations wo
    WHERE wo.container_number = biz_containers.container_number
    AND (
      wo.wms_status = 'WMS已完成'
      OR wo.ebs_status = '已入库'
      OR wo.wms_confirm_date IS NOT NULL
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM process_empty_returns er
    WHERE er."containerNumber" = biz_containers.container_number
    AND er.return_time IS NOT NULL
  );
