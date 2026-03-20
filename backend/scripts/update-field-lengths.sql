-- ============================================================
-- LogiX 数据库字段长度扩展脚本
-- LogiX Database Field Length Update Script
-- ============================================================
-- 用途: 扩大数据库字段长度限制，解决 Excel 导入时的字符长度问题
-- Usage: Update field lengths to support longer strings in Excel imports
-- ============================================================

-- ============================================================
-- 字典表字段长度扩展
-- ============================================================

-- 1. 国家字典 (dict_countries)
ALTER TABLE dict_countries
    ALTER COLUMN code TYPE VARCHAR(100),
    ALTER COLUMN name_cn TYPE VARCHAR(100),
    ALTER COLUMN name_en TYPE VARCHAR(100),
    ALTER COLUMN currency TYPE VARCHAR(100);

-- 2. 客户类型字典 (dict_customer_types)
ALTER TABLE dict_customer_types
    ALTER COLUMN type_name_cn TYPE VARCHAR(100),
    ALTER COLUMN type_name_en TYPE VARCHAR(100);

-- 3. 港口字典 (dict_ports)
ALTER TABLE dict_ports
    ALTER COLUMN port_code TYPE VARCHAR(100),
    ALTER COLUMN port_name TYPE VARCHAR(100),
    ALTER COLUMN country TYPE VARCHAR(100),
    ALTER COLUMN city TYPE VARCHAR(100);

-- 4. 船公司字典 (dict_shipping_companies)
ALTER TABLE dict_shipping_companies
    ALTER COLUMN company_code TYPE VARCHAR(100),
    ALTER COLUMN scac_code TYPE VARCHAR(100),
    ALTER COLUMN api_provider TYPE VARCHAR(100),
    ALTER COLUMN contact_phone TYPE VARCHAR(100);

-- 5. 货代公司字典 (dict_freight_forwarders)
ALTER TABLE dict_freight_forwarders
    ALTER COLUMN forwarder_code TYPE VARCHAR(100),
    ALTER COLUMN contact_phone TYPE VARCHAR(100);

-- 6. 清关公司字典 (dict_customs_brokers)
ALTER TABLE dict_customs_brokers
    ALTER COLUMN broker_code TYPE VARCHAR(100),
    ALTER COLUMN country TYPE VARCHAR(100),
    ALTER COLUMN contact_phone TYPE VARCHAR(100);

-- 7. 拖车公司字典 (dict_trucking_companies)
ALTER TABLE dict_trucking_companies
    ALTER COLUMN company_code TYPE VARCHAR(100),
    ALTER COLUMN contact_phone TYPE VARCHAR(100);

-- 8. 柜型字典 (dict_container_types)
ALTER TABLE dict_container_types
    ALTER COLUMN type_name_cn TYPE VARCHAR(100),
    ALTER COLUMN type_name_en TYPE VARCHAR(100),
    ALTER COLUMN type_abbrev TYPE VARCHAR(100),
    ALTER COLUMN dimensions TYPE VARCHAR(100);

-- 9. 海外公司字典 (dict_overseas_companies)
ALTER TABLE dict_overseas_companies
    ALTER COLUMN company_code TYPE VARCHAR(100),
    ALTER COLUMN country TYPE VARCHAR(100),
    ALTER COLUMN contact_person TYPE VARCHAR(100),
    ALTER COLUMN contact_phone TYPE VARCHAR(100),
    ALTER COLUMN currency TYPE VARCHAR(100),
    ALTER COLUMN tax_id TYPE VARCHAR(100),
    ALTER COLUMN bank_account TYPE VARCHAR(100);

-- 10. 仓库字典 (dict_warehouses)
ALTER TABLE dict_warehouses
    ALTER COLUMN warehouse_code TYPE VARCHAR(100),
    ALTER COLUMN company_code TYPE VARCHAR(100),
    ALTER COLUMN state TYPE VARCHAR(100),
    ALTER COLUMN country TYPE VARCHAR(100),
    ALTER COLUMN contact_phone TYPE VARCHAR(100);

-- ============================================================
-- 业务表字段长度扩展
-- ============================================================

-- 1. 滞港费标准表 (ext_demurrage_standards)
ALTER TABLE ext_demurrage_standards
    ALTER COLUMN foreign_company_code TYPE VARCHAR(100),
    ALTER COLUMN destination_port_code TYPE VARCHAR(100),
    ALTER COLUMN shipping_company_code TYPE VARCHAR(100),
    ALTER COLUMN origin_forwarder_code TYPE VARCHAR(100),
    ALTER COLUMN transport_mode_name TYPE VARCHAR(100),
    ALTER COLUMN charge_type_code TYPE VARCHAR(100);

