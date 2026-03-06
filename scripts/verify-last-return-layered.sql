-- 验证"按最晚还箱日"的分层统计逻辑
-- 第1层：目标集 → 第2层：有/无lastReturnDate → 第3层：时间分类

-- 第1层 + 第2层：主要分组统计
WITH layer1_target_set AS (
  SELECT
    c.container_number,
    c.logistics_status,
    er."lastReturnDate" as last_return_date,
    er."returnTime" as return_time,
    CASE
      WHEN tt.container_number IS NOT NULL THEN '有拖卡记录'
      ELSE '无拖卡记录'
    END as trucking_status
  FROM biz_containers c
  LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
  LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
  WHERE c.logistics_status != 'returned_empty'
    AND er."returnTime" IS NULL
    AND (c.logistics_status IN ('picked_up', 'unloaded') OR tt.container_number IS NOT NULL)
)

SELECT
  '第1层+第2层：主要分组' as layer,
  CASE
    WHEN last_return_date IS NOT NULL THEN '① 有最晚还箱日'
    ELSE '② 无最晚还箱日'
  END as main_category,
  COUNT(*) as count
FROM layer1_target_set
GROUP BY
  CASE
    WHEN last_return_date IS NOT NULL THEN '① 有最晚还箱日'
    ELSE '② 无最晚还箱日'
  END

UNION ALL

-- 第3层：时间分类（仅针对有最晚还箱日）
SELECT
  '第3层：时间分类' as layer,
  CASE
    WHEN last_return_date IS NULL THEN '② 缺最后还箱日'
    WHEN DATE(last_return_date) < CURRENT_DATE THEN '①-1 已逾期未还箱'
    WHEN DATE(last_return_date) >= CURRENT_DATE
      AND DATE(last_return_date) <= CURRENT_DATE + INTERVAL '3 days'
    THEN '①-2 紧急：倒计时3天内'
    WHEN DATE(last_return_date) > CURRENT_DATE + INTERVAL '3 days'
      AND DATE(last_return_date) <= CURRENT_DATE + INTERVAL '7 days'
    THEN '①-3 警告：倒计时7天内'
    WHEN DATE(last_return_date) > CURRENT_DATE + INTERVAL '7 days'
    THEN '①-4 正常'
    ELSE '未知'
  END as category,
  COUNT(*) as count
FROM layer1_target_set
GROUP BY
  CASE
    WHEN last_return_date IS NULL THEN '② 缺最后还箱日'
    WHEN DATE(last_return_date) < CURRENT_DATE THEN '①-1 已逾期未还箱'
    WHEN DATE(last_return_date) >= CURRENT_DATE
      AND DATE(last_return_date) <= CURRENT_DATE + INTERVAL '3 days'
    THEN '①-2 紧急：倒计时3天内'
    WHEN DATE(last_return_date) > CURRENT_DATE + INTERVAL '3 days'
      AND DATE(last_return_date) <= CURRENT_DATE + INTERVAL '7 days'
    THEN '①-3 警告：倒计时7天内'
    WHEN DATE(last_return_date) > CURRENT_DATE + INTERVAL '7 days'
    THEN '①-4 正常'
    ELSE '未知'
  END
ORDER BY layer, category;
