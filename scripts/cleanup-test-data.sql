-- ============================================================
-- LogiX 测试数据清理脚本
-- 删除导入的测试数据（备货单、货柜及相关流程表）
-- ============================================================

BEGIN;

-- ============================================================
-- 删除顺序：从表 → 主表
-- ============================================================

-- 1. 删除流程子表数据（依赖货柜）
DELETE FROM process_port_operations WHERE container_number IN (
    SELECT container_number FROM biz_containers
);

DELETE FROM process_trucking_transport WHERE container_number IN (
    SELECT container_number FROM biz_containers
);

DELETE FROM process_warehouse_operations WHERE container_number IN (
    SELECT container_number FROM biz_containers
);

DELETE FROM process_empty_return WHERE container_number IN (
    SELECT container_number FROM biz_containers
);

-- 2. 删除备货单（依赖货柜）
DELETE FROM biz_replenishment_orders WHERE container_number IN (
    SELECT container_number FROM biz_containers
);

-- 3. 删除货柜（依赖海运表的提单号）
DELETE FROM biz_containers WHERE bill_of_lading_number IS NOT NULL;

-- 4. 删除海运信息
DELETE FROM process_sea_freight;

COMMIT;

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
SELECT 'process_empty_return (还空箱)', COUNT(*) FROM process_empty_return;
