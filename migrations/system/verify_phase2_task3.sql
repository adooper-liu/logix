-- Phase 2 Task 3: 功能验证脚本
-- 作者：刘志高
-- 创建时间：2026-04-01

-- 1. 验证 isWeekend() 逻辑
SELECT 
  '2026-04-04'::DATE AS test_date,  -- Saturday
  EXTRACT(DOW FROM '2026-04-04'::DATE) AS day_of_week,
  CASE 
    WHEN EXTRACT(DOW FROM '2026-04-04'::DATE) IN (0, 6) THEN TRUE
    ELSE FALSE
  END AS is_weekend;

-- 2. 验证 getWorkingDays() 计算（手动计算 2026-04-01 到 2026-04-10）
WITH RECURSIVE date_range AS (
  SELECT '2026-04-01'::DATE AS date
  UNION ALL
  SELECT date + INTERVAL '1 day'
  FROM date_range
  WHERE date < '2026-04-10'::DATE
),
working_days AS (
  SELECT 
    date,
    EXTRACT(DOW FROM date) AS day_of_week,
    CASE 
      WHEN EXTRACT(DOW FROM date) IN (0, 6) THEN 'weekend'
      ELSE 'weekday'
    END AS day_type
  FROM date_range
)
SELECT 
  COUNT(*) FILTER (WHERE day_type = 'weekday') AS working_days_count,
  COUNT(*) FILTER (WHERE day_type = 'weekend') AS weekend_count,
  COUNT(*) AS total_days
FROM working_days;

-- 预期结果：8 working days, 2 weekend days, 10 total days

-- 3. 验证 addWorkDays() 逻辑（从 2026-04-01 加 5 个工作日）
WITH RECURSIVE work_day_calc AS (
  SELECT 
    '2026-04-01'::DATE AS current_date,
    0 AS added_days
  UNION ALL
  SELECT 
    current_date + INTERVAL '1 day',
    added_days + CASE 
      WHEN EXTRACT(DOW FROM (current_date + INTERVAL '1 day')) IN (0, 6) THEN 0
      ELSE 1
    END
  FROM work_day_calc
  WHERE added_days < 5
)
SELECT current_date AS result_date
FROM work_day_calc
WHERE added_days = 5
ORDER BY current_date DESC
LIMIT 1;

-- 预期结果：2026-04-07 (跳过周末)

-- 4. 结合节假日验证（美国 7 月 4 日独立日）
SELECT 
  holiday_date,
  holiday_name,
  country_code
FROM dict_holidays
WHERE country_code = 'US'
  AND holiday_date BETWEEN '2026-07-01' AND '2026-07-10'
ORDER BY holiday_date;

-- 5. 验证批量查询性能
EXPLAIN ANALYZE
SELECT * FROM dict_holidays
WHERE holiday_date BETWEEN '2026-04-01' AND '2026-04-30'
  AND country_code = 'US';

-- 应该使用 idx_country_date 索引
