-- 验证还箱节点数据来源修复
-- 修复前：return_time 为 NULL 时，使用 last_return_date 填充，导致误显示为"已还箱"
-- 修复后：return_time 为 NULL 时，显示"还箱 缺数据"

-- 检查当前数据状态
SELECT 
  container_number,
  return_time AS "实际还箱时间",
  last_return_date AS "最晚还箱日",
  CASE 
    WHEN return_time IS NOT NULL THEN '应显示：已还空箱 (return_time)'
    WHEN last_return_date IS NOT NULL THEN '应显示：还箱 缺数据 (return_time 为 NULL)'
    ELSE '应显示：还箱 缺数据 (全无数据)'
  END AS "前端应显示状态"
FROM process_empty_return
ORDER BY container_number
LIMIT 10;

-- 预期结果：
-- 所有 return_time 为 NULL 的记录，前端物流路径的还箱节点应显示"还箱 缺数据"
-- 而不是显示 last_return_date 的日期并标记为"已还空箱"
