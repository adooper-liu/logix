-- ============================================================
-- LogiX 鏁版嵁搴撹〃缁撴瀯鍒涘缓鑴氭湰
-- LogiX Database Schema Creation Script
-- ============================================================
-- 璇存槑: 姝よ剼鏈牴鎹甌ypeORM瀹炰綋瀹氫箟鍒涘缓鏁版嵁搴撹〃
-- Usage: Create all tables based on TypeORM entities
-- ============================================================


-- ============================================================
-- 瀛楀吀琛?(Dictionary Tables)
-- ============================================================

-- 1. 鍥藉埆瀛楀吀 (dict_countries)
CREATE TABLE IF NOT EXISTS dict_countries (
    code VARCHAR(50) PRIMARY KEY,
    name_cn VARCHAR(50) NOT NULL,
    name_en VARCHAR(50) NOT NULL,
    region VARCHAR(20),
    continent VARCHAR(20),
    currency VARCHAR(50),
    phone_code VARCHAR(20),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_countries_continent ON dict_countries(continent);
CREATE INDEX idx_countries_region ON dict_countries(region);

-- 2. 瀹㈡埛绫诲瀷瀛楀吀 (dict_customer_types)
CREATE TABLE IF NOT EXISTS dict_customer_types (
    type_code VARCHAR(20) PRIMARY KEY,
    type_name_cn VARCHAR(50) NOT NULL,
    type_name_en VARCHAR(50) NOT NULL,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 娓彛瀛楀吀 (dict_ports)
CREATE TABLE IF NOT EXISTS dict_ports (
    port_code VARCHAR(50) PRIMARY KEY,
    port_name VARCHAR(50) NOT NULL,
    port_name_en VARCHAR(100),
    port_type VARCHAR(20),
    country VARCHAR(50),
    state VARCHAR(20),
    city VARCHAR(50),
    timezone INT,
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    support_export BOOLEAN DEFAULT true,
    support_import BOOLEAN DEFAULT true,
    support_container_only BOOLEAN DEFAULT true,
    status VARCHAR(20),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ports_country ON dict_ports(country);
CREATE INDEX idx_ports_city ON dict_ports(city);

-- 4. 鑸瑰叕鍙稿瓧鍏?(dict_shipping_companies)
CREATE TABLE IF NOT EXISTS dict_shipping_companies (
    company_code VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    company_name_en VARCHAR(200),
    scac_code VARCHAR(50),
    api_provider VARCHAR(50),
    support_booking BOOLEAN DEFAULT true,
    support_bill_of_lading BOOLEAN DEFAULT true,
    support_container BOOLEAN DEFAULT true,
    website_url VARCHAR(200),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    status VARCHAR(20),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 璐т唬鍏徃瀛楀吀 (dict_freight_forwarders)
CREATE TABLE IF NOT EXISTS dict_freight_forwarders (
    forwarder_code VARCHAR(50) PRIMARY KEY,
    forwarder_name VARCHAR(100) NOT NULL,
    forwarder_name_en VARCHAR(200),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    status VARCHAR(20),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 清关公司字典 (dict_customs_brokers)
CREATE TABLE IF NOT EXISTS dict_customs_brokers (
    broker_code VARCHAR(50) PRIMARY KEY,
    broker_name VARCHAR(100) NOT NULL,
    broker_name_en VARCHAR(200),
    country VARCHAR(50),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    status VARCHAR(20),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customs_brokers_country ON dict_customs_brokers(country);
CREATE INDEX idx_customs_brokers_status ON dict_customs_brokers(status);

-- 7. 鎷栬溅鍏徃瀛楀吀 (dict_trucking_companies)
CREATE TABLE IF NOT EXISTS dict_trucking_companies (
    company_code VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    company_name_en VARCHAR(200),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    status VARCHAR(20),
    daily_capacity INT DEFAULT 10,
    daily_return_capacity INT DEFAULT NULL,
    has_yard BOOLEAN DEFAULT FALSE,
    yard_daily_capacity INT DEFAULT NULL,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON COLUMN dict_trucking_companies.daily_return_capacity IS '每日可还箱数量（柜数），用于 Drop 模式还箱日约束；NULL 表示与 daily_capacity 共用';
COMMENT ON COLUMN dict_trucking_companies.has_yard IS '是否有堆场：true=支持 Drop 模式（提<送）；false=必须 Live 模式（提=送=卸）';
COMMENT ON COLUMN dict_trucking_companies.yard_daily_capacity IS '堆场每日可容纳柜数（有堆场时有效）';

-- 8. 鏌滃瀷瀛楀吀 (dict_container_types)
CREATE TABLE IF NOT EXISTS dict_container_types (
    type_code VARCHAR(20) PRIMARY KEY,
    type_name_cn VARCHAR(50) NOT NULL,
    type_name_en VARCHAR(50) NOT NULL,
    size_ft INT,
    type_abbrev VARCHAR(50),
    full_name VARCHAR(100),
    dimensions VARCHAR(50),
    max_weight_kg DECIMAL(10,2),
    max_cbm DECIMAL(8,2),
    teu DECIMAL(4,2),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. 娴峰鍏徃瀛楀吀 (dict_overseas_companies)
CREATE TABLE IF NOT EXISTS dict_overseas_companies (
    company_code VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    company_name_en VARCHAR(200),
    country VARCHAR(50),
    address VARCHAR(200),
    contact_person VARCHAR(50),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    currency VARCHAR(50),
    tax_id VARCHAR(50),
    bank_name VARCHAR(100),
    bank_account VARCHAR(50),
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. 浠撳簱瀛楀吀 (dict_warehouses)
CREATE TABLE IF NOT EXISTS dict_warehouses (
    warehouse_code VARCHAR(50) PRIMARY KEY,
    warehouse_name VARCHAR(100) NOT NULL,
    warehouse_name_en VARCHAR(200),
    short_name VARCHAR(100),
    property_type VARCHAR(20) NOT NULL,
    warehouse_type VARCHAR(20),
    company_code VARCHAR(50),
    address VARCHAR(300),
    city VARCHAR(100),
    state VARCHAR(50),
    country VARCHAR(50) NOT NULL,
    contact_phone VARCHAR(50),
    contact_email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    daily_unload_capacity INTEGER DEFAULT 10,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_warehouse_company FOREIGN KEY (company_code)
        REFERENCES dict_overseas_companies(company_code) ON DELETE SET NULL
);

COMMENT ON COLUMN dict_warehouses.daily_unload_capacity IS '仓库每日卸柜容量（柜数），默认 10';

CREATE INDEX idx_warehouses_country ON dict_warehouses(country);
CREATE INDEX idx_warehouses_property_type ON dict_warehouses(property_type);
CREATE INDEX idx_warehouses_company ON dict_warehouses(company_code);

-- ============================================================
-- 娴佺▼琛?(Process Tables)
-- ============================================================

-- 14. 海运信息表 (process_sea_freight) - 提前创建，因为 biz_containers 需要引用它
-- 字段类型统一为 TIMESTAMPTZ（支持时区），新增 revised_eta_dest_port
CREATE TABLE IF NOT EXISTS process_sea_freight (
    bill_of_lading_number VARCHAR(50) PRIMARY KEY,
    booking_number VARCHAR(50),
    shipping_company_id VARCHAR(50),
    port_of_loading VARCHAR(50),
    port_of_discharge VARCHAR(50),
    freight_forwarder_id VARCHAR(50),
    vessel_name VARCHAR(100),
    voyage_number VARCHAR(50),
    -- 目的港 ETA/ATA（TIMESTAMPTZ 支持时区）
    eta TIMESTAMPTZ,
    etd TIMESTAMPTZ,
    ata TIMESTAMPTZ,
    atd TIMESTAMPTZ,
    -- 修正 ETA（滞港费用，优先级高于 eta）
    revised_eta_dest_port TIMESTAMPTZ,
    customs_clearance_date DATE,
    mbl_scac VARCHAR(20),
    mbl_number VARCHAR(50),
    hbl_scac VARCHAR(20),
    hbl_number VARCHAR(50),
    ams_number VARCHAR(50),
    transit_port_code VARCHAR(50),
    transport_mode VARCHAR(20),
    mother_vessel_name VARCHAR(100),
    mother_voyage_number VARCHAR(50),
    -- 接货地/起运港时间
    shipment_date TIMESTAMPTZ, -- 接货地实际离开时间
    actual_loading_date TIMESTAMPTZ, -- 实际装船时间
    eta_origin TIMESTAMPTZ,
    ata_origin TIMESTAMPTZ,
    port_open_date TIMESTAMPTZ,
    port_close_date TIMESTAMPTZ,
    mother_shipment_date TIMESTAMPTZ,
    document_release_date DATE,
    port_entry_date DATE,
    rail_yard_entry_date DATE,
    truck_yard_entry_date DATE,
    freight_currency VARCHAR(50),
    standard_freight_amount DECIMAL(10,2),
    route_code VARCHAR(20),
    imo_number VARCHAR(20),
    mmsi_number VARCHAR(20),
    flag VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sea_freight_bol ON process_sea_freight(bill_of_lading_number);
CREATE INDEX idx_sea_freight_vessel ON process_sea_freight(vessel_name, voyage_number);

-- ============================================================
-- 涓氬姟琛?(Business Tables)
-- ============================================================

-- 11. 瀹㈡埛琛?(biz_customers)
CREATE TABLE IF NOT EXISTS biz_customers (
    customer_code VARCHAR(50) PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    customer_type_code VARCHAR(50),
    country VARCHAR(50),
    overseas_company_code VARCHAR(50),
    customer_category VARCHAR(20),
    address VARCHAR(200),
    contact_person VARCHAR(50),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    payment_term VARCHAR(50),
    price_term VARCHAR(20),
    tax_number VARCHAR(50),
    customs_code VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    sort_order INT DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (country) REFERENCES dict_countries(code) ON DELETE SET NULL,
    FOREIGN KEY (customer_type_code) REFERENCES dict_customer_types(type_code) ON DELETE SET NULL,
    FOREIGN KEY (overseas_company_code) REFERENCES dict_overseas_companies(company_code) ON DELETE SET NULL
);

CREATE INDEX idx_customers_country ON biz_customers(country);
CREATE INDEX idx_customers_type ON biz_customers(customer_type_code);

-- 12. 璐ф煖琛?(biz_containers)
CREATE TABLE IF NOT EXISTS biz_containers (
    container_number VARCHAR(50) PRIMARY KEY,
    bill_of_lading_number VARCHAR(50),
    container_type_code VARCHAR(50) NOT NULL,
    cargo_description TEXT,
    gross_weight DECIMAL(10,2),
    net_weight DECIMAL(10,2),
    cbm DECIMAL(8,2),
    packages INT,
    seal_number VARCHAR(50),
    inspection_required BOOLEAN DEFAULT false,
    is_unboxing BOOLEAN DEFAULT false,
    logistics_status VARCHAR(20) DEFAULT 'not_shipped',
    remarks TEXT,
    requires_pallet BOOLEAN DEFAULT false,
    requires_assembly BOOLEAN DEFAULT false,
    container_size INT,
    is_rolled BOOLEAN DEFAULT false,
    operator VARCHAR(50),
    container_holder VARCHAR(50),
    tare_weight DECIMAL(10,2),
    total_weight DECIMAL(10,2),
    over_length DECIMAL(6,2),
    over_height DECIMAL(6,2),
    danger_class VARCHAR(20),
    current_status_desc_cn VARCHAR(100),
    current_status_desc_en VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_type_code) REFERENCES dict_container_types(type_code) ON DELETE RESTRICT,
    FOREIGN KEY (bill_of_lading_number) REFERENCES process_sea_freight(bill_of_lading_number) ON DELETE SET NULL
);

CREATE INDEX idx_containers_status ON biz_containers(logistics_status);
CREATE INDEX idx_containers_type ON biz_containers(container_type_code);
CREATE INDEX idx_containers_bol ON biz_containers(bill_of_lading_number);

-- 13. 澶囪揣鍗曡〃 (biz_replenishment_orders)
CREATE TABLE IF NOT EXISTS biz_replenishment_orders (
    order_number VARCHAR(50) PRIMARY KEY,
    main_order_number VARCHAR(50),
    container_number VARCHAR(50),
    sell_to_country VARCHAR(50),
    customer_code VARCHAR(50),
    customer_name VARCHAR(100),
    order_status VARCHAR(20) DEFAULT 'DRAFT',
    procurement_trade_mode VARCHAR(20),
    price_terms VARCHAR(20),
    total_boxes INT DEFAULT 0,
    total_cbm DECIMAL(12,2) DEFAULT 0,
    total_gross_weight DECIMAL(12,2) DEFAULT 0,
    shipment_total_value DECIMAL(15,2),
    fob_amount DECIMAL(15,2),
    cif_amount DECIMAL(15,2),
    negotiation_amount DECIMAL(15,2),
    order_date DATE,
    expected_ship_date DATE,
    actual_ship_date DATE,
    container_required BOOLEAN DEFAULT false,
    inspection_required BOOLEAN DEFAULT false,
    is_assembly BOOLEAN DEFAULT false,
    pallet_required BOOLEAN DEFAULT false,
    special_cargo_volume DECIMAL(8,2),
    wayfair_spo VARCHAR(50),
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_code) REFERENCES biz_customers(customer_code) ON DELETE SET NULL,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE SET NULL
);

CREATE INDEX idx_replenishment_customer ON biz_replenishment_orders(customer_code);
CREATE INDEX idx_replenishment_container ON biz_replenishment_orders(container_number);
CREATE INDEX idx_replenishment_status ON biz_replenishment_orders(order_status);
CREATE INDEX idx_replenishment_date ON biz_replenishment_orders(actual_ship_date);

-- 13.5. 璐ф煖SKU鏄庣粏琛?(biz_container_skus)
CREATE TABLE IF NOT EXISTS biz_container_skus (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    order_number VARCHAR(50),
    sku_code VARCHAR(50) NOT NULL,
    sku_name VARCHAR(200),
    quantity INT NOT NULL,
    quantity_per_box INT,
    total_boxes INT,
    unit_price DECIMAL(10,2),
    total_value DECIMAL(12,2),
    gross_weight_per_unit DECIMAL(8,2),
    total_gross_weight DECIMAL(10,2),
    net_weight_per_unit DECIMAL(8,2),
    total_net_weight DECIMAL(10,2),
    cbm_per_unit DECIMAL(8,4),
    total_cbm DECIMAL(10,4),
    barcode VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE CASCADE,
    FOREIGN KEY (order_number) REFERENCES biz_replenishment_orders(order_number) ON DELETE SET NULL
);

CREATE INDEX idx_container_skus_container ON biz_container_skus(container_number);
CREATE INDEX idx_container_skus_order ON biz_container_skus(order_number);
CREATE INDEX idx_container_skus_sku ON biz_container_skus(sku_code);

-- ============================================================
-- 娴佺▼琛?(Process Tables)
-- ============================================================

-- 15. 港口操作表 (process_port_operations)
-- 字段命名统一：eta_dest_port→eta, ata_dest_port→ata, etd_transit→etd, atd_transit→atd
CREATE TABLE IF NOT EXISTS process_port_operations (
    id VARCHAR(50) PRIMARY KEY,
    container_number VARCHAR(50),
    port_type VARCHAR(20),
    port_code VARCHAR(50),
    port_name VARCHAR(100),
    port_sequence INT,
    -- 目的港 ETA/ATA（统一命名）
    eta TIMESTAMPTZ,
    ata TIMESTAMPTZ,
    -- 修正 ETA（滞港费用，优先级高于 eta）
    revised_eta TIMESTAMPTZ,
    eta_correction TIMESTAMPTZ,
    -- 卸船时间
    discharged_time TIMESTAMPTZ,
    dest_port_unload_date TIMESTAMPTZ,
    -- 中转港 ETD/ATD（统一命名）
    etd TIMESTAMPTZ,
    atd TIMESTAMPTZ,
    -- 中转港到港时间
    transit_arrival_date TIMESTAMPTZ,
    -- 其他时间字段
    gate_in_time TIMESTAMPTZ,
    gate_out_time TIMESTAMPTZ,
    available_time TIMESTAMPTZ,
    customs_status VARCHAR(20),
    isf_status VARCHAR(20),
    -- 最后免费日（滞港费按日计算）
    last_free_date DATE,
    last_free_date_mode VARCHAR(20),
    gate_in_terminal VARCHAR(50),
    gate_out_terminal VARCHAR(50),
    berth_position VARCHAR(50),
    planned_customs_date TIMESTAMPTZ,
    actual_customs_date DATE,
    customs_broker_code VARCHAR(50),
    document_status VARCHAR(20),
    all_generated_date DATE,
    customs_remarks TEXT,
    isf_declaration_date TIMESTAMPTZ,
    document_transfer_date TIMESTAMPTZ,
    free_storage_days INT,
    free_detention_days INT,
    free_off_terminal_days INT,
    -- 飞驼专用字段
    status_code VARCHAR(20),
    status_occurred_at TIMESTAMP,
    has_occurred BOOLEAN,
    location_name_en VARCHAR(100),
    location_name_cn VARCHAR(100),
    location_type VARCHAR(20),
    latitude DECIMAL(10,6),
    longitude DECIMAL(10,6),
    timezone INT,
    data_source VARCHAR(50),
    cargo_location VARCHAR(200),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE CASCADE
);

CREATE INDEX idx_port_operations_container ON process_port_operations(container_number);
CREATE INDEX idx_port_operations_port ON process_port_operations(port_code);
CREATE INDEX idx_port_operations_type ON process_port_operations(port_type);

-- 16. 鎷栧崱杩愯緭琛?(process_trucking_transport)
CREATE TABLE IF NOT EXISTS process_trucking_transport (
    container_number VARCHAR(50) PRIMARY KEY,
    trucking_type VARCHAR(20),
    is_pre_pickup BOOLEAN DEFAULT false,
    trucking_company_id VARCHAR(50),
    pickup_notification TEXT,
    carrier_company VARCHAR(100),
    last_pickup_date DATE,
    planned_pickup_date DATE,
    pickup_date TIMESTAMP,
    last_delivery_date DATE,
    planned_delivery_date DATE,
    delivery_date TIMESTAMP,
    unload_mode_plan VARCHAR(20),
    driver_name VARCHAR(50),
    driver_phone VARCHAR(20),
    truck_plate VARCHAR(20),
    pickup_location VARCHAR(200),
    delivery_location VARCHAR(200),
    distance_km DECIMAL(8,2),
    cost DECIMAL(10,2),
    schedule_status VARCHAR(20) DEFAULT 'initial',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE CASCADE
);

-- 17. 浠撳簱鎿嶄綔琛?(process_warehouse_operations)
CREATE TABLE IF NOT EXISTS process_warehouse_operations (
    container_number VARCHAR(50) PRIMARY KEY,
    operation_type VARCHAR(20),
    warehouse_id VARCHAR(50),
    planned_warehouse VARCHAR(50),
    actual_warehouse VARCHAR(50),
    warehouse_group VARCHAR(50),
    warehouse_arrival_date TIMESTAMP,
    unload_mode_actual VARCHAR(20),
    last_unload_date DATE,
    planned_unload_date TIMESTAMP,
    unload_date TIMESTAMP,
    wms_status VARCHAR(20),
    ebs_status VARCHAR(20),
    wms_confirm_date TIMESTAMP,
    unload_gate VARCHAR(50),
    unload_company VARCHAR(100),
    notification_pickup_date DATE,
    pickup_time TIMESTAMP,
    warehouse_remarks TEXT,
    gate_in_time TIMESTAMP,
    gate_out_time TIMESTAMP,
    storage_start_date DATE,
    storage_end_date DATE,
    is_unboxing BOOLEAN DEFAULT false,
    unboxing_time TIMESTAMP,
    cargo_received_by VARCHAR(50),
    cargo_delivered_to VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE CASCADE,
    FOREIGN KEY (warehouse_id) REFERENCES dict_warehouses(warehouse_code) ON DELETE SET NULL
);

CREATE INDEX idx_warehouse_operations_container ON process_warehouse_operations(container_number);
CREATE INDEX idx_warehouse_operations_warehouse ON process_warehouse_operations(warehouse_id);

-- 18. 杩樼┖绠辫〃 (process_empty_return)
CREATE TABLE IF NOT EXISTS process_empty_return (
    container_number VARCHAR(50) PRIMARY KEY,
    last_return_date TIMESTAMP,
    planned_return_date TIMESTAMP,
    return_time TIMESTAMP,
    notification_return_date DATE,
    notification_return_time TIMESTAMP,
    return_terminal_code VARCHAR(50),
    return_terminal_name VARCHAR(100),
    container_condition VARCHAR(20),
    return_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE CASCADE
);

-- ============================================================
-- 鎵╁睍琛?(Extension Tables)
-- ============================================================

-- 19. 闆嗚绠辩姸鎬佷簨浠惰〃 (ext_container_status_events)
CREATE TABLE IF NOT EXISTS ext_container_status_events (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    status_code VARCHAR(20),
    status_name VARCHAR(100),
    occurred_at TIMESTAMP,
    location VARCHAR(200),
    description TEXT,
    data_source VARCHAR(50),
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE CASCADE
);

CREATE INDEX idx_status_events_container ON ext_container_status_events(container_number);
CREATE INDEX idx_status_events_time ON ext_container_status_events(occurred_at DESC);

-- 20. 闆嗚绠辫杞借褰曡〃 (ext_container_loading_records)
CREATE TABLE IF NOT EXISTS ext_container_loading_records (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    load_number VARCHAR(50),
    loading_port VARCHAR(50),
    loading_date TIMESTAMP,
    discharge_port VARCHAR(50),
    discharge_date TIMESTAMP,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE CASCADE
);

-- 21. 闆嗚绠盚OLD璁板綍琛?(ext_container_hold_records)
CREATE TABLE IF NOT EXISTS ext_container_hold_records (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    hold_type VARCHAR(20),
    hold_reason TEXT,
    hold_date TIMESTAMP,
    release_date TIMESTAMP,
    status VARCHAR(20),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE CASCADE
);

-- 22. 闆嗚绠辫垂鐢ㄨ褰曡〃 (ext_container_charges)
CREATE TABLE IF NOT EXISTS ext_container_charges (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    charge_type VARCHAR(50),
    charge_amount DECIMAL(12,2),
    charge_currency VARCHAR(50),
    charge_date DATE,
    description TEXT,
    status VARCHAR(20),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE CASCADE
);

CREATE INDEX idx_charges_container ON ext_container_charges(container_number);
CREATE INDEX idx_charges_type ON ext_container_charges(charge_type);

-- ============================================================
-- 物流节点映射表 (Mapping Tables)
-- ============================================================

-- 23. 港口-仓库映射表
CREATE TABLE IF NOT EXISTS dict_port_warehouse_mapping (
    id SERIAL PRIMARY KEY,
    port_code VARCHAR(50) NOT NULL,
    port_name VARCHAR(100),
    warehouse_code VARCHAR(50) NOT NULL,
    warehouse_name VARCHAR(100),
    mapping_type VARCHAR(20) DEFAULT 'DEFAULT',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_port_warehouse_port ON dict_port_warehouse_mapping(port_code);
CREATE INDEX idx_port_warehouse_warehouse ON dict_port_warehouse_mapping(warehouse_code);
CREATE INDEX idx_port_warehouse_active ON dict_port_warehouse_mapping(is_active);

COMMENT ON TABLE dict_port_warehouse_mapping IS '港口-仓库映射表，用于甘特图分组显示';

-- 24. 仓库-车队映射表
CREATE TABLE IF NOT EXISTS dict_warehouse_trucking_mapping (
    id SERIAL PRIMARY KEY,
    country VARCHAR(50) NOT NULL,
    warehouse_code VARCHAR(50) NOT NULL,
    warehouse_name VARCHAR(100),
    trucking_company_id VARCHAR(50) NOT NULL,
    trucking_company_name VARCHAR(100),
    mapping_type VARCHAR(20) DEFAULT 'DEFAULT',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warehouse_trucking_country ON dict_warehouse_trucking_mapping(country);
CREATE INDEX idx_warehouse_trucking_warehouse ON dict_warehouse_trucking_mapping(warehouse_code);
CREATE INDEX idx_warehouse_trucking_company ON dict_warehouse_trucking_mapping(trucking_company_id);
CREATE INDEX idx_warehouse_trucking_active ON dict_warehouse_trucking_mapping(is_active);

COMMENT ON TABLE dict_warehouse_trucking_mapping IS '仓库-车队映射表，用于甘特图分组显示';

-- 25. 车队-港口映射表
CREATE TABLE IF NOT EXISTS dict_trucking_port_mapping (
    id SERIAL PRIMARY KEY,
    country VARCHAR(50) NOT NULL,
    trucking_company_id VARCHAR(50) NOT NULL,
    trucking_company_name VARCHAR(200),
    port_code VARCHAR(50) NOT NULL,
    port_name VARCHAR(100),
    yard_capacity DECIMAL(10,2) DEFAULT 0,
    standard_rate DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(20),
    yard_operation_fee DECIMAL(10,2) DEFAULT 0,
    mapping_type VARCHAR(20) DEFAULT 'DEFAULT',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trucking_port_country ON dict_trucking_port_mapping(country);
CREATE INDEX idx_trucking_port_company ON dict_trucking_port_mapping(trucking_company_id);
CREATE INDEX idx_trucking_port_port ON dict_trucking_port_mapping(port_code);
CREATE INDEX idx_trucking_port_active ON dict_trucking_port_mapping(is_active);

COMMENT ON TABLE dict_trucking_port_mapping IS '车队-港口映射表，包含费用信息，用于甘特图分组显示';

-- ============================================================
-- AI 流程相关表 (AI Flow Tables)
-- ============================================================

-- 26. 流程定义表 (flow_definitions)
CREATE TABLE IF NOT EXISTS flow_definitions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    version VARCHAR(20) DEFAULT '1.0.0',
    created_by VARCHAR(50),
    nodes JSONB NOT NULL DEFAULT '[]',
    start_node_id VARCHAR(50),
    variables JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flow_definitions_name ON flow_definitions(name);
CREATE INDEX idx_flow_definitions_created_at ON flow_definitions(created_at DESC);

-- 27. 流程实例表 (flow_instances)
CREATE TABLE IF NOT EXISTS flow_instances (
    id VARCHAR(50) PRIMARY KEY,
    flow_id VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    variables JSONB,
    current_node_id VARCHAR(50),
    execution_history JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (flow_id) REFERENCES flow_definitions(id) ON DELETE CASCADE
);

CREATE INDEX idx_flow_instances_flow_id ON flow_instances(flow_id);
CREATE INDEX idx_flow_instances_status ON flow_instances(status);
CREATE INDEX idx_flow_instances_created_at ON flow_instances(created_at DESC);








