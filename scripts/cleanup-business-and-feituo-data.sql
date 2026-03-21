-- ============================================================
-- LogiX 一键清理脚本：
-- 1) 7个业务表
-- 2) 所有飞驼导入相关表
--
-- 用途：重跑 Excel/飞驼导入前，先清空历史数据
-- ============================================================

BEGIN;

-- 7个业务表 + 飞驼导入相关表，统一清空并重置自增序列
TRUNCATE TABLE
  process_empty_return,
  process_warehouse_operations,
  process_trucking_transport,
  process_port_operations,
  process_sea_freight,
  biz_replenishment_orders,
  biz_containers,
  ext_feituo_import_batch,
  ext_feituo_import_table1,
  ext_feituo_import_table2,
  ext_feituo_places,
  ext_feituo_status_events,
  ext_feituo_vessels
RESTART IDENTITY CASCADE;

COMMIT;

-- ============================================================
-- 清理结果校验
-- ============================================================
SELECT 'biz_containers' AS table_name, COUNT(*) AS record_count FROM biz_containers
UNION ALL
SELECT 'biz_replenishment_orders', COUNT(*) FROM biz_replenishment_orders
UNION ALL
SELECT 'process_sea_freight', COUNT(*) FROM process_sea_freight
UNION ALL
SELECT 'process_port_operations', COUNT(*) FROM process_port_operations
UNION ALL
SELECT 'process_trucking_transport', COUNT(*) FROM process_trucking_transport
UNION ALL
SELECT 'process_warehouse_operations', COUNT(*) FROM process_warehouse_operations
UNION ALL
SELECT 'process_empty_return', COUNT(*) FROM process_empty_return
UNION ALL
SELECT 'ext_feituo_import_batch', COUNT(*) FROM ext_feituo_import_batch
UNION ALL
SELECT 'ext_feituo_import_table1', COUNT(*) FROM ext_feituo_import_table1
UNION ALL
SELECT 'ext_feituo_import_table2', COUNT(*) FROM ext_feituo_import_table2
UNION ALL
SELECT 'ext_feituo_places', COUNT(*) FROM ext_feituo_places
UNION ALL
SELECT 'ext_feituo_status_events', COUNT(*) FROM ext_feituo_status_events
UNION ALL
SELECT 'ext_feituo_vessels', COUNT(*) FROM ext_feituo_vessels;
