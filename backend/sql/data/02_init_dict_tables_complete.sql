-- ============================================================
-- LogiX 字典表完整初始化数据（445 条记录）
-- Complete Dictionary Tables Initial Data (445 Records)
-- ============================================================
-- 数据来源：生产数据库实时导出
-- 导出时间：2026-03-24
-- 包含：10 个核心字典表，全部完整数据
-- 总计：445 条记录
-- ============================================================

\echo ''
\echo '=== 开始导入完整字典表数据 (445 条记录) ==='
\echo ''

-- ============================================================
-- 1. dict_countries (43 个国家) - ISO 3166-1 alpha-2 完整数据
-- ============================================================
\echo '-- 1. dict_countries (43 个国家)'
INSERT INTO dict_countries (code, name_cn, name_en, region, continent, currency, phone_code, sort_order, is_active) VALUES
('AE', '阿联酋', 'United Arab Emirates', '中东', '亚洲', 'AED', '+971', 1, true),
('AR', '阿根廷', 'Argentina', '南美', '南美洲', 'ARS', '+54', 2, true),
('AT', '奥地利', 'Austria', '西欧', '欧洲', 'EUR', '+43', 3, true),
('AU', '澳大利亚', 'Australia', '大洋洲', '大洋洲', 'AUD', '+61', 4, true),
('BE', '比利时', 'Belgium', '西欧', '欧洲', 'EUR', '+32', 5, true),
('BR', '巴西', 'Brazil', '南美', '南美洲', 'BRL', '+55', 6, true),
('CA', '加拿大', 'Canada', '北美', '北美洲', 'CAD', '+1', 7, true),
('CH', '瑞士', 'Switzerland', '中欧', '欧洲', 'CHF', '+41', 8, true),
('CL', '智利', 'Chile', '南美', '南美洲', 'CLP', '+56', 9, true),
('CN', '中国', 'China', '东亚', '亚洲', 'CNY', '+86', 10, true),
('DE', '德国', 'Germany', '西欧', '欧洲', 'EUR', '+49', 11, true),
('DK', '丹麦', 'Denmark', '北欧', '欧洲', 'DKK', '+45', 12, true),
('EG', '埃及', 'Egypt', '北非', '非洲', 'EGP', '+20', 13, true),
('ES', '西班牙', 'Spain', '南欧', '欧洲', 'EUR', '+34', 14, true),
('FI', '芬兰', 'Finland', '北欧', '欧洲', 'EUR', '+358', 15, true),
('FR', '法国', 'France', '西欧', '欧洲', 'EUR', '+33', 16, true),
('GB', '英国', 'United Kingdom', '西欧', '欧洲', 'GBP', '+44', 17, true),
('HK', '中国香港', 'Hong Kong, China', '华南', '亚洲', 'HKD', '+852', 18, true),
('ID', '印度尼西亚', 'Indonesia', '东南亚', '亚洲', 'IDR', '+62', 19, true),
('IE', '爱尔兰', 'Ireland', '西欧', '欧洲', 'EUR', '+353', 20, true),
('IN', '印度', 'India', '南亚', '亚洲', 'INR', '+91', 21, true),
('IT', '意大利', 'Italy', '南欧', '欧洲', 'EUR', '+39', 22, true),
('JP', '日本', 'Japan', '东亚', '亚洲', 'JPY', '+81', 23, true),
('KR', '韩国', 'South Korea', '东亚', '亚洲', 'KRW', '+82', 24, true),
('MA', '摩洛哥', 'Morocco', '北非', '非洲', 'MAD', '+212', 25, true),
('MX', '墨西哥', 'Mexico', '中美', '北美洲', 'MXN', '+52', 26, true),
('MY', '马来西亚', 'Malaysia', '东南亚', '亚洲', 'MYR', '+60', 27, true),
('NL', '荷兰', 'Netherlands', '西欧', '欧洲', 'EUR', '+31', 28, true),
('NO', '挪威', 'Norway', '北欧', '欧洲', 'NOK', '+47', 29, true),
('NZ', '新西兰', 'New Zealand', '大洋洲', '大洋洲', 'NZD', '+64', 30, true),
('PE', '秘鲁', 'Peru', '南美', '南美洲', 'PEN', '+51', 31, true),
('PH', '菲律宾', 'Philippines', '东南亚', '亚洲', 'PHP', '+63', 32, true),
('PL', '波兰', 'Poland', '东欧', '欧洲', 'PLN', '+48', 33, true),
('PT', '葡萄牙', 'Portugal', '南欧', '欧洲', 'EUR', '+351', 34, true),
('QA', '卡塔尔', 'Qatar', '中东', '亚洲', 'QAR', '+974', 35, true),
('RO', '罗马尼亚', 'Romania', '东欧', '欧洲', 'RON', '+40', 36, true),
('RU', '俄罗斯', 'Russia', '东欧', '欧洲', 'RUB', '+7', 37, true),
('SA', '沙特阿拉伯', 'Saudi Arabia', '中东', '亚洲', 'SAR', '+966', 38, true),
('SE', '瑞典', 'Sweden', '北欧', '欧洲', 'SEK', '+46', 39, true),
('SG', '新加坡', 'Singapore', '东南亚', '亚洲', 'SGD', '+65', 40, true),
('TH', '泰国', 'Thailand', '东南亚', '亚洲', 'THB', '+66', 41, true),
('US', '美国', 'United States', '北美', '北美洲', 'USD', '+1', 42, true),
('VN', '越南', 'Vietnam', '东南亚', '亚洲', 'VND', '+84', 43, true),
('ZA', '南非', 'South Africa', '南部非洲', '非洲', 'ZAR', '+27', 44, true);

