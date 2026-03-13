-- 找出被过滤掉的21个货柜
WITH all_46 AS (
  SELECT 'BEAU5730626' as container_number UNION
  SELECT 'CAAU9221491' UNION SELECT 'CAIU7235539' UNION SELECT 'CAIU9970363' UNION SELECT 'FSCU8507808' UNION
  SELECT 'GCXU5599790' UNION SELECT 'HASU4405826' UNION SELECT 'HMMU4016860' UNION SELECT 'HMMU4139490' UNION SELECT 'HMMU4181756' UNION
  SELECT 'HMMU4753337' UNION SELECT 'HMMU6350686' UNION SELECT 'HMMU6552584' UNION SELECT 'HMMU6595800' UNION SELECT 'HMMU6671860' UNION
  SELECT 'HMMU6855472' UNION SELECT 'HMMU6874528' UNION SELECT 'HMMU6947630' UNION SELECT 'HMMU7135055' UNION SELECT 'HMMU7164789' UNION
  SELECT 'KOCU4690071' UNION SELECT 'KOCU4714466' UNION SELECT 'KOCU5032943' UNION SELECT 'KOCU5073074' UNION SELECT 'KOCU5082923' UNION
  SELECT 'MRKU2750203' UNION SELECT 'MRKU4378672' UNION SELECT 'MRKU4501107' UNION SELECT 'MRKU5180737' UNION SELECT 'MRKU5557646' UNION
  SELECT 'MRSU3186214' UNION SELECT 'MRSU4494227' UNION SELECT 'MRSU8517995' UNION SELECT 'MRSU8794834' UNION SELECT 'MRSU9475512' UNION
  SELECT 'MSKU0627486' UNION SELECT 'MSKU1739536' UNION SELECT 'MSKU9347315' UNION SELECT 'MSMU6370164' UNION SELECT 'MSNU5178675' UNION
  SELECT 'TEMU7307910' UNION SELECT 'TGBU6878468' UNION SELECT 'TLLU5814475' UNION SELECT 'TXGU7910130' UNION SELECT 'TXGU8539620' UNION
  SELECT 'UETU7804928'
),
matched_25 AS (
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
)
SELECT 
  a.container_number,
  c.logistics_status,
  po.ata_dest_port,
  po.last_free_date,
  CASE 
    WHEN EXISTS (SELECT 1 FROM process_port_operations tp WHERE tp.container_number = a.container_number AND tp.port_type = 'transit') 
    THEN 'HAS_TRANSIT'
    ELSE 'NO_TRANSIT'
  END as transit_status,
  CASE 
    WHEN po.ata_dest_port IS NULL THEN 'NO_ATA'
    ELSE 'HAS_ATA'
  END as ata_status
FROM all_46 a
LEFT JOIN matched_25 m ON a.container_number = m.container_number
LEFT JOIN biz_containers c ON a.container_number = c.container_number
LEFT JOIN process_port_operations po ON a.container_number = po.container_number
  AND po.port_type = 'destination'
  AND po.port_sequence = (
    SELECT MAX(po2.port_sequence)
    FROM process_port_operations po2
    WHERE po2.container_number = po.container_number
    AND po2.port_type = 'destination'
  )
WHERE m.container_number IS NULL
ORDER BY a.container_number;
