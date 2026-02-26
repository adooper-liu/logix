-- ============================================================================
-- LogiX 数据库数据一致性验证脚本
-- ============================================================================
-- 用途：验证Excel导入数据与原始数据的一致性
-- 使用方法：
--   方法1：使用PowerShell脚本（推荐）
--     pwsh -File verify-data.ps1
--
--   方法2：修改下方参数后执行
--     docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -f /dev/stdin < verify_excel_data_consistency.sql
--
--   方法3：在psql中交互执行
--     docker exec -it logix-timescaledb-prod psql -U logix_user -d logix_db
--     \i verify_excel_data_consistency.sql
-- ============================================================================

-- 设置参数（修改此处值）
-- 备货单号: 24DSC4914
-- 货柜号: FANU3376528
-- 提单号: HLCUNG12501WPWJ9

-- 在实际执行时，这些参数会被PowerShell脚本自动替换
-- 或手动替换下方SQL中的 '24DSC4914', 'FANU3376528', 'HLCUNG12501WPWJ9'

-- ============================================================================
-- 1. 备货单信息验证
-- ============================================================================
SELECT '=== 备货单信息 ===' as 检查项;

SELECT 
    order_number as 备货单号,
    main_order_number as 主备货单号,
    sell_to_country as 销往国家,
    customer_name as 客户名称,
    order_status as 备货单状态,
    CASE inspection_required WHEN 't' THEN '是' ELSE '否' END as 是否查验,
    price_terms as 价格条款,
    total_boxes as 箱数合计,
    total_cbm as 体积合计_m3,
    total_gross_weight as 毛重合计_KG,
    shipment_total_value as 出运总价,
    fob_amount as 议付金额_FOB,
    cif_amount as 议付金额_CIF,
    negotiation_amount as 议付金额,
    procurement_trade_mode as 采购贸易模式,
    CASE pallet_required WHEN 't' THEN '是' ELSE '否' END as 是否装配件,
    special_cargo_volume as 特殊货物体积,
    actual_ship_date as 出运日期
FROM biz_replenishment_orders 
WHERE order_number = '24DSC4914';

-- ============================================================================
-- 2. 货柜信息验证
-- ============================================================================
SELECT '=== 货柜信息 ===' as 检查项;

SELECT 
    c.container_number as 集装箱号,
    c.order_number as 备货单号,
    c.container_type_code as 柜型,
    c.logistics_status as 物流状态,
    CASE c.inspection_required WHEN 't' THEN '是' ELSE '否' END as 是否查验,
    CASE c.is_unboxing WHEN 't' THEN '是' ELSE '否' END as 是否开箱,
    c.gross_weight as 毛重,
    c.net_weight as 净重,
    c.cbm as 体积_m3,
    c.packages as 包数,
    c.seal_number as 封号
FROM biz_containers c
WHERE c.container_number = 'FANU3376528';

-- ============================================================================
-- 3. 海运信息验证
-- ============================================================================
SELECT '=== 海运信息 ===' as 检查项;

SELECT 
    sf.container_number as 集装箱号,
    sf.bill_of_lading_number as 提单号,
    sf.booking_number as 订舱号,
    sf.shipping_company_id as 船公司编码,
    sf.port_of_loading as 起运港编码,
    sf.port_of_discharge as 目的港编码,
    sf.freight_forwarder_id as 货代公司编码,
    sf.vessel_name as 船名,
    sf.voyage_number as 航次,
    sf.mother_vessel_name as 母船船名,
    sf.mother_voyage_number as 母船航次,
    sf.eta as 预计到港时间_ETA,
    sf.etd as 预计离港时间_ETD,
    sf.ata as 实际到港时间_ATA,
    sf.atd as 实际离港时间_ATD,
    sf.transit_port_code as 途经港编码,
    sf.transport_mode as 运输方式,
    sf.shipment_date as 出运日期,
    sf.mother_shipment_date as 母船出运日期,
    sf.document_release_date as 放单日期,
    sf.port_entry_date as 进港日期,
    sf.rail_yard_entry_date as 进火车堆场日期,
    sf.truck_yard_entry_date as 进卡车堆场日期,
    sf.freight_currency as 海运费币种,
    sf.standard_freight_amount as 标准海运费金额,
    sf.mbl_scac as MBL_SCAC,
    sf.mbl_number as MBL_Number,
    sf.hbl_scac as HBL_SCAC,
    sf.hbl_number as HBL_Number,
    sf.ams_number as AMS_Number
