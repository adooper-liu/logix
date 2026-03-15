-- ============================================================
-- 【已废弃】last_free_date 不应使用简单 ETA+7 天计算
-- ============================================================
--
-- last_free_date（最后免费日）应按以下口径计算：
--   - 基准日：修正 ETA → ETA（或 ATA → 实际卸船日）
--   - 免费天数：来自 ext_demurrage_standards 滞港费标准表
--   - 公式：基准日 + (free_days - 1)，按 free_days_basis 折算
--
-- 正确做法：调用滞港费服务批量写回
--   - 定时任务：DemurrageWriteBackScheduler（默认每 6 小时）
--   - 手动触发：POST /api/v1/demurrage/batch-write-back
--
-- 详见：
--   - frontend/public/docs/11-project/15-排柜数据补全与缺省方案.md
--   - frontend/public/docs/demurrage/02-CONTAINER_SCHEDULING_AND_COST_OPTIMIZATION_PLAN.md
--
-- 以下 SQL 已注释，仅作历史参考，请勿执行
-- ============================================================

/*
UPDATE process_port_operations po
SET last_free_date = (
  COALESCE(po.ata_dest_port::date, po.eta_dest_port::date) + INTERVAL '7 days'
)::date
WHERE po.port_type = 'destination'
  AND po.last_free_date IS NULL
  AND (po.ata_dest_port IS NOT NULL OR po.eta_dest_port IS NOT NULL);
*/
