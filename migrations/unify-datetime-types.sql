-- ==========================================
-- 统一日期时间类型迁移脚本
-- Unify DateTime Types Migration Script
-- ==========================================

-- 1. 修改 process_port_operations 表的日期字段为 TIMESTAMP
ALTER TABLE process_port_operations
  ALTER COLUMN eta_dest_port TYPE TIMESTAMP USING eta_dest_port::TIMESTAMP;

ALTER TABLE process_port_operations
  ALTER COLUMN ata_dest_port TYPE TIMESTAMP USING ata_dest_port::TIMESTAMP;

ALTER TABLE process_port_operations
  ALTER COLUMN etd_transit TYPE TIMESTAMP USING etd_transit::TIMESTAMP;

ALTER TABLE process_port_operations
  ALTER COLUMN atd_transit TYPE TIMESTAMP USING atd_transit::TIMESTAMP;

ALTER TABLE process_port_operations
  ALTER COLUMN last_free_date TYPE TIMESTAMP USING last_free_date::TIMESTAMP;

ALTER TABLE process_port_operations
  ALTER COLUMN dest_port_unload_date TYPE TIMESTAMP USING dest_port_unload_date::TIMESTAMP;

ALTER TABLE process_port_operations
  ALTER COLUMN actual_customs_date TYPE TIMESTAMP USING actual_customs_date::TIMESTAMP;

ALTER TABLE process_port_operations
  ALTER COLUMN all_generated_date TYPE TIMESTAMP USING all_generated_date::TIMESTAMP;

ALTER TABLE process_port_operations
  ALTER COLUMN planned_customs_date TYPE TIMESTAMP USING planned_customs_date::TIMESTAMP;

ALTER TABLE process_port_operations
  ALTER COLUMN isf_declaration_date TYPE TIMESTAMP USING isf_declaration_date::TIMESTAMP;

ALTER TABLE process_port_operations
  ALTER COLUMN document_transfer_date TYPE TIMESTAMP USING document_transfer_date::TIMESTAMP;

-- 2. 修改 process_sea_freight 表的日期字段为 TIMESTAMP
ALTER TABLE process_sea_freight
  ALTER COLUMN eta TYPE TIMESTAMP USING eta::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN etd TYPE TIMESTAMP USING etd::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN ata TYPE TIMESTAMP USING ata::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN atd TYPE TIMESTAMP USING atd::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN customs_clearance_date TYPE TIMESTAMP USING customs_clearance_date::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN shipment_date TYPE TIMESTAMP USING shipment_date::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN mother_shipment_date TYPE TIMESTAMP USING mother_shipment_date::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN document_release_date TYPE TIMESTAMP USING document_release_date::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN port_entry_date TYPE TIMESTAMP USING port_entry_date::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN rail_yard_entry_date TYPE TIMESTAMP USING rail_yard_entry_date::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN truck_yard_entry_date TYPE TIMESTAMP USING truck_yard_entry_date::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN eta_origin TYPE TIMESTAMP USING eta_origin::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN ata_origin TYPE TIMESTAMP USING ata_origin::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN port_open_date TYPE TIMESTAMP USING port_open_date::TIMESTAMP;

ALTER TABLE process_sea_freight
  ALTER COLUMN port_close_date TYPE TIMESTAMP USING port_close_date::TIMESTAMP;

-- 3. 修改 biz_replenishment_orders 表的日期字段为 TIMESTAMP
ALTER TABLE biz_replenishment_orders
  ALTER COLUMN order_date TYPE TIMESTAMP USING order_date::TIMESTAMP;

ALTER TABLE biz_replenishment_orders
  ALTER COLUMN expected_ship_date TYPE TIMESTAMP USING expected_ship_date::TIMESTAMP;

ALTER TABLE biz_replenishment_orders
  ALTER COLUMN actual_ship_date TYPE TIMESTAMP USING actual_ship_date::TIMESTAMP;

-- 4. 修改 process_trucking_transport 表的日期字段为 TIMESTAMP
ALTER TABLE process_trucking_transport
  ALTER COLUMN last_pickup_date TYPE TIMESTAMP USING last_pickup_date::TIMESTAMP;

