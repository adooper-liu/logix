-- LogiX 数据库初始化脚本
-- Database Initialization Script

-- 创建数据库 (如果需要)
-- CREATE DATABASE logix_db;

-- ============================================
-- 字典表初始数据
-- ============================================

-- 港口字典数据
INSERT INTO dict_ports (id, port_code, port_name, port_name_en, port_type, country, latitude, longitude, is_active) VALUES
('P001', 'SZX', '深圳港', 'Shenzhen Port', 'PORT', '中国', 22.5431, 114.0579, TRUE),
('P002', 'LAX', '洛杉矶港', 'Los Angeles Port', 'PORT', '美国', 33.7529, -118.4340, TRUE),
('P003', 'HKG', '香港港', 'Hong Kong Port', 'PORT', '中国', 22.2944, 114.1618, TRUE),
('P004', 'SHA', '上海港', 'Shanghai Port', 'PORT', '中国', 31.2304, 121.4737, TRUE),
('P005', 'NYC', '纽约港', 'New York Port', 'PORT', '美国', 40.7128, -74.0060, TRUE),
('P006', 'ROT', '鹿特丹港', 'Rotterdam Port', 'PORT', '荷兰', 51.9225, 4.47917, TRUE),
('P007', 'SIN', '新加坡港', 'Singapore Port', 'PORT', '新加坡', 1.3521, 103.8198, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 船公司字典数据
INSERT INTO dict_shipping_companies (id, company_code, company_name, company_name_en, contact_person, contact_phone, contact_email, is_active) VALUES
('SC001', 'MAERSK', '马士基', 'Maersk', '张经理', '0755-88888888', 'contact@maersk.com', TRUE),
('SC002', 'COSCO', '中远海运', 'COSCO', '李经理', '021-66666666', 'contact@cosco.com', TRUE),
('SC003', 'MSC', '地中海航运', 'MSC', '王经理', '020-77777777', 'contact@msc.com', TRUE),
('SC004', 'HAPAG', '赫伯罗特', 'Hapag-Lloyd', '赵经理', '0755-55555555', 'contact@hapag.com', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 柜型字典数据
INSERT INTO dict_container_types (id, container_code, container_name, length, width, height, max_weight, cbm, is_active) VALUES
('CT001', '20GP', '20英尺普通箱', 6.058, 2.438, 2.591, 21.75, 33.00, TRUE),
('CT002', '40GP', '40英尺普通箱', 12.192, 2.438, 2.591, 26.53, 67.00, TRUE),
('CT003', '40HQ', '40英尺高箱', 12.192, 2.438, 2.896, 26.38, 76.00, TRUE),
('CT004', '20HC', '20英尺高箱', 6.058, 2.438, 2.896, 21.90, 36.50, TRUE),
('CT005', '45HC', '45英尺高箱', 13.716, 2.438, 2.896, 27.60, 86.00, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 货代公司字典数据
INSERT INTO dict_freight_forwarders (id, forwarder_code, forwarder_name, forwarder_name_en, contact_person, contact_phone, contact_email, is_active) VALUES
('FF001', 'FF-SZX-001', '深圳国际货代', 'Shenzhen International FF', '陈先生', '0755-12345678', 'info@szxff.com', TRUE),
('FF002', 'FF-SHA-001', '上海远洋货代', 'Shanghai Ocean FF', '刘女士', '021-87654321', 'info@shaff.com', TRUE),
('FF003', 'FF-HKG-001', '香港环球货代', 'Hong Kong Global FF', '黄先生', '852-28765432', 'info@hkff.com', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 拖车公司字典数据
INSERT INTO dict_trucking_companies (id, company_code, company_name, contact_person, contact_phone, contact_email, is_active) VALUES
('TC001', 'TRUCK-SZX-001', '深圳顺通拖车', '周师傅', '0755-11112222', 'contact@shunton.com', TRUE),
('TC002', 'TRUCK-LAX-001', '洛杉矶快运拖车', 'Mike', '+1-310-5551234', 'info@latruck.com', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 仓库字典数据
INSERT INTO dict_warehouses (id, warehouse_code, warehouse_name, warehouse_type, address, city, country, latitude, longitude, is_active) VALUES
('WH001', 'WH-SZX-001', '深圳保税仓', 'Bonded', '深圳市南山区保税区', '深圳', '中国', 22.5300, 113.9300, TRUE),
('WH002', 'WH-SHA-001', '上海普通仓', 'General', '上海市浦东新区', '上海', '中国', 31.2200, 121.5500, TRUE),
('WH003', 'WH-LAX-001', '洛杉矶CFS仓', 'CFS', '123 Harbor Blvd, Los Angeles', '洛杉矶', '美国', 33.9300, -118.4000, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 系统用户初始数据
-- ============================================

-- 创建默认管理员用户 (密码: admin123, 需要在应用中使用 bcrypt 加密)
INSERT INTO sys_users (id, username, email, password_hash, full_name, department, position, phone, is_active) VALUES
('U001', 'admin', 'admin@logix.com', '$2b$10$YourHashedPasswordHere', '系统管理员', 'IT部', '系统架构师', '13800138000', TRUE),
('U002', 'operator', 'operator@logix.com', '$2b$10$YourHashedPasswordHere', '运营专员', '运营部', '物流专员', '13800138001', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 创建角色
INSERT INTO sys_roles (id, role_code, role_name, description, is_active) VALUES
('R001', 'ADMIN', '系统管理员', '拥有所有权限', TRUE),
('R002', 'OPERATOR', '运营专员', '日常运营操作权限', TRUE),
('R003', 'VIEWER', '查看者', '只读权限', TRUE)
ON CONFLICT (id) DO NOTHING;

-- 创建用户角色关联
INSERT INTO sys_user_roles (id, user_id, role_id) VALUES
('UR001', 'U001', 'R001'),
('UR002', 'U002', 'R002')
ON CONFLICT (user_id, role_id) DO NOTHING;

-- ============================================
-- 示例业务数据
-- ============================================

-- 创建示例备货单
INSERT INTO biz_replenishment_orders (
    order_number, sell_to_country, customer_name, order_status,
    procurement_trade_mode, price_terms, total_boxes, total_cbm,
    total_gross_weight, fob_amount, cif_amount, negotiation_amount,
    order_date, expected_ship_date, actual_ship_date, created_by
) VALUES
('RO202402240001', '美国', 'ABC Trading Co.', 'CONFIRMED',
 'FOB', 'FOB', 50, 150.00, 75000.00, 150000.00, 160000.00, 155000.00,
 '2024-02-01', '2024-02-25', '2024-02-26', 'U001'),
('RO202402240002', '德国', 'XYZ GmbH', 'SHIPPED',
 'CIF', 'CIF', 30, 90.00, 45000.00, 90000.00, 100000.00, 95000.00,
 '2024-02-05', '2024-02-20', '2024-02-21', 'U001')
ON CONFLICT (order_number) DO NOTHING;

-- 创建示例货柜
INSERT INTO biz_containers (
    container_number, order_number, container_type_code,
    cargo_description, gross_weight, net_weight, cbm, packages,
    seal_number, inspection_required, is_unboxing, logistics_status
) VALUES
('CNTR1234567', 'RO202402240001', '40HQ',
 '电子产品、服装、家居用品', 18000.00, 17500.00, 75.00, 500,
 'SZX20240226001', FALSE, FALSE, 'in_transit'),
('CNTR7654321', 'RO202402240001', '40HQ',
 '机械设备、配件', 18500.00, 18000.00, 76.00, 480,
 'SZX20240226002', FALSE, FALSE, 'in_transit'),
('CNTR9876543', 'RO202402240002', '40GP',
 '汽车配件、轮胎', 16000.00, 15500.00, 65.00, 400,
 'SHA20240221001', TRUE, FALSE, 'arrived')
ON CONFLICT (container_number) DO NOTHING;

-- 创建示例海运信息
INSERT INTO process_sea_freight (
    id, container_number, bill_of_lading_number, booking_number,
    shipping_company_id, vessel_name, voyage_number,
    port_of_loading, port_of_discharge, freight_forwarder_id,
    eta, etd, ata, atd
) VALUES
('SF001', 'CNTR1234567', 'B/L-SZX-LAX-240226', 'BK-SZX-LAX-240226',
 'SC001', 'MAERSK EMMA', '2415E',
 'P001', 'P002', 'FF001',
 '2024-03-05', '2024-02-26', '2024-02-27', '2024-02-26'),
('SF002', 'CNTR7654321', 'B/L-SZX-LAX-240226', 'BK-SZX-LAX-240226',
 'SC001', 'MAERSK EMMA', '2415E',
 'P001', 'P002', 'FF001',
 '2024-03-05', '2024-02-26', NULL, '2024-02-26'),
('SF003', 'CNTR9876543', 'B/L-SHA-ROT-240221', 'BK-SHA-ROT-240221',
 'SC002', 'COSCO SHIPPING', '2403S',
 'P004', 'P006', 'FF002',
 '2024-03-02', '2024-02-21', '2024-03-01', '2024-02-21')
ON CONFLICT (id) DO NOTHING;

-- 创建示例港口操作信息
INSERT INTO process_port_operations (
    id, container_number, port_type, port_code, port_name,
    eta_dest_port, ata_dest_port, gate_in_time, gate_out_time,
    discharged_time, available_time, customs_status, isf_status,
    last_free_date, gate_in_terminal
) VALUES
('PO001', 'CNTR1234567', 'origin', 'SZX', '深圳港',
 NULL, '2024-02-26', '2024-02-24 10:00:00', '2024-02-26 08:00:00',
 NULL, NULL, 'CLEARED', 'ACCEPTED',
 NULL, '深圳盐田港'),
('PO002', 'CNTR1234567', 'destination', 'LAX', '洛杉矶港',
 '2024-03-05', NULL, NULL, NULL,
 NULL, NULL, 'CLEARING', 'ACCEPTED',
 '2024-03-12', '洛杉矶港WWT码头'),
('PO003', 'CNTR9876543', 'origin', 'SHA', '上海港',
 NULL, '2024-02-21', '2024-02-20 14:00:00', '2024-02-21 09:00:00',
 NULL, NULL, 'CLEARED', 'ACCEPTED',
 NULL, '上海洋山港'),
('PO004', 'CNTR9876543', 'destination', 'ROT', '鹿特丹港',
 '2024-03-02', '2024-03-01', '2024-03-01 10:00:00', NULL,
 '2024-03-01 08:00:00', '2024-03-01 10:00:00', 'PENDING', 'ACCEPTED',
 '2024-03-08', '鹿特丹港ECT码头')
ON CONFLICT (id) DO NOTHING;

-- 滞港费标准示例数据
INSERT INTO ext_demurrage_standards (
    id, overseas_company_code, overseas_company_name, effective_date,
    destination_port_code, destination_port_name,
    shipping_company_code, shipping_company_name,
    origin_freight_forwarder_code, origin_freight_forwarder_name,
    transport_mode_code, transport_mode_name,
    charge_type_code, charge_name, is_chargeable, sequence_number,
    port_condition, free_days_basis, free_days, calculation_basis,
    rate_per_day, currency, process_status
) VALUES
('DS001', 'US001', '美国分公司', '2024-01-01',
 'P002', '洛杉矶港',
 'SC001', '马士基',
 'FF001', '深圳国际货代',
 'FCL', '整箱',
 'DEMU001', 'Demurrage Charge', 'N', 1,
 '好', '自然日', 5, '按到港',
 80.00, 'USD', 'ACTIVE'),
('DS002', 'US001', '美国分公司', '2024-01-01',
 'P002', '洛杉矶港',
 'SC001', '马士基',
 'FF001', '深圳国际货代',
 'FCL', '整箱',
 'STOR001', 'Storage Charge', 'N', 2,
 '好', '自然日', 5, '按卸船',
 50.00, 'USD', 'ACTIVE'),
('DS003', 'US001', '美国分公司', '2024-01-01',
 'P005', '纽约港',
 'SC001', '马士基',
 'FF001', '深圳国际货代',
 'FCL', '整箱',
 'DEMU001', 'Demurrage Charge', 'N', 1,
 '中', '自然日', 4, '按到港',
 90.00, 'USD', 'ACTIVE')
ON CONFLICT DO NOTHING;

COMMIT;

-- 显示初始化结果
SELECT 'Database initialization completed successfully!' AS status;
