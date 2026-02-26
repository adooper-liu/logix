-- ============================================================
-- LogiX 数据库表结构重构 - 删除所有现有表
-- LogiX Database Schema Refactor - Drop All Tables
-- ============================================================
-- 说明: 此脚本会删除所有数据库表，请谨慎使用
-- Usage: DROP ALL TABLES - Use with caution
-- ============================================================

-- 设置客户端输出最小化
\echo '开始删除所有表...'
\echo 'Starting to drop all tables...'

-- 删除业务表 (Business Tables)
DROP TABLE IF EXISTS biz_containers CASCADE;
DROP TABLE IF EXISTS biz_replenishment_orders CASCADE;
DROP TABLE IF EXISTS biz_customers CASCADE;

-- 删除流程表 (Process Tables)
DROP TABLE IF EXISTS process_sea_freight CASCADE;
DROP TABLE IF EXISTS process_port_operations CASCADE;
DROP TABLE IF EXISTS process_trucking_transport CASCADE;
DROP TABLE IF EXISTS process_warehouse_operations CASCADE;
DROP TABLE IF EXISTS process_empty_return CASCADE;

-- 删除扩展表 (Extension Tables)
DROP TABLE IF EXISTS ext_container_status_events CASCADE;
DROP TABLE IF EXISTS ext_container_loading_records CASCADE;
DROP TABLE IF EXISTS ext_container_hold_records CASCADE;
DROP TABLE IF EXISTS ext_container_charges CASCADE;

-- 删除字典表 (Dictionary Tables)
DROP TABLE IF EXISTS dict_countries CASCADE;
DROP TABLE IF EXISTS dict_customer_types CASCADE;
DROP TABLE IF EXISTS dict_ports CASCADE;
DROP TABLE IF EXISTS dict_shipping_companies CASCADE;
DROP TABLE IF EXISTS dict_freight_forwarders CASCADE;
DROP TABLE IF EXISTS dict_customs_brokers CASCADE;
DROP TABLE IF EXISTS dict_trucking_companies CASCADE;
DROP TABLE IF EXISTS dict_container_types CASCADE;
DROP TABLE IF EXISTS dict_warehouses CASCADE;
DROP TABLE IF EXISTS dict_overseas_companies CASCADE;

\echo '所有表已删除完成'
\echo 'All tables dropped successfully'
