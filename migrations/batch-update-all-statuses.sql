-- =====================================================
-- 批量更新所有货柜状态（使用修正后的状态机规则）
-- 生成时间: 2026-03-06
-- 用途: 一劳永逸解决中转港与目的港混淆问题
-- =====================================================

-- 状态机优先级规则（已修正）：
-- 1. returned_empty - 有还箱记录（最高优先级）
-- 2. unloaded - 有卸柜记录（WMS已确认）
-- 3. picked_up - 有提柜记录
-- 4. at_port - 有目的港ATA（已到目的港，不包括中转港）
-- 5. in_transit - 有出运日期，无目的港ATA
-- 6. not_shipped - 无任何流程记录

-- 1. 更新所有货柜状态为正确值
UPDATE biz_containers c
SET logistics_status =
  CASE
    -- 1. 已还箱（优先级最高）
    WHEN EXISTS (
      SELECT 1 FROM process_empty_returns er
      WHERE er.container_number = c.container_number
      AND er.return_time IS NOT NULL
    ) THEN 'returned_empty'

    -- 2. 已卸柜
    WHEN EXISTS (
      SELECT 1 FROM process_warehouse_operations wo
      WHERE wo.container_number = c.container_number
      AND wo.unload_date IS NOT NULL
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

    -- 5. 在途（有出运日期，无目的港ATA）
    WHEN EXISTS (
      SELECT 1 FROM process_sea_freight sf
      WHERE sf.container_number = c.container_number
      AND sf.shipment_date IS NOT NULL
    ) THEN 'in_transit'

    -- 6. 未出运
    ELSE 'not_shipped'
  END,
  updated_at = NOW();

-- 2. 验证更新结果
SELECT
    logistics_status,
    COUNT(*) as count
FROM biz_containers
GROUP BY logistics_status
ORDER BY logistics_status;

-- 3. 检查 at_port 状态中的中转港情况（应该为0）
SELECT
    COUNT(DISTINCT c.container_number) as transit_in_at_port_count
FROM biz_containers c
INNER JOIN process_port_operations transit_po
  ON c.container_number = transit_po.container_number
  AND transit_po.port_type = 'transit'
WHERE c.logistics_status = 'at_port';

-- 4. 检查有中转港但无目的港ATA的货柜状态（应该为 in_transit）
SELECT
    c.logistics_status,
    COUNT(DISTINCT c.container_number) as count
FROM biz_containers c
INNER JOIN process_port_operations transit_po
  ON c.container_number = transit_po.container_number
  AND transit_po.port_type = 'transit'
LEFT JOIN process_port_operations dest_po
  ON c.container_number = dest_po.container_number
  AND dest_po.port_type = 'destination'
WHERE dest_po.ata_dest_port IS NULL
GROUP BY c.logistics_status
ORDER BY c.logistics_status;