FROM process_sea_freight sf
WHERE sf.container_number = 'FANU3376528';

-- ============================================================================
-- 4. 港口操作信息验证
-- ============================================================================
SELECT '=== 港口操作信息 ===' as 检查项;

SELECT 
    po.container_number as 集装箱号,
    po.port_type as 港口类型,
    po.port_code as 港口编码,
    po.port_name as 港口名称,
    po.port_sequence as 港口序列,
    po.eta_dest_port as 预计到港日期,
    po.eta_correction as ETA修正,
    po.ata_dest_port as 实际到港日期,
    po.etd_transit as 途经港预计离港,
    po.atd_transit as 途经港实际离港,
    po.transit_arrival_date as 途经港到达日期,
    po.dest_port_unload_date as 目的港卸船日期,
    po.gate_in_time as 进闸时间,
    po.gate_out_time as 出闸时间,
    po.discharged_time as 卸船时间,
    po.available_time as 可提货时间,
    po.customs_status as 清关状态,
    po.isf_status as ISF申报状态,
    po.last_free_date as 最后免费日期,
    po.gate_in_terminal as 进闸码头,
    po.gate_out_terminal as 出闸码头,
    po.berth_position as 泊位,
    po.planned_customs_date as 计划清关日期,
    po.actual_customs_date as 实际清关日期,
    po.customs_broker_code as 清关公司编码,
    po.document_status as 清关单据状态,
    po.all_generated_date as 全部生成日期,
    po.customs_remarks as 异常原因,
    po.isf_declaration_date as ISF申报日期,
    po.document_transfer_date as 传递日期,
    po.free_storage_days as 免堆期_天,
    po.free_detention_days as 场内免箱期_天,
    po.free_off_terminal_days as 场外免箱期_天
FROM process_port_operations po
WHERE po.container_number = 'FANU3376528'
ORDER BY po.port_type, po.port_sequence;

-- ============================================================================
-- 5. 拖卡运输信息验证
-- ============================================================================
SELECT '=== 拖卡运输信息 ===' as 检查项;

SELECT 
    tt.container_number as 集装箱号,
    tt.trucking_type as 拖卡类型,
    CASE tt.is_pre_pickup WHEN 't' THEN '是' ELSE '否' END as 是否预提,
    tt.trucking_company_id as 拖车公司编码,
    tt.carrier_company as 目的港卡车,
    tt.pickup_notification as 提柜通知,
    tt.last_pickup_date as 最晚提柜日期,
    tt.planned_pickup_date as 计划提柜日期,
    tt.pickup_date as 提柜日期,
    tt.last_delivery_date as 最晚送仓日期,
    tt.planned_delivery_date as 计划送仓日期,
    tt.delivery_date as 送仓日期,
    tt.unload_mode_plan as 卸柜方式_计划,
    '' as 卸柜方式_实际,
    '' as 最晚卸柜日期,
    '' as 计划卸柜日期,
    tt.driver_name as 司机姓名,
    tt.driver_phone as 司机电话,
    tt.truck_plate as 车牌号,
    tt.pickup_location as 提柜地点,
    tt.delivery_location as 送仓地点,
    tt.distance_km as 距离_km,
    tt.cost as 费用
FROM process_trucking_transport tt
WHERE tt.container_number = 'FANU3376528';

-- ============================================================================
-- 6. 仓库操作信息验证
-- ============================================================================
SELECT '=== 仓库操作信息 ===' as 检查项;

SELECT 
    wo.container_number as 集装箱号,
    wo.operation_type as 操作类型,
    wo.warehouse_id as 仓库ID,
    wo.planned_warehouse as 计划仓库,
    wo.actual_warehouse as 实际仓库,
    wo.warehouse_group as 入库仓库组,
    wo.warehouse_arrival_date as 仓库到达日期,
    wo.unload_mode_actual as 卸柜方式_实际,
    wo.last_unload_date as 最晚卸柜日期,
    wo.planned_unload_date as 计划卸柜日期,
    wo.unload_date as 卸柜日期,
    wo.wms_status as WMS入库状态,
    wo.ebs_status as EBS入库状态,
    wo.wms_confirm_date as WMS_Confirm_Date,
    wo.unload_gate as 卸柜门,
    wo.unload_company as 卸柜公司,
    wo.notification_pickup_date as 通知取空日期,
    wo.pickup_time as 取空时间,
    wo.gate_in_time as 进闸时间,
    wo.gate_out_time as 出闸时间,
    wo.storage_start_date as 存储开始日期,
    wo.storage_end_date as 存储结束日期,
    CASE wo.is_unboxing WHEN 't' THEN '是' ELSE '否' END as 是否开箱,
    wo.unboxing_time as 开箱时间,
    wo.cargo_received_by as 货物接收人,
    wo.cargo_delivered_to as 货物交付给,
    wo.warehouse_remarks as 备注
