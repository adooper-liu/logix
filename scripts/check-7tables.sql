SELECT 'biz_replenishment_orders' as tbl, COUNT(*) FROM biz_replenishment_orders
UNION ALL
SELECT 'biz_containers', COUNT(*) FROM biz_containers
UNION ALL
SELECT 'process_sea_freight', COUNT(*) FROM process_sea_freight
UNION ALL
SELECT 'process_port_operations', COUNT(*) FROM process_port_operations
UNION ALL
SELECT 'process_trucking_transport', COUNT(*) FROM process_trucking_transport
UNION ALL
SELECT 'process_warehouse_operations', COUNT(*) FROM process_warehouse_operations
UNION ALL
SELECT 'process_empty_return', COUNT(*) FROM process_empty_return;