ALTER TABLE process_trucking_transport
  ALTER COLUMN planned_pickup_date TYPE TIMESTAMP USING planned_pickup_date::TIMESTAMP;

ALTER TABLE process_trucking_transport
  ALTER COLUMN last_delivery_date TYPE TIMESTAMP USING last_delivery_date::TIMESTAMP;

ALTER TABLE process_trucking_transport
  ALTER COLUMN planned_delivery_date TYPE TIMESTAMP USING planned_delivery_date::TIMESTAMP;

-- 5. 修改 process_warehouse_operations 表的日期字段为 TIMESTAMP
ALTER TABLE process_warehouse_operations
  ALTER COLUMN warehouse_arrival_date TYPE TIMESTAMP USING warehouse_arrival_date::TIMESTAMP;

ALTER TABLE process_warehouse_operations
  ALTER COLUMN last_unload_date TYPE TIMESTAMP USING last_unload_date::TIMESTAMP;

ALTER TABLE process_warehouse_operations
  ALTER COLUMN planned_unload_date TYPE TIMESTAMP USING planned_unload_date::TIMESTAMP;

ALTER TABLE process_warehouse_operations
  ALTER COLUMN wms_confirm_date TYPE TIMESTAMP USING wms_confirm_date::TIMESTAMP;

ALTER TABLE process_warehouse_operations
  ALTER COLUMN notification_pickup_date TYPE TIMESTAMP USING notification_pickup_date::TIMESTAMP;

ALTER TABLE process_warehouse_operations
  ALTER COLUMN storage_start_date TYPE TIMESTAMP USING storage_start_date::TIMESTAMP;

ALTER TABLE process_warehouse_operations
  ALTER COLUMN storage_end_date TYPE TIMESTAMP USING storage_end_date::TIMESTAMP;

-- 6. 修改 process_empty_returns 表的日期字段为 TIMESTAMP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'process_empty_returns') THEN
    ALTER TABLE process_empty_returns
      ALTER COLUMN last_return_date TYPE TIMESTAMP USING last_return_date::TIMESTAMP;
    ALTER TABLE process_empty_returns
      ALTER COLUMN planned_return_date TYPE TIMESTAMP USING planned_return_date::TIMESTAMP;
  END IF;
END $$;

-- 7. 修改 container_hold_records 表的日期字段为 TIMESTAMP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'container_hold_records') THEN
    ALTER TABLE container_hold_records
      ALTER COLUMN hold_date TYPE TIMESTAMP USING hold_date::TIMESTAMP;
  END IF;
END $$;

-- 8. 修改 container_charges 表的日期字段为 TIMESTAMP
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'container_charges') THEN
    ALTER TABLE container_charges
      ALTER COLUMN charge_date TYPE TIMESTAMP USING charge_date::TIMESTAMP;
    ALTER TABLE container_charges
      ALTER COLUMN paid_date TYPE TIMESTAMP USING paid_date::TIMESTAMP;
  END IF;
END $$;

-- 9. 修改 ext_demurrage_standards 表的日期字段为 TIMESTAMP
ALTER TABLE ext_demurrage_standards
  ALTER COLUMN effective_date TYPE TIMESTAMP USING effective_date::TIMESTAMP;

ALTER TABLE ext_demurrage_standards
  ALTER COLUMN expiry_date TYPE TIMESTAMP USING expiry_date::TIMESTAMP;

-- 10. 修改 ext_demurrage_records 表的日期字段为 TIMESTAMP
ALTER TABLE ext_demurrage_records
  ALTER COLUMN charge_start_date TYPE TIMESTAMP USING charge_start_date::TIMESTAMP;

ALTER TABLE ext_demurrage_records
  ALTER COLUMN charge_end_date TYPE TIMESTAMP USING charge_end_date::TIMESTAMP;

ALTER TABLE ext_demurrage_records
  ALTER COLUMN invoice_date TYPE TIMESTAMP USING invoice_date::TIMESTAMP;

ALTER TABLE ext_demurrage_records
  ALTER COLUMN payment_date TYPE TIMESTAMP USING payment_date::TIMESTAMP;

-- 完成
SELECT 'DateTime types unified successfully!' AS message;