-- 检查到港分布的重叠问题
-- 目标集：shipped (0) + in_transit (85) + at_port (92) = 177

-- 1. 查看目标集各状态的货柜及到港情况
SELECT c.logistics_status as 状态,
       COUNT(DISTINCT c.container_number) as 货柜数,
       COUNT(DISTINCT CASE WHEN po.ata_dest_port IS NOT NULL THEN c.container_number END) as 有ATA,
       COUNT(DISTINCT CASE WHEN po_transit.transit_arrival_date IS NOT NULL THEN c.container_number END) as 有中转港到港,
       COUNT(DISTINCT CASE WHEN po.eta_dest_port IS NOT NULL THEN c.container_number END) as 有ETA
FROM containers c
LEFT JOIN port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
LEFT JOIN port_operations po_transit ON c.container_number = po_transit.container_number AND po_transit.port_type = 'transit'
WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
GROUP BY c.logistics_status;

-- 2. 统计到港分布（按8个分类）
-- 今日到港
SELECT '今日到港' as 分类, COUNT(DISTINCT c.container_number) as 计数
FROM containers c
JOIN port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
  AND DATE(po.ata_dest_port) = CURRENT_DATE;

-- 今日之前到港
SELECT '今日之前到港' as 分类, COUNT(DISTINCT c.container_number) as 计数
FROM containers c
JOIN port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
  AND DATE(po.ata_dest_port) < CURRENT_DATE;

-- 中转港到港
SELECT '中转港到港' as 分类, COUNT(DISTINCT c.container_number) as 计数
FROM containers c
JOIN port_operations po_transit ON c.container_number = po_transit.container_number
  AND po_transit.port_type = 'transit'
  AND po_transit.transit_arrival_date IS NOT NULL
LEFT JOIN port_operations po_dest ON c.container_number = po_dest.container_number
  AND po_dest.port_type = 'destination'
  AND po_dest.ata_dest_port IS NOT NULL
WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
  AND po_dest.container_number IS NULL;

-- 3. 检查：一个货柜是否被多个分类统计到
SELECT c.container_number, c.logistics_status as 状态,
       CASE WHEN DATE(po.ata_dest_port) = CURRENT_DATE THEN '今日到港' END as 今日到港,
       CASE WHEN DATE(po.ata_dest_port) < CURRENT_DATE THEN '今日之前到港' END as 今日之前到港,
       CASE WHEN po_transit.transit_arrival_date IS NOT NULL AND po_dest.ata_dest_port IS NULL THEN '中转港到港' END as 中转港到港
FROM containers c
LEFT JOIN port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
LEFT JOIN port_operations po_transit ON c.container_number = po_transit.container_number AND po_transit.port_type = 'transit' AND po_transit.transit_arrival_date IS NOT NULL
LEFT JOIN port_operations po_dest ON c.container_number = po_dest.container_number AND po_dest.port_type = 'destination' AND po_dest.ata_dest_port IS NOT NULL
WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
  AND (
    (DATE(po.ata_dest_port) = CURRENT_DATE) OR
    (DATE(po.ata_dest_port) < CURRENT_DATE) OR
    (po_transit.transit_arrival_date IS NOT NULL AND po_dest.ata_dest_port IS NULL)
  )
ORDER BY c.container_number
LIMIT 30;
