-- 按到港统计完整分类
-- Arrival Statistics Complete Classification

-- 总体目标：所有有目的港记录的货柜（port_type='destination'，取最大port_sequence）
SELECT '1. 总目标：所有有目的港记录的货柜' as step;
SELECT COUNT(DISTINCT c.container_number) as total_dest_containers
FROM containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
);

-- 分类1：今日到港（有ATA且ATA=今日）
SELECT '2. 今日到港（有ATA且ATA=今日）' as step;
SELECT COUNT(DISTINCT c.container_number) as arrived_today
FROM containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
AND po.ata_dest_port IS NOT NULL
AND DATE(po.ata_dest_port) = CURRENT_DATE;

-- 分类2：今日之前到港且未提柜（有ATA且ATA<今日且logistics_status!=picked_up）
SELECT '3. 今日之前到港且未提柜' as step;
SELECT COUNT(DISTINCT c.container_number) as arrived_before_not_picked_up
FROM containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
AND po.ata_dest_port IS NOT NULL
AND DATE(po.ata_dest_port) < CURRENT_DATE
AND c.logistics_status NOT IN ('picked_up', 'unloaded', 'returned_empty');

-- 分类3：今日之前到港且已提柜（有ATA且ATA<今日且logistics_status=picked_up/unloaded/returned_empty）
SELECT '4. 今日之前到港且已提柜' as step;
SELECT COUNT(DISTINCT c.container_number) as arrived_before_picked_up
FROM containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
AND po.ata_dest_port IS NOT NULL
AND DATE(po.ata_dest_port) < CURRENT_DATE
AND c.logistics_status IN ('picked_up', 'unloaded', 'returned_empty');

-- 分类4：今日之前到港但无ATA（有目的港记录但无ATA）
SELECT '5. 今日之前到港但无ATA' as step;
SELECT COUNT(DISTINCT c.container_number) as arrived_before_no_ata
FROM containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
AND po.ata_dest_port IS NULL
AND c.logistics_status IN ('at_port', 'picked_up', 'unloaded', 'returned_empty');

-- 分类5：逾期未到港（ETA<今日且未到港）
SELECT '6. 逾期未到港（ETA<今日且未到港）' as step;
SELECT COUNT(DISTINCT c.container_number) as overdue_not_arrived
FROM containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
AND po.eta_dest_port IS NOT NULL
AND DATE(po.eta_dest_port) < CURRENT_DATE
AND po.ata_dest_port IS NULL
AND c.logistics_status IN ('shipped', 'in_transit');

-- 验证：所有分类之和是否等于总数
SELECT '7. 验证：所有分类之和' as step;
SELECT
  (SELECT COUNT(DISTINCT c.container_number)
   FROM containers c
   INNER JOIN process_port_operations po ON c.container_number = po.container_number
   WHERE po.port_type = 'destination'
   AND po.port_sequence = (
     SELECT MAX(po2.port_sequence)
     FROM process_port_operations po2
     WHERE po2.container_number = po.container_number
     AND po2.port_type = 'destination'
   )
  ) as total_dest,
  (SELECT COUNT(DISTINCT c.container_number)
   FROM containers c
   INNER JOIN process_port_operations po ON c.container_number = po.container_number
   WHERE po.port_type = 'destination'
   AND po.port_sequence = (
     SELECT MAX(po2.port_sequence)
     FROM process_port_operations po2
     WHERE po2.container_number = po.container_number
     AND po2.port_type = 'destination'
   )
   AND po.ata_dest_port IS NOT NULL
   AND DATE(po.ata_dest_port) = CURRENT_DATE
  ) as arrived_today,
  (SELECT COUNT(DISTINCT c.container_number)
   FROM containers c
   INNER JOIN process_port_operations po ON c.container_number = po.container_number
   WHERE po.port_type = 'destination'
   AND po.port_sequence = (
     SELECT MAX(po2.port_sequence)
     FROM process_port_operations po2
     WHERE po2.container_number = po.container_number
     AND po2.port_type = 'destination'
   )
   AND po.ata_dest_port IS NOT NULL
   AND DATE(po.ata_dest_port) < CURRENT_DATE
   AND c.logistics_status NOT IN ('picked_up', 'unloaded', 'returned_empty')
  ) as arrived_before_not_picked_up,
  (SELECT COUNT(DISTINCT c.container_number)
   FROM containers c
   INNER JOIN process_port_operations po ON c.container_number = po.container_number
   WHERE po.port_type = 'destination'
   AND po.port_sequence = (
     SELECT MAX(po2.port_sequence)
     FROM process_port_operations po2
     WHERE po2.container_number = po.container_number
     AND po2.port_type = 'destination'
   )
   AND po.ata_dest_port IS NOT NULL
   AND DATE(po.ata_dest_port) < CURRENT_DATE
   AND c.logistics_status IN ('picked_up', 'unloaded', 'returned_empty')
  ) as arrived_before_picked_up,
  (SELECT COUNT(DISTINCT c.container_number)
   FROM containers c
   INNER JOIN process_port_operations po ON c.container_number = po.container_number
   WHERE po.port_type = 'destination'
   AND po.port_sequence = (
     SELECT MAX(po2.port_sequence)
     FROM process_port_operations po2
     WHERE po2.container_number = po.container_number
     AND po2.port_type = 'destination'
   )
   AND po.ata_dest_port IS NULL
   AND c.logistics_status IN ('at_port', 'picked_up', 'unloaded', 'returned_empty')
  ) as arrived_before_no_ata,
  (SELECT COUNT(DISTINCT c.container_number)
   FROM containers c
   INNER JOIN process_port_operations po ON c.container_number = po.container_number
   WHERE po.port_type = 'destination'
   AND po.port_sequence = (
     SELECT MAX(po2.port_sequence)
     FROM process_port_operations po2
     WHERE po2.container_number = po.container_number
     AND po2.port_type = 'destination'
   )
   AND po.eta_dest_port IS NOT NULL
   AND DATE(po.eta_dest_port) < CURRENT_DATE
   AND po.ata_dest_port IS NULL
   AND c.logistics_status IN ('shipped', 'in_transit')
  ) as overdue_not_arrived;
