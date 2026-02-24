-- ==========================================
-- 完整数据库初始化脚本
-- Complete Database Initialization Script
-- ==========================================

-- 1. 创建字典表 (Dictionary Tables)
-- ==========================================

-- 港口字典
CREATE TABLE IF NOT EXISTS dict_ports (
    port_code VARCHAR(50) PRIMARY KEY,
    port_name VARCHAR(100) NOT NULL,
    port_name_en VARCHAR(100),
    port_type VARCHAR(20),
    country VARCHAR(50),
    state VARCHAR(50),
    city VARCHAR(100),
    timezone INT,
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    status VARCHAR(10) DEFAULT 'ACTIVE',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ports_country ON dict_ports(country);
CREATE INDEX idx_ports_type ON dict_ports(port_type);

-- 船公司字典
CREATE TABLE IF NOT EXISTS dict_shipping_companies (
    company_code VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    company_name_en VARCHAR(100),
    scac_code VARCHAR(20),
    website_url VARCHAR(200),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    status VARCHAR(10) DEFAULT 'ACTIVE',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 柜型字典
CREATE TABLE IF NOT EXISTS dict_container_types (
    type_code VARCHAR(20) PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    type_name_en VARCHAR(50),
    length_ft DECIMAL(5, 2),
    width_ft DECIMAL(5, 2),
    height_ft DECIMAL(5, 2),
    cbm_capacity DECIMAL(8, 2),
    max_weight_kg INT,
    status VARCHAR(10) DEFAULT 'ACTIVE',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 货代公司字典
CREATE TABLE IF NOT EXISTS dict_freight_forwarders (
    forwarder_code VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    company_name_en VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    status VARCHAR(10) DEFAULT 'ACTIVE',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 清关公司字典
CREATE TABLE IF NOT EXISTS dict_customs_brokers (
    broker_code VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    company_name_en VARCHAR(100),
    country VARCHAR(50),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    status VARCHAR(10) DEFAULT 'ACTIVE',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 拖车公司字典
CREATE TABLE IF NOT EXISTS dict_trucking_companies (
    company_code VARCHAR(50) PRIMARY KEY,
    company_name VARCHAR(100) NOT NULL,
    company_name_en VARCHAR(100),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    status VARCHAR(10) DEFAULT 'ACTIVE',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 仓库字典
CREATE TABLE IF NOT EXISTS dict_warehouses (
    warehouse_code VARCHAR(50) PRIMARY KEY,
    warehouse_name VARCHAR(100) NOT NULL,
    warehouse_name_en VARCHAR(100),
    warehouse_type VARCHAR(50),
    country VARCHAR(50),
    state VARCHAR(50),
    city VARCHAR(100),
    address VARCHAR(200),
    contact_phone VARCHAR(20),
    contact_email VARCHAR(100),
    status VARCHAR(10) DEFAULT 'ACTIVE',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 创建业务表 (Business Tables)
-- ==========================================

-- 备货单表
CREATE TABLE IF NOT EXISTS biz_replenishment_orders (
    order_number VARCHAR(50) PRIMARY KEY,
    main_order_number VARCHAR(50),
    sell_to_country VARCHAR(50),
    customer_name VARCHAR(100),
    order_status VARCHAR(20) DEFAULT 'DRAFT',
    procurement_trade_mode VARCHAR(20),
    price_terms VARCHAR(20),
    total_boxes INT DEFAULT 0,
    total_cbm DECIMAL(12, 2) DEFAULT 0,
    total_gross_weight DECIMAL(12, 2) DEFAULT 0,
    shipment_total_value DECIMAL(15, 2),
    fob_amount DECIMAL(15, 2),
    cif_amount DECIMAL(15, 2),
    negotiation_amount DECIMAL(15, 2),
    order_date DATE,
    expected_ship_date DATE,
    actual_ship_date DATE,
    created_by VARCHAR(50),
    container_required BOOLEAN DEFAULT FALSE,
    special_cargo_volume DECIMAL(8, 2),
    wayfair_spo VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (main_order_number) REFERENCES biz_replenishment_orders(order_number)
);

CREATE INDEX idx_ro_status ON biz_replenishment_orders(order_status);
CREATE INDEX idx_ro_customer ON biz_replenishment_orders(customer_name);

-- 货柜表
CREATE TABLE IF NOT EXISTS biz_containers (
    container_number VARCHAR(50) PRIMARY KEY,
    order_number VARCHAR(50) NOT NULL,
    container_type_code VARCHAR(10) NOT NULL,
    cargo_description TEXT,
    gross_weight DECIMAL(10, 2),
    net_weight DECIMAL(10, 2),
    cbm DECIMAL(8, 2),
    packages INT,
    seal_number VARCHAR(50),
    inspection_required BOOLEAN DEFAULT FALSE,
    is_unboxing BOOLEAN DEFAULT FALSE,
    logistics_status VARCHAR(20) DEFAULT 'not_shipped',
    requires_pallet BOOLEAN DEFAULT FALSE,
    container_size INT,
    is_rolled BOOLEAN DEFAULT FALSE,
    operator VARCHAR(50),
    container_holder VARCHAR(50),
    tare_weight DECIMAL(10, 2),
    total_weight DECIMAL(10, 2),
    over_length DECIMAL(6, 2),
    over_height DECIMAL(6, 2),
    danger_class VARCHAR(20),
    current_status_desc_cn VARCHAR(100),
    current_status_desc_en VARCHAR(100),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_number) REFERENCES biz_replenishment_orders(order_number),
    FOREIGN KEY (container_type_code) REFERENCES dict_container_types(type_code)
);

CREATE INDEX idx_c_order ON biz_containers(order_number);
CREATE INDEX idx_c_status ON biz_containers(logistics_status);

-- 3. 创建流程表 (Process Tables)
-- ==========================================

-- 海运信息表
CREATE TABLE IF NOT EXISTS process_sea_freight (
    id VARCHAR(50) PRIMARY KEY,
    container_number VARCHAR(50) UNIQUE NOT NULL,
    bill_of_lading_number VARCHAR(50),
    booking_number VARCHAR(50),
    shipping_company_id VARCHAR(50),
    vessel_name VARCHAR(100),
    voyage_number VARCHAR(50),
    port_of_loading VARCHAR(50),
    port_of_discharge VARCHAR(50),
    freight_forwarder_id VARCHAR(50),
    eta DATE,
    etd DATE,
    ata DATE,
    atd DATE,
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
    shipment_date DATE,
    mother_shipment_date DATE,
    document_release_date DATE,
    port_entry_date DATE,
    rail_yard_entry_date DATE,
    truck_yard_entry_date DATE,
    route_code VARCHAR(20),
    imo_number VARCHAR(20),
    mmsi_number VARCHAR(20),
    flag VARCHAR(50),
    eta_origin DATE,
    ata_origin DATE,
    port_open_date DATE,
    port_close_date DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number)
);

CREATE INDEX idx_sf_bl ON process_sea_freight(bill_of_lading_number);
CREATE INDEX idx_sf_booking ON process_sea_freight(booking_number);

-- 港口操作表
CREATE TABLE IF NOT EXISTS process_port_operations (
    id VARCHAR(50) PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    port_type VARCHAR(20),
    port_code VARCHAR(50),
    port_name VARCHAR(100),
    port_sequence INT,
    eta_dest_port DATE,
    ata_dest_port DATE,
    etd_transit DATE,
    atd_transit DATE,
    gate_in_time TIMESTAMP,
    gate_out_time TIMESTAMP,
    discharged_time TIMESTAMP,
    available_time TIMESTAMP,
    customs_status VARCHAR(20),
    isf_status VARCHAR(20),
    last_free_date DATE,
    gate_in_terminal VARCHAR(50),
    gate_out_terminal VARCHAR(50),
    berth_position VARCHAR(50),
    eta_correction TIMESTAMP,
    dest_port_unload_date DATE,
    planned_customs_date DATE,
    actual_customs_date DATE,
    customs_broker_code VARCHAR(50),
    document_status VARCHAR(20),
    all_generated_date DATE,
    customs_remarks TEXT,
    isf_declaration_date DATE,
    document_transfer_date DATE,
    status_code VARCHAR(20),
    status_occurred_at TIMESTAMP,
    has_occurred BOOLEAN,
    location_name_en VARCHAR(100),
    location_name_cn VARCHAR(100),
    location_type VARCHAR(20),
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    timezone INT,
    data_source VARCHAR(50),
    cargo_location VARCHAR(200),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number)
);

CREATE INDEX idx_po_container ON process_port_operations(container_number);
CREATE INDEX idx_po_port ON process_port_operations(port_code);

-- 拖卡运输表
CREATE TABLE IF NOT EXISTS process_trucking (
    id VARCHAR(50) PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    trucking_type VARCHAR(20),
    is_pre_pickup BOOLEAN DEFAULT FALSE,
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
    distance_km DECIMAL(8, 2),
    cost DECIMAL(10, 2),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number)
);

CREATE INDEX idx_pt_container ON process_trucking(container_number);

-- 仓库操作表
CREATE TABLE IF NOT EXISTS process_warehouse_operations (
    id VARCHAR(50) PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    operation_type VARCHAR(20),
    warehouse_id VARCHAR(50),
    planned_warehouse VARCHAR(50),
    warehouse_group VARCHAR(50),
    warehouse_arrival_date DATE,
    unload_mode_actual VARCHAR(20),
    last_unload_date DATE,
    planned_unload_date DATE,
    unload_date TIMESTAMP,
    wms_status VARCHAR(20),
    ebs_status VARCHAR(20),
    wms_confirm_date DATE,
    unload_gate VARCHAR(50),
    unload_company VARCHAR(100),
    notification_pickup_date DATE,
    pickup_time TIMESTAMP,
    warehouse_remarks TEXT,
    gate_in_time TIMESTAMP,
    gate_out_time TIMESTAMP,
    storage_start_date DATE,
    storage_end_date DATE,
    is_unboxing BOOLEAN DEFAULT FALSE,
    unboxing_time TIMESTAMP,
    cargo_received_by VARCHAR(50),
    cargo_delivered_to VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number),
    FOREIGN KEY (warehouse_id) REFERENCES dict_warehouses(warehouse_code)
);

CREATE INDEX idx_wo_container ON process_warehouse_operations(container_number);

-- 还空箱表
CREATE TABLE IF NOT EXISTS process_empty_returns (
    id VARCHAR(50) PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    last_return_date DATE,
    planned_return_date DATE,
    return_time TIMESTAMP,
    return_terminal_code VARCHAR(50),
    return_terminal_name VARCHAR(100),
    container_condition VARCHAR(20),
    return_remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number)
);

CREATE INDEX idx_er_container ON process_empty_returns(container_number);

-- 4. 创建飞驼数据扩展表 (FeiTuo Extension Tables)
-- ==========================================

-- 集装箱状态节点表
CREATE TABLE IF NOT EXISTS container_status_events (
    id VARCHAR(50) PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    status_code VARCHAR(20) NOT NULL,
    occurred_at TIMESTAMP NOT NULL,
    is_estimated BOOLEAN DEFAULT FALSE,
    location_code VARCHAR(50),
    location_name_en VARCHAR(100),
    location_name_cn VARCHAR(100),
    location_name_original VARCHAR(100),
    status_type VARCHAR(20),
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    timezone INT,
    terminal_name VARCHAR(50),
    cargo_location VARCHAR(200),
    data_source VARCHAR(50),
    description_cn VARCHAR(100),
    description_en VARCHAR(100),
    description_original VARCHAR(100),
    route_path VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number)
);

