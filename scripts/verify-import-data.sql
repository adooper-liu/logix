-- ============================================================
-- LogiX 数据库导入完整性验证脚本
-- 用于验证货柜数据导入是否完整
-- ============================================================

-- ============================================================
-- 1. 核心表记录数统计
-- ============================================================
SELECT 'biz_replenishment_orders (备货单)' AS table_name, COUNT(*) AS record_count FROM biz_replenishment_orders
UNION ALL
SELECT 'biz_containers (货柜)', COUNT(*) FROM biz_containers
UNION ALL
SELECT 'process_sea_freight (海运)', COUNT(*) FROM process_sea_freight
UNION ALL
SELECT 'process_port_operations (港口操作)', COUNT(*) FROM process_port_operations
UNION ALL
SELECT 'process_trucking_transport (拖卡运输)', COUNT(*) FROM process_trucking_transport
UNION ALL
SELECT 'process_warehouse_operations (仓库操作)', COUNT(*) FROM process_warehouse_operations
UNION ALL
SELECT 'process_empty_return (还空箱)', COUNT(*) FROM process_empty_return;

-- ============================================================
-- 2. 备货单与货柜关联检查
-- ============================================================
SELECT 
    '备货单-货柜关联' AS check_type,
    COUNT(*) AS total_orders,
    SUM(CASE WHEN c.container_number IS NOT NULL THEN 1 ELSE 0 END) AS with_containers,
    SUM(CASE WHEN c.container_number IS NULL THEN 1 ELSE 0 END) AS without_containers
FROM biz_replenishment_orders r
LEFT JOIN biz_containers c ON r.container_number = c.container_number;

-- ============================================================
-- 3. 货柜与海运信息关联检查
-- ============================================================
SELECT 
    '货柜-海运关联' AS check_type,
    COUNT(*) AS total_containers,
    SUM(CASE WHEN s.bill_of_lading_number IS NOT NULL THEN 1 ELSE 0 END) AS with_sea_freight,
    SUM(CASE WHEN s.bill_of_lading_number IS NULL THEN 1 ELSE 0 END) AS without_sea_freight
FROM biz_containers c
LEFT JOIN process_sea_freight s ON c.bill_of_lading_number = s.bill_of_lading_number;

-- ============================================================
-- 4. 货柜物流状态分布
-- ============================================================
SELECT 
    logistics_status AS status,
    COUNT(*) AS count
FROM biz_containers
GROUP BY logistics_status
ORDER BY count DESC;

-- ============================================================
-- 5. 货柜详细数据检查（最近10条）
-- ============================================================
SELECT 
    c.container_number AS 货柜号,
    c.logistics_status AS 物流状态,
    c.container_type_code AS 柜型,
    c.cbm AS 体积,
    c.gross_weight AS 毛重,
    c.created_at AS 创建时间
FROM biz_containers c
ORDER BY c.created_at DESC
LIMIT 10;

-- ============================================================
-- 6. 备货单详细数据检查（最近10条）
-- ============================================================
SELECT 
    r.order_number AS 备货单号,
    r.container_number AS 货柜号,
    r.customer_name AS 客户名称,
    r.sell_to_country AS 销往国家,
    r.order_status AS 订单状态,
    r.total_boxes AS 箱数,
    r.total_cbm AS 总体积,
    r.order_date AS 订单日期,
    r.created_at AS 创建时间
FROM biz_replenishment_orders r
ORDER BY r.created_at DESC
LIMIT 10;

-- ============================================================
-- 7. 海运信息检查（最近10条）
-- ============================================================
SELECT 
    s.bill_of_lading_number AS 提单号,
    s.vessel_name AS 船名,
    s.shipment_date AS 出运日,
    s.eta AS 预计到港,
    s.ata AS 实际到港,
    s.port_of_discharge AS 目的港,
    s.shipping_company_id AS 船公司,
    s.freight_forwarder_id AS 货代
FROM process_sea_freight s
ORDER BY s.created_at DESC
LIMIT 10;

-- ============================================================
-- 8. 港口操作检查（按货柜）
-- ============================================================
SELECT 
    c.container_number AS 货柜号,
    COUNT(*) AS 港口操作记录数,
    MAX(CASE WHEN po.port_type = 'destination' THEN po.port_type END) AS 是否有目的港,
    MAX(CASE WHEN po.port_type = 'transit' THEN po.port_type END) AS 是否有中转港,
    MAX(po.eta) AS ETA,
    MAX(po.ata) AS ATA