-- 2. 滞港费记录表 (ext_demurrage_records)
ALTER TABLE ext_demurrage_records
    ALTER COLUMN container_number TYPE VARCHAR(100),
    ALTER COLUMN charge_type TYPE VARCHAR(100),
    ALTER COLUMN invoice_number TYPE VARCHAR(100);

-- 3. 货柜表 (biz_containers)
ALTER TABLE biz_containers
    ALTER COLUMN container_number TYPE VARCHAR(100),
    ALTER COLUMN container_type_code TYPE VARCHAR(100),
    ALTER COLUMN seal_number TYPE VARCHAR(100),
    ALTER COLUMN operator TYPE VARCHAR(100),
    ALTER COLUMN container_holder TYPE VARCHAR(100);

-- 4. 海运表 (process_sea_freight)
ALTER TABLE process_sea_freight
    ALTER COLUMN shipping_company_code TYPE VARCHAR(100),
    ALTER COLUMN vessel_name TYPE VARCHAR(100),
    ALTER COLUMN voyage_number TYPE VARCHAR(100);

-- 5. 港口操作表 (process_port_operations)
ALTER TABLE process_port_operations
    ALTER COLUMN container_number TYPE VARCHAR(100),
    ALTER COLUMN port_code TYPE VARCHAR(100),
    ALTER COLUMN customs_broker_code TYPE VARCHAR(100);

-- 6. 拖卡运输表 (process_trucking_transport)
ALTER TABLE process_trucking_transport
    ALTER COLUMN container_number TYPE VARCHAR(100),
    ALTER COLUMN trucking_company_id TYPE VARCHAR(100);

-- 7. 仓库操作表 (process_warehouse_operations)
ALTER TABLE process_warehouse_operations
    ALTER COLUMN container_number TYPE VARCHAR(100);

-- 8. 飞驼地点表 (ext_feituo_places)
ALTER TABLE ext_feituo_places
    ALTER COLUMN bill_of_lading_number TYPE VARCHAR(100),
    ALTER COLUMN container_number TYPE VARCHAR(100),
    ALTER COLUMN port_code TYPE VARCHAR(100),
    ALTER COLUMN port_name_en TYPE VARCHAR(100),
    ALTER COLUMN port_name_cn TYPE VARCHAR(100),
    ALTER COLUMN place_type TYPE VARCHAR(100),
    ALTER COLUMN timezone TYPE VARCHAR(100),
    ALTER COLUMN terminal_name TYPE VARCHAR(100),
    ALTER COLUMN vessel_name TYPE VARCHAR(100),
    ALTER COLUMN voyage_number TYPE VARCHAR(100),
    ALTER COLUMN cargo_location TYPE VARCHAR(100);

-- 9. 飞驼状态事件表 (ext_feituo_status_events)
ALTER TABLE ext_feituo_status_events
    ALTER COLUMN bill_of_lading_number TYPE VARCHAR(100),
    ALTER COLUMN container_number TYPE VARCHAR(100),
    ALTER COLUMN event_code TYPE VARCHAR(100),
    ALTER COLUMN location TYPE VARCHAR(100),
    ALTER COLUMN vessel_name TYPE VARCHAR(100),
    ALTER COLUMN voyage_number TYPE VARCHAR(100),
    ALTER COLUMN equipment_reference TYPE VARCHAR(100),
    ALTER COLUMN event_type TYPE VARCHAR(100),
    ALTER COLUMN status_type TYPE VARCHAR(100),
    ALTER COLUMN milestone_type TYPE VARCHAR(100);

-- 10. 飞驼船泊信息表 (ext_feituo_vessels)
ALTER TABLE ext_feituo_vessels
    ALTER COLUMN bill_of_lading_number TYPE VARCHAR(100),
    ALTER COLUMN vessel_name TYPE VARCHAR(100),
    ALTER COLUMN vessel_code TYPE VARCHAR(100),
    ALTER COLUMN imo_number TYPE VARCHAR(100),
    ALTER COLUMN mmsi_number TYPE VARCHAR(100),
    ALTER COLUMN flag TYPE VARCHAR(100),
    ALTER COLUMN container_size TYPE VARCHAR(100),
    ALTER COLUMN operator TYPE VARCHAR(100);

-- 显示成功信息
COMMENT ON TABLE ext_demurrage_standards IS '滞港费标准表 - 字段长度已扩展到 100 字符';
