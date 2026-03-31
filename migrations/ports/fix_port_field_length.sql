-- ============================================================
-- Fix Port Field Length Migration
-- ============================================================
-- Description: Increase port_code field length from VARCHAR(10) to VARCHAR(50)
--              to support longer port codes (e.g., USLAX, KPUSN, CNXME)
-- Date: 2026-02-27
-- ============================================================

-- Fix dict_ports.port_code
ALTER TABLE dict_ports ALTER COLUMN port_code TYPE VARCHAR(50);

-- Fix process_port_operations.port_code
ALTER TABLE process_port_operations ALTER COLUMN port_code TYPE VARCHAR(50);

-- Fix process_sea_freight.port_of_loading
ALTER TABLE process_sea_freight ALTER COLUMN port_of_loading TYPE VARCHAR(50);

-- Fix process_sea_freight.port_of_discharge
ALTER TABLE process_sea_freight ALTER COLUMN port_of_discharge TYPE VARCHAR(50);

-- Fix process_sea_freight.transit_port_code
ALTER TABLE process_sea_freight ALTER COLUMN transit_port_code TYPE VARCHAR(50);

-- Fix dict_port_name_mapping.port_code
ALTER TABLE dict_port_name_mapping ALTER COLUMN port_code TYPE VARCHAR(50);

-- Fix dict_port_name_mapping.port_code_old
ALTER TABLE dict_port_name_mapping ALTER COLUMN port_code_old TYPE VARCHAR(50);

-- Fix ext_demurrage_standards.destination_port_code
ALTER TABLE ext_demurrage_standards ALTER COLUMN destination_port_code TYPE VARCHAR(50);

-- Fix container_loading_records.origin_port_code
ALTER TABLE container_loading_records ALTER COLUMN origin_port_code TYPE VARCHAR(50);

-- Fix container_loading_records.dest_port_code
ALTER TABLE container_loading_records ALTER COLUMN dest_port_code TYPE VARCHAR(50);

-- Fix dict_customs_brokers.broker_code (港口代码相关的清关公司代码)
ALTER TABLE dict_customs_brokers ALTER COLUMN broker_code TYPE VARCHAR(50);

-- Fix dict_freight_forwarders.forwarder_code (货代公司代码)
ALTER TABLE dict_freight_forwarders ALTER COLUMN forwarder_code TYPE VARCHAR(50);

-- Fix dict_shipping_companies.company_code (船公司代码)
ALTER TABLE dict_shipping_companies ALTER COLUMN company_code TYPE VARCHAR(50);

-- Fix dict_trucking_companies.company_code (拖车公司代码)
ALTER TABLE dict_trucking_companies ALTER COLUMN company_code TYPE VARCHAR(50);

-- Fix dict_warehouses.warehouse_code (仓库代码)
ALTER TABLE dict_warehouses ALTER COLUMN warehouse_code TYPE VARCHAR(50);

-- Fix dict_container_types.type_code (柜型代码)
ALTER TABLE dict_container_types ALTER COLUMN type_code TYPE VARCHAR(50);

-- Fix biz_containers.container_type_code
ALTER TABLE biz_containers ALTER COLUMN container_type_code TYPE VARCHAR(50);

SELECT 'Port field length fix completed successfully' as status;
