-- 查询46个货柜的详细信息
SELECT 
  c.container_number,
  c.logistics_status,
  po.ata_dest_port,
  po.last_free_date,
  po.port_sequence,
  po.port_type
FROM biz_containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE c.container_number IN (
  'BEAU5730626', 'CAAU9221491', 'CAIU7235539', 'CAIU9970363', 'FSCU8507808',
  'GCXU5599790', 'HASU4405826', 'HMMU4016860', 'HMMU4139490', 'HMMU4181756',
  'HMMU4753337', 'HMMU6350686', 'HMMU6552584', 'HMMU6595800', 'HMMU6671860',
  'HMMU6855472', 'HMMU6874528', 'HMMU6947630', 'HMMU7135055', 'HMMU7164789',
  'KOCU4690071', 'KOCU4714466', 'KOCU5032943', 'KOCU5073074', 'KOCU5082923',
  'MRKU2750203', 'MRKU4378672', 'MRKU4501107', 'MRKU5180737', 'MRKU5557646',
  'MRSU3186214', 'MRSU4494227', 'MRSU8517995', 'MRSU8794834', 'MRSU9475512',
  'MSKU0627486', 'MSKU1739536', 'MSKU9347315', 'MSMU6370164', 'MSNU5178675',
  'TEMU7307910', 'TGBU6878468', 'TLLU5814475', 'TXGU7910130', 'TXGU8539620',
  'UETU7804928'
)
AND po.port_type = 'destination'
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
ORDER BY c.container_number;

-- 按状态分组统计
SELECT 
  c.logistics_status,
  COUNT(*) as count,
  COUNT(po.last_free_date) as with_last_free_date,
  COUNT(*) - COUNT(po.last_free_date) as without_last_free_date
FROM biz_containers c
INNER JOIN process_port_operations po ON c.container_number = po.container_number
WHERE c.container_number IN (
  'BEAU5730626', 'CAAU9221491', 'CAIU7235539', 'CAIU9970363', 'FSCU8507808',
  'GCXU5599790', 'HASU4405826', 'HMMU4016860', 'HMMU4139490', 'HMMU4181756',
  'HMMU4753337', 'HMMU6350686', 'HMMU6552584', 'HMMU6595800', 'HMMU6671860',
  'HMMU6855472', 'HMMU6874528', 'HMMU6947630', 'HMMU7135055', 'HMMU7164789',
  'KOCU4690071', 'KOCU4714466', 'KOCU5032943', 'KOCU5073074', 'KOCU5082923',
  'MRKU2750203', 'MRKU4378672', 'MRKU4501107', 'MRKU5180737', 'MRKU5557646',
  'MRSU3186214', 'MRSU4494227', 'MRSU8517995', 'MRSU8794834', 'MRSU9475512',
  'MSKU0627486', 'MSKU1739536', 'MSKU9347315', 'MSMU6370164', 'MSNU5178675',
  'TEMU7307910', 'TGBU6878468', 'TLLU5814475', 'TXGU7910130', 'TXGU8539620',
  'UETU7804928'
)
AND po.port_type = 'destination'
AND po.port_sequence = (
  SELECT MAX(po2.port_sequence)
  FROM process_port_operations po2
  WHERE po2.container_number = po.container_number
  AND po2.port_type = 'destination'
)
GROUP BY c.logistics_status
ORDER BY c.logistics_status;
