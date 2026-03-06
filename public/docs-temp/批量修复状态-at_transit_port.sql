-- =====================================================
-- 批量修复状态 - 新增 at_transit_port
-- 生成时间: 2026-03-06
-- 用途: 明确区分中转港和目的港,新增 at_transit_port 状态
-- =====================================================

-- 1. 备份当前状态
SELECT '1. 备份当前状态' as description;
CREATE TABLE IF NOT EXISTS container_status_backup_20260306 AS
SELECT * FROM biz_containers;

-- 2. 显示修复前的状态分布
SELECT '2. 修复前的状态分布' as description;
SELECT
  logistics_status,
  COUNT(*) as count
FROM biz_containers
GROUP BY logistics_status
ORDER BY logistics_status;

-- 3. 批量更新所有货柜状态
SELECT '3. 批量更新状态' as description;
UPDATE biz_containers c
SET logistics_status =
  CASE
    -- 1. 已还箱（优先级最高）
    WHEN EXISTS (
      SELECT 1 FROM process_empty_returns er
      WHERE er.container_number = c.container_number
      AND er.return_time IS NOT NULL
    ) THEN 'returned_empty'

    -- 2. 已卸柜（WMS已确认）
    WHEN EXISTS (
      SELECT 1 FROM process_warehouse_operations wo
      WHERE wo.container_number = c.container_number
      AND (
        wo.wms_status = 'WMS已完成'
        OR wo.ebs_status = '已入库'
        OR wo.wms_confirm_date IS NOT NULL
      )
    ) THEN 'unloaded'

    -- 3. 已提柜
    WHEN EXISTS (
      SELECT 1 FROM process_trucking_transport tt
      WHERE tt.container_number = c.container_number
      AND tt.pickup_date IS NOT NULL
    ) THEN 'picked_up'

    -- 4. 已到目的港（只有目的港有ATA，不包括中转港）
    WHEN EXISTS (
      SELECT 1 FROM process_port_operations po
      WHERE po.container_number = c.container_number
      AND po.port_type = 'destination'
      AND po.ata_dest_port IS NOT NULL
    ) THEN 'at_port'

    -- 5. 已到中转港（有中转港记录，但目的港无ATA）
    WHEN EXISTS (
      SELECT 1 FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
      AND transit_po.ata_dest_port IS NOT NULL
    ) AND NOT EXISTS (
      SELECT 1 FROM process_port_operations dest_po
      WHERE dest_po.container_number = c.container_number
      AND dest_po.port_type = 'destination'
      AND dest_po.ata_dest_port IS NOT NULL
    ) THEN 'at_transit_port'

    -- 6. 在途（有出运日期，未到任何港口）
    WHEN EXISTS (
      SELECT 1 FROM process_sea_freight sf
      WHERE sf.container_number = c.container_number
      AND sf.shipment_date IS NOT NULL
    ) THEN 'in_transit'

    -- 7. 未出运
    ELSE 'not_shipped'
  END,
  updated_at = NOW();

-- 4. 显示修复后的状态分布
SELECT '4. 修复后的状态分布' as description;
SELECT
  logistics_status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM biz_containers), 2) as percentage
FROM biz_containers
GROUP BY logistics_status
ORDER BY logistics_status;

-- 5. 检查 at_transit_port 状态的货柜
SELECT '5. at_transit_port 状态货柜明细' as description;
SELECT
  c.container_number,
  c.logistics_status,
  transit_po.port_name as transit_port,
  transit_po.ata_dest_port as transit_ata
FROM biz_containers c
INNER JOIN process_port_operations transit_po
  ON c.container_number = transit_po.container_number
  AND transit_po.port_type = 'transit'
  AND transit_po.ata_dest_port IS NOT NULL
WHERE c.logistics_status = 'at_transit_port'
AND NOT EXISTS (
  SELECT 1 FROM process_port_operations dest_po
  WHERE dest_po.container_number = c.container_number
  AND dest_po.port_type = 'destination'
  AND dest_po.ata_dest_port IS NOT NULL
)
ORDER BY c.container_number;

-- 6. 检查 at_port 状态的货柜（不应该有中转港）
SELECT '6. at_port 状态货柜明细（不应该有中转港）' as description;
SELECT
  c.container_number,
  c.logistics_status,
  dest_po.port_name as destination_port,
  dest_po.ata_dest_port as destination_ata,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM process_port_operations transit_po
      WHERE transit_po.container_number = c.container_number
      AND transit_po.port_type = 'transit'
    ) THEN '⚠️ 有中转港记录'
    ELSE '✅ 无中转港记录'
  END as transit_check
FROM biz_containers c
INNER JOIN process_port_operations dest_po
  ON c.container_number = dest_po.container_number
  AND dest_po.port_type = 'destination'
  AND dest_po.ata_dest_port IS NOT NULL
WHERE c.logistics_status = 'at_port'
ORDER BY c.container_number;

-- 7. 状态流转统计
SELECT '7. 状态流转统计' as description;
WITH status_flow AS (
  SELECT
    c.container_number,
    c.logistics_status,
    -- 统计状态流转
    CASE
      WHEN EXISTS (
        SELECT 1 FROM process_empty_returns er
        WHERE er.container_number = c.container_number
        AND er.return_time IS NOT NULL
      ) THEN 'returned_empty'
      WHEN EXISTS (
        SELECT 1 FROM process_warehouse_operations wo
        WHERE wo.container_number = c.container_number
        AND (
          wo.wms_status = 'WMS已完成'
          OR wo.ebs_status = '已入库'
          OR wo.wms_confirm_date IS NOT NULL
        )
      ) THEN 'unloaded'
      WHEN EXISTS (
        SELECT 1 FROM process_trucking_transport tt
        WHERE tt.container_number = c.container_number
        AND tt.pickup_date IS NOT NULL
      ) THEN 'picked_up'
      WHEN EXISTS (
        SELECT 1 FROM process_port_operations po
        WHERE po.container_number = c.container_number
        AND po.port_type = 'destination'
        AND po.ata_dest_port IS NOT NULL
      ) THEN 'at_port'
      WHEN EXISTS (
        SELECT 1 FROM process_port_operations transit_po
        WHERE transit_po.container_number = c.container_number
        AND transit_po.port_type = 'transit'
        AND transit_po.ata_dest_port IS NOT NULL
      ) AND NOT EXISTS (
        SELECT 1 FROM process_port_operations dest_po
        WHERE dest_po.container_number = c.container_number
        AND dest_po.port_type = 'destination'
        AND dest_po.ata_dest_port IS NOT NULL
      ) THEN 'at_transit_port'
      WHEN EXISTS (
        SELECT 1 FROM process_sea_freight sf
        WHERE sf.container_number = c.container_number
        AND sf.shipment_date IS NOT NULL
      ) THEN 'in_transit'
      ELSE 'not_shipped'
    END as expected_status
  FROM biz_containers c
)
SELECT
  CASE
    WHEN logistics_status = expected_status THEN '✅ 一致'
    ELSE '❌ 不一致'
  END as status,
  logistics_status as current_status,
  expected_status,
  COUNT(*) as count
FROM status_flow
GROUP BY status, logistics_status, expected_status
ORDER BY status DESC, logistics_status;