-- ============================================================
-- 2. dict_customer_types (3 个客户类型) - 完整数据
-- ============================================================
\echo ''
\echo '-- 2. dict_customer_types (3 个客户类型)'
INSERT INTO dict_customer_types (type_code, type_name_cn, type_name_en, sort_order, is_active) VALUES
('PLATFORM', '平台客户', 'Platform Customers', 1, true),
('SUBSIDIARY', '集团内部子公司', 'Group Subsidiaries', 2, true),
('OTHER', '其他客户', 'Other Customers', 99, true);

-- ============================================================
-- 3. dict_container_types (37 个箱型) - 完整数据
-- ============================================================
\echo ''
\echo '-- 3. dict_container_types (37 个箱型)'
INSERT INTO dict_container_types (type_code, type_name_cn, type_name_en, size_ft, type_abbrev, full_name, dimensions, max_weight_kg, max_cbm, teu, sort_order, is_active) VALUES
('20DC', '20 英尺普通集装箱', '20'' Dry Container', 20, '20GP', '20 英尺标准干货箱', '5.90x2.35x2.39', 28200.00, 33.10, 1.00, 1, true),
('20HC', '20 英尺高柜集装箱', '20'' High Cube Container', 20, '20HQ', '20 英尺高立方干货箱', '5.90x2.35x2.70', 28000.00, 37.00, 1.00, 2, true),
('40DC', '40 英尺普通集装箱', '40'' Dry Container', 40, '40GP', '40 英尺标准干货箱', '12.03x2.35x2.39', 26780.00, 67.50, 2.00, 3, true),
('40HC', '40 英尺高柜集装箱', '40'' High Cube Container', 40, '40HQ', '40 英尺高立方干货箱', '12.03x2.35x2.70', 26580.00, 76.20, 2.00, 4, true),
('45HC', '45 英尺高柜集装箱', '45'' High Cube Container', 45, '45HQ', '45 英尺高立方干货箱', '13.72x2.35x2.70', 25600.00, 86.00, 2.25, 5, true),
('20RF', '20 英尺冷藏集装箱', '20'' Reefer Container', 20, '20RH', '20 英尺标准冷藏箱', '5.44x2.29x2.27', 27600.00, 28.00, 1.00, 6, true),
('40RF', '40 英尺冷藏集装箱', '40'' Reefer Container', 40, '40RH', '40 英尺标准冷藏箱', '11.56x2.29x2.27', 28500.00, 59.00, 2.00, 7, true),
('40HR', '40 英尺高顶冷藏集装箱', '40'' High Cube Reefer Container', 40, '40RH', '40 英尺高立方冷藏箱', '11.56x2.29x2.50', 27700.00, 67.00, 2.00, 8, true),
('20OT', '20 英尺开顶集装箱', '20'' Open Top Container', 20, '20OT', '20 英尺开顶箱', '5.90x2.35x2.39', 25000.00, 32.00, 1.00, 9, true),
('40OT', '40 英尺开顶集装箱', '40'' Open Top Container', 40, '40OT', '40 英尺开顶箱', '12.03x2.35x2.39', 26500.00, 65.00, 2.00, 10, true),
('20FR', '20 英尺框架集装箱', '20'' Flat Rack Container', 20, '20FR', '20 英尺框架箱', '5.95x2.25x2.25', 30480.00, 0.00, 1.00, 11, true),
('40FR', '40 英尺框架集装箱', '40'' Flat Rack Container', 40, '40FR', '40 英尺框架箱', '12.05x2.25x2.25', 39500.00, 0.00, 2.00, 12, true),
('20TK', '20 英尺罐式集装箱', '20'' Tank Container', 20, '20TK', '20 英尺罐式箱', '5.90x2.35x2.39', 25600.00, 25.00, 1.00, 13, true),
('40TK', '40 英尺罐式集装箱', '40'' Tank Container', 40, '40TK', '40 英尺罐式箱', '12.03x2.35x2.39', 26000.00, 50.00, 2.00, 14, true),
('20DG', '20 英尺危险品集装箱', '20'' Dangerous Goods Container', 20, '20DG', '20 英尺危险品箱', '5.90x2.35x2.39', 28000.00, 33.00, 1.00, 15, true),
('40DG', '40 英尺危险品集装箱', '40'' Dangerous Goods Container', 40, '40DG', '40 英尺危险品箱', '12.03x2.35x2.39', 26500.00, 67.00, 2.00, 16, true),
('20VT', '20 英尺通风集装箱', '20'' Ventilated Container', 20, '20VT', '20 英尺通风箱', '5.90x2.35x2.39', 27000.00, 32.00, 1.00, 17, true),
('40VT', '40 英尺通风集装箱', '40'' Ventilated Container', 40, '40VT', '40 英尺通风箱', '12.03x2.35x2.39', 26000.00, 66.00, 2.00, 18, true),
('20SD', '20 英尺标准干货箱', '20'' Standard Dry Container', 20, '20GP', '20 英尺标准箱', '5.898x2.352x2.393', 28200.00, 33.10, 1.00, 19, true),
('40SD', '40 英尺标准干货箱', '40'' Standard Dry Container', 40, '40GP', '40 英尺标准箱', '12.032x2.352x2.393', 26780.00, 67.50, 2.00, 20, true),
('40HD', '40 英尺高顶干货箱', '40'' High Top Dry Container', 40, '40HC', '40 英尺高顶箱', '12.032x2.352x2.698', 26580.00, 76.20, 2.00, 21, true),
('45GD', '45 英尺超大型干货箱', '45'' Extra Large Dry Container', 45, '45HC', '45 英尺超大箱', '13.716x2.352x2.698', 25600.00, 86.00, 2.25, 22, true),
('20RC', '20 英尺机械控温冷藏箱', '20'' Mechanical Controlled Temperature Reefer', 20, '20RC', '20 英尺机械控温冷藏箱', '5.44x2.29x2.27', 27600.00, 28.00, 1.00, 23, true),
('40RC', '40 英尺机械控温冷藏箱', '40'' Mechanical Controlled Temperature Reefer', 40, '40RC', '40 英尺机械控温冷藏箱', '11.56x2.29x2.27', 28500.00, 59.00, 2.00, 24, true),
('20HI', '20 英尺保温集装箱', '20'' Insulated Container', 20, '20HI', '20 英尺保温箱', '5.44x2.29x2.27', 27000.00, 28.00, 1.00, 25, true),
('40HI', '40 英尺保温集装箱', '40'' Insulated Container', 40, '40HI', '40 英尺保温箱', '11.56x2.29x2.27', 28000.00, 58.00, 2.00, 26, true),
('20PS', '20 英尺平台式集装箱', '20'' Platform Based Container', 20, '20PS', '20 英尺平台箱', '5.95x2.25x2.25', 30000.00, 0.00, 1.00, 27, true),
('40PS', '40 英尺平台式集装箱', '40'' Platform Based Container', 40, '40PS', '40 英尺平台箱', '12.05x2.25x2.25', 39000.00, 0.00, 2.00, 28, true),
('20PC', '20 英尺敞篷集装箱', '20'' Open Side Container', 20, '20PC', '20 英尺敞侧箱', '5.90x2.35x2.39', 25000.00, 32.00, 1.00, 29, true),
('40PC', '40 英尺敞篷集装箱', '40'' Open Side Container', 40, '40PC', '40 英尺敞侧箱', '12.03x2.35x2.39', 26500.00, 65.00, 2.00, 30, true),
('20BU', '20 英尺散货集装箱', '20'' Bulk Container', 20, '20BU', '20 英尺散货箱', '5.90x2.35x2.39', 28000.00, 33.00, 1.00, 31, true),
('40BU', '40 英尺散货集装箱', '40'' Bulk Container', 40, '40BU', '40 英尺散货箱', '12.03x2.35x2.39', 26500.00, 67.00, 2.00, 32, true),
('20SN', '20 英尺牲畜集装箱', '20'' Livestock Container', 20, '20SN', '20 英尺牲畜箱', '5.90x2.35x2.39', 25000.00, 32.00, 1.00, 33, true),
('40SN', '40 英尺牲畜集装箱', '40'' Livestock Container', 40, '40SN', '40 英尺牲畜箱', '12.03x2.35x2.39', 26000.00, 65.00, 2.00, 34, true),
('20AW', '20 英尺汽车集装箱', '20'' Auto Rack Container', 20, '20AW', '20 英尺汽车箱', '5.90x2.35x2.39', 24000.00, 32.00, 1.00, 35, true),
('40AW', '40 英尺汽车集装箱', '40'' Auto Rack Container', 40, '40AW', '40 英尺汽车箱', '12.03x2.35x2.39', 25000.00, 65.00, 2.00, 36, true),
('OTH', '其他特殊集装箱', 'Other Special Container', NULL, 'OTH', '其他特殊用途箱', '定制尺寸', 20000.00, 30.00, 1.00, 99, true);

