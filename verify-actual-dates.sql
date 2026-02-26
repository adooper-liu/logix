-- ============================================================
-- 日期修复验证查询 - FANU3376528
-- 执行后将显示所有日期字段的Excel期望值和数据库实际值
-- ============================================================

WITH excel_values AS (
  SELECT
    'shipment_date'::text as 字段名,
    '2025-03-30 00:00:00'::timestamp as Excel期望值
  UNION ALL SELECT 'eta', '2025-05-09 00:00:00'::timestamp
  UNION ALL SELECT 'mother_shipment_date', '2025-04-07 00:00:00'::timestamp
  UNION ALL SELECT 'eta_dest_port', '2025-05-09 00:00:00'::timestamp
  UNION ALL SELECT 'ata_dest_port', '2025-05-17 00:18:00'::timestamp
  UNION ALL SELECT 'dest_port_unload_date', '2025-05-17 00:18:00'::timestamp
  UNION ALL SELECT 'planned_customs_date', '2025-05-06 23:59:59'::timestamp
  UNION ALL SELECT 'isf_declaration_date', '2025-03-26 21:00:23'::timestamp
  UNION ALL SELECT 'warehouse_arrival_date', '2025-05-31 11:38:58'::timestamp
  UNION ALL SELECT 'planned_unload_date', '2025-05-28 00:00:00'::timestamp
  UNION ALL SELECT 'wms_confirm_date', '2025-05-28 05:00:47'::timestamp
  UNION ALL SELECT 'last_return_date', '2025-05-30 23:59:59'::timestamp
  UNION ALL SELECT 'planned_return_date', '2025-05-28 00:00:00'::timestamp
  UNION ALL SELECT 'return_time', '2025-06-29 20:52:47'::timestamp
),
db_values AS (
  SELECT 'shipment_date'::text as 字段名, shipment_date::timestamp as 数据库实际值
  FROM process_sea_freight WHERE container_number = 'FANU3376528'

  UNION ALL

  SELECT 'eta', eta::timestamp
  FROM process_sea_freight WHERE container_number = 'FANU3376528'

  UNION ALL

  SELECT 'mother_shipment_date', mother_shipment_date::timestamp
  FROM process_sea_freight WHERE container_number = 'FANU3376528'

  UNION ALL

  SELECT 'eta_dest_port', eta_dest_port::timestamp
  FROM process_port_operations
  WHERE container_number = 'FANU3376528' AND port_type = 'destination'

  UNION ALL

  SELECT 'ata_dest_port', ata_dest_port::timestamp
  FROM process_port_operations
  WHERE container_number = 'FANU3376528' AND port_type = 'destination'

  UNION ALL

  SELECT 'dest_port_unload_date', dest_port_unload_date::timestamp
  FROM process_port_operations
  WHERE container_number = 'FANU3376528' AND port_type = 'destination'

  UNION ALL

  SELECT 'planned_customs_date', planned_customs_date::timestamp
  FROM process_port_operations
  WHERE container_number = 'FANU3376528' AND port_type = 'destination'

  UNION ALL

  SELECT 'isf_declaration_date', isf_declaration_date::timestamp
  FROM process_port_operations
  WHERE container_number = 'FANU3376528' AND port_type = 'destination'

  UNION ALL

  SELECT 'warehouse_arrival_date', warehouse_arrival_date::timestamp
  FROM process_warehouse_operations WHERE container_number = 'FANU3376528'

  UNION ALL

  SELECT 'planned_unload_date', planned_unload_date::timestamp
  FROM process_warehouse_operations WHERE container_number = 'FANU3376528'

  UNION ALL

  SELECT 'wms_confirm_date', wms_confirm_date::timestamp
  FROM process_warehouse_operations WHERE container_number = 'FANU3376528'

  UNION ALL

  SELECT 'last_return_date', last_return_date::timestamp
  FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528'

  UNION ALL

  SELECT 'planned_return_date', planned_return_date::timestamp
  FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528'

  UNION ALL

  SELECT 'return_time', return_time::timestamp
  FROM process_empty_returns WHERE "containerNumber" = 'FANU3376528'
)
SELECT
  e.字段名,
  e.Excel期望值,
  d.数据库实际值,
  CASE
    WHEN e.Excel期望值 = d.数据库实际值 THEN '✅ 准确'
    WHEN d.数据库实际值 IS NULL THEN '⚠️  数据为空'
    ELSE '❌ 偏差'
  END as 状态
FROM excel_values e
LEFT JOIN db_values d ON e.字段名 = d.字段名
ORDER BY e.字段名;
