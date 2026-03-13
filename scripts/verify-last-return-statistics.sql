-- 验证"按最晚还箱日"统计的记录数
-- 数据子集规则：已提柜或有拖卡运输记录，且不等于已还箱状态，且未还箱（returnTime为空）

-- 1. 统计目标集总数（满足基础条件的货柜数）
WITH target_set AS (
  SELECT
    c.container_number,
    c.logistics_status,
    er.last_return_date,
    er.return_time,
    tt.container_number as has_trucking,
    CASE
      WHEN c.logistics_status = 'returned_empty' THEN 'EXCLUDED_RETURNED_EMPTY'
      WHEN er.return_time IS NOT NULL THEN 'EXCLUDED_ALREADY_RETURNED'
      WHEN c.logistics_status IN ('picked_up', 'unloaded') THEN 'PICKED_UP'
      WHEN tt.container_number IS NOT NULL THEN 'HAS_TRUCKING'
      ELSE 'EXCLUDED_NO_CONDITION'
    END as category
  FROM biz_containers c
  LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
  LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
  WHERE c.logistics_status != 'returned_empty'
    AND er."returnTime" IS NULL
    AND (c.logistics_status IN ('picked_up', 'unloaded') OR tt.container_number IS NOT NULL)
)

-- 2. 目标集总数
SELECT
  '目标集总数' as description,
  COUNT(*) as count
FROM target_set

UNION ALL

-- 3. 已逾期未还箱（lastReturnDate < 今天）
SELECT
  '已逾期未还箱' as description,
  COUNT(*) as count
FROM target_set
WHERE last_return_date IS NOT NULL
  AND DATE(last_return_date) < CURRENT_DATE

UNION ALL

-- 4. 紧急：倒计时3天内（今天 ≤ lastReturnDate ≤ 3天后）
SELECT
  '紧急：倒计时3天内' as description,
  COUNT(*) as count
FROM target_set
WHERE last_return_date IS NOT NULL
  AND DATE(last_return_date) >= CURRENT_DATE
  AND DATE(last_return_date) <= CURRENT_DATE + INTERVAL '3 days'

UNION ALL

-- 5. 警告：倒计时7天内（3天 < lastReturnDate ≤ 7天）
SELECT
  '警告：倒计时7天内' as description,
  COUNT(*) as count
FROM target_set
WHERE last_return_date IS NOT NULL
  AND DATE(last_return_date) > CURRENT_DATE + INTERVAL '3 days'
  AND DATE(last_return_date) <= CURRENT_DATE + INTERVAL '7 days'

UNION ALL

-- 6. 正常（lastReturnDate > 7天）
SELECT
  '正常' as description,
  COUNT(*) as count
FROM target_set
WHERE last_return_date IS NOT NULL
  AND DATE(last_return_date) > CURRENT_DATE + INTERVAL '7 days'

UNION ALL

-- 7. 缺最后还箱日
SELECT
  '缺最后还箱日' as description,
  COUNT(*) as count
FROM target_set
WHERE last_return_date IS NULL

ORDER BY count DESC;