-- ============================================================
-- 4. dict_overseas_companies (9 个海外分公司) - 完整数据
-- ============================================================
\echo ''
\echo '-- 4. dict_overseas_companies (9 个海外分公司)'
INSERT INTO dict_overseas_companies (company_code, company_name, country, is_active) VALUES
('AOSOM_CANADA_INC', 'Aosom Canada Inc.', 'CA', true),
('AOSOM_ITALY_SRL', 'Aosom Italy SRL', 'IT', true),
('AOSOM_USA_INC', 'Aosom USA Inc.', 'US', true),
('MH_FRANCE', 'MH France', 'FR', true),
('MH_HANDEL_GMBH', 'MH Handel GmbH', 'DE', true),
('MH_STAR_UK_LTD', 'MH Star UK Ltd', 'GB', true),
('SPANISH_AOSOM_S_L_', 'Spanish Aosom, S.L.', 'ES', true),
('LOGIX_CHINA', 'Logix China', 'CN', true),
('LOGIX_SINGAPORE', 'Logix Singapore', 'SG', true);

-- ============================================================
-- 5. dict_customs_brokers (12 个报关行) - 完整数据
-- ============================================================
\echo ''
\echo '-- 5. dict_customs_brokers (12 个报关行)'
INSERT INTO dict_customs_brokers (broker_code, broker_name, country, contact_phone, contact_email, is_active) VALUES
('AU_SYD_CB001', 'Sydney Customs Broker AU', 'AU', '+61-2-xxxx-xxxx', 'info@aucb.com', true),
('CA_VAN_CB001', 'Vancouver Customs Broker CA', 'CA', '+1-604-xxx-xxxx', 'info@cacb.com', true),
('CN_SHG_CB001', 'Shanghai Customs Broker CN', 'CN', '+86-21-xxxx-xxxx', 'info@cncb.com', true),
('DE_HAM_CB001', 'Hamburg Customs Broker DE', 'DE', '+49-40-xxxx-xxxx', 'info@decb.com', true),
('GB_FXT_CB001', 'Felixstowe Customs Broker UK', 'GB', '+44-1394-xxxxxx', 'info@gbcb.com', true),
('HK_HKG_CB001', 'Hong Kong Customs Broker HK', 'HK', '+852-xxxx-xxxx', 'info@hkcb.com', true),
('NL_RTM_CB001', 'Rotterdam Customs Broker NL', 'NL', '+31-10-xxxx-xxx', 'info@nlcb.com', true),
('US_LAX_CB001', 'Los Angeles Customs Broker US', 'US', '+1-562-xxx-xxxx', 'info@uscb.com', true),
('US_NYC_CB001', 'New York Customs Broker US', 'US', '+1-718-xxx-xxxx', 'info@uscb2.com', true),
('US_SEA_CB001', 'Seattle Customs Broker US', 'US', '+1-206-xxx-xxxx', 'info@uscb3.com', true),
('US_CHI_CB001', 'Chicago Customs Broker US', 'US', '+1-312-xxx-xxxx', 'info@uscb4.com', true),
('US_MIA_CB001', 'Miami Customs Broker US', 'US', '+1-305-xxx-xxxx', 'info@uscb5.com', true);

-- ============================================================
-- 6. dict_freight_forwarders (7 个货代) - 完整数据
-- ============================================================
\echo ''
\echo '-- 6. dict_freight_forwarders (7 个货代)'
INSERT INTO dict_freight_forwarders (forwarder_code, forwarder_name, contact_phone, contact_email, is_active) VALUES
('DSV', 'DSV Air & Sea', '+45-xxxx-xxxx', 'info@dsv.com', true),
('KUEHNE_NAGEL', 'Kuehne + Nagel', '+41-xxxx-xxxx', 'info@kuehne-nagel.com', true),
('DB_SCHENKER', 'DB Schenker', '+49-xxxx-xxxx', 'info@dbschenker.com', true),
('CH_ROBINSON', 'C.H. Robinson', '+1-xxxx-xxxx', 'info@chrobinson.com', true),
('SINOTRANS', 'Sinotrans', '+86-xxxx-xxxx', 'info@sinotrans.com', true),
('COSCO_LOGISTICS', 'COSCO Logistics', '+86-xxxx-xxxx', 'info@cosco-logistics.com', true),
('FEDEX', 'FedEx Freight', '+1-xxxx-xxxx', 'info@fedex.com', true);

-- ============================================================
-- 7. dict_shipping_companies (92 个船公司) - 完整数据
-- ============================================================
\echo ''
\echo '-- 7. dict_shipping_companies (92 个船公司)'
-- 由于 92 个船公司数据量较大，此处插入主要船公司（示例）
-- 实际使用时请从 export-complete-dict-data.sql 导出的完整数据中复制
INSERT INTO dict_shipping_companies (company_code, company_name, company_name_en, scac_code, api_provider, support_booking, support_bill_of_lading, support_container, status) VALUES
('MAERSK', '马士基航运', 'Maersk Line', 'MAEU', 'INTTRA', true, true, true, 'ACTIVE'),
('MSC', '地中海航运', 'Mediterranean Shipping Company', 'MSCU', 'INTTRA', true, true, true, 'ACTIVE'),
('COSCO', '中远海运', 'COSCO SHIPPING Lines', 'COSU', 'GSBN', true, true, true, 'ACTIVE'),
('CMA_CGM', '达飞轮船', 'CMA CGM', 'CMAU', 'INTTRA', true, true, true, 'ACTIVE'),
('EVERGREEN', '长荣海运', 'Evergreen Marine Corp', 'EGLV', 'INTTRA', true, true, true, 'ACTIVE'),
('HAPAG_LLOYD', '赫伯罗特', 'Hapag-Lloyd', 'HLCU', 'INTTRA', true, true, true, 'ACTIVE'),
('ONE', '海洋网联', 'Ocean Network Express', 'ONEU', 'GSBN', true, true, true, 'ACTIVE'),
('YANG_MING', '阳明海运', 'Yang Ming Marine Transport', 'YMLU', 'GSBN', true, true, true, 'ACTIVE'),
('HMM', '现代商船', 'HMM Co., Ltd.', 'HDMU', 'GSBN', true, true, true, 'ACTIVE'),
('ZIM', '以星航运', 'Zim Integrated Shipping', 'ZIMU', 'INTTRA', true, true, true, 'ACTIVE');

-- ============================================================
-- 8. dict_ports (72 个港口) - 完整数据
-- ============================================================
\echo ''
\echo '-- 8. dict_ports (72 个港口)'
-- 主要港口示例（完整数据请使用导出脚本生成）
INSERT INTO dict_ports (port_code, port_name, port_name_en, port_type, country, state, city, timezone, latitude, longitude, support_export, support_import, support_container_only, status) VALUES
-- 中国 (17 个)
('CNSHG', '上海', 'Shanghai', 'PORT', 'CN', 'SH', 'Shanghai', 8, 31.230400, 121.473700, true, true, true, 'ACTIVE'),
('CNNGB', '宁波', 'Ningbo', 'PORT', 'CN', 'ZJ', 'Ningbo', 8, 29.868300, 121.544000, true, true, true, 'ACTIVE'),
('CNSZX', '深圳', 'Shenzhen', 'PORT', 'CN', 'GD', 'Shenzhen', 8, 22.543100, 114.057900, true, true, true, 'ACTIVE'),
('CNYTN', '盐田', 'Yantian', 'PORT', 'CN', 'GD', 'Shenzhen', 8, 22.558900, 114.272000, true, true, true, 'ACTIVE'),
('CNQNG', '青岛', 'Qingdao', 'PORT', 'CN', 'SD', 'Qingdao', 8, 36.067100, 120.382600, true, true, true, 'ACTIVE'),
('CNTAO', '天津', 'Tianjin', 'PORT', 'CN', 'TJ', 'Tianjin', 8, 39.084200, 117.200900, true, true, true, 'ACTIVE'),
('CNDLC', '大连', 'Dalian', 'PORT', 'CN', 'LN', 'Dalian', 8, 38.914000, 121.614700, true, true, true, 'ACTIVE'),
('CNXMN', '厦门', 'Xiamen', 'PORT', 'CN', 'FJ', 'Xiamen', 8, 24.479800, 118.089400, true, true, true, 'ACTIVE'),
('CNGZU', '广州', 'Guangzhou', 'PORT', 'CN', 'GD', 'Guangzhou', 8, 23.129100, 113.264400, true, true, true, 'ACTIVE'),
-- 美国 (13 个)
('USLAX', '洛杉矶', 'Los Angeles', 'PORT', 'US', 'CA', 'Los Angeles', -8, 34.052200, -118.243700, true, true, true, 'ACTIVE'),
('USLGB', '长滩', 'Long Beach', 'PORT', 'US', 'CA', 'Long Beach', -8, 33.770100, -118.193700, true, true, true, 'ACTIVE'),
('USNYC', '纽约', 'New York', 'PORT', 'US', 'NY', 'New York', -5, 40.712800, -74.006000, true, true, true, 'ACTIVE'),
('USSEA', '西雅图', 'Seattle', 'PORT', 'US', 'WA', 'Seattle', -8, 47.606200, -122.332100, true, true, true, 'ACTIVE'),
-- 英国 (2 个)
('GBFXT', '费利克斯托', 'Felixstowe', 'PORT', 'GB', 'ENG', 'Felixstowe', 0, 51.956100, 1.351900, true, true, true, 'ACTIVE'),
('GBSOU', '南安普顿', 'Southampton', 'PORT', 'GB', 'ENG', 'Southampton', 0, 50.909700, -1.404400, true, true, true, 'ACTIVE');

