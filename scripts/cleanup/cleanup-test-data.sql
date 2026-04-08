-- ============================================================
-- LogiX 测试数据清理脚本
-- 删除导入的测试数据（备货单、货柜及相关流程表、扩展表）
-- ============================================================

-- 注意：此脚本不使用事务包裹，以便部分成功时可以看到结果
-- 如果需要原子操作，请手动添加 BEGIN; 和 COMMIT;

-- ============================================================
-- 删除顺序：从表 -> 主表（按依赖关系倒序删除）
-- ============================================================

-- 1. Delete extension table data (dependent on containers)
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

-- Delete Feituo vessel data (test data)
DELETE FROM ext_feituo_vessels;

-- 2. Delete system data change log (associated with containers)
-- Note: sys_data_change_log uses entity_type and entity_id columns
DELETE FROM sys_data_change_log WHERE entity_type = 'biz_containers' AND entity_id IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

-- 3. Resource occupancy table notes
-- ext_trucking_return_slot_occupancy, ext_trucking_slot_occupancy, ext_warehouse_daily_occupancy
-- These three tables are resource-level (trucking/warehouse) daily capacity aggregation data without container_number column
-- They record overall capacity occupancy and do not need to be deleted by container
-- If cleanup is needed, clean historical data by date (e.g., data older than 30 days):

-- 4. Delete process sub-table data (dependent on containers)
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

-- 5. Delete replenishment orders (dependent on containers)
DELETE FROM biz_replenishment_orders WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

-- 6. Delete containers (dependent on bill of lading number from sea freight table)
DELETE FROM biz_containers WHERE bill_of_lading_number IS NOT NULL;

-- 7. Delete sea freight information
DELETE FROM process_sea_freight;

-- 8. Delete container SKU (dependent on containers)
DELETE FROM biz_container_skus WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

-- 9. Delete inspection-related extension tables
-- Note: ext_inspection_events does not have container_number, it links via inspection_record_id
-- First delete events, then records
DELETE FROM ext_inspection_events WHERE inspection_record_id IN (
    SELECT id FROM ext_inspection_records WHERE container_number IN (
        SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
    )
);

DELETE FROM ext_inspection_records WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

DELETE FROM ext_container_hold_records WHERE container_number IN (
    SELECT container_number FROM biz_containers WHERE bill_of_lading_number IS NOT NULL
);

-- 10. Delete Feituo import-related tables (test data)
DELETE FROM ext_feituo_import_table1;

DELETE FROM ext_feituo_import_table2;

DELETE FROM ext_feituo_import_batch;

-- 11. Delete resource occupancy tables (clean historical data older than 30 days by date)
-- Note: Different tables use different date column names
DELETE FROM ext_trucking_return_slot_occupancy WHERE slot_date < CURRENT_DATE - INTERVAL '30 days';

DELETE FROM ext_trucking_slot_occupancy WHERE date < CURRENT_DATE - INTERVAL '30 days';

DELETE FROM ext_warehouse_daily_occupancy WHERE date < CURRENT_DATE - INTERVAL '30 days';

DELETE FROM ext_yard_daily_occupancy WHERE date < CURRENT_DATE - INTERVAL '30 days';

-- 12. Delete flow instances and definitions
-- Note: flow_instances does not have entity_type/entity_id columns
-- It has: id, flow_id, status, variables, current_node_id, execution_history, etc.
-- For test data cleanup, delete all flow instances and definitions
DELETE FROM flow_instances;

DELETE FROM flow_definitions;

-- ============================================================
-- Verify deletion results
-- ============================================================
SELECT 'biz_replenishment_orders (Replenishment Orders)' AS table_name, COUNT(*) AS record_count FROM biz_replenishment_orders
UNION ALL
SELECT 'biz_containers (Containers)', COUNT(*) FROM biz_containers
UNION ALL
SELECT 'process_sea_freight (Sea Freight)', COUNT(*) FROM process_sea_freight
UNION ALL
SELECT 'process_port_operations (Port Operations)', COUNT(*) FROM process_port_operations
UNION ALL
SELECT 'process_trucking_transport (Trucking Transport)', COUNT(*) FROM process_trucking_transport
UNION ALL
SELECT 'process_warehouse_operations (Warehouse Operations)', COUNT(*) FROM process_warehouse_operations
UNION ALL
SELECT 'process_empty_return (Empty Return)', COUNT(*) FROM process_empty_return
UNION ALL
SELECT 'ext_container_alerts (Container Alerts)', COUNT(*) FROM ext_container_alerts
UNION ALL
SELECT 'ext_container_status_events (Container Status Events)', COUNT(*) FROM ext_container_status_events
UNION ALL
SELECT 'ext_container_loading_records (Container Loading Records)', COUNT(*) FROM ext_container_loading_records
UNION ALL
SELECT 'ext_container_charges (Container Charges)', COUNT(*) FROM ext_container_charges
UNION ALL
SELECT 'ext_demurrage_records (Demurrage Records)', COUNT(*) FROM ext_demurrage_records
UNION ALL
SELECT 'ext_feituo_status_events (Feituo Status Events)', COUNT(*) FROM ext_feituo_status_events
UNION ALL
SELECT 'ext_feituo_places (Feituo Places)', COUNT(*) FROM ext_feituo_places
UNION ALL
SELECT 'ext_feituo_vessels (Feituo Vessels)', COUNT(*) FROM ext_feituo_vessels
UNION ALL
SELECT 'biz_container_skus (Container SKUs)', COUNT(*) FROM biz_container_skus
UNION ALL
SELECT 'ext_container_hold_records (Container Hold Records)', COUNT(*) FROM ext_container_hold_records
UNION ALL
SELECT 'ext_inspection_events (Inspection Events)', COUNT(*) FROM ext_inspection_events
UNION ALL
SELECT 'ext_inspection_records (Inspection Records)', COUNT(*) FROM ext_inspection_records
UNION ALL
SELECT 'ext_feituo_import_table1 (Feituo Import Table 1)', COUNT(*) FROM ext_feituo_import_table1
UNION ALL
SELECT 'ext_feituo_import_table2 (Feituo Import Table 2)', COUNT(*) FROM ext_feituo_import_table2
UNION ALL
SELECT 'ext_feituo_import_batch (Feituo Import Batch)', COUNT(*) FROM ext_feituo_import_batch
UNION ALL
SELECT 'flow_definitions (Flow Definitions)', COUNT(*) FROM flow_definitions
UNION ALL
SELECT 'flow_instances (Flow Instances)', COUNT(*) FROM flow_instances
UNION ALL
SELECT 'sys_data_change_log (System Data Change Log)', COUNT(*) FROM sys_data_change_log
UNION ALL
SELECT 'ext_trucking_return_slot_occupancy (Trucking Return Slot Occupancy)', COUNT(*) FROM ext_trucking_return_slot_occupancy
UNION ALL
SELECT 'ext_trucking_slot_occupancy (Trucking Slot Occupancy)', COUNT(*) FROM ext_trucking_slot_occupancy
UNION ALL
SELECT 'ext_warehouse_daily_occupancy (Warehouse Daily Occupancy)', COUNT(*) FROM ext_warehouse_daily_occupancy
UNION ALL
SELECT 'ext_yard_daily_occupancy (Yard Daily Occupancy)', COUNT(*) FROM ext_yard_daily_occupancy
ORDER BY table_name;