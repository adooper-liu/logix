-- 诊断"已到目的港但无ATA"的货柜情况

-- 1. 状态为at_port，有目的港记录但无ATA
SELECT '状态为at_port但无ATA' AS category, COUNT(*) AS count
FROM containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
AND po.ata_dest_port IS NULL
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
AND c.logistics_status = 'at_port'
AND NOT EXISTS (
  SELECT 1
  FROM process_port_operations transit_po
  WHERE transit_po.container_number = c.container_number
  AND transit_po.port_type = 'transit'
  AND transit_po.ata_dest_port IS NOT NULL
)

UNION ALL

-- 2. 状态为picked_up，有目的港记录但无ATA（这些货柜可能遗漏了！）
SELECT '状态为picked_up但无ATA' AS category, COUNT(*) AS count
FROM containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
AND po.ata_dest_port IS NULL
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
AND c.logistics_status = 'picked_up'
AND NOT EXISTS (
  SELECT 1
  FROM process_port_operations transit_po
  WHERE transit_po.container_number = c.container_number
  AND transit_po.port_type = 'transit'
  AND transit_po.ata_dest_port IS NOT NULL
)

UNION ALL

-- 3. 状态为unloaded，有目的港记录但无ATA
SELECT '状态为unloaded但无ATA' AS category, COUNT(*) AS count
FROM containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
AND po.ata_dest_port IS NULL
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
AND c.logistics_status = 'unloaded'
AND NOT EXISTS (
  SELECT 1
  FROM process_port_operations transit_po
  WHERE transit_po.container_number = c.container_number
  AND transit_po.port_type = 'transit'
  AND transit_po.ata_dest_port IS NOT NULL
)

UNION ALL

-- 4. 状态为returned_empty，有目的港记录但无ATA
SELECT '状态为returned_empty但无ATA' AS category, COUNT(*) AS count
FROM containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
AND po.ata_dest_port IS NULL
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
AND c.logistics_status = 'returned_empty'
AND NOT EXISTS (
  SELECT 1
  FROM process_port_operations transit_po
  WHERE transit_po.container_number = c.container_number
  AND transit_po.port_type = 'transit'
  AND transit_po.ata_dest_port IS NOT NULL
)

UNION ALL

-- 5. 所有状态但有目的港记录无ATA的总和
SELECT '所有状态有目的港记录无ATA总和' AS category, COUNT(*) AS count
FROM containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
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
);
