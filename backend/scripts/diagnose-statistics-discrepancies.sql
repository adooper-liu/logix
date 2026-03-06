-- 统计数据差异诊断SQL
-- 用于检查各维度统计数据与实际数据的不一致问题

-- 设置当前日期
\set today '\''CURRENT_DATE'\''
\set threeDaysLater '\''CURRENT_DATE + INTERVAL \\'3 days\\''\''
\set sevenDaysLater '\''CURRENT_DATE + INTERVAL \\'7 days\\''\''

-- ========================================
-- 问题1: 3天内预计到港 vs 7天内预计到港
-- ========================================

-- 3天内预计到港查询
SELECT '3天内预计到港' as test_name, COUNT(*) as count
FROM (
    SELECT DISTINCT c.container_number
    FROM containers c
    INNER JOIN (
      SELECT DISTINCT po1.container_number
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NULL
      AND po1.eta_dest_port IS NOT NULL
      AND po1.eta_dest_port >= CURRENT_DATE
      AND po1.eta_dest_port <= (CURRENT_DATE + INTERVAL '3 days')
    ) dest_po ON dest_po.container_number = c.container_number
    WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
) sub;

-- 7天内预计到港查询
SELECT '7天内预计到港' as test_name, COUNT(*) as count
FROM (
    SELECT DISTINCT c.container_number
    FROM containers c
    INNER JOIN (
      SELECT DISTINCT po1.container_number
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NULL
      AND po1.eta_dest_port IS NOT NULL
      AND po1.eta_dest_port > (CURRENT_DATE + INTERVAL '3 days')
      AND po1.eta_dest_port <= (CURRENT_DATE + INTERVAL '7 days')
    ) dest_po ON dest_po.container_number = c.container_number
    WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
) sub;

-- ETA数据详情 (前20条)
SELECT 'ETA数据详情' as info,
       c.container_number,
       c.logistics_status,
       DATE(po.eta_dest_port) as eta_date,
       po.port_type,
       po.port_sequence
FROM containers c
INNER JOIN process_port_operations po ON po.container_number = c.container_number
WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
AND po.port_type = 'destination'
AND po.ata_dest_port IS NULL
AND po.eta_dest_port IS NOT NULL
ORDER BY po.eta_dest_port ASC
LIMIT 20;

-- ========================================
-- 问题2: 已逾期未到港
-- ========================================

-- 已逾期未到港查询
SELECT '已逾期未到港' as test_name, COUNT(*) as count
FROM (
    SELECT DISTINCT c.container_number
    FROM containers c
    INNER JOIN (
      SELECT po1.container_number
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NULL
      AND po1.eta_dest_port IS NOT NULL
      AND (po1.eta_dest_port < CURRENT_DATE OR po1.eta_correction < CURRENT_DATE)
      AND po1.port_sequence = (
        SELECT MAX(po2.port_sequence)
        FROM process_port_operations po2
        WHERE po2.container_number = po1.container_number
        AND po2.port_type = 'destination'
      )
    ) dest_po ON dest_po.container_number = c.container_number
    WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
) sub;

-- 逾期ETA详情 (前20条)
SELECT '逾期ETA详情' as info,
       c.container_number,
       c.logistics_status,
       DATE(po.eta_dest_port) as eta_date,
       po.port_type,
       po.port_sequence
FROM containers c
INNER JOIN process_port_operations po ON po.container_number = c.container_number
WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port')
AND po.port_type = 'destination'
AND po.ata_dest_port IS NULL
AND po.eta_dest_port IS NOT NULL
AND po.eta_dest_port < CURRENT_DATE
ORDER BY po.eta_dest_port ASC
LIMIT 20;

-- ========================================
-- 问题3: 今日之前到港已提柜
-- ========================================

