-- 调试到港分布的SQL查询
-- 目标：找出为什么到港分布总和 > 目标集总数

-- 1. 目标集总数
SELECT '目标集总数' as 查询, COUNT(*) as 计数
FROM containers
WHERE logistics_status IN ('shipped', 'in_transit', 'at_port');

-- 2. 查看目标集各状态分布
SELECT logistics_status, COUNT(*) as 计数
FROM containers
WHERE logistics_status IN ('shipped', 'in_transit', 'at_port')
GROUP BY logistics_status;

-- 3. 今日到港 (today)
SELECT '今日到港' as 分类, COUNT(DISTINCT c.container_number) as 计数
FROM containers c
JOIN port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND c.logistics_status IN ('shipped', 'in_transit', 'at_port')
  AND DATE(po.ata_dest_port) = CURRENT_DATE;

-- 4. 今日之前到港 (arrivedBeforeToday)
SELECT '今日之前到港' as 分类, COUNT(DISTINCT c.container_number) as 计数
FROM containers c
JOIN port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND c.logistics_status IN ('shipped', 'in_transit', 'at_port')
  AND DATE(po.ata_dest_port) < CURRENT_DATE;

-- 5. 中转港到港 (transit)
SELECT '中转港到港' as 分类, COUNT(DISTINCT c.container_number) as 计数
FROM containers c
JOIN port_operations po_transit ON c.container_number = po_transit.container_number
  AND po_transit.port_type = 'transit'
  AND po_transit.transit_arrival_date IS NOT NULL
LEFT JOIN port_operations po_dest ON c.container_number = po_dest.container_number
  AND po_dest.port_type = 'destination'
  AND po_dest.ata_dest_port IS NOT NULL
WHERE po_dest.container_number IS NULL
  AND c.logistics_status IN ('shipped', 'in_transit', 'at_port');

-- 6. 检查中转港和目的港的关系（看是否有重叠）
SELECT c.container_number, c.logistics_status,
       CASE WHEN po_transit.container_number IS NOT NULL THEN '有中转港' END as 有中转港,
       po_transit.transit_arrival_date as 中转港到港日,
       CASE WHEN po_dest.ata_dest_port IS NOT NULL THEN '有目的港' END as 有目的港,
       po_dest.ata_dest_port as 目的港到港日
FROM containers c
LEFT JOIN port_operations po_transit ON c.container_number = po_transit.container_number
  AND po_transit.port_type = 'transit'
  AND po_transit.transit_arrival_date IS NOT NULL
LEFT JOIN port_operations po_dest ON c.container_number = po_dest.container_number
  AND po_dest.port_type = 'destination'
WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
  AND (
    (po_transit.container_number IS NOT NULL AND po_dest.ata_dest_port IS NOT NULL)
    OR
    (po_transit.container_number IS NOT NULL AND po_dest.ata_dest_port IS NULL)
  )
ORDER BY c.container_number
LIMIT 20;

-- 7. 检查一个货柜是否有多条目的港记录
SELECT c.container_number, c.logistics_status, COUNT(*) as 目的港记录数
FROM containers c
JOIN port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND c.logistics_status IN ('shipped', 'in_transit', 'at_port')
GROUP BY c.container_number, c.logistics_status
HAVING COUNT(*) > 1
LIMIT 10;
