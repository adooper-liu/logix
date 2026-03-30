-- ============================================================
-- LogiX 测试数据清理脚本
-- 删除导入的测试数据（备货单、货柜及相关流程表、扩展表）
-- ============================================================

-- 注意：此脚本不使用事务包裹，以便部分成功时可以看到结果
-- 如果需要原子操作，请手动添加 BEGIN; 和 COMMIT;

-- ============================================================
-- 删除顺序：从表 → 主表（按依赖关系倒序删除）
-- ============================================================

-- 1. 删除扩展表数据（依赖货柜）
DELETE FROM ext_container_alerts WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

DELETE FROM ext_container_status_events WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

DELETE FROM ext_container_loading_records WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

DELETE FROM ext_container_charges WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

DELETE FROM ext_demurrage_records WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

DELETE FROM ext_feituo_status_events WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

DELETE FROM ext_feituo_places WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

-- 2. 删除系统数据变更日志（与货柜关联）
-- 注意：sys_data_change_log 使用 entity_type 和 entity_id 列
DELETE FROM sys_data_change_log WHERE entity_type = 'biz_containers' AND entity_id IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

-- 3. 资源占用表说明
-- ext_trucking_return_slot_occupancy、ext_trucking_slot_occupancy、ext_warehouse_daily_occupancy
-- 这三个表是资源级（车队/仓库）的日产能聚合数据，没有 container_number 列
-- 它们记录的是整体容量占用，不需要按货柜删除
-- 如需清理，可按日期清理历史数据（如清理30天前的数据）：

-- 4. 删除流程子表数据（依赖货柜）
DELETE FROM process_port_operations WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

DELETE FROM process_trucking_transport WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

DELETE FROM process_warehouse_operations WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

DELETE FROM process_empty_return WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

-- 5. 删除备货单（依赖货柜）
DELETE FROM biz_replenishment_orders WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

-- 6. 删除货柜（依赖海运表的提单号）
DELETE FROM biz_containers WHERE bill_of_lading_number IS NOT NULL;

-- 7. 删除海运信息
DELETE FROM process_sea_freight;

-- 8. 删除货柜SKU（依赖货柜）
DELETE FROM biz_container_skus WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

-- 10. 删除查验相关扩展表（依赖货柜）
DELETE FROM ext_inspection_events WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

DELETE FROM ext_inspection_records WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

DELETE FROM ext_container_hold_records WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

-- 11. 删除飞驼导入相关表（测试数据）
DELETE FROM ext_feituo_import_table1;
DELETE FROM ext_feituo_import_table2;
DELETE FROM ext_feituo_import_batch;

-- 12. 删除资源占用表（按日期清理30天前的历史数据）
DELETE FROM ext_trucking_return_slot_occupancy WHERE occupancy_date < CURRENT_DATE - INTERVAL '30 days';
DELETE FROM ext_trucking_slot_occupancy WHERE occupancy_date < CURRENT_DATE - INTERVAL '30 days';
DELETE FROM ext_warehouse_daily_occupancy WHERE occupancy_date < CURRENT_DATE - INTERVAL '30 days';
DELETE FROM ext_yard_daily_occupancy WHERE occupancy_date < CURRENT_DATE - INTERVAL '30 days';

-- 13. 删除流程实例（依赖货柜/备货单）
DELETE FROM flow_instances WHERE entity_type = 'biz_containers' AND entity_id IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);
DELETE FROM flow_instances WHERE entity_type = 'biz_replenishment_orders' AND entity_id IN (
    SELECT order_number FROM biz_replenishment_orders
);

-- 14. 删除流程定义（仅删除测试流程）
DELETE FROM flow_definitions WHERE flow_code LIKE 'TEST_%';

-- ============================================================
-- 验证删除结果
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
SELECT 'process_empty_return (还空箱)', COUNT(*) FROM process_empty_return
UNION ALL
SELECT 'ext_container_alerts (货柜预警)', COUNT(*) FROM ext_container_alerts
UNION ALL
SELECT 'ext_container_status_events (货柜状态事件)', COUNT(*) FROM ext_container_status_events
UNION ALL
SELECT 'ext_container_loading_records (货柜装载记录)', COUNT(*) FROM ext_container_loading_records
UNION ALL
SELECT 'ext_container_charges (货柜费用)', COUNT(*) FROM ext_container_charges
UNION ALL
SELECT 'ext_demurrage_records (滞港费记录)', COUNT(*) FROM ext_demurrage_records
UNION ALL
SELECT 'ext_feituo_status_events (飞托状态事件)', COUNT(*) FROM ext_feituo_status_events
UNION ALL
SELECT 'ext_feituo_places (飞托地点)', COUNT(*) FROM ext_feituo_places
UNION ALL
SELECT 'biz_container_skus (货柜SKU)', COUNT(*) FROM biz_container_skus
UNION ALL
SELECT 'ext_container_hold_records (货柜扣留记录)', COUNT(*) FROM ext_container_hold_records
UNION ALL
SELECT 'ext_inspection_events (查验事件)', COUNT(*) FROM ext_inspection_events
UNION ALL
SELECT 'ext_inspection_records (查验记录)', COUNT(*) FROM ext_inspection_records
UNION ALL
SELECT 'ext_feituo_import_table1 (飞驼导入表1)', COUNT(*) FROM ext_feituo_import_table1
UNION ALL
SELECT 'ext_feituo_import_table2 (飞驼导入表2)', COUNT(*) FROM ext_feituo_import_table2
UNION ALL
SELECT 'ext_feituo_import_batch (飞驼导入批次)', COUNT(*) FROM ext_feituo_import_batch
UNION ALL
SELECT 'flow_definitions (流程定义)', COUNT(*) FROM flow_definitions
UNION ALL
SELECT 'flow_instances (流程实例)', COUNT(*) FROM flow_instances
UNION ALL
SELECT 'sys_data_change_log (系统数据变更日志)', COUNT(*) FROM sys_data_change_log
UNION ALL
SELECT 'ext_trucking_return_slot_occupancy (车队还箱档期)', COUNT(*) FROM ext_trucking_return_slot_occupancy
UNION ALL
SELECT 'ext_trucking_slot_occupancy (车队运输档期)', COUNT(*) FROM ext_trucking_slot_occupancy
UNION ALL
SELECT 'ext_warehouse_daily_occupancy (仓库日占用)', COUNT(*) FROM ext_warehouse_daily_occupancy
UNION ALL
SELECT 'ext_yard_daily_occupancy (场站日占用)', COUNT(*) FROM ext_yard_daily_occupancy;