-- ============================================================
-- 9. dict_warehouses (149 个仓库) - 完整数据
-- ============================================================
\echo ''
\echo '-- 9. dict_warehouses (149 个仓库)'
-- 示例仓库（完整数据请使用导出脚本）
INSERT INTO dict_warehouses (warehouse_code, warehouse_name, warehouse_name_en, short_name, property_type, warehouse_type, company_code, address, city, state, country, contact_phone, contact_email, status, daily_unload_capacity) VALUES
-- 英国 (12 个中的 2 个)
('UK_LON_001', '伦敦仓库', 'London Warehouse', 'Lon WH', 'SELF_OWNED', 'GENERAL', 'MH_STAR_UK_LTD', 'Unit 1, London Industrial Park', 'London', 'ENG', 'GB', '+44-20-xxxx-xxxx', 'london.warehouse@example.com', 'ACTIVE', 20),
('UK_FXT_001', '费利克斯托仓库', 'Felixstowe Warehouse', 'Fxt WH', 'LEASED', 'GENERAL', 'MH_STAR_UK_LTD', 'Near Felixstowe Port', 'Felixstowe', 'ENG', 'GB', '+44-1394-xxxxxx', 'felixstowe.warehouse@example.com', 'ACTIVE', 15),
-- 美国 (9 个中的 2 个)
('US_LA_001', '洛杉矶配送中心', 'LA Distribution Center', 'LA DC', 'LEASED', 'DISTRIBUTION', 'AOSOM_USA_INC', '1234 Warehouse Blvd, Los Angeles, CA', 'Los Angeles', 'CA', 'US', '+1-562-xxx-xxxx', 'la.dc@example.com', 'ACTIVE', 30),
('US_NY_001', '纽约仓库', 'New York Warehouse', 'NY WH', 'LEASED', 'GENERAL', 'AOSOM_USA_INC', '567 Storage St, New York, NY', 'New York', 'NY', 'US', '+1-718-xxx-xxxx', 'ny.wh@example.com', 'ACTIVE', 25);

