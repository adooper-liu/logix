-- Phase 2 Task 2: 验证节假日配置表
-- 作者：刘志高
-- 创建时间：2026-04-01

-- 1. 验证表结构和注释
SELECT 
  table_name,
  obj_description(oid, 'pg_class') as table_comment
FROM information_schema.tables
JOIN pg_class ON table_name = relname
WHERE table_name = 'dict_holidays';

-- 2. 验证字段注释
SELECT 
  a.attname as column_name,
  col_description(a.attrelid, a.attnum) as column_comment
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
WHERE c.relname = 'dict_holidays'
  AND a.attnum > 0
ORDER BY a.attnum;

-- 3. 验证索引
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'dict_holidays';

-- 4. 验证数据量（按国家分组）
SELECT 
  country_code,
  COUNT(*) as holiday_count,
  MIN(holiday_date) as first_holiday,
  MAX(holiday_date) as last_holiday
FROM dict_holidays
GROUP BY country_code
ORDER BY country_code;

-- 5. 查看美国 2026 年所有节假日
SELECT 
  holiday_date,
  holiday_name,
  is_recurring
FROM dict_holidays
WHERE country_code = 'US'
  AND EXTRACT(YEAR FROM holiday_date) = 2026
ORDER BY holiday_date;

-- 6. 测试节假日查询功能
SELECT 
  '2026-07-04'::DATE as test_date,
  EXISTS (
    SELECT 1 FROM dict_holidays
    WHERE holiday_date = '2026-07-04'
      AND country_code = 'US'
  ) as is_holiday;

-- 7. 验证视图
SELECT * FROM v_holidays_by_year
WHERE holiday_year = 2026
ORDER BY country_code, holiday_date
LIMIT 10;
