-- 查询"按最晚提柜"目标集（当前实现，返回25个）
SELECT c.container_number, c.logistics_status, po.ata_dest_port, po.last_free_date
FROM biz_containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
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

-- 对比：查询"按到港"的"今日之前到港未提柜"（应该返回46个）
SELECT c.container_number, c.logistics_status, po.ata_dest_port
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

-- 统计差异：哪些货柜在"按到港"中但不在"按最晚提柜"中
WITH arrival_containers AS (
  SELECT c.container_number
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
),
lastpickup_containers AS (
  SELECT c.container_number
  FROM biz_containers c
  INNER JOIN process_port_operations po ON c.container_number = po.container_number
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
)
SELECT 
  a.container_number,
  c.logistics_status,
  po.ata_dest_port,
  po.last_free_date,
  CASE 
    WHEN po.last_free_date IS NULL THEN 'NULL'
    ELSE 'NOT NULL'
  END as last_free_date_status
FROM arrival_containers a
LEFT JOIN lastpickup_containers l ON a.container_number = l.container_number
LEFT JOIN biz_containers c ON a.container_number = c.container_number
LEFT JOIN process_port_operations po ON a.container_number = po.container_number
  AND po.port_type = 'destination'
  AND po.port_sequence = (
    SELECT MAX(po2.port_sequence)
    FROM process_port_operations po2
    WHERE po2.container_number = po.container_number
    AND po2.port_type = 'destination'
  )
WHERE l.container_number IS NULL
ORDER BY a.container_number;
