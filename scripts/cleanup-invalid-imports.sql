-- ============================================================================
-- LogiX 导入数据清理脚本
-- Cleanup Script for Invalid Imported Data
--
-- 用途: 删除因字段映射缺失导致的错误导入数据
-- 使用场景: 修复字段映射后,重新导入Excel前执行
--
-- 使用方法:
--   docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -f cleanup-invalid-imports.sql
--
-- 注意: 本脚本会删除数据,请先备份数据库
-- ============================================================================

-- ============================================================================
-- 检查模式: 查找可能的错误导入记录 (不执行删除)
-- ============================================================================

-- 1. 查找拖卡运输表中的空记录 (只有container_number,没有实际业务数据)
SELECT '检查: 拖卡运输表空记录' as 检查项;
SELECT
    container_number,
    CASE
        WHEN (carrier_company IS NULL OR carrier_company = '')
         AND (pickup_date IS NULL)
         AND (delivery_date IS NULL)
        THEN '可能的错误记录'
        ELSE '正常记录'
    END as 记录状态,
    carrier_company,
    pickup_date,
    delivery_date
FROM process_trucking_transport
WHERE container_number IS NOT NULL
ORDER BY
    CASE
        WHEN (carrier_company IS NULL OR carrier_company = '') AND pickup_date IS NULL AND delivery_date IS NULL
        THEN 0  -- 空记录排前面
        ELSE 1
    END,
    container_number;

-- 2. 查找仓库操作表中的空记录
SELECT '检查: 仓库操作表空记录' as 检查项;
SELECT
    container_number,
    CASE
        WHEN (actual_warehouse IS NULL OR actual_warehouse = '')
         AND (warehouse_arrival_date IS NULL)
         AND (wms_status IS NULL OR wms_status = '')
         AND (ebs_status IS NULL OR ebs_status = '')
        THEN '可能的错误记录'
        ELSE '正常记录'
    END as 记录状态,
    actual_warehouse,
    warehouse_arrival_date,
    wms_status,
    ebs_status
FROM process_warehouse_operations
WHERE container_number IS NOT NULL
ORDER BY
    CASE
        WHEN (actual_warehouse IS NULL OR actual_warehouse = '') AND warehouse_arrival_date IS NULL AND (wms_status IS NULL OR wms_status = '')
        THEN 0  -- 空记录排前面
        ELSE 1
    END,
    container_number;

-- ============================================================================
-- 执行模式: 删除错误导入记录 (取消注释以执行)
-- ============================================================================

-- ⚠️ 警告: 以下操作将删除数据,请确保已修复字段映射!
-- 取消注释以下SQL以执行删除操作:

/*
-- 删除拖卡运输表中的空记录
DELETE FROM process_trucking_transport
WHERE container_number IS NOT NULL
  AND (carrier_company IS NULL OR carrier_company = '')
  AND (pickup_date IS NULL)
  AND (delivery_date IS NULL);

-- 显示删除结果
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已删除 % 条拖卡运输空记录', deleted_count;
END $$;

-- 删除仓库操作表中的空记录
DELETE FROM process_warehouse_operations
WHERE container_number IS NOT NULL
  AND (actual_warehouse IS NULL OR actual_warehouse = '')
  AND (warehouse_arrival_date IS NULL)
  AND (wms_status IS NULL OR wms_status = '')
  AND (ebs_status IS NULL OR ebs_status = '');

-- 显示删除结果
DO $$
DECLARE
    deleted_count INTEGER;
BEGIN
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE '已删除 % 条仓库操作空记录', deleted_count;
END $$;
*/

-- ============================================================================
-- 验证模式: 检查删除结果 (执行删除后运行)
-- ============================================================================

-- 统计剩余的空记录数量
SELECT '验证: 剩余空记录统计' as 检查项;
SELECT
    '拖卡运输' as 表名,
    COUNT(*) as 空记录数量
FROM process_trucking_transport
WHERE (carrier_company IS NULL OR carrier_company = '')
  AND pickup_date IS NULL
  AND delivery_date IS NULL

UNION ALL

SELECT
    '仓库操作' as 表名,
    COUNT(*) as 空记录数量
FROM process_warehouse_operations
WHERE (actual_warehouse IS NULL OR actual_warehouse = '')
  AND warehouse_arrival_date IS NULL
  AND (wms_status IS NULL OR wms_status = '');
