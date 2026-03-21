-- 检查所有表的详细记录数
SELECT 'biz_replenishment_orders' as tbl, COUNT(*) as cnt FROM biz_replenishment_orders
UNION ALL SELECT 'biz_containers', COUNT(*) FROM biz_containers
UNION ALL SELECT 'process_sea_freight', COUNT(*) FROM process_sea_freight
UNION ALL SELECT 'process_port_operations', COUNT(*) FROM process_port_operations
UNION ALL SELECT 'process_trucking_transport', COUNT(*) FROM process_trucking_transport
UNION ALL SELECT 'process_warehouse_operations', COUNT(*) FROM process_warehouse_operations
UNION ALL SELECT 'process_empty_return', COUNT(*) FROM process_empty_return;

-- 查看货柜与子表关联情况
SELECT 
    c.container_number,
    (SELECT COUNT(*) FROM process_port_operations po WHERE po.container_number = c.container_number) as port_ops_count,
    (SELECT COUNT(*) FROM process_trucking_transport tt WHERE tt.container_number = c.container_number) as trucking_count,
    (SELECT COUNT(*) FROM process_warehouse_operations wo WHERE wo.container_number = c.container_number) as warehouse_count,
    (SELECT COUNT(*) FROM process_empty_return er WHERE er.container_number = c.container_number) as empty_return_count
FROM biz_containers c
LIMIT 10;