CREATE INDEX idx_cse_container ON container_status_events(container_number);
CREATE INDEX idx_cse_status ON container_status_events(status_code);
CREATE INDEX idx_cse_occurred ON container_status_events(occurred_at);

-- 集装箱装载记录表
CREATE TABLE IF NOT EXISTS container_loading_records (
    id VARCHAR(50) PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    route_path INT NOT NULL,
    -- 船舶信息
    vessel_name VARCHAR(200),
    voyage_number VARCHAR(50),
    -- 提单和订舱信息
    bill_of_lading_number VARCHAR(100),
    booking_number VARCHAR(100),
    -- 起始地信息
    origin_port_code VARCHAR(50),
    origin_name_standard VARCHAR(100),
    origin_name_original VARCHAR(100),
    origin_latitude DECIMAL(10, 6),
    origin_longitude DECIMAL(10, 6),
    origin_timezone INT,
    -- 目的地信息
    dest_port_code VARCHAR(50),
    destination_name_standard VARCHAR(100),
    destination_name_original VARCHAR(100),
    destination_cargo_location VARCHAR(200),
    destination_latitude DECIMAL(10, 6),
    destination_longitude DECIMAL(10, 6),
    destination_timezone INT,
    -- 时间节点
    eta_origin TIMESTAMP,
    ata_origin TIMESTAMP,
    eta_dest TIMESTAMP,
    ata_dest TIMESTAMP,
    loading_date TIMESTAMP,
    discharge_date TIMESTAMP,
    estimated_departure_time TIMESTAMP,
    estimated_arrival_time TIMESTAMP,
    actual_arrival_time TIMESTAMP,
    -- 运输信息
    transport_mode VARCHAR(20),
    transport_info TEXT,
    -- 航线和船公司信息
    route_code VARCHAR(50),
    carrier_code VARCHAR(50),
    carrier_name VARCHAR(200),
    operator VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number)
);

