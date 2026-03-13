-- ========================================
-- 状态机一致性分析
-- ========================================

-- ========================================
-- 1. 检查各状态的分布
-- ========================================
SELECT logistics_status, COUNT(*) as count
FROM biz_containers
GROUP BY logistics_status
ORDER BY logistics_status;

-- ========================================
-- 2. 检查状态与记录的一致性
-- ========================================

-- 2.1 picked_up状态但没有拖卡记录
SELECT
  c.container_number,
  c.logistics_status,
  sf.shipment_date,
  po.ata_dest_port
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
LEFT JOIN process_port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
WHERE c.logistics_status = 'picked_up'
  AND NOT EXISTS (SELECT 1 FROM process_trucking_transport WHERE container_number = c.container_number)
ORDER BY c.container_number;

-- 2.2 picked_up状态但有卸柜记录（状态应该是unloaded）
SELECT
  c.container_number,
  c.logistics_status,
  tt.pickup_date,
  wo.unload_date
FROM biz_containers c
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
WHERE c.logistics_status = 'picked_up'
  AND wo.unload_date IS NOT NULL
ORDER BY c.container_number;

-- 2.3 at_port状态但有拖卡记录（状态应该是picked_up）
SELECT
  c.container_number,
  c.logistics_status,
  po.ata_dest_port,
  tt.pickup_date
FROM biz_containers c
LEFT JOIN process_port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
WHERE c.logistics_status = 'at_port'
  AND tt.pickup_date IS NOT NULL
ORDER BY c.container_number;

-- 2.4 at_port状态但没有到港记录
SELECT
  c.container_number,
  c.logistics_status,
  sf.shipment_date,
  po.ata_dest_port
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
LEFT JOIN process_port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
WHERE c.logistics_status = 'at_port'
  AND po.ata_dest_port IS NULL
ORDER BY c.container_number;

-- 2.5 in_transit状态但有到港记录（状态应该是at_port）
SELECT
  c.container_number,
  c.logistics_status,
  sf.shipment_date,
  po.ata_dest_port
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
LEFT JOIN process_port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
WHERE c.logistics_status = 'in_transit'
  AND po.ata_dest_port IS NOT NULL
ORDER BY c.container_number;

-- 2.6 in_transit状态但无出运记录
SELECT
  c.container_number,
  c.logistics_status,
  sf.shipment_date
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
WHERE c.logistics_status = 'in_transit'
  AND sf.shipment_date IS NULL
ORDER BY c.container_number;

-- ========================================
-- 3. 检查还箱相关
-- ========================================

-- 3.1 returned_empty状态但没有还箱时间记录
SELECT
  c.container_number,
  c.logistics_status,
  er."lastReturnDate",
  er."returnTime"
FROM biz_containers c
LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
WHERE c.logistics_status = 'returned_empty'
  AND (er."returnTime" IS NULL OR NOT EXISTS (
    SELECT 1 FROM process_empty_returns
    WHERE container_number = c.container_number
    AND "returnTime" IS NOT NULL
  ))
ORDER BY c.container_number;

-- 3.2 非returned_empty状态但有还箱时间（状态应该是returned_empty）
SELECT
  c.container_number,
  c.logistics_status,
  wo.unload_date,
  er."returnTime"
FROM biz_containers c
LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
WHERE c.logistics_status IN ('picked_up', 'unloaded', 'at_port')
  AND er."returnTime" IS NOT NULL
ORDER BY c.container_number;

-- ========================================
-- 4. 检查日期缺失情况
-- ========================================

-- 4.1 有后续记录但前面记录缺失
SELECT
  c.container_number,
  c.logistics_status,
  CASE
    WHEN sf.shipment_date IS NULL AND (po.ata_dest_port IS NOT NULL OR tt.pickup_date IS NOT NULL OR wo.unload_date IS NOT NULL OR er."returnTime" IS NOT NULL)
    THEN '缺出运日期'
    WHEN po.ata_dest_port IS NULL AND (tt.pickup_date IS NOT NULL OR wo.unload_date IS NOT NULL OR er."returnTime" IS NOT NULL)
    THEN '缺到港日期'
    WHEN tt.pickup_date IS NULL AND (wo.unload_date IS NOT NULL OR er."returnTime" IS NOT NULL)
    THEN '缺提柜日期'
    WHEN wo.unload_date IS NULL AND er."returnTime" IS NOT NULL
    THEN '缺卸柜日期'
    ELSE '其他'
  END as missing_type,
  sf.shipment_date,
  po.ata_dest_port,
  tt.pickup_date,
  wo.unload_date,
  er."returnTime"
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
LEFT JOIN process_port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
WHERE
  (sf.shipment_date IS NULL AND (po.ata_dest_port IS NOT NULL OR tt.pickup_date IS NOT NULL OR wo.unload_date IS NOT NULL OR er."returnTime" IS NOT NULL))
  OR (po.ata_dest_port IS NULL AND (tt.pickup_date IS NOT NULL OR wo.unload_date IS NOT NULL OR er."returnTime" IS NOT NULL))
  OR (tt.pickup_date IS NULL AND (wo.unload_date IS NOT NULL OR er."returnTime" IS NOT NULL))
  OR (wo.unload_date IS NULL AND er."returnTime" IS NOT NULL)
ORDER BY c.container_number;

-- ========================================
-- 5. 检查lastFreeDate和lastReturnDate的关系
-- ========================================

SELECT
  c.container_number,
  c.logistics_status,
  po.last_free_date,
  er."lastReturnDate",
  er."returnTime",
  CASE
    WHEN po.last_free_date IS NULL THEN '港口无lastFreeDate'
    WHEN er."lastReturnDate" IS NULL THEN '还箱表无lastReturnDate'
    WHEN po.last_free_date != er."lastReturnDate" THEN '日期不一致'
    ELSE '日期一致'
  END as relationship
FROM biz_containers c
LEFT JOIN process_port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
LEFT JOIN process_empty_returns er ON c.container_number = er."containerNumber"
WHERE c.logistics_status IN ('picked_up', 'unloaded', 'at_port')
  AND (po.last_free_date IS NOT NULL OR er."lastReturnDate" IS NOT NULL)
ORDER BY c.container_number
LIMIT 20;