-- 今日之前到港的总数
SELECT '今日之前到港总数' as test_name, COUNT(*) as count
FROM (
    SELECT DISTINCT c.container_number
    FROM containers c
    INNER JOIN (
      SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NOT NULL
      GROUP BY po1.container_number
    ) latest_po ON latest_po.container_number = c.container_number
    WHERE DATE(latest_po.latest_ata) < CURRENT_DATE
) sub;

-- 今日之前到港已提柜
SELECT '今日之前到港已提柜' as test_name, COUNT(*) as count
FROM (
    SELECT DISTINCT c.container_number
    FROM containers c
    INNER JOIN (
      SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NOT NULL
      GROUP BY po1.container_number
    ) latest_po ON latest_po.container_number = c.container_number
    WHERE DATE(latest_po.latest_ata) < CURRENT_DATE
    AND c.logistics_status IN ('picked_up', 'unloaded', 'returned_empty')
) sub;

-- 今日之前到港未提柜
SELECT '今日之前到港未提柜' as test_name, COUNT(*) as count
FROM (
    SELECT DISTINCT c.container_number
    FROM containers c
    INNER JOIN (
      SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
      FROM process_port_operations po1
      WHERE po1.port_type = 'destination'
      AND po1.ata_dest_port IS NOT NULL
      GROUP BY po1.container_number
    ) latest_po ON latest_po.container_number = c.container_number
    WHERE DATE(latest_po.latest_ata) < CURRENT_DATE
    AND c.logistics_status NOT IN ('picked_up', 'unloaded', 'returned_empty')
) sub;

-- 状态为at_port的货柜数
SELECT 'at_port状态总数' as test_name, COUNT(*) as count
FROM containers
WHERE logistics_status = 'at_port';

-- 今日之前到港货柜的状态分布
SELECT '今日之前到港货柜状态分布' as info,
       c.logistics_status,
       COUNT(DISTINCT c.container_number) as count
FROM containers c
INNER JOIN (
  SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
  FROM process_port_operations po1
  WHERE po1.port_type = 'destination'
  AND po1.ata_dest_port IS NOT NULL
  GROUP BY po1.container_number
) latest_po ON latest_po.container_number = c.container_number
WHERE DATE(latest_po.latest_ata) < CURRENT_DATE
GROUP BY c.logistics_status
ORDER BY count DESC;

-- ========================================
-- 问题4: 已到目的港 vs 今日之前到港未提柜
-- ========================================

-- at_port状态货柜的ATA分布 (前20条)
SELECT 'at_port状态货柜的ATA分布' as info,
       c.container_number,
       c.logistics_status,
       DATE(po.ata_dest_port) as ata_date,
       po.port_type,
       po.port_sequence
FROM containers c
INNER JOIN process_port_operations po ON po.container_number = c.container_number
WHERE c.logistics_status = 'at_port'
AND po.port_type = 'destination'
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = c.container_number
  AND po2.port_type = 'destination'
)
ORDER BY po.ata_dest_port DESC
LIMIT 20;

-- at_port但不在今日之前到港中的货柜
SELECT 'at_port但不在今日之前到港中' as info,
       c.container_number,
       c.logistics_status,
       DATE(po.ata_dest_port) as ata_date,
       po.port_type,
       po.port_sequence
FROM containers c
INNER JOIN (
  SELECT po1.container_number, MAX(po1.ata_dest_port) as latest_ata
  FROM process_port_operations po1
  WHERE po1.port_type = 'destination'
  AND po1.ata_dest_port IS NOT NULL
  GROUP BY po1.container_number
) latest_po ON latest_po.container_number = c.container_number
INNER JOIN process_port_operations po ON po.container_number = c.container_number
WHERE c.logistics_status = 'at_port'
AND po.port_type = 'destination'
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = c.container_number
  AND po2.port_type = 'destination'
)
AND (DATE(latest_po.latest_ata) >= CURRENT_DATE OR latest_po.latest_ata IS NULL)
ORDER BY po.ata_dest_port DESC
LIMIT 20;