CREATE INDEX idx_clr_container ON container_loading_records(container_number);
CREATE INDEX idx_clr_route ON container_loading_records(route_path);

-- HOLD记录表
CREATE TABLE IF NOT EXISTS container_hold_records (
    id VARCHAR(50) PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    bill_of_lading_number VARCHAR(50),
    hold_type VARCHAR(50),
    hold_status VARCHAR(20),
    hold_date DATE,
    hold_description TEXT,
    released_at TIMESTAMP,
    release_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number)
);

CREATE INDEX idx_chr_container ON container_hold_records(container_number);
CREATE INDEX idx_chr_status ON container_hold_records(hold_status);

-- 费用记录表
CREATE TABLE IF NOT EXISTS container_charges (
    id VARCHAR(50) PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    bill_of_lading_number VARCHAR(50),
    charge_type VARCHAR(50),
    amount DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    charge_status VARCHAR(20),
    charge_date DATE,
    charge_description TEXT,
    paid_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number)
);

CREATE INDEX idx_cc_container ON container_charges(container_number);
CREATE INDEX idx_cc_type ON container_charges(charge_type);
CREATE INDEX idx_cc_status ON container_charges(charge_status);

-- 5. 创建扩展表 (Extension Tables)
-- ==========================================

-- 滞港费标准表
CREATE TABLE IF NOT EXISTS ext_demurrage_standards (
    id SERIAL PRIMARY KEY,
    foreign_company_code VARCHAR(50),
    foreign_company_name VARCHAR(100),
    effective_date DATE,
    expiry_date DATE,
    destination_port_code VARCHAR(50),
    destination_port_name VARCHAR(100),
    shipping_company_code VARCHAR(50),
    shipping_company_name VARCHAR(100),
    terminal VARCHAR(100),
    origin_forwarder_code VARCHAR(50),
    origin_forwarder_name VARCHAR(100),
    transport_mode_code VARCHAR(20),
    transport_mode_name VARCHAR(50),
    charge_type_code VARCHAR(50),
    charge_name VARCHAR(100),
    is_chargeable VARCHAR(1) DEFAULT 'N',
    sequence_number INT,
    port_condition VARCHAR(20),
    free_days_basis VARCHAR(20),
    free_days INT,
    calculation_basis VARCHAR(20),
    process_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ds_port ON ext_demurrage_standards(destination_port_code);
CREATE INDEX idx_ds_company ON ext_demurrage_standards(shipping_company_code);
CREATE INDEX idx_ds_effective ON ext_demurrage_standards(effective_date, expiry_date);

-- 滞港费记录表
CREATE TABLE IF NOT EXISTS ext_demurrage_records (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(50),
    charge_type VARCHAR(50),
    charge_name VARCHAR(100),
    free_days INT,
    free_days_basis VARCHAR(20),
    calculation_basis VARCHAR(20),
    charge_start_date DATE,
    charge_end_date DATE,
    charge_days INT,
    charge_amount DECIMAL(12, 2),
    currency VARCHAR(10) DEFAULT 'USD',
    charge_status VARCHAR(20),
    invoice_number VARCHAR(50),
    invoice_date DATE,
    payment_date DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number)
);