FROM process_warehouse_operations wo
WHERE wo.container_number = 'FANU3376528';

-- ============================================================================
-- 7. 还空箱信息验证
-- ============================================================================
SELECT '=== 还空箱信息 ===' as 检查项;

SELECT
    er."containerNumber" as 集装箱号,
    er."lastReturnDate" as 最晚还箱日期,
    er."plannedReturnDate" as 计划还箱日期,
    er."returnTime" as 还箱日期,
    er."returnTerminalCode" as 还箱码头编码,
    er."returnTerminalName" as 还箱码头名称,
    er."containerCondition" as 集装箱状况,
    er."notificationReturnDate" as 通知取空日期,
    er."notificationReturnTime" as 通知取空时间,
    er."returnRemarks" as 备注
FROM process_empty_returns er
WHERE er."containerNumber" = 'FANU3376528';

-- ============================================================================
-- 8. 字典数据验证（港口名称映射）
-- ============================================================================
SELECT '=== 港口字典映射 ===' as 检查项;

SELECT 
    sf.port_of_loading as 起运港编码,
    p1.port_name as 起运港名称,
    sf.port_of_discharge as 目的港编码,
    p2.port_name as 目的港名称,
    sf.transit_port_code as 途经港编码,
    p3.port_name as 途经港名称
FROM process_sea_freight sf
LEFT JOIN dict_ports p1 ON sf.port_of_loading = p1.port_code
LEFT JOIN dict_ports p2 ON sf.port_of_discharge = p2.port_code
LEFT JOIN dict_ports p3 ON sf.transit_port_code = p3.port_code
WHERE sf.container_number = 'FANU3376528';

-- ============================================================================
-- 9. 关联关系验证
-- ============================================================================
SELECT '=== 关联关系验证 ===' as 检查项;

-- 检查货柜是否属于指定的备货单
SELECT
    '货柜-备货单关联' as 验证项,
    CASE
        WHEN (SELECT order_number FROM biz_containers WHERE container_number = 'FANU3376528') = '24DSC4914'
        THEN '✅ 正确关联'
        ELSE '❌ 关联错误'
    END as 状态;

-- 检查提单号是否一致
SELECT
    '货柜-提单号关联' as 验证项,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM process_sea_freight
            WHERE container_number = 'FANU3376528'
            AND bill_of_lading_number = 'HLCUNG12501WPWJ9'
        ) THEN '✅ 正确关联'
        ELSE '❌ 未找到关联'
    END as 状态;

-- 检查物流状态一致性
SELECT
    '物流状态一致性' as 验证项,
    (SELECT logistics_status FROM biz_containers WHERE container_number = 'FANU3376528') as 货柜物流状态,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM process_empty_returns
            WHERE "containerNumber" = 'FANU3376528'
        ) THEN '✅ 有还箱记录'
        ELSE '❌ 无还箱记录（但状态为已还箱）'
    END as 还箱记录状态;

-- ============================================================================
-- 10. 数据完整性汇总
-- ============================================================================
SELECT '=== 数据完整性汇总 ===' as 检查项;

WITH 
-- 备货单完整性
replenishment_check AS (
    SELECT 
        COUNT(*) as total_fields,
        COUNT(CASE WHEN 
            order_number IS NOT NULL 
            AND main_order_number IS NOT NULL
            AND sell_to_country IS NOT NULL
            AND customer_name IS NOT NULL
            AND order_status IS NOT NULL
            AND price_terms IS NOT NULL
            AND total_boxes IS NOT NULL
            AND total_cbm IS NOT NULL
            AND total_gross_weight IS NOT NULL
            AND shipment_total_value IS NOT NULL
            AND procurement_trade_mode IS NOT NULL
            THEN 1 END) as filled_fields
    FROM biz_replenishment_orders
    WHERE order_number = '24DSC4914'
),

-- 货柜完整性
container_check AS (
    SELECT
        COUNT(*) as total_fields,
        COUNT(CASE WHEN
            container_number IS NOT NULL
            AND order_number IS NOT NULL
            AND logistics_status IS NOT NULL
            THEN 1 END) as filled_fields
    FROM biz_containers
    WHERE container_number = 'FANU3376528'
),

-- 海运完整性
sea_freight_check AS (
    SELECT
        COUNT(*) as total_fields,
        COUNT(CASE WHEN
            container_number IS NOT NULL
            AND bill_of_lading_number IS NOT NULL
            AND shipping_company_id IS NOT NULL
            AND port_of_loading IS NOT NULL
            AND port_of_discharge IS NOT NULL
            AND vessel_name IS NOT NULL
            AND voyage_number IS NOT NULL
            THEN 1 END) as filled_fields
    FROM process_sea_freight
    WHERE container_number = 'FANU3376528'
),

-- 港口操作完整性
port_check AS (
    SELECT
        COUNT(*) as total_fields,
        COUNT(CASE WHEN
            container_number IS NOT NULL
            AND port_type IS NOT NULL
            AND port_code IS NOT NULL
            AND customs_status IS NOT NULL
            THEN 1 END) as filled_fields
    FROM process_port_operations
    WHERE container_number = 'FANU3376528'
),

-- 拖卡运输完整性
trucking_check AS (
    SELECT
        COUNT(*) as total_fields,
        COUNT(CASE WHEN
            container_number IS NOT NULL
            AND carrier_company IS NOT NULL
            AND delivery_location IS NOT NULL
            THEN 1 END) as filled_fields
    FROM process_trucking_transport
    WHERE container_number = 'FANU3376528'
),

-- 仓库操作完整性
warehouse_check AS (
    SELECT
        COUNT(*) as total_fields,
        COUNT(CASE WHEN
            container_number IS NOT NULL
            AND actual_warehouse IS NOT NULL
            AND warehouse_group IS NOT NULL
            THEN 1 END) as filled_fields
    FROM process_warehouse_operations
    WHERE container_number = 'FANU3376528'
),

-- 还空箱完整性
empty_return_check AS (
    SELECT
        COUNT(*) as total_fields,
        COUNT(CASE WHEN
            "containerNumber" IS NOT NULL
            THEN 1 END) as filled_fields
    FROM process_empty_returns
    WHERE "containerNumber" = 'FANU3376528'
)

SELECT 
    '备货单' as 表名,
    ROUND((filled_fields::numeric / total_fields * 100), 1) as 完整率_percent,
    filled_fields as 已填充字段,
    total_fields as 总字段数
FROM replenishment_check

UNION ALL

SELECT 
    '货柜' as 表名,
    ROUND((filled_fields::numeric / total_fields * 100), 1) as 完整率_percent,
    filled_fields as 已填充字段,
    total_fields as 总字段数
FROM container_check

UNION ALL

SELECT 
    '海运信息' as 表名,
    ROUND((filled_fields::numeric / total_fields * 100), 1) as 完整率_percent,
    filled_fields as 已填充字段,
    total_fields as 总字段数
FROM sea_freight_check

UNION ALL

SELECT 
    '港口操作' as 表名,
    ROUND((filled_fields::numeric / total_fields * 100), 1) as 完整率_percent,
    filled_fields as 已填充字段,
    total_fields as 总字段数
FROM port_check

UNION ALL

SELECT 
    '拖卡运输' as 表名,
    ROUND((filled_fields::numeric / total_fields * 100), 1) as 完整率_percent,
    filled_fields as 已填充字段,
    total_fields as 总字段数
FROM trucking_check

UNION ALL

SELECT 
    '仓库操作' as 表名,
    ROUND((filled_fields::numeric / total_fields * 100), 1) as 完整率_percent,
    filled_fields as 已填充字段,
    total_fields as 总字段数
FROM warehouse_check

UNION ALL

SELECT 
    '还空箱' as 表名,
    CASE WHEN total_fields = 0 THEN 0 ELSE ROUND((filled_fields::numeric / total_fields * 100), 1) END as 完整率_percent,
    filled_fields as 已填充字段,
    total_fields as 总字段数
FROM empty_return_check;

-- ============================================================================
-- 使用说明
-- ============================================================================
-- 1. 修改脚本开头的 \set 参数值，设置要验证的备货单号、货柜号和提单号
-- 2. 在 psql 中执行整个脚本
-- 3. 对比查询结果与Excel原始数据，验证一致性
-- 4. 重点关注：
--    - 关键时间节点（ETA/ATA、提柜/送仓/卸柜/还箱日期）
--    - 物流状态流转
--    - 途经港信息
--    - 还空箱记录
-- 5. 数据完整性汇总表格中，完整率低于50%的表需要重点检查
-- ============================================================================
