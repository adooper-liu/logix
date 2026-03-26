-- ============================================================
-- 仓库字典数据初始化 (dict_warehouses)
-- 说明: 包含真实仓库数据，共129个仓库
-- 字段: property_type(自营仓/平台仓/第三方仓), company_code(关联海外公司)
-- ============================================================

-- 清空现有数据
TRUNCATE TABLE dict_warehouses CASCADE;

INSERT INTO dict_warehouses (
    warehouse_code, warehouse_name, warehouse_name_en, short_name,
    property_type, warehouse_type, company_code, address, city, state, country,
    status, remarks, created_at, updated_at
) VALUES
-- 加拿大仓库 (AOSOM_CA)
('CA-P003', 'FBW_CA', 'FBW_CA', 'FBW_CA', '平台仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '平台仓库', NOW(), NOW()),
('CA-S003', 'Oshawa', 'Oshawa', 'Oshawa', '自营仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '自营仓库', NOW(), NOW()),
('CA-S004', 'Elora', 'Elora', 'Elora', '自营仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '自营仓库', NOW(), NOW()),
('CA-S005', 'Oshawa RMA&Parts', 'Oshawa RMA&Parts', 'Oshawa RMA&Parts', '自营仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '自营仓库', NOW(), NOW()),
('CA-S006', 'Milton', 'Milton', 'Milton', '自营仓', 'NORMAL', 'AOSOM_CA', '8119 Trafalgar Rd, Halton Hills, ON L0P 1E0', '', '', 'CA', 'ACTIVE', '自营仓库', NOW(), NOW()),
('CA-T001', '3PL-Oshawa-GC', '3PL-Oshawa-GC', '3PL-Oshawa-GC', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T002', 'Oshawa 18WL', 'Oshawa 18WL', 'Oshawa 18WL', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T003', 'Calgary 18WL', 'Calgary 18WL', 'Calgary 18WL', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T004', 'Oshawa 18WL 1', 'Oshawa 18WL 1', 'Oshawa 18WL 1', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T005', 'Calgary 18WL 1', 'Calgary 18WL 1', 'Calgary 18WL 1', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T006', 'Oshawa 18WL 2', 'Oshawa 18WL 2', 'Oshawa 18WL 2', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T007', 'Oshawa 18WL 3', 'Oshawa 18WL 3', 'Oshawa 18WL 3', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T008', 'Oshawa 18WL 4', 'Oshawa 18WL 4', 'Oshawa 18WL 4', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T009', 'Oshawa 18WL 5', 'Oshawa 18WL 5', 'Oshawa 18WL 5', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T010', 'Oshawa 18WL 6', 'Oshawa 18WL 6', 'Oshawa 18WL 6', '第三方仓', 'NORMAL', 'AOSOM_CA', '', 'Oshawa 18WL 6', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T011', '3PL Toronto-DM', '3PL Toronto-DM', '3PL Toronto-DM', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T012', '3PL Vancouver-DM', '3PL Vancouver-DM', '3PL Vancouver-DM', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T013', '3PL Toronto-MSK', '3PL Toronto-MSK', '3PL Toronto-MSK', '第三方仓', 'NORMAL', 'AOSOM_CA', '12333 Airport Road, Caledon, ON L7C 2X3', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T014', '3PL Toronto-EDA', '3PL Toronto-EDA', '3PL Toronto-EDA', '第三方仓', 'NORMAL', 'AOSOM_CA', 'Tonolli Rd #2, Mississauga, ON L4Y 4C2', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T014-3PL', 'CLG02 3PL', 'CLG02 3PL', 'CLG02 3PL', '第三方仓', 'NORMAL', 'AOSOM_CA', '5020 72 Ave SE, Calgary, AB T2C 4B5', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA-T015', '3PL Calgary-RIG', '3PL Calgary-RIG', '3PL Calgary-RIG', '第三方仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('CA001', 'Toronto Store', 'Toronto Store', 'Toronto Store', '自营仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '自营仓库', NOW(), NOW()),
('CA002', 'Toronto_new', 'Toronto_new', 'Toronto_new', '自营仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '自营仓库', NOW(), NOW()),
('CA003', 'FBA_CA', 'FBA_CA', 'FBA_CA', '平台仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '平台仓库', NOW(), NOW()),
('CA004', 'Wayfair Mississauga', 'Wayfair Mississauga', 'Wayfair Mississauga', '平台仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '平台仓库', NOW(), NOW()),
('CA005', 'CLG01', 'CLG01', 'CLG01', '自营仓', 'NORMAL', 'AOSOM_CA', '', '', '', 'CA', 'ACTIVE', '自营仓库', NOW(), NOW()),

-- 德国仓库 (MH_DE)
('DE-S003', 'Schwan', 'Schwan', 'Schwan', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '自营仓库', NOW(), NOW()),
('DE-S004', 'Rade 2', 'Rade 2', 'Rade 2', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '自营仓库', NOW(), NOW()),
('DE-T001', 'CHE', 'CHE', 'CHE', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('DE-T002', 'New Returns BV', 'New Returns BV', 'New Returns BV', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('DE-T003', 'Galan', 'Galan', 'Galan', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('DE-T004', '3PL DE-GC', '3PL DE-GC', '3PL DE-GC', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('DE-T005', 'Galan New Warehouse', 'Galan New Warehouse', 'Galan New Warehouse', '第三方仓', 'NORMAL', 'MH_DE', 'Jana Śniadeckiego 25，72102,Stargard，zachodniopomorskie', '', '', 'DE', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('DE-T006', '3PL DE-Sph', '3PL DE-Sph', '3PL DE-Sph', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('DE-T007', '3PL DE-DHL', '3PL DE-DHL', '3PL DE-DHL', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('DE-T008', '3PL DE-Phe', '3PL DE-Phe', '3PL DE-Phe', '第三方仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '第三方仓库', NOW(), NOW()),

-- 德国扩展仓库 (MH_DE)
('GE001', 'Stuhr', 'Stuhr', 'Stuhr', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '自营仓库', NOW(), NOW()),
('GE002', 'Amazon FBA', 'Amazon FBA', 'Amazon FBA', '平台仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '平台仓库', NOW(), NOW()),
('GE003', 'Bremen_new', 'Bremen_new', 'Bremen_new', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '自营仓库', NOW(), NOW()),
('GE004', 'Soller_Bremen', 'Soller_Bremen', 'Soller_Bremen', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '自营仓库', NOW(), NOW()),
('GE005', 'Compact', 'Compact', 'Compact', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '自营仓库', NOW(), NOW()),
('GE006', 'Vechta', 'Vechta', 'Vechta', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '自营仓库', NOW(), NOW()),
('GE007', 'Wayfair_CG', 'Wayfair_CG', 'Wayfair_CG', '平台仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '平台仓库', NOW(), NOW()),
('GE008', 'HMB01', 'HMB01', 'HMB01', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '自营仓库', NOW(), NOW()),
('GE009', 'Aosom Virtual', 'Aosom Virtual', 'Aosom Virtual', '自营仓', 'NORMAL', 'MH_DE', '', '', '', 'DE', 'ACTIVE', '自营仓库', NOW(), NOW()),

-- 西班牙仓库 (AOSOM_ES)
('ES-T001', 'Worten', 'Worten', 'Worten', '第三方仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('ES001', 'Barcelona', 'Barcelona', 'Barcelona', '第三方仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('ES002', 'Amazon FBA', 'Amazon FBA', 'Amazon FBA', '平台仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', 'ACTIVE', '平台仓库', NOW(), NOW()),
('ES003', 'BAL', 'BAL', 'BAL', '自营仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', 'ACTIVE', '自营仓库', NOW(), NOW()),
('ES004', 'ND', 'ND', 'ND', '第三方仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('ES005', 'Monechelle_ES', 'Monechelle_ES', 'Monechelle_ES', '平台仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', 'ACTIVE', '平台仓库', NOW(), NOW()),
('ES006', 'SLT', 'SLT', 'SLT', '自营仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', 'ACTIVE', '自营仓库', NOW(), NOW()),
('ES007', 'VLS', 'VLS', 'VLS', '自营仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', 'ACTIVE', '自营仓库', NOW(), NOW()),
('ES008', 'Aosom Virtual', 'Aosom Virtual', 'Aosom Virtual', '自营仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', 'ACTIVE', '自营仓库', NOW(), NOW()),

-- 葡萄牙仓库 (AOSOM_ES)
('PT001', 'PT001', 'PT001', 'PT001', '自营仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'PT', 'ACTIVE', '自营仓库', NOW(), NOW()),

-- 西班牙扩展仓库 (AOSOM_ES)
('SP2-S001', 'SP2-S001', 'SP2-S001', 'SP2-S001', '自营仓', 'NORMAL', 'AOSOM_ES', '', '', '', 'ES', 'ACTIVE', '自营仓库', NOW(), NOW()),

-- 法国仓库 (MH_FR)
('FR-S004', 'ART', 'ART', 'ART', '自营仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', 'ACTIVE', '自营仓库', NOW(), NOW()),
('FR001', 'MH France Oissel', 'MH France Oissel', 'MH France Oissel', '自营仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', 'ACTIVE', '自营仓库', NOW(), NOW()),
('FR002', 'Amazon FBA', 'Amazon FBA', 'Amazon FBA', '平台仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', 'ACTIVE', '平台仓库', NOW(), NOW()),
('FR003', 'MH France Roncq', 'MH France Roncq', 'MH France Roncq', '自营仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', 'ACTIVE', '自营仓库', NOW(), NOW()),
('FR004', 'FBA Cdiscount', 'FBA Cdiscount', 'FBA Cdiscount', '平台仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', 'ACTIVE', '平台仓库', NOW(), NOW()),
('FR006', 'FR_Virtual', 'FR_Virtual', 'FR_Virtual', '自营仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', 'ACTIVE', '自营仓库', NOW(), NOW()),
('FR007', 'LEH01', 'LEH01', 'LEH01', '自营仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', 'ACTIVE', '自营仓库', NOW(), NOW()),
('FR008', 'Mer', 'Mer', 'Mer', '自营仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', 'ACTIVE', '自营仓库', NOW(), NOW()),
('FR05', 'Mon Echelle FBM', 'Mon Echelle FBM', 'Mon Echelle FBM', '平台仓', 'NORMAL', 'MH_FR', '', '', '', 'FR', 'ACTIVE', '平台仓库', NOW(), NOW()),

-- 罗马尼亚仓库 (AOSOM_RO)
('GCC_701', 'Vendor Warehouse', 'Vendor Warehouse', 'Vendor Warehouse', '自营仓', 'NORMAL', 'AOSOM_RO', '', '', '', 'RO', 'ACTIVE', '自营仓库', NOW(), NOW()),
('RO-T001', '3PL RO-DSV', '3PL RO-DSV', '3PL RO-DSV', '第三方仓', 'NORMAL', 'AOSOM_RO', '', '', '', 'RO', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('RO-T002', '3PL RO-FAN', '3PL RO-FAN', '3PL RO-FAN', '第三方仓', 'NORMAL', 'AOSOM_RO', '', '', '', 'RO', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('RO001', 'RO001', 'RO001', 'RO001', '自营仓', 'NORMAL', 'AOSOM_RO', '', '', '', 'RO', 'ACTIVE', '自营仓库', NOW(), NOW()),

-- 爱尔兰仓库 (AOSOM_IE)
('IE-P001', 'Amazon FBA_IE', 'Amazon FBA_IE', 'Amazon FBA_IE', '平台仓', 'NORMAL', 'AOSOM_IE', '', '', '', 'IE', 'ACTIVE', '平台仓库', NOW(), NOW()),
('IE-S001', 'Greenogue', 'Greenogue', 'Greenogue', '自营仓', 'NORMAL', 'AOSOM_IE', '', '', '', 'IE', 'ACTIVE', '自营仓库', NOW(), NOW()),
('IE001', 'Ireland', 'Ireland', 'Ireland', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'IE', 'ACTIVE', '自营仓库', NOW(), NOW()),

-- 意大利仓库 (AOSOM_IT)
('IT-S002', 'BLG', 'BLG', 'BLG', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '自营仓库', NOW(), NOW()),
('IT-S003', 'AL', 'AL', 'AL', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '自营仓库', NOW(), NOW()),
('IT-S004', 'POZ', 'POZ', 'POZ', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '自营仓库', NOW(), NOW()),
('IT-T002', 'DSV', 'DSV', 'DSV', '第三方仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('IT-T003', '3PL IT-FAN', '3PL IT-FAN', '3PL IT-FAN', '第三方仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('IT001', 'BRT Servizi Logistici', 'BRT Servizi Logistici', 'BRT Servizi Logistici', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '自营仓库', NOW(), NOW()),
('IT002', 'SITAF', 'SITAF', 'SITAF', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '自营仓库', NOW(), NOW()),
('IT003', 'Amazon FBA', 'Amazon FBA', 'Amazon FBA', '平台仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '平台仓库', NOW(), NOW()),
('IT004', 'KN', 'KN', 'KN', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '自营仓库', NOW(), NOW()),
('IT005', 'KN-Marketplace', 'KN-Marketplace', 'KN-Marketplace', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '自营仓库', NOW(), NOW()),
('IT006', 'eMag', 'eMag', 'eMag', '平台仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '平台仓库', NOW(), NOW()),
('IT007', 'FRISBO', 'FRISBO', 'FRISBO', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '自营仓库', NOW(), NOW()),
('IT008', 'FBM', 'FBM', 'FBM', '平台仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '平台仓库', NOW(), NOW()),
('IT009', 'BRT TORINO', 'BRT TORINO', 'BRT TORINO', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '自营仓库', NOW(), NOW()),
('IT2-S001', 'IT2-S001', 'IT2-S001', 'IT2-S001', '自营仓', 'NORMAL', 'AOSOM_IT', '', '', '', 'IT', 'ACTIVE', '自营仓库', NOW(), NOW()),

-- 英国仓库 (MH_UK)
('UK-S003', 'Bedford3', 'Bedford3', 'Bedford3', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK-S004', 'Bedford 2', 'Bedford 2', 'Bedford 2', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK-S005', 'Bedford', 'Bedford', 'Bedford', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK-S006', 'Nampton', 'Nampton', 'Nampton', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK-S007', 'Nampton 2', 'Nampton 2', 'Nampton 2', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK-S008', 'Nampton 3', 'Nampton 3', 'Nampton 3', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK-T001', '3PL UK-GC', '3PL UK-GC', '3PL UK-GC', '第三方仓', 'NORMAL', 'MH_UK', '3PL UK-GC', '', '', 'GB', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('UK-T002', '3PL UK-WT', '3PL UK-WT', '3PL UK-WT', '第三方仓', 'NORMAL', 'MH_UK', '3PL UK-WT', '', '', 'GB', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('UK-T003', '3PL UK-WG', '3PL UK-WG', '3PL UK-WG', '第三方仓', 'NORMAL', 'MH_UK', '3PL UK-WG', '', '', 'GB', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('UK-T004', 'JKO', 'JKO', 'JKO', '第三方仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('UK-T005', '3PL UK-BID', '3PL UK-BID', '3PL UK-BID', '第三方仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('UK-T006', '3PL UK-CW', '3PL UK-CW', '3PL UK-CW', '第三方仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('UK001', 'Guildford_Invalid', 'Guildford_Invalid', 'Guildford_Invalid', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK002', 'Anchor', 'Anchor', 'Anchor', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK003', 'CWL_Invalid', 'CWL_Invalid', 'CWL_Invalid', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK004', 'Perivale', 'Perivale', 'Perivale', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK005', 'St. Neots', 'St. Neots', 'St. Neots', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK006', 'Amazon FBA_UK', 'Amazon FBA_UK', 'Amazon FBA_UK', '平台仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '平台仓库', NOW(), NOW()),
('UK007', 'PD PORTS', 'PD PORTS', 'PD PORTS', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK008', 'CASTLE GATE', 'CASTLE GATE', 'CASTLE GATE', '平台仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '平台仓库', NOW(), NOW()),
('UK009', 'Doncaster', 'Doncaster', 'Doncaster', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK010', 'Wayfair Lutterworth', 'Wayfair Lutterworth', 'Wayfair Lutterworth', '平台仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '平台仓库', NOW(), NOW()),
('UK011', 'SP01', 'SP01', 'SP01', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK012', 'UK-GC', 'UK-GC', 'UK-GC', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK013', 'Carlton Forest', 'Carlton Forest', 'Carlton Forest', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),
('UK014', 'PTB', 'PTB', 'PTB', '自营仓', 'NORMAL', 'MH_UK', '', '', '', 'GB', 'ACTIVE', '自营仓库', NOW(), NOW()),

-- 美国仓库 (AOSOM_US)
('US-P007', 'Wayfair Hebron', 'Wayfair Hebron', 'Wayfair Hebron', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US-P008', 'Wayfair Perris (LP)/Perris2 (SP)', 'Wayfair Perris', 'Wayfair Perris', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US-P009', 'Wayfair Port Wentworth', 'Wayfair Port Wentworth', 'Wayfair Port Wentworth', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US-P010', 'Wayfair Aberdeen', 'Wayfair Aberdeen', 'Wayfair Aberdeen', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US-P011', 'Wayfair Savannah', 'Wayfair Savannah', 'Wayfair Savannah', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US-P012', 'Wayfair SantaFeSprings', 'Wayfair SantaFeSprings', 'Wayfair SantaFeSprings', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US-P013', 'Wayfair Romeoville', 'Wayfair Romeoville', 'Wayfair Romeoville', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US-P014', 'Wayfair Pre Bonded', 'Wayfair Pre Bonded', 'Wayfair Pre Bonded', '平台仓', 'NORMAL', 'AOSOM_US', '', 'US-P014', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US-S005', 'AOSOM CA-1', 'AOSOM CA-1', 'AOSOM CA-1', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '自营仓库', NOW(), NOW()),
('US-T004', '3PL-NJ-Cope', '3PL-NJ-Cope', '3PL-NJ-Cope', '第三方仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('US-T005', '3PL CA-iCargo', '3PL CA-iCargo', '3PL CA-iCargo', '第三方仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('US-T006', '3PL-CA-LC', '3PL-CA-LC', '3PL-CA-LC', '第三方仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('US001', 'OLD_PDX Store', 'OLD_PDX Store', 'OLD_PDX Store', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '自营仓库', NOW(), NOW()),
('US002', 'AOSOM TN-1', 'AOSOM TN-1', 'AOSOM TN-1', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '自营仓库', NOW(), NOW()),
('US003', 'Memphis_temp', 'Memphis_temp', 'Memphis_temp', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '自营仓库', NOW(), NOW()),
('US004', 'OLD_PDX_temp', 'OLD_PDX_temp', 'OLD_PDX_temp', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '自营仓库', NOW(), NOW()),
('US005', 'AOSOM OR-1', 'AOSOM OR-1', 'AOSOM OR-1', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '自营仓库', NOW(), NOW()),
('US006', 'AOSOM TN-2', 'AOSOM TN-2', 'AOSOM TN-2', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '自营仓库', NOW(), NOW()),
('US007', 'Amazon 3PL', 'Amazon 3PL', 'Amazon 3PL', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US008', 'Wayfair 3PL', 'Wayfair 3PL', 'Wayfair 3PL', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US009', 'Wayfair McDonough', 'Wayfair McDonough', 'Wayfair McDonough', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US010', 'Wayfair Cranbury (LP)/Cranbury 2', 'Wayfair Cranbury', 'Wayfair Cranbury', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US011', 'Wayfair Erlanger', 'Wayfair Erlanger', 'Wayfair Erlanger', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US012', 'Overstock 3PL', 'Overstock 3PL', 'Overstock 3PL', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US013', 'Wayfair Lancaster', 'Wayfair Lancaster', 'Wayfair Lancaster', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US014', 'Wayfair Lathrop', 'Wayfair Lathrop', 'Wayfair Lathrop', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US015', 'Walmart 3PL', 'Walmart 3PL', 'Walmart 3PL', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US016', 'AOSOM NJ-1', 'AOSOM NJ-1', 'AOSOM NJ-1', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '自营仓库', NOW(), NOW()),
('US017', '3PL NJ-LC', '3PL NJ-LC', '3PL NJ-LC', '第三方仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('US018', 'AOSOM GA-1', 'AOSOM GA-1', 'AOSOM GA-1', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '自营仓库', NOW(), NOW()),
('US019', '3PL LA-JD', '3PL LA-JD', '3PL LA-JD', '第三方仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('US020', '3PL NJ-KS', '3PL NJ-KS', '3PL NJ-KS', '第三方仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '第三方仓库', NOW(), NOW()),
('US021', 'Wayfair Jacksonville', 'Wayfair Jacksonville', 'Wayfair Jacksonville', '平台仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '平台仓库', NOW(), NOW()),
('US022', 'AOSOM TN-Parts', 'AOSOM TN-Parts', 'AOSOM TN-Parts', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '自营仓库', NOW(), NOW()),
('US023', 'Aosom Virtual', 'Aosom Virtual', 'Aosom Virtual', '自营仓', 'NORMAL', 'AOSOM_US', '', '', '', 'US', 'ACTIVE', '自营仓库', NOW(), NOW()),
('US024', 'AOSOM GA-Parts', 'AOSOM GA-Parts', 'AOSOM GA-Parts', '自营仓', 'NORMAL', 'AOSOM_US', '', 'AOSOM GA-Parts', '', 'US', 'ACTIVE', '自营仓库', NOW(), NOW());

-- 验证数据
SELECT '仓库总数' as check_type, COUNT(*) as count FROM dict_warehouses;
SELECT '国家分布' as check_type, country, property_type, COUNT(*) as count 
FROM dict_warehouses 
GROUP BY country, property_type 
ORDER BY country, property_type;