CREATE INDEX idx_dr_container ON ext_demurrage_records(container_number);
CREATE INDEX idx_dr_status ON ext_demurrage_records(charge_status);

-- 6. 创建系统表 (System Tables)
-- ==========================================

-- 用户表
CREATE TABLE IF NOT EXISTS sys_users (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    department VARCHAR(50),
    position VARCHAR(50),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    last_login_at TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON sys_users(email);
CREATE INDEX idx_users_status ON sys_users(status);

-- 角色表
CREATE TABLE IF NOT EXISTS sys_roles (
    role_id VARCHAR(50) PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL,
    role_description TEXT,
    permissions JSON,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 用户角色关联表
CREATE TABLE IF NOT EXISTS sys_user_roles (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    role_id VARCHAR(50) NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(50),
    FOREIGN KEY (user_id) REFERENCES sys_users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES sys_roles(role_id) ON DELETE CASCADE,
    UNIQUE(user_id, role_id)
);

CREATE INDEX idx_ur_user ON sys_user_roles(user_id);
CREATE INDEX idx_ur_role ON sys_user_roles(role_id);

-- 操作日志表
CREATE TABLE IF NOT EXISTS sys_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(50),
    old_data JSON,
    new_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sys_users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_audit_user ON sys_audit_logs(user_id);
CREATE INDEX idx_audit_action ON sys_audit_logs(action);
CREATE INDEX idx_audit_entity ON sys_audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_created ON sys_audit_logs(created_at);

-- 系统配置表
CREATE TABLE IF NOT EXISTS sys_configs (
    config_key VARCHAR(100) PRIMARY KEY,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'STRING',
    description TEXT,
    is_encrypted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 通知表
CREATE TABLE IF NOT EXISTS sys_notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50),
    notification_type VARCHAR(50),
    title VARCHAR(200),
    message TEXT,
    data JSON,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES sys_users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_notif_user ON sys_notifications(user_id);
CREATE INDEX idx_notif_read ON sys_notifications(is_read);
CREATE INDEX idx_notif_created ON sys_notifications(created_at);

-- 7. 初始化字典数据
-- ==========================================

-- 插入港口数据
INSERT INTO dict_ports (port_code, port_name, port_name_en, country, city) VALUES
('CNYTN', '盐田港', 'Yantian Port', '中国', '深圳'),
('CNSZX', '蛇口港', 'Shekou Port', '中国', '深圳'),
('CNNGS', '宁波港', 'Ningbo Port', '中国', '宁波'),
('CNSHG', '上海港', 'Shanghai Port', '中国', '上海'),
('CNQDG', '青岛港', 'Qingdao Port', '中国', '青岛'),
('USLGB', '长滩港', 'Long Beach Port', '美国', '洛杉矶'),
('USLAX', '洛杉矶港', 'Los Angeles Port', '美国', '洛杉矶'),
('DEHAM', '汉堡港', 'Hamburg Port', '德国', '汉堡'),
('NLRTM', '鹿特丹港', 'Rotterdam Port', '荷兰', '鹿特丹'),
('GBFXT', '菲利克斯托港', 'Felixstowe Port', '英国', '菲利克斯托')
ON CONFLICT (port_code) DO NOTHING;

-- 插入船公司数据
INSERT INTO dict_shipping_companies (company_code, company_name, company_name_en, scac_code) VALUES
('MSC', '地中海航运', 'Mediterranean Shipping Company', 'MSCU'),
('MAERSK', '马士基', 'Maersk', 'MAEU'),
('COSCO', '中远海运', 'COSCO Shipping', 'COSU'),
('EVERGREEN', '长荣海运', 'Evergreen Marine', 'EGLV'),
('ONE', '海洋网联', 'Ocean Network Express', 'ONE'),
('HAPAGLLOYD', '赫伯罗特', 'Hapag-Lloyd', 'HLCU'),
('CMA', '达飞轮船', 'CMA CGM', 'CMACG'),
('PIL', '太平船务', 'Pacific International Lines', 'PIL'),
('WANHAI', '万海航运', 'Wan Hai Lines', 'WHL'),
('SITC', '新时达', 'SITC Container Lines', 'SITC')
ON CONFLICT (company_code) DO NOTHING;

-- 插入柜型数据
INSERT INTO dict_container_types (type_code, type_name, type_name_en, length_ft, width_ft, height_ft, cbm_capacity, max_weight_kg) VALUES
('20GP', '20英尺普柜', '20ft General Purpose', 20, 8, 8.5, 33.1, 21700),
('40GP', '40英尺普柜', '40ft General Purpose', 40, 8, 8.5, 67.7, 26630),
('40HQ', '40英尺高柜', '40ft High Cube', 40, 8, 9.5, 76.3, 26580),
('45HQ', '45英尺高柜', '45ft High Cube', 45, 8, 9.5, 85.9, 27700),
('20OT', '20英尺开顶柜', '20ft Open Top', 20, 8, 8.5, 31.5, 21720),
('40OT', '40英尺开顶柜', '40ft Open Top', 40, 8, 8.5, 65.9, 26530)
ON CONFLICT (type_code) DO NOTHING;

-- 插入默认用户
INSERT INTO sys_users (user_id, username, email, password_hash, full_name, department, position) VALUES
('admin', 'admin', 'admin@logix.com', '$2b$10$placeholder', '系统管理员', 'IT', '管理员'),
('demo', 'demo', 'demo@logix.com', '$2b$10$placeholder', '演示用户', '物流部', '操作员')
ON CONFLICT (user_id) DO NOTHING;

-- 插入默认角色
INSERT INTO sys_roles (role_id, role_name, role_description, permissions) VALUES
('ADMIN', '管理员', '系统管理员，拥有所有权限', '["*"]'::json),
('OPERATOR', '操作员', '物流操作员，可操作业务数据', '["orders:*", "containers:*", "sea_freight:*", "port_operations:*"]'::json),
('VIEWER', '查看员', '只能查看数据，不能修改', '["orders:read", "containers:read"]'::json)
ON CONFLICT (role_id) DO NOTHING;

-- 为管理员分配角色
INSERT INTO sys_user_roles (user_id, role_id, assigned_by)
VALUES ('admin', 'ADMIN', 'system')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 插入系统配置
INSERT INTO sys_configs (config_key, config_value, config_type, description) VALUES
('system.name', 'LogiX 货柜物流管理系统', 'STRING', '系统名称'),
('system.version', '1.0.0', 'STRING', '系统版本'),
('demurrage.default_free_days', '7', 'NUMBER', '默认免费天数'),
('demurrage.default_currency', 'USD', 'STRING', '默认货币'),
('feituo.api.enabled', 'true', 'BOOLEAN', '是否启用飞驼API'),
('feituo.api.url', 'https://api.feituo.com', 'STRING', '飞驼API地址')
ON CONFLICT (config_key) DO NOTHING;

-- 完成
SELECT 'Database initialization completed successfully!' AS message;