FROM biz_containers c
LEFT JOIN process_port_operations po ON c.container_number = po.container_number
GROUP BY c.container_number
ORDER BY c.created_at DESC
LIMIT 10;

-- ============================================================
-- 9. 拖卡运输检查（按货柜）
-- ============================================================
SELECT 
    c.container_number AS 货柜号,
    COUNT(*) AS 拖卡记录数,
    MAX(t.planned_pickup_date) AS 计划提柜日,
    MAX(t.planned_delivery_date) AS 计划送货日,
    MAX(t.pickup_date) AS 实际提柜日,
    MAX(t.delivery_date) AS 实际送货日
FROM biz_containers c
LEFT JOIN process_trucking_transport t ON c.container_number = t.container_number
GROUP BY c.container_number
ORDER BY c.created_at DESC
LIMIT 10;

-- ============================================================
-- 10. 仓库操作检查（按货柜）
-- ============================================================
SELECT 
    c.container_number AS 货柜号,
    COUNT(*) AS 仓库操作记录数,
    MAX(w.warehouse_id) AS 仓库编码,
    MAX(w.planned_unload_date) AS 计划入库日,
    MAX(w.unload_date) AS 实际入库日,
    MAX(w.notification_pickup_date) AS 计划出库日,
    MAX(w.pickup_time) AS 实际出库日
FROM biz_containers c
LEFT JOIN process_warehouse_operations w ON c.container_number = w.container_number
GROUP BY c.container_number
ORDER BY c.created_at DESC
LIMIT 10;

-- ============================================================
-- 11. 还空箱检查（按货柜）
-- ============================================================
SELECT 
    c.container_number AS 货柜号,
    COUNT(*) AS 还空箱记录数,
    MAX(e.planned_return_date) AS 计划还箱日,
    MAX(e.return_time) AS 实际还箱日,
    MAX(e.return_terminal_name) AS 还箱地点
FROM biz_containers c
LEFT JOIN process_empty_return e ON c.container_number = e.container_number
GROUP BY c.container_number
ORDER BY c.created_at DESC
LIMIT 10;

-- ============================================================
-- 12. 数据完整性问题检查
-- ============================================================
SELECT 
    '缺失海运信息的货柜' AS issue_type,
    c.container_number AS 货柜号,
    c.logistics_status AS 状态
FROM biz_containers c
WHERE c.logistics_status IN ('shipped', 'in_transit', 'at_port', 'picked_up', 'unloaded')
  AND c.bill_of_lading_number IS NULL
ORDER BY c.created_at DESC
LIMIT 10;

-- ============================================================
-- 13. 港口操作类型分布
-- ============================================================
SELECT 
    port_type AS 港口类型,
    COUNT(*) AS 记录数
FROM process_port_operations
GROUP BY port_type;

-- ============================================================
-- 14. 导入时间范围
-- ============================================================
SELECT 
    '货柜表' AS table_name,
    MIN(created_at) AS earliest_import,
    MAX(created_at) AS latest_import
FROM biz_containers
UNION ALL
SELECT '备货单表', MIN(created_at), MAX(created_at)
FROM biz_replenishment_orders
UNION ALL
SELECT '海运表', MIN(created_at), MAX(created_at)
FROM process_sea_freight
UNION ALL
SELECT '港口操作表', MIN(created_at), MAX(created_at)
FROM process_port_operations
UNION ALL
SELECT '拖卡运输表', MIN(created_at), MAX(created_at)
FROM process_trucking_transport;

-- ============================================================
-- 15. 综合数据完整性汇总
-- ============================================================
SELECT 
    '=== 数据导入完整性汇总 ===' AS summary,
    '' AS details
UNION ALL
SELECT 
    '备货单总数', CAST(COUNT(*) AS VARCHAR) FROM biz_replenishment_orders
UNION ALL
SELECT 
    '货柜总数', CAST(COUNT(*) AS VARCHAR) FROM biz_containers
UNION ALL
SELECT 
    '海运记录数', CAST(COUNT(*) AS VARCHAR) FROM process_sea_freight
UNION ALL
SELECT 
    '港口操作记录数', CAST(COUNT(*) AS VARCHAR) FROM process_port_operations
UNION ALL
SELECT 
    '拖卡运输记录数', CAST(COUNT(*) AS VARCHAR) FROM process_trucking_transport
UNION ALL
SELECT 
    '仓库操作记录数', CAST(COUNT(*) AS VARCHAR) FROM process_warehouse_operations
UNION ALL
SELECT 
    '还空箱记录数', CAST(COUNT(*) AS VARCHAR) FROM process_empty_return;
