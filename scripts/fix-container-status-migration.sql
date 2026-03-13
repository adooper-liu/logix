-- ========================================
-- LogiX 状态机数据修复脚本
-- 执行日期: 2025-03-06
-- 目的: 修复picked_up状态但WMS已确认的货柜为unloaded状态
-- ========================================

-- ========================================
-- 修复前：检查当前状态分布
-- ========================================
SELECT '修复前状态分布' as description;
SELECT logistics_status, COUNT(*) as count
FROM biz_containers
GROUP BY logistics_status
ORDER BY logistics_status;

-- ========================================
-- 修复1：批量更新所有状态不一致的货柜
-- 根据状态机规则，一次性修复所有货柜状态
-- ========================================
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

    -- 4. 已到中转港（有transit记录，destination无ATA）
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

    -- 5. 已到目的港（destination有ATA）
    WHEN EXISTS (
      SELECT 1 FROM process_port_operations po3
      WHERE po3.container_number = c.container_number
      AND po3.port_type = 'destination'
      AND po3.ata_dest_port IS NOT NULL
    ) THEN 'at_port'

    -- 6. 在途
    WHEN EXISTS (
      SELECT 1 FROM process_sea_freight sf
      WHERE sf.container_number = c.container_number
      AND sf.shipment_date IS NOT NULL
    ) THEN 'in_transit'

    -- 7. 未出运
    ELSE 'not_shipped'
  END
WHERE logistics_status != (
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

-- ========================================
-- 修复后：验证状态分布
-- ========================================
SELECT '修复后状态分布' as description;
SELECT logistics_status, COUNT(*) as count
FROM biz_containers
GROUP BY logistics_status
ORDER BY logistics_status;

-- ========================================
-- 验证：检查状态不一致的货柜（应该为0条）
-- ========================================
SELECT '状态不一致检查（应该为0）' as description;
SELECT
  c.container_number,
  c.logistics_status as current_status,
  (
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
  ) as expected_status
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
)
ORDER BY c.container_number;

-- ========================================
-- 预期结果统计
-- ========================================
SELECT '预期结果对比' as description;
SELECT
  '预期状态分布' as type,
  'not_shipped' as status, 0 as count
UNION ALL
SELECT '预期状态分布', 'in_transit', 85
UNION ALL
SELECT '预期状态分布', 'at_port', 92
UNION ALL
SELECT '预期状态分布', 'picked_up', 0
UNION ALL
SELECT '预期状态分布', 'unloaded', 54
UNION ALL
SELECT '预期状态分布', 'returned_empty', 119;
