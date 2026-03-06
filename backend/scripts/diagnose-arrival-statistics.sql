-- 诊断到港统计数据丢失问题

-- 1. 获取所有到目的港的货柜（根据记忆规则：只统计目的港，排除中转港）
-- 条件：port_type='destination' AND 有ATA记录

WITH destination_with_ata AS (
  SELECT DISTINCT
    po.container_number,
    po.ata_dest_port,
    po.port_type,
    po.port_sequence,
    c.logistics_status,
    c.order_number
  FROM process_port_operations po
  INNER JOIN containers c ON po.container_number = c.container_number
  WHERE po.port_type = 'destination'
  AND po.ata_dest_port IS NOT NULL
  AND po.port_sequence = (
    SELECT MAX(po2.port_sequence)
    FROM process_port_operations po2
    WHERE po2.container_number = po.container_number
    AND po2.port_type = 'destination'
  )
),

-- 2. 获取状态为at_port但无目的港ATA记录的货柜
at_port_without_ata AS (
  SELECT DISTINCT
    c.container_number,
    c.logistics_status,
    c.order_number
  FROM containers c
  INNER JOIN process_port_operations po ON c.container_number = po.container_number
  WHERE c.logistics_status = 'at_port'
  AND po.port_type = 'destination'
  AND po.ata_dest_port IS NULL
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
    AND transit_po.ata_dest_port IS NOT NULL
  )
)

-- 3. 查询所有已到目的港的货柜总数
SELECT '已到目的港货柜总数' AS category, COUNT(*) AS count
FROM (
  SELECT container_number FROM destination_with_ata
  UNION
  SELECT container_number FROM at_port_without_ata
) all_arrived

UNION ALL

-- 4. 今日到港（假设当前日期是2026-03-05）
SELECT '今日到港' AS category, COUNT(DISTINCT d.container_number) AS count
FROM destination_with_ata d
WHERE DATE(d.ata_dest_port) = CURRENT_DATE

UNION ALL

-- 5. 今日之前到港未提柜
SELECT '今日之前到港未提柜' AS category, COUNT(DISTINCT d.container_number) AS count
FROM destination_with_ata d
WHERE DATE(d.ata_dest_port) < CURRENT_DATE
AND d.logistics_status NOT IN ('picked_up', 'unloaded', 'returned_empty')

UNION ALL

-- 6. 今日之前到港已提柜
SELECT '今日之前到港已提柜' AS category, COUNT(DISTINCT d.container_number) AS count
FROM destination_with_ata d
WHERE DATE(d.ata_dest_port) < CURRENT_DATE
AND d.logistics_status IN ('picked_up', 'unloaded', 'returned_empty')

UNION ALL

-- 7. 状态为at_port但无ATA
SELECT '状态为at_port但无ATA' AS category, COUNT(*) AS count
FROM at_port_without_ata

UNION ALL

-- 8. 4个分类总和
SELECT '4个分类总和' AS category,
  (
    SELECT COUNT(DISTINCT d.container_number)
    FROM destination_with_ata d
    WHERE DATE(d.ata_dest_port) = CURRENT_DATE
  ) +
  (
    SELECT COUNT(DISTINCT d.container_number)
    FROM destination_with_ata d
    WHERE DATE(d.ata_dest_port) < CURRENT_DATE
    AND d.logistics_status NOT IN ('picked_up', 'unloaded', 'returned_empty')
  ) +
  (
    SELECT COUNT(DISTINCT d.container_number)
    FROM destination_with_ata d
    WHERE DATE(d.ata_dest_port) < CURRENT_DATE
    AND d.logistics_status IN ('picked_up', 'unloaded', 'returned_empty')
  ) +
  (
    SELECT COUNT(*)
    FROM at_port_without_ata
  ) AS count

UNION ALL

-- 9. 检查是否有货柜被重复统计或遗漏
SELECT 'destination_with_ata唯一货柜数' AS category, COUNT(DISTINCT container_number) AS count
FROM destination_with_ata

UNION ALL

-- 10. 检查at_port_without_ata是否有重叠
SELECT 'at_port_without_ata唯一货柜数' AS category, COUNT(DISTINCT container_number) AS count
FROM at_port_without_ata

UNION ALL

-- 11. 检查两个集合是否重叠
SELECT '两个集合的重叠货柜数' AS category, COUNT(DISTINCT d.container_number) AS count
FROM destination_with_ata d
INNER JOIN at_port_without_ata a ON d.container_number = a.container_number;
