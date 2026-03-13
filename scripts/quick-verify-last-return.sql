-- 快速验证"按最晚还箱日"分层统计
SELECT
  CASE
    WHEN er."lastReturnDate" IS NULL THEN '② 缺最后还箱日'
    WHEN DATE(er."lastReturnDate") < CURRENT_DATE THEN '①-1 已逾期未还箱'
    WHEN DATE(er."lastReturnDate") >= CURRENT_DATE
      AND DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '3 days'
    THEN '①-2 紧急：倒计时3天内'
    WHEN DATE(er."lastReturnDate") > CURRENT_DATE + INTERVAL '3 days'
      AND DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '7 days'
    THEN '①-3 警告：倒计时7天内'
    WHEN DATE(er."lastReturnDate") > CURRENT_DATE + INTERVAL '7 days'
    THEN '①-4 正常'
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
    WHEN er."lastReturnDate" IS NULL THEN '② 缺最后还箱日'
    WHEN DATE(er."lastReturnDate") < CURRENT_DATE THEN '①-1 已逾期未还箱'
    WHEN DATE(er."lastReturnDate") >= CURRENT_DATE
      AND DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '3 days'
    THEN '①-2 紧急：倒计时3天内'
    WHEN DATE(er."lastReturnDate") > CURRENT_DATE + INTERVAL '3 days'
      AND DATE(er."lastReturnDate") <= CURRENT_DATE + INTERVAL '7 days'
    THEN '①-3 警告：倒计时7天内'
    WHEN DATE(er."lastReturnDate") > CURRENT_DATE + INTERVAL '7 days'
    THEN '①-4 正常'
    ELSE '未知'
  END
ORDER BY
  CASE category
    WHEN '② 缺最后还箱日' THEN 1
    WHEN '①-1 已逾期未还箱' THEN 2
    WHEN '①-2 紧急：倒计时3天内' THEN 3
    WHEN '①-3 警告：倒计时7天内' THEN 4
    WHEN '①-4 正常' THEN 5
    ELSE 6
  END;
