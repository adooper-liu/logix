-- 验证重新导入后的日期准确性 - FANU3376528
-- 修复日期: 2026-02-26

-- 1. 海运表日期验证
SELECT '海运表' as 表名, 
       'shipment_date' as 字段名,
       shipment_date as 数据库值,
       '2025-03-30 00:00:00' as Excel值,
       CASE WHEN shipment_date = '2025-03-30 00:00:00' THEN '✅ 准确' ELSE '❌ 偏差' END as 状态
FROM process_sea_freight
WHERE container_number = 'FANU3376528'

UNION ALL

SELECT '海运表', 'eta', eta, '2025-05-09 00:00:00',
       CASE WHEN eta = '2025-05-09 00:00:00' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_sea_freight
WHERE container_number = 'FANU3376528'

UNION ALL

SELECT '海运表', 'mother_shipment_date', mother_shipment_date, '2025-04-07 00:00:00',
       CASE WHEN mother_shipment_date = '2025-04-07 00:00:00' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_sea_freight
WHERE container_number = 'FANU3376528'

-- 2. 港口操作表日期验证
UNION ALL

SELECT '港口操作表', 'eta_dest_port', eta_dest_port, '2025-05-09 00:00:00',
       CASE WHEN eta_dest_port = '2025-05-09 00:00:00' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_port_operations
WHERE container_number = 'FANU3376528' AND port_type = 'destination'

UNION ALL

SELECT '港口操作表', 'ata_dest_port', ata_dest_port, '2025-05-17 00:18:00',
       CASE WHEN ata_dest_port = '2025-05-17 00:18:00' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_port_operations
WHERE container_number = 'FANU3376528' AND port_type = 'destination'

UNION ALL

SELECT '港口操作表', 'dest_port_unload_date', dest_port_unload_date, '2025-05-17 00:18:00',
       CASE WHEN dest_port_unload_date = '2025-05-17 00:18:00' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_port_operations
WHERE container_number = 'FANU3376528' AND port_type = 'destination'

UNION ALL

SELECT '港口操作表', 'planned_customs_date', planned_customs_date, '2025-05-06 00:00:00',
       CASE WHEN planned_customs_date = '2025-05-06 00:00:00' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_port_operations
WHERE container_number = 'FANU3376528' AND port_type = 'destination'

UNION ALL

SELECT '港口操作表', 'isf_declaration_date', isf_declaration_date, '2025-03-26 21:00:23',
       CASE WHEN isf_declaration_date = '2025-03-26 21:00:23' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_port_operations
WHERE container_number = 'FANU3376528' AND port_type = 'destination'

-- 3. 仓库操作表日期验证
UNION ALL

SELECT '仓库操作表', 'warehouse_arrival_date', warehouse_arrival_date, '2025-05-31 11:38:58',
       CASE WHEN warehouse_arrival_date = '2025-05-31 11:38:58' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_warehouse_operations
WHERE container_number = 'FANU3376528'

UNION ALL

SELECT '仓库操作表', 'planned_unload_date', planned_unload_date, '2025-05-28 00:00:00',
       CASE WHEN planned_unload_date = '2025-05-28 00:00:00' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_warehouse_operations
WHERE container_number = 'FANU3376528'

UNION ALL

SELECT '仓库操作表', 'wms_confirm_date', wms_confirm_date, '2025-05-28 05:00:47',
       CASE WHEN wms_confirm_date = '2025-05-28 05:00:47' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_warehouse_operations
WHERE container_number = 'FANU3376528'

-- 4. 还空箱表日期验证
UNION ALL

SELECT '还空箱表', 'last_return_date', last_return_date, '2025-05-30 00:00:00',
       CASE WHEN last_return_date = '2025-05-30 00:00:00' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_empty_returns
WHERE "containerNumber" = 'FANU3376528'

UNION ALL

SELECT '还空箱表', 'planned_return_date', planned_return_date, '2025-05-28 00:00:00',
       CASE WHEN planned_return_date = '2025-05-28 00:00:00' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_empty_returns
WHERE "containerNumber" = 'FANU3376528'

UNION ALL

SELECT '还空箱表', 'return_time', return_time, '2025-06-29 20:52:47',
       CASE WHEN return_time = '2025-06-29 20:52:47' THEN '✅ 准确' ELSE '❌ 偏差' END
FROM process_empty_returns
WHERE "containerNumber" = 'FANU3376528'

ORDER BY 表名, 字段名;
