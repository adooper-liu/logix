-- 详细验证"按最晚还箱日"统计 - 显示具体记录
-- 数据子集规则：已提柜或有拖卡运输记录，且不等于已还箱状态，且未还箱（returnTime为空）

-- 1. 查看目标集所有记录（前20条）
SELECT
  c.container_number,
  c.logistics_status,
  er."lastReturnDate" as last_return_date,
  er."returnTime" as return_time,
  CASE
    WHEN tt.container_number IS NOT NULL THEN '有拖卡记录'
    ELSE '无拖卡记录'
  END as trucking_status,
  CASE
    WHEN er."lastReturnDate" IS NULL THEN '缺最后还箱日'
    WHEN DATE(er."lastReturnDate") < CURRENT_DATE THEN '已逾期'
    WHEN DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '3 days' THEN '紧急(3天内)'
    WHEN DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '7 days' THEN '警告(7天内)'
    ELSE '正常'
  END as category,
  CASE
    WHEN er."lastReturnDate" IS NOT NULL
    THEN CURRENT_DATE - DATE(er."lastReturnDate")
    ELSE NULL
  END as days_until_due
FROM biz_containers c
LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
WHERE c.logistics_status != 'returned_empty'
  AND er."returnTime" IS NULL
  AND (c.logistics_status IN ('picked_up', 'unloaded') OR tt.container_number IS NOT NULL)
ORDER BY
  CASE
    WHEN er."lastReturnDate" IS NULL THEN 1
    WHEN DATE(er."lastReturnDate") < CURRENT_DATE THEN 2
    WHEN DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '3 days' THEN 3
    WHEN DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '7 days' THEN 4
    ELSE 5
  END,
  er."lastReturnDate"
LIMIT 20;

-- 2. 按分类统计
SELECT
  CASE
    WHEN er."lastReturnDate" IS NULL THEN '缺最后还箱日'
    WHEN DATE(er."lastReturnDate") < CURRENT_DATE THEN '已逾期未还箱'
    WHEN DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '3 days' THEN '紧急：倒计时3天内'
    WHEN DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '7 days' THEN '警告：倒计时7天内'
    ELSE '正常'
  END as category,
  COUNT(*) as count,
  array_agg(c.container_number ORDER BY c.container_number) as sample_containers
FROM biz_containers c
LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
WHERE c.logistics_status != 'returned_empty'
  AND er."returnTime" IS NULL
  AND (c.logistics_status IN ('picked_up', 'unloaded') OR tt.container_number IS NOT NULL)
GROUP BY
  CASE
    WHEN er."lastReturnDate" IS NULL THEN '缺最后还箱日'
    WHEN DATE(er."lastReturnDate") < CURRENT_DATE THEN '已逾期未还箱'
    WHEN DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '3 days' THEN '紧急：倒计时3天内'
    WHEN DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '7 days' THEN '警告：倒计时7天内'
    ELSE '正常'
  END
ORDER BY
  CASE
    WHEN er."lastReturnDate" IS NULL THEN '缺最后还箱日'
    WHEN DATE(er."lastReturnDate") < CURRENT_DATE THEN '已逾期未还箱'
    WHEN DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '3 days' THEN '紧急：倒计时3天内'
    WHEN DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '7 days' THEN '警告：倒计时7天内'
    ELSE '正常'
  END;

-- 3. 检查被排除的记录（满足"已提柜或有拖卡"但有其他条件不满足）
SELECT
  c.container_number,
  c.logistics_status,
  er."returnTime" as is_returned,
  CASE
    WHEN c.logistics_status = 'returned_empty' THEN '已还箱状态'
    WHEN er."returnTime" IS NOT NULL THEN '已还箱(有returnTime)'
    ELSE '其他原因'
  END as exclude_reason
FROM biz_containers c
LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
WHERE (c.logistics_status IN ('picked_up', 'unloaded') OR tt.container_number IS NOT NULL)
  AND (
    c.logistics_status = 'returned_empty'
    OR er."returnTime" IS NOT NULL
  )
ORDER BY c.container_number
LIMIT 10;
