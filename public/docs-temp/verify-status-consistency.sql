-- =====================================================
-- 状态一致性验证SQL
-- 用途: 验证状态机更新数据库状态是否正确
-- 生成时间: 2026-03-06
-- =====================================================

-- 1. 检查表名是否存在
SELECT '1. 检查表名' as description;
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'process_empty_returns' THEN '✅ 正确表名'
    WHEN table_name = 'process_empty_return' THEN '❌ 错误表名(无s)'
    ELSE '其他表'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'process_empty_return%';

-- 2. 检查正确的表数据量
SELECT '2. 检查正确的表数据量' as description;
SELECT 
  COUNT(*) as total_records,
  COUNT(CASE WHEN return_time IS NOT NULL THEN 1 END) as has_return_time
FROM process_empty_returns;

-- 3. 检查错误的表数据量 (应该为0)
SELECT '3. 检查错误的表数据量' as description;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'process_empty_return') THEN
    EXECUTE 'SELECT ''❌ 错误的表存在'' as status, COUNT(*) as count FROM process_empty_return';
  ELSE
    RAISE NOTICE '✅ 错误的表不存在';
  END IF;
END $$;

-- 4. 检查有还箱记录的货柜状态分布
SELECT '4. 有还箱记录的货柜状态分布' as description;
SELECT
  c.logistics_status as current_status,
  COUNT(*) as count,
  CASE 
    WHEN c.logistics_status = 'returned_empty' THEN '✅ 状态正确'
    ELSE '❌ 状态错误(应该是returned_empty)'
  END as status_check
FROM biz_containers c
INNER JOIN process_empty_returns er ON c.container_number = er.container_number
WHERE er.return_time IS NOT NULL
GROUP BY c.logistics_status
ORDER BY c.logistics_status;

-- 5. 检查状态不一致的货柜明细
SELECT '5. 状态不一致的货柜明细' as description;
SELECT
  c.container_number,
  c.logistics_status as current_status,
  er.return_time,
  CASE 
    WHEN c.logistics_status = 'returned_empty' THEN '✅ 正确'
    ELSE '❌ 应该是returned_empty'
  END as status_check
FROM biz_containers c
INNER JOIN process_empty_returns er ON c.container_number = er.container_number
WHERE er.return_time IS NOT NULL
  AND c.logistics_status != 'returned_empty'
ORDER BY c.container_number;

-- 6. 检查状态机覆盖度
SELECT '6. 状态机覆盖度' as description;
WITH status_coverage AS (
  SELECT 
    c.container_number,
    c.logistics_status,
    CASE 
      WHEN er.return_time IS NOT NULL THEN 'returned_empty'
      WHEN wo.wms_status = 'WMS已完成' OR wo.ebs_status = '已入库' OR wo.wms_confirm_date IS NOT NULL THEN 'unloaded'
      WHEN tt.pickup_date IS NOT NULL THEN 'picked_up'
      WHEN EXISTS (
        SELECT 1 FROM process_port_operations po 
        WHERE po.container_number = c.container_number 
        AND po.port_type = 'destination' 
        AND po.ata_dest_port IS NOT NULL
      ) THEN 'at_port'
      WHEN sf.shipment_date IS NOT NULL THEN 'in_transit'
      ELSE 'not_shipped'
    END as expected_status
  FROM biz_containers c
  LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
  LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
  LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
  LEFT JOIN process_empty_returns er ON c.container_number = er.container_number
)
SELECT
  CASE 
    WHEN current_status = expected_status THEN '✅ 一致'
    ELSE '❌ 不一致'
  END as status,
  current_status,
  expected_status,
  COUNT(*) as count
FROM status_coverage
GROUP BY current_status, expected_status
ORDER BY status, current_status;

-- 7. 删除错误表 (如果存在)
SELECT '7. 删除错误表(如果存在)' as description;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'process_empty_return') THEN
    EXECUTE 'DROP TABLE IF EXISTS process_empty_return CASCADE';
    RAISE NOTICE '✅ 已删除错误的表 process_empty_return';
  ELSE
    RAISE NOTICE '✅ 错误的表不存在，无需删除';
  END IF;
END $$;

-- 8. 验证结果汇总
SELECT '8. 验证结果汇总' as description;
SELECT 
  '有还箱记录货柜总数' as metric,
  COUNT(*) as value
FROM biz_containers c
INNER JOIN process_empty_returns er ON c.container_number = er.container_number
WHERE er.return_time IS NOT NULL

UNION ALL

SELECT 
  '状态为returned_empty的货柜数',
  COUNT(*)
FROM biz_containers
WHERE logistics_status = 'returned_empty'

UNION ALL

SELECT 
  '状态不一致的货柜数',
  COUNT(*)
FROM biz_containers c
INNER JOIN process_empty_returns er ON c.container_number = er.container_number
WHERE er.return_time IS NOT NULL
  AND c.logistics_status != 'returned_empty';
