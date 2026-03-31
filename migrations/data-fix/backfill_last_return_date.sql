-- ============================================================
-- 【已废弃】last_return_date 不应使用 last_free_date+7 天简单计算
-- ============================================================
--
-- last_return_date（最晚还箱日）应按滞箱费标准计算：
--   - 起算日：实际提柜日（有则用）或 last_free_date
--   - 免费用箱天数：来自滞箱费标准表
--
-- 正确做法：与 last_free_date 相同，调用滞港费服务批量写回
--   - 手动触发：POST /api/v1/demurrage/batch-write-back
--   - 定时任务：DemurrageWriteBackScheduler
--
-- 详见：frontend/public/docs/11-project/15-排柜数据补全与缺省方案.md
--
-- 以下 SQL 已注释，仅作历史参考，请勿执行
-- ============================================================

/*
UPDATE process_empty_return er
SET last_return_date = sub.last_ret
FROM (
  SELECT po.container_number,
         (po.last_free_date + INTERVAL '7 days')::timestamp AS last_ret
  FROM process_port_operations po
  WHERE po.port_type = 'destination'
    AND po.last_free_date IS NOT NULL
) sub
WHERE er.container_number = sub.container_number
  AND er.last_return_date IS NULL;
*/
