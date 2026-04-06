-- 检查还箱日相关字段的数据
SELECT 
  container_number,
  return_time,
  last_return_date,
  planned_return_date,
  notification_return_date,
  notification_return_time
FROM process_empty_return
WHERE container_number IN (
  SELECT container_number FROM biz_containers LIMIT 5
)
ORDER BY container_number;

-- 说明：
-- 1. 如果 return_time 有值，甘特图会显示 return_time，而不是 planned_return_date
-- 2. 如果 last_return_date 有值且 return_time 为空，甘特图会显示 last_return_date
-- 3. 只有当 return_time 和 last_return_date 都为空时，才会显示 planned_return_date
