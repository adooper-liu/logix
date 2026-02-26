-- 修复拖卡运输和仓库操作导入数据
-- Fix for trucking transport and warehouse operations import
-- 针对 FANU3376528 / 24DSC4914 的数据修复

-- ============================================================================
-- 1. 删除空的/不完整的拖卡运输记录
-- ============================================================================
DELETE FROM process_trucking_transport WHERE container_number = 'FANU3376528';

-- ============================================================================
-- 2. 插入完整的拖卡运输数据
-- ============================================================================
INSERT INTO process_trucking_transport (
    container_number,
    trucking_type,
    is_pre_pickup,
    carrier_company,
    last_pickup_date,
    planned_pickup_date,
    pickup_date,
    last_delivery_date,
    planned_delivery_date,
    delivery_date,
    unload_mode_plan,
    created_at,
    updated_at
) VALUES (
    'FANU3376528',
    'POST_SHIPMENT',
    false,
    'TRANS PRO LOGISTIC INC',
    '2025-05-21',
    '2025-05-21',
    '2025-05-21 02:04:30',
    '2025-05-21',
    '2025-05-21',
    '2025-05-21 02:04:30',
    'Drop off',
    NOW(),
    NOW()
);

-- ============================================================================
-- 3. 删除空的/不完整的仓库操作记录
-- ============================================================================
DELETE FROM process_warehouse_operations WHERE container_number = 'FANU3376528';

-- ============================================================================
-- 4. 插入完整的仓库操作数据
-- ============================================================================
INSERT INTO process_warehouse_operations (
    container_number,
    warehouse_group,
    planned_warehouse,
    actual_warehouse,
    planned_unload_date,
    last_unload_date,
    warehouse_arrival_date,
    unload_mode_actual,
    wms_status,
    ebs_status,
    wms_confirm_date,
    is_unboxing,
    created_at,
    updated_at
) VALUES (
    'FANU3376528',
    'Toronto Warehouse Group',
    'Oshawa',
    'Oshawa',
    '2025-05-28',
    '2025-05-22',
    '2025-05-31 11:38:58',
    NULL,
    'WMS已完成',
    '已入库',
    '2025-05-28 05:00:47',
    false,
    NOW(),
    NOW()
);

-- ============================================================================
-- 5. 验证数据修复结果
-- ============================================================================

SELECT '=== 拖卡运输信息 ===' as 检查项;
SELECT
    container_number as 集装箱号,
    is_pre_pickup as 是否预提,
    carrier_company as 目的港卡车,
    last_pickup_date as 最晚提柜日期,
    planned_pickup_date as 计划提柜日期,
    pickup_date as 提柜日期,
    last_delivery_date as 最晚送仓日期,
    planned_delivery_date as 计划送仓日期,
    delivery_date as 送仓日期,
    unload_mode_plan as 卸柜方式计划
FROM process_trucking_transport
WHERE container_number = 'FANU3376528';

SELECT '=== 仓库操作信息 ===' as 检查项;
SELECT
    container_number as 集装箱号,
    warehouse_group as 入库仓库组,
    planned_warehouse as 计划仓库,
    actual_warehouse as 实际仓库,
    warehouse_arrival_date as 入库日期,
    planned_unload_date as 计划卸柜日期,
    last_unload_date as 最晚卸柜日期,
    wms_status as WMS入库状态,
    ebs_status as EBS入库状态,
    wms_confirm_date as WMS_Confirm_Date
FROM process_warehouse_operations
WHERE container_number = 'FANU3376528';
