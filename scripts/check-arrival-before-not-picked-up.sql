-- 查询"按到港"的"今日之前到港未提柜"（使用与ArrivalStatistics.service.ts相同的逻辑）
SELECT c.container_number, c.logistics_status, po.ata_dest_port, po.last_free_date
FROM biz_containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
LEFT JOIN biz_replenishment_orders o ON c.order_number = o.order_number
LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
WHERE po.port_type = 'destination'
AND po.ata_dest_port IS NOT NULL
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
AND NOT EXISTS (
  SELECT 1
  FROM process_port_operations transit_po
  WHERE transit_po.container_number = c.container_number
  AND transit_po.port_type = 'transit'
)
AND c.logistics_status IN ('shipped', 'in_transit', 'at_port')
ORDER BY c.container_number;

-- 检查这个查询返回的数量
SELECT COUNT(*) as count
FROM biz_containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
LEFT JOIN biz_replenishment_orders o ON c.order_number = o.order_number
LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
WHERE po.port_type = 'destination'
AND po.ata_dest_port IS NOT NULL
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
AND NOT EXISTS (
  SELECT 1
  FROM process_port_operations transit_po
  WHERE transit_po.container_number = c.container_number
  AND transit_po.port_type = 'transit'
)
AND c.logistics_status IN ('shipped', 'in_transit', 'at_port');
