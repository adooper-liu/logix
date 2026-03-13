-- 检查46个货柜的last_free_date分布
WITH containers AS (
  SELECT c.container_number, po.last_free_date
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
  AND c.logistics_status IN ('shipped', 'in_transit', 'at_port')
)
SELECT
  CASE
    WHEN last_free_date IS NULL THEN '缺最后免费日'
    WHEN last_free_date < CURRENT_DATE THEN '已超时'
    WHEN last_free_date = CURRENT_DATE THEN '已超时（今天）'
    WHEN last_free_date = CURRENT_DATE + INTERVAL '1 day' THEN '即将超时（1天）'
    WHEN last_free_date = CURRENT_DATE + INTERVAL '2 days' THEN '即将超时（2天）'
    WHEN last_free_date = CURRENT_DATE + INTERVAL '3 days' THEN '即将超时（3天）'
    WHEN last_free_date BETWEEN CURRENT_DATE + INTERVAL '4 days' AND CURRENT_DATE + INTERVAL '7 days' THEN '预警（4-7天）'
    WHEN last_free_date = CURRENT_DATE + INTERVAL '7 days' THEN '预警（7天）'
    WHEN last_free_date > CURRENT_DATE + INTERVAL '7 days' THEN '时间充裕（7天以上）'
  END as category,
  COUNT(*) as count
FROM containers
GROUP BY category
ORDER BY
  CASE category
    WHEN '缺最后免费日' THEN 1
    WHEN '已超时' THEN 2
    WHEN '已超时（今天）' THEN 3
    WHEN '即将超时（1天）' THEN 4
    WHEN '即将超时（2天）' THEN 5
    WHEN '即将超时（3天）' THEN 6
    WHEN '预警（4-7天）' THEN 7
    WHEN '预警（7天）' THEN 8
    WHEN '时间充裕（7天以上）' THEN 9
  END;

-- 显示详细数据（用于验证）
SELECT
  container_number,
  last_free_date,
  CURRENT_DATE as today,
  last_free_date - CURRENT_DATE as days_diff,
  CASE
    WHEN last_free_date IS NULL THEN '缺最后免费日'
    WHEN last_free_date < CURRENT_DATE THEN '已超时'
    WHEN last_free_date >= CURRENT_DATE AND last_free_date < CURRENT_DATE + INTERVAL '3 days' THEN '即将超时（1-3天）'
    WHEN last_free_date >= CURRENT_DATE + INTERVAL '3 days' AND last_free_date < CURRENT_DATE + INTERVAL '7 days' THEN '预警（4-7天）'
    WHEN last_free_date >= CURRENT_DATE + INTERVAL '7 days' THEN '时间充裕（7天以上）'
  END as category
FROM containers
ORDER BY last_free_date NULLS LAST, container_number;
