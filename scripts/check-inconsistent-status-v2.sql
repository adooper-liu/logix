-- 检查状态不一致的货柜（应该为0）
SELECT
  c.container_number,
  c.logistics_status as current_status,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM process_empty_returns er
      WHERE er.container_number = c.container_number
      AND er.return_time IS NOT NULL
    ) THEN 'returned_empty'
    WHEN EXISTS (
      SELECT 1 FROM process_warehouse_operations wo
      WHERE wo.container_number = c.container_number
      AND (
        wo.wms_status = 'WMS已完成'
        OR wo.ebs_status = '已入库'
        OR wo.wms_confirm_date IS NOT NULL
      )
    ) THEN 'unloaded'
    WHEN EXISTS (
      SELECT 1 FROM process_trucking_transport tt
      WHERE tt.container_number = c.container_number
      AND tt.pickup_date IS NOT NULL
    ) THEN 'picked_up'
    WHEN EXISTS (
      SELECT 1 FROM process_port_operations po
      WHERE po.container_number = c.container_number
      AND po.port_type = 'transit'
    ) AND NOT EXISTS (
      SELECT 1 FROM process_port_operations po2
      WHERE po2.container_number = c.container_number
      AND po2.port_type = 'destination'
      AND po2.ata_dest_port IS NOT NULL
    ) THEN 'at_port'
    WHEN EXISTS (
      SELECT 1 FROM process_port_operations po3
      WHERE po3.container_number = c.container_number
      AND po3.port_type = 'destination'
      AND po3.ata_dest_port IS NOT NULL
    ) THEN 'at_port'
    WHEN EXISTS (
      SELECT 1 FROM process_sea_freight sf
      WHERE sf.container_number = c.container_number
      AND sf.shipment_date IS NOT NULL
    ) THEN 'in_transit'
    ELSE 'not_shipped'
  END as expected_status
FROM biz_containers c
WHERE c.logistics_status != (
  CASE
    WHEN EXISTS (
      SELECT 1 FROM process_empty_returns er
      WHERE er.container_number = c.container_number
      AND er.return_time IS NOT NULL
    ) THEN 'returned_empty'
    WHEN EXISTS (
      SELECT 1 FROM process_warehouse_operations wo
      WHERE wo.container_number = c.container_number
      AND (
        wo.wms_status = 'WMS已完成'
        OR wo.ebs_status = '已入库'
        OR wo.wms_confirm_date IS NOT NULL
      )
    ) THEN 'unloaded'
    WHEN EXISTS (
      SELECT 1 FROM process_trucking_transport tt
      WHERE tt.container_number = c.container_number
      AND tt.pickup_date IS NOT NULL
    ) THEN 'picked_up'
    WHEN EXISTS (
      SELECT 1 FROM process_port_operations po
      WHERE po.container_number = c.container_number
      AND po.port_type = 'transit'
    ) AND NOT EXISTS (
      SELECT 1 FROM process_port_operations po2
      WHERE po2.container_number = c.container_number
      AND po2.port_type = 'destination'
      AND po2.ata_dest_port IS NOT NULL
    ) THEN 'at_port'
    WHEN EXISTS (
      SELECT 1 FROM process_port_operations po3
      WHERE po3.container_number = c.container_number
      AND po3.port_type = 'destination'
      AND po3.ata_dest_port IS NOT NULL
    ) THEN 'at_port'
    WHEN EXISTS (
      SELECT 1 FROM process_sea_freight sf
      WHERE sf.container_number = c.container_number
      AND sf.shipment_date IS NOT NULL
    ) THEN 'in_transit'
    ELSE 'not_shipped'
  END
)
ORDER BY c.container_number;