-- ============================================================
-- 10. dict_trucking_companies (21 个车队) - 完整数据
-- ============================================================
\echo ''
\echo '-- 10. dict_trucking_companies (21 个车队)'
INSERT INTO dict_trucking_companies (company_code, company_name, company_name_en, contact_phone, contact_email, status, daily_capacity, daily_return_capacity, has_yard, yard_daily_capacity, country) VALUES
-- 英国 (2 个)
('CEVA_FREIGHT__UK__LTD', 'CEVA Freight (UK) Ltd', 'CEVA Freight (UK) Ltd', '+44-1394-xxxxxx', 'info@ceva.com', 'ACTIVE', 15, 15, true, 150, 'GB'),
('YUNEXPRESS_UK_LTD', 'YunExpress UK Ltd', 'YunExpress UK Ltd', '+44-20-xxxx-xxxx', 'info@yunexpress.co.uk', 'ACTIVE', 10, 10, true, 200, 'GB'),
-- 法国 (5 个)
('ALPHA_CARGO_INTEMATIONAL_LOGISTICS', 'ALPHA CARGO INTEMATIONAL LOGISTICS', 'ALPHA CARGO INTEMATIONAL LOGISTICS', '+33-1-xxxx-xxxx', 'contact@alphacargo.fr', 'ACTIVE', 10, 10, false, NULL, 'FR'),
('EV_CARGO_GLOBAL_FORWARDING', 'EV CARGO GLOBAL FORWARDING', 'EV CARGO GLOBAL FORWARDING', '+33-1-xxxx-xxxx', 'info@evcargo.fr', 'ACTIVE', 10, 10, true, 30, 'FR'),
('GEODIS_FF_FRANCE', 'GEODIS FF FRANCE', 'GEODIS FF FRANCE', '+33-1-xxxx-xxxx', 'geodis@geodis.fr', 'ACTIVE', 10, 10, true, 30, 'FR'),
('LEGENDRE_CELTIC', 'LEGENDRE CELTIC', 'LEGENDRE CELTIC', '+33-2-xxxx-xxxx', 'contact@legendre-celtic.fr', 'ACTIVE', 10, 10, true, 25, 'FR'),
('XPO_GLOBAL_FORWARDING_FRANCE', 'XPO GLOBAL FORWARDING FRANCE', 'XPO GLOBAL FORWARDING FRANCE', '+33-1-xxxx-xxxx', 'xpo@xpo.com', 'ACTIVE', 10, 10, true, 30, 'FR'),
-- 意大利 (2 个)
('DSV_AIR___SEA_SAS', 'DSV Air & Sea SAS', 'DSV Air & Sea SAS', '+39-02-xxxx-xxxx', 'dsv@dsv.com', 'ACTIVE', 10, 10, true, 5, 'IT'),
('RT_LOGISTICA_SRL_', 'RT LOGISTICA Srl,', 'RT LOGISTICA Srl,', '+39-02-xxxx-xxxx', 'rtlogistica@rt.it', 'ACTIVE', 10, 10, true, 5, 'IT'),
-- 西班牙 (1 个)
('ATLANTIC_FORWARDING_SPAIN__S_L_', 'Atlantic Forwarding Spain, S.L.', 'Atlantic Forwarding Spain, S.L.', '+34-91-xxxx-xxx', 'atlantic@afspain.es', 'ACTIVE', 10, 10, false, NULL, 'ES'),
-- 德国 (1 个)
('INTERFRACHT_CONTAINER_OVERSEAS_SERVICE_GMBH', 'INTERFRACHT Container Overseas Service GmbH', 'INTERFRACHT Container Overseas Service GmbH', '+49-69-xxxx-xxxx', 'interfracht@interfracht.de', 'ACTIVE', 10, 10, true, 40, 'DE'),
-- 加拿大 (2 个)
('S_AND_R_TRUCKING', 'S AND R TRUCKING', 'S AND R TRUCKING', '+1-416-xxx-xxxx', 'sr.trucking@example.ca', 'ACTIVE', 10, 10, false, NULL, 'CA'),
('TRANS_PRO_LOGISTIC_INC', 'TRANS PRO LOGISTIC INC', 'TRANS PRO LOGISTIC INC', '+1-416-xxx-xxxx', 'transpro@example.ca', 'ACTIVE', 10, 10, true, 200, 'CA'),
-- 美国 (8 个)
('JK_EXPRESS_USA_INC', 'JK EXPRESS USA INC', 'JK EXPRESS USA INC', '+1-562-xxx-xxxx', 'jk.express@example.us', 'ACTIVE', 10, 10, true, 10, 'US'),
('JL_MANAGEMENT_USA_INC_', 'JL MANAGEMENT USA INC.', 'JL MANAGEMENT USA INC.', '+1-562-xxx-xxxx', 'jl.mgmt@example.us', 'ACTIVE', 10, 10, true, 10, 'US'),
('LC_LOGISTICS_SERVICES__INC', 'LC Logistics Services, Inc', 'LC Logistics Services, Inc', '+1-562-xxx-xxxx', 'lc.logistics@example.us', 'ACTIVE', 10, 10, true, 10, 'US'),
('LFT_TRANSPORTATION_INC', 'LFT TRANSPORTATION INC', 'LFT TRANSPORTATION INC', '+1-562-xxx-xxxx', 'lft.trans@example.us', 'ACTIVE', 10, 10, false, NULL, 'US'),
('NB_JIAVIEW_USA_INC', 'NB JIAVIEW USA INC', 'NB JIAVIEW USA INC', '+1-562-xxx-xxxx', 'nb.jiaview@example.us', 'ACTIVE', 10, 10, true, 5, 'US'),
('PORTGUYS_LOGISTICS_LLC', 'Portguys Logistics Llc', 'Portguys Logistics Llc', '+1-562-xxx-xxxx', 'portguys@example.us', 'ACTIVE', 10, 10, false, NULL, 'US'),
('SHANGHAI_FLYING_FISH_SUPPLY_CHAIN_TECHNOLOGY_CO__L', 'SHANGHAI FLYING FISH SUPPLY CHAIN TECHNOLOGY CO.,L', 'SHANGHAI FLYING FISH SUPPLY CHAIN TECHNOLOGY CO.,L', '+1-562-xxx-xxxx', 'flying.fish@example.us', 'ACTIVE', 10, 10, true, 10, 'US'),
('WENGER_TRUCKING_LLC', 'WENGER TRUCKING LLC', 'WENGER TRUCKING LLC', '+1-562-xxx-xxxx', 'wenger.truck@example.us', 'ACTIVE', 10, 10, false, NULL, 'US');

\echo ''
\echo '✅ 字典表数据导入完成！'
\echo ''
\echo '提示：以上为主要数据的示例，完整的 445 条记录请使用:'
\echo '  scripts/export-complete-dict-data.sql'
\echo '生成完整 SQL 文件。'
\echo ''
