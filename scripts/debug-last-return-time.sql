-- 调试"按最晚还箱"时间分类逻辑
-- 检查每个货柜的lastReturnDate和分类

SELECT
  c.container_number,
  er."lastReturnDate" as last_return_date,
  CURRENT_DATE as today,
  CURRENT_DATE + INTERVAL '3 days' as three_days_later,
  CURRENT_DATE + INTERVAL '7 days' as seven_days_later,

  -- 时间差
  CASE
    WHEN er.last_return_date IS NULL THEN NULL
    WHEN DATE(er.last_return_date) < CURRENT_DATE THEN CURRENT_DATE - DATE(er.last_return_date)
    ELSE DATE(er.last_return_date) - CURRENT_DATE
  END as days_diff,

  -- 分类
  CASE
    WHEN er."lastReturnDate" IS NULL THEN '缺最后还箱日'
    WHEN DATE(er."lastReturnDate") < CURRENT_DATE THEN '已逾期未还箱'
    WHEN DATE(er."lastReturnDate") >= CURRENT_DATE
      AND DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '3 days'
    THEN '紧急：倒计时3天内'
    WHEN DATE(er."lastReturnDate") > CURRENT_DATE + INTERVAL '3 days'
      AND DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '7 days'
    THEN '警告：倒计时7天内'
    WHEN DATE(er."lastReturnDate") > CURRENT_DATE + INTERVAL '7 days'
    THEN '正常'
    ELSE '未知'
  END as category

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
LIMIT 30;

-- 统计分类
SELECT
  CASE
    WHEN er."lastReturnDate" IS NULL THEN '缺最后还箱日'
    WHEN DATE(er."lastReturnDate") < CURRENT_DATE THEN '已逾期未还箱'
    WHEN DATE(er."lastReturnDate") >= CURRENT_DATE
      AND DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '3 days'
    THEN '紧急：倒计时3天内'
    WHEN DATE(er."lastReturnDate") > CURRENT_DATE + INTERVAL '3 days'
      AND DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '7 days'
    THEN '警告：倒计时7天内'
    WHEN DATE(er."lastReturnDate") > CURRENT_DATE + INTERVAL '7 days'
    THEN '正常'
    ELSE '未知'
  END as category,
  COUNT(*) as count
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
    WHEN DATE(er."lastReturnDate") >= CURRENT_DATE
      AND DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '3 days'
    THEN '紧急：倒计时3天内'
    WHEN DATE(er."lastReturnDate") > CURRENT_DATE + INTERVAL '3 days'
      AND DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '7 days'
    THEN '警告：倒计时7天内'
    WHEN DATE(er."lastReturnDate") > CURRENT_DATE + INTERVAL '7 days'
    THEN '正常'
    ELSE '未知'
  END
ORDER BY
  CASE category
    WHEN '缺最后还箱日' THEN 1
    WHEN '已逾期未还箱' THEN 2
    WHEN '紧急：倒计时3天内' THEN 3
    WHEN '警告：倒计时7天内' THEN 4
    WHEN '正常' THEN 5
    ELSE 6
  END;
