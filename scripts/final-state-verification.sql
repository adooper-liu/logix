-- ========================================
-- 状态机实施最终验证脚本
-- ========================================

-- 1. 验证状态分布
SELECT '1. 状态分布' as description;
SELECT logistics_status, COUNT(*) as count
FROM biz_containers
GROUP BY logistics_status
ORDER BY logistics_status;

-- 2. 验证状态不一致的货柜（应该为0）
SELECT '2. 状态不一致检查（应该为0）' as description;
SELECT COUNT(*) as inconsistent_count
FROM biz_containers c
WHERE c.logistics_status != (
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
      AND po.port_type = 'transit'
    ) AND NOT EXISTS (
      SELECT 1 FROM process_port_operations po2
      WHERE po2.container_number = c.container_number
      AND po2.port_type = 'destination'
      AND po2.ata_dest_port IS NOT NULL
    ) THEN 'at_port'
    WHEN EXISTS (
      SELECT 1 FROM process_port_operations po3
      WHERE po3.container_number = c.container_number
      AND po3.port_type = 'destination'
      AND po3.ata_dest_port IS NOT NULL
    ) THEN 'at_port'
    WHEN EXISTS (
      SELECT 1 FROM process_sea_freight sf
      WHERE sf.container_number = c.container_number
      AND sf.shipment_date IS NOT NULL
    ) THEN 'in_transit'
    ELSE 'not_shipped'
  END
);

-- 3. 验证"按最晚还箱日"目标集数量
SELECT '3. 按最晚还箱日目标集（picked_up + unloaded）' as description;
SELECT COUNT(*) as target_set_count
FROM biz_containers
WHERE logistics_status IN ('picked_up', 'unloaded');

-- 4. 验证"按最晚提柜日"目标集数量
SELECT '4. 按最晚提柜日目标集（at_port）' as description;
SELECT COUNT(*) as target_set_count
FROM biz_containers
WHERE logistics_status = 'at_port';

-- 5. 检查是否有returned_empty状态的货柜有returnTime
SELECT '5. returned_empty状态检查（应该都有returnTime）' as description;
SELECT COUNT(*) as returned_empty_without_returntime
FROM biz_containers c
LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
WHERE c.logistics_status = 'returned_empty'
AND er."returnTime" IS NULL;

-- 6. 检查unloaded状态的货柜WMS确认情况
SELECT '6. unloaded状态WMS确认检查' as description;
SELECT
  c.logistics_status,
  wo.wms_status,
  wo.ebs_status,
  wo.wms_confirm_date,
  COUNT(*) as count
FROM biz_containers c
LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
WHERE c.logistics_status = 'unloaded'
GROUP BY c.logistics_status, wo.wms_status, wo.ebs_status, wo.wms_confirm_date;

-- 7. 验证总数量
SELECT '7. 总数量验证（应该为350）' as description;
SELECT SUM(count) as total FROM (
  SELECT COUNT(*) as count FROM biz_containers GROUP BY logistics_status
) t;

-- 8. 预期结果对比
SELECT '8. 预期结果对比' as description;
SELECT
  'at_port' as status, 92 as expected, (SELECT COUNT(*) FROM biz_containers WHERE logistics_status = 'at_port') as actual
UNION ALL
SELECT 'in_transit', 85, (SELECT COUNT(*) FROM biz_containers WHERE logistics_status = 'in_transit')
UNION ALL
SELECT 'picked_up', 39, (SELECT COUNT(*) FROM biz_containers WHERE logistics_status = 'picked_up')
UNION ALL
SELECT 'unloaded', 15, (SELECT COUNT(*) FROM biz_containers WHERE logistics_status = 'unloaded')
UNION ALL
SELECT 'returned_empty', 119, (SELECT COUNT(*) FROM biz_containers WHERE logistics_status = 'returned_empty');
