-- 验证 Excel 导入的数据
-- 备货单信息
SELECT
    r.order_number,
    r.main_order_number,
    r.sell_to_country,
    r.customer_name,
    r.order_status,
    r.inspection_required as 是否查验,
    r.requires_pallet as 是否装配件,
    r.actual_ship_date as 出运日期,
    r.price_term,
    r.total_boxes,
    r.total_cbm,
    r.total_gross_weight,
    r.total_price,
    r.fob_amount,
    r.cif_amount,
    r.bill_amount,
    r.procurement_trade_mode
FROM biz_replenishment_orders r
WHERE r.order_number = '24DSA1954';

-- 货柜信息
SELECT
    c.container_number,
    c.order_number,
    c.logistics_status,
    c.inspection_required,
    c.is_unboxing
FROM biz_containers c
WHERE c.order_number = '24DSA1954';

-- 海运信息
SELECT
    sf.bill_of_lading_number,
    sf.shipping_company,
    sf.port_of_loading,
    sf.port_of_discharge,
    sf.shipping_date,
    sf.vessel_name,
    sf.voyage_number,
    sf.freight_currency,
    sf.standard_freight_amount
FROM biz_sea_freights sf
WHERE sf.container_number = 'MRKU4896861';

-- 港口操作信息
SELECT
    po.port_type,
    po.eta_dest_port,
    po.eta_correction,
    po.ata_dest_port,
    po.unloading_date,
    po.customs_status,
    po.customs_broker,
    po.last_free_date,
    po.terminal
FROM biz_port_operations po
WHERE po.container_number = 'MRKU4896861'
AND po.port_type = 'destination';

-- 拖卡运输信息
SELECT
    tt.is_pre_pickup as 是否预提,
    tt.transport_mode as 运输方式,
    tt.carrier_company as 目的港卡车,
    tt.planned_warehouse as 仓库计划,
    tt.actual_warehouse as 仓库实际,
    tt.last_pickup_date as 最晚提柜日期,
    tt.planned_pickup_date as 计划提柜日期,
    tt.pickup_date as 提柜日期,
    tt.last_delivery_date as 最晚送仓日期,
    tt.planned_delivery_date as 计划送仓日期,
    tt.delivery_date as 送仓日期,
    tt.unload_mode_plan as 卸柜方式计划,
    tt.unload_mode_actual as 卸柜方式实际,
    tt.last_unload_date as 最晚卸柜日期,
    tt.planned_unload_date as 计划卸柜日期
FROM biz_trucking_transports tt
WHERE tt.container_number = 'MRKU4896861';

-- 仓库操作信息
SELECT
    wo.warehouse_group as 入库仓库组,
    wo.planned_warehouse,
    wo.actual_warehouse,
    wo.last_unload_date as 最晚卸柜日期,
    wo.planned_unload_date as 计划卸柜日期,
    wo.unload_date as 卸柜日期,
    wo.unload_gate as 卸柜门,
    wo.unload_company as 卸柜公司,
    wo.wms_status,
    wo.ebs_status,
    wo.wms_confirm_date
FROM biz_warehouse_operations wo
WHERE wo.container_number = 'MRKU4896861';

-- 还空箱信息
SELECT
    er.last_return_date as 最晚还箱日期,
    er.planned_return_date as 计划还箱日期,
    er.return_time as 还箱日期,
    er.empty_pickup_time as 取空时间,
    er.notify_empty_date as 通知取空日期
FROM biz_empty_returns er
WHERE er.container_number = 'MRKU4896861';
