-- ============================================================
-- LogiX 字典表初始化数据 (最终正确版本)
-- LogiX Dictionary Tables Initial Data (Final Correct Version)
-- ============================================================
-- 说明: 此脚本初始化所有字典表的基础数据
-- Usage: Initialize all dictionary tables with base data
-- 版本: v1.0 Final
-- 日期: 2026-02-25
-- ============================================================

-- 设置客户端输出
\echo '开始初始化字典表数据...'
\echo 'Starting to initialize dictionary table data...'

-- ============================================================
-- 国别字典 (dict_countries)
-- ============================================================
INSERT INTO dict_countries (code, name_cn, name_en, region, continent, currency, phone_code, sort_order, is_active, remarks, created_at, updated_at) VALUES
('US', '美国', 'United States', 'NA', 'North America', 'USD', '+1', 1, true, NULL, NOW(), NOW()),
('CA', '加拿大', 'Canada', 'NA', 'North America', 'CAD', '+1', 2, true, NULL, NOW(), NOW()),
('GB', '英国', 'United Kingdom', 'EU', 'Europe', 'GBP', '+44', 3, true, NULL, NOW(), NOW()),
('DE', '德国', 'Germany', 'EU', 'Europe', 'EUR', '+49', 4, true, NULL, NOW(), NOW()),
('FR', '法国', 'France', 'EU', 'Europe', 'EUR', '+33', 5, true, NULL, NOW(), NOW()),
('IT', '意大利', 'Italy', 'EU', 'Europe', 'EUR', '+39', 6, true, NULL, NOW(), NOW()),
('ES', '西班牙', 'Spain', 'EU', 'Europe', 'EUR', '+34', 7, true, NULL, NOW(), NOW()),
('NL', '荷兰', 'Netherlands', 'EU', 'Europe', 'EUR', '+31', 8, true, NULL, NOW(), NOW()),
('BE', '比利时', 'Belgium', 'EU', 'Europe', 'EUR', '+32', 9, true, NULL, NOW(), NOW()),
('PL', '波兰', 'Poland', 'EU', 'Europe', 'PLN', '+48', 10, true, NULL, NOW(), NOW()),
('CZ', '捷克', 'Czech Republic', 'EU', 'Europe', 'CZK', '+420', 11, true, NULL, NOW(), NOW()),
('AT', '奥地利', 'Austria', 'EU', 'Europe', 'EUR', '+43', 12, true, NULL, NOW(), NOW()),
('CH', '瑞士', 'Switzerland', 'EU', 'Europe', 'CHF', '+41', 13, true, NULL, NOW(), NOW()),
('SE', '瑞典', 'Sweden', 'EU', 'Europe', 'SEK', '+46', 14, true, NULL, NOW(), NOW()),
('NO', '挪威', 'Norway', 'EU', 'Europe', 'NOK', '+47', 15, true, NULL, NOW(), NOW()),
('DK', '丹麦', 'Denmark', 'EU', 'Europe', 'DKK', '+45', 16, true, NULL, NOW(), NOW()),
('FI', '芬兰', 'Finland', 'EU', 'Europe', 'EUR', '+358', 17, true, NULL, NOW(), NOW()),
('JP', '日本', 'Japan', 'ASIA', 'Asia', 'JPY', '+81', 18, true, NULL, NOW(), NOW()),
('KR', '韩国', 'South Korea', 'ASIA', 'Asia', 'KRW', '+82', 19, true, NULL, NOW(), NOW()),
('SG', '新加坡', 'Singapore', 'ASIA', 'Asia', 'SGD', '+65', 20, true, NULL, NOW(), NOW()),
('MY', '马来西亚', 'Malaysia', 'ASIA', 'Asia', 'MYR', '+60', 21, true, NULL, NOW(), NOW()),
('TH', '泰国', 'Thailand', 'ASIA', 'Asia', 'THB', '+66', 22, true, NULL, NOW(), NOW()),
('VN', '越南', 'Vietnam', 'ASIA', 'Asia', 'VND', '+84', 23, true, NULL, NOW(), NOW()),
('PH', '菲律宾', 'Philippines', 'ASIA', 'Asia', 'PHP', '+63', 24, true, NULL, NOW(), NOW()),
('ID', '印度尼西亚', 'Indonesia', 'ASIA', 'Asia', 'IDR', '+62', 25, true, NULL, NOW(), NOW()),
('AU', '澳大利亚', 'Australia', 'OCEANIA', 'Oceania', 'AUD', '+61', 26, true, NULL, NOW(), NOW()),
('NZ', '新西兰', 'New Zealand', 'OCEANIA', 'Oceania', 'NZD', '+64', 27, true, NULL, NOW(), NOW()),
('IE', '爱尔兰', 'Ireland', 'EU', 'Europe', 'EUR', '+353', 28, true, NULL, NOW(), NOW()),
('RO', '罗马尼亚', 'Romania', 'EU', 'Europe', 'RON', '+40', 29, true, NULL, NOW(), NOW()),
('CN', '中国', 'China', 'ASIA', 'Asia', 'CNY', '+86', 99, true, NULL, NOW(), NOW());

-- ============================================================
-- 客户类型字典 (dict_customer_types)
-- 说明: 客户类型只包括三种：平台客户、集团内部子公司、其他客户
-- ============================================================
INSERT INTO dict_customer_types (type_code, type_name_cn, type_name_en, sort_order, is_active, remarks, created_at, updated_at) VALUES
-- 平台客户 (PLATFORM)
('PLATFORM', '平台客户', 'Platform Customers', 1, true, '电商客户：Wayfair、Amazon、Target等', NOW(), NOW()),
-- 集团内部子公司 (SUBSIDIARY)
('SUBSIDIARY', '集团内部子公司', 'Group Subsidiaries', 2, true, 'AoSOM/MH集团9个海外子公司', NOW(), NOW()),
-- 其他客户 (OTHER)
('OTHER', '其他客户', 'Other Customers', 99, true, '其他客户', NOW(), NOW());

-- ============================================================
-- 港口字典 (dict_ports)
-- 说明: 包含32个国家67个主要港口
-- ============================================================
INSERT INTO dict_ports (
    port_code, port_name, port_name_en, port_type, country, state, city, timezone,
    latitude, longitude, support_export, support_import, support_container_only,
    status, remarks, created_at, updated_at
) VALUES
-- 中国港口
('CNSHG', '上海', 'Shanghai', 'PORT', 'CN', 'SH', 'Shanghai', 8, 31.2304, 121.4737, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CNSZX', '深圳', 'Shenzhen', 'PORT', 'CN', 'GD', 'Shenzhen', 8, 22.5431, 114.0579, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CNNGB', '宁波', 'Ningbo', 'PORT', 'CN', 'ZJ', 'Shanghai', 8, 29.8683, 121.5440, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CNYTN', '盐田', 'Yantian', 'PORT', 'CN', 'GD', 'Shenzhen', 8, 22.5589, 114.2720, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CNQNG', '青岛', 'Qingdao', 'PORT', 'CN', 'SD', 'Qingdao', 8, 36.0671, 120.3826, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CNTAO', '天津', 'Tianjin', 'PORT', 'CN', 'TJ', 'Beijing', 8, 39.0842, 117.2009, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CNDLC', '大连', 'Dalian', 'PORT', 'CN', 'LN', 'Dalian', 8, 38.9140, 121.6147, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CNXMN', '厦门', 'Xiamen', 'PORT', 'CN', 'FJ', 'Xiamen', 8, 24.4798, 118.0894, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CNGZU', '广州', 'Guangzhou', 'PORT', 'CN', 'GD', 'Guangzhou', 8, 23.1291, 113.2644, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CNTSN', '天津新港', 'Tianjin Xingang', 'PORT', 'CN', 'TJ', 'Beijing', 8, 38.9339, 117.8830, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CNLZU', '连云港', 'Lianyungang', 'PORT', 'CN', 'JS', 'Shanghai', 8, 34.5967, 119.2228, true, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('CNWHU', '武汉', 'Wuhan', 'PORT', 'CN', 'HB', 'Wuhan', 8, 30.5928, 114.3055, true, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('CNQNZ', '泉州', 'Quanzhou', 'PORT', 'CN', 'FJ', 'Xiamen', 8, 24.8741, 118.6757, true, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('CNSZW', '石围', 'Shiwei', 'PORT', 'CN', 'GD', 'Shenzhen', 8, 22.5833, 113.9167, true, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('CNYKT', '营口', 'Yingkou', 'PORT', 'CN', 'LN', 'Shenyang', 8, 40.6680, 122.2350, true, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('CNTAI', '太仓', 'Taicang', 'PORT', 'CN', 'JS', 'Shanghai', 8, 31.4497, 121.1089, true, true, false, 'ACTIVE', NULL, NOW(), NOW()),

-- 美国港口
('USLAX', '洛杉矶', 'Los Angeles', 'PORT', 'US', 'CA', 'Los_Angeles', -8, 33.7490, -118.2477, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('USNYC', '纽约', 'New York', 'PORT', 'US', 'NY', 'New_York', -5, 40.7128, -74.0060, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('USCHI', '芝加哥', 'Chicago', 'PORT', 'US', 'IL', 'Chicago', -6, 41.8781, -87.6298, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('USHOU', '休斯顿', 'Houston', 'PORT', 'US', 'TX', 'Chicago', -6, 29.7604, -95.3698, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('USSEA', '西雅图', 'Seattle', 'PORT', 'US', 'WA', 'Los_Angeles', -8, 47.6062, -122.3321, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('USSFO', '旧金山', 'San Francisco', 'PORT', 'US', 'CA', 'Los_Angeles', -8, 37.7749, -122.4194, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('USMIA', '迈阿密', 'Miami', 'PORT', 'US', 'FL', 'New_York', -5, 25.7617, -80.1918, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('USATL', '亚特兰大', 'Atlanta', 'PORT', 'US', 'GA', 'New_York', -5, 33.7490, -84.3880, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('USORD', '奥黑尔', 'Chicago O''Hare', 'PORT', 'US', 'IL', 'Chicago', -6, 41.9742, -87.9073, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('USJFK', '肯尼迪', 'JFK Airport', 'PORT', 'US', 'NY', 'New_York', -5, 40.6413, -73.7781, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),

-- 欧洲港口
('GBLHR', '伦敦', 'London', 'PORT', 'GB', 'ENG', 'London', 0, 51.5074, -0.1278, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('DEHAM', '汉堡', 'Hamburg', 'PORT', 'DE', 'HH', 'Berlin', 1, 53.5511, 9.9937, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('DETXF', '法兰克福', 'Frankfurt', 'PORT', 'DE', 'HE', 'Berlin', 1, 50.1109, 8.6821, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('FRAIX', '巴黎', 'Paris', 'PORT', 'FR', 'IDF', 'Paris', 1, 48.8566, 2.3522, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('ITFCO', '罗马', 'Rome', 'PORT', 'IT', 'LAZ', 'Rome', 1, 41.9028, 12.4964, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('NLAMS', '阿姆斯特丹', 'Amsterdam', 'PORT', 'NL', 'NH', 'Amsterdam', 1, 52.3676, 4.9041, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('ESMAD', '马德里', 'Madrid', 'PORT', 'ES', 'MD', 'Madrid', 1, 40.4168, -3.7038, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('BEBRU', '布鲁塞尔', 'Brussels', 'PORT', 'BE', 'BRU', 'Brussels', 1, 50.8503, 4.3517, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CHZRH', '苏黎世', 'Zurich', 'PORT', 'CH', 'ZH', 'Zurich', 1, 47.3769, 8.5417, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('ATVIE', '维也纳', 'Vienna', 'PORT', 'AT', 'W', 'Vienna', 1, 48.2082, 16.3738, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),

-- 亚洲其他港口
('JPTYO', '东京', 'Tokyo', 'PORT', 'JP', '13', 'Tokyo', 9, 35.6762, 139.6503, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('JPOSA', '大阪', 'Osaka', 'PORT', 'JP', '27', 'Tokyo', 9, 34.6937, 135.5023, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('JPNKT', '名古屋', 'Nagoya', 'PORT', 'JP', '23', 'Tokyo', 9, 35.1815, 136.9066, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('JPNGO', '福冈', 'Fukuoka', 'PORT', 'JP', '40', 'Tokyo', 9, 33.5904, 130.4017, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('KRINC', '仁川', 'Incheon', 'PORT', 'KR', '28', 'Seoul', 9, 37.4563, 126.7052, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SGSIN', '新加坡', 'Singapore', 'PORT', 'SG', 'SG', 'Singapore', 8, 1.3521, 103.8198, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('MYKUL', '吉隆坡', 'Kuala Lumpur', 'PORT', 'MY', 'KUL', 'Kuala_Lumpur', 8, 3.1390, 101.6869, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('THBKK', '曼谷', 'Bangkok', 'PORT', 'TH', 'BKK', 'Bangkok', 7, 13.7563, 100.5018, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('IDCGK', '雅加达', 'Jakarta', 'PORT', 'ID', 'JKT', 'Jakarta', 7, -6.2088, 106.8456, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('VNDEL', '胡志明', 'Ho Chi Minh', 'PORT', 'VN', 'SGN', 'Ho_Chi_Minh', 7, 10.8231, 106.6297, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),

-- 中东港口
('AEDXB', '迪拜', 'Dubai', 'PORT', 'AE', 'DU', 'Dubai', 4, 25.2048, 55.2708, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('AEJEA', '杰贝阿里', 'Jebel Ali', 'PORT', 'AE', 'DU', 'Dubai', 4, 25.0392, 55.1855, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SAJED', '吉达', 'Jeddah', 'PORT', 'SA', '14', 'Riyadh', 3, 21.5433, 39.1728, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('QADOH', '多哈', 'Doha', 'PORT', 'QA', 'DA', 'Qatar', 3, 25.2854, 51.5310, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),

-- 南美港口
('BRGRU', '圣保罗', 'Sao Paulo', 'PORT', 'BR', 'SP', 'Sao_Paulo', -3, -23.5505, -46.6333, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('ARSZE', '布宜诺斯艾利斯', 'Buenos Aires', 'PORT', 'AR', 'BA', 'Buenos_Aires', -3, -34.6037, -58.3816, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CLLIM', '利马', 'Lima', 'PORT', 'CL', 'LIM', 'Lima', -5, -12.0464, -77.0428, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('PELIM', '利马(秘鲁)', 'Lima Peru', 'PORT', 'PE', 'LIM', 'Lima', -5, -12.0464, -77.0428, true, true, false, 'ACTIVE', NULL, NOW(), NOW()),

-- 非洲港口
('ZACPT', '开普敦', 'Cape Town', 'PORT', 'ZA', 'WC', 'Johannesburg', 2, -33.9249, 18.4241, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('EGCAI', '开罗', 'Cairo', 'PORT', 'EG', 'C', 'Cairo', 2, 30.0444, 31.2357, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('MNCPT', '卡萨布兰卡', 'Casablanca', 'PORT', 'MA', 'CM', 'Casablanca', 1, 33.5731, -7.5898, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),

-- 印度港口
('INDEL', '德里', 'Delhi', 'PORT', 'IN', 'DL', 'New_Delhi', 5.5, 28.6139, 77.2090, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('INBOM', '孟买', 'Mumbai', 'PORT', 'IN', 'MH', 'Mumbai', 5.5, 19.0760, 72.8777, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),

-- 加拿大港口
('CAVAN', '温哥华', 'Vancouver', 'PORT', 'CA', 'BC', 'Vancouver', -8, 49.2827, -123.1207, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CATRN', '多伦多', 'Toronto', 'PORT', 'CA', 'ON', 'Toronto', -5, 43.7001, -79.4163, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CAMTR', '蒙特利尔', 'Montreal', 'PORT', 'CA', 'QC', 'Montreal', -5, 45.5017, -73.5673, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),

-- 大洋洲港口
('AUSYD', '悉尼', 'Sydney', 'PORT', 'AU', 'NSW', 'Sydney', 10, -33.8688, 151.2093, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('AUMEL', '墨尔本', 'Melbourne', 'PORT', 'AU', 'VIC', 'Melbourne', 10, -37.8136, 144.9631, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('AUBNE', '布里斯班', 'Brisbane', 'PORT', 'AU', 'QLD', 'Brisbane', 10, -27.4698, 153.0251, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('AUFRE', '弗里曼特尔', 'Fremantle', 'PORT', 'AU', 'WA', 'Perth', 8, -32.0569, 115.7439, true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('NZAKL', '奥克兰', 'Auckland', 'PORT', 'NZ', 'AUK', 'Auckland', 12, -36.8485, 174.7633, true, true, true, 'ACTIVE', NULL, NOW(), NOW());

-- ============================================================
-- 船公司字典 (dict_shipping_companies)
-- 完整海运船公司列表，共91家
-- ============================================================
INSERT INTO dict_shipping_companies (company_code, company_name, company_name_en, scac_code, api_provider, support_booking, support_bill_of_lading, support_container, status, remarks, created_at, updated_at) VALUES
('ACI', '亚利安莎', 'Arian Shipping', 'ACIC', 'MSK', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('ANL', '澳航', 'ANL Container Line', 'ANNU', 'ANL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('APL', '美国总统', 'American President Lines', 'APLU', 'CMA', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CCN', '智利航运', 'CCNI', 'CCNR', 'MSK', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CKL', '天敬', 'CK Line', 'CKLC', 'CKL', true, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('CMA', '达飞', 'CMA CGM', 'CMDU', 'CMA', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CNC', '正利', 'CNC Line', 'CNCL', 'CNC', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('COS', '中远', 'COSCO', 'COSU', 'COSCO', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CUL', '中联', 'Cheng Lie Navigation', 'CULU', 'CUL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('DEL', '达贸轮船', 'Delmas', 'DELC', 'CMA', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('EMC', '长荣', 'Evergreen Marine', 'EGLV', 'EMC', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('ESL', '阿联酋', 'ESL Shipping', 'EMIV', 'ESL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('GSL', '金星', 'Gold Star Line', 'GOSU', 'GSL', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('HAL', '兴亚', 'Heung-A Shipping', 'HALC', 'HAL', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('HAS', '海华', 'HASCO', 'HASU', 'HASCO', false, true, true, 'ACTIVE', 'Requires 箱号+英文船名+航次', NOW(), NOW()),
('HBS', '汉堡南美', 'Hamburg Süd', 'SUDU', 'MSK', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('HMM', '现代', 'HMM', 'HDMU', 'HMM', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('HPL', '赫伯罗特', 'Hapag-Lloyd', 'HLCU', 'HPL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('IAL', '运达', 'IAL', 'IALU', 'IAL', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SJJ', '锦江', 'Jinjiang Shipping', 'JINX', 'JINJIANG', false, true, true, 'ACTIVE', 'Requires 箱号+英文船名+航次', NOW(), NOW()),
('KKC', '神原汽船', 'Kambara Kisen', 'KMBU', 'KKC', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('KMT', '高丽', 'KMTC', 'KMTC', 'KMTC', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('KWE', '近铁', 'Kintetsu World Express', 'KWEU', 'KWE', true, false, false, 'ACTIVE', NULL, NOW(), NOW()),
('MAT', '美森', 'Matson', 'MATS', 'MATS', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('MCC', 'MCC运输', 'MCC Transport', 'MCPU', 'MSK', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('MSC', '地中海', 'Mediterranean Shipping Company', 'MEDU', 'MSC', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('MSK', '马士基', 'Maersk', 'MAEU', 'MSK', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('NGP', '太古船务', 'NGPL', 'NGPL', 'NGPL', true, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('NDS', '尼罗河', 'Nile Dutch', 'NDSU', 'HPL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('NOS', '宁波远洋外贸', 'NOSCO', 'NOSC', 'NOSCO', false, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('NSS', '南星', 'Namsung Shipping', 'NSSC', 'NSS', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('ONE', '海洋网联', 'Ocean Network Express', 'ONEY', 'ONE', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('OOL', '东方海外', 'OOCL', 'OOLU', 'OOCL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('PCL', '泛洲', 'Pan Continental', 'PCLC', 'PCL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('PIL', '太平', 'PIL', 'PABV', 'PIL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('RCL', '宏海', 'RCL', 'RCLC', 'RCL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SAF', '萨非', 'Safmarine', 'SEAU', 'MSK', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SLS', '海领', 'Sealead', 'SJHH', 'SEALEAD', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SNL', '中外运', 'Sino Shipping', 'SNTU', 'SINO', false, true, true, 'ACTIVE', 'Requires 提单号+箱号', NOW(), NOW()),
('SMM', '森罗', 'Sinokor', 'SKMC', 'SINOKOR', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SIT', '海丰', 'SITC', 'SITC', 'SITC', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SML', '森罗', 'SML', 'SMLM', 'SML', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('STX', '世腾', 'STX', 'POBU', 'STX', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('TAR', '塔罗斯', 'Tarros', 'GETU', 'TARROS', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('TCL', '太仓', 'Taicang Container', 'TCLC', 'TCLC', false, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('TSL', '德翔', 'TS Lines', 'TSYN', 'TSL', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('USL', '美国轮船', 'United States Lines', 'USLC', 'CMA', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('WHL', '万海', 'Wan Hai Lines', 'WHLC', 'WHL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('YML', '阳明', 'Yang Ming', 'YMJA', 'YML', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('ZIM', '以星', 'ZIM', 'ZIMU', 'ZIM', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('ZSH', '中谷外贸', 'ZSH', 'ZSHC', 'ZSH', false, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('FES', '俄远东', 'FESCO', 'FESO', 'FESCO', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('MEL', '玛里亚那', 'Mariana Express', 'MELL', 'MARIANA', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('HDW', '合德', 'Hede', 'HDUJ', 'HEDE', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('DYS', '东映', 'Dong Young', 'DYSL', 'DYS', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('DJS', '东进', 'Dongjin', 'DJSL', 'DJS', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SIF', '仁川', 'SIF', 'SIMP', 'SIF', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('MSS', '民生', 'Minsheng', 'MSKM', 'MINSHENG', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('TSH', '泰赢', 'Tailwind', 'TSHG', 'TAILWIND', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('ALX', '阿拉丁', 'Aladdin', 'ALXU', 'ALX', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('UGL', '联合环球', 'UGL', 'UGLU', 'UGL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('OVP', '海液通', 'OVP', 'OVPB', 'OVP', false, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('ARKAS', '阿尔卡斯', 'Arkas', 'ARKU', 'ARKAS', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('EPANASIA', '泛亚内贸', 'Pan-Asia Domestic', 'COSU', 'COSCO', false, true, true, 'ACTIVE', '内贸航线', NOW(), NOW()),
('ZSH_D', '中谷内贸', 'ZSH Domestic', 'ZSHC', 'ZSH', false, true, false, 'ACTIVE', '内贸航线', NOW(), NOW()),
('ATL', '安通内贸', 'Antong Domestic', 'ATLC', 'ATL', false, true, false, 'ACTIVE', '内贸航线', NOW(), NOW()),
('TRAWIND', '信风内贸', 'Tailwind Domestic', 'TRAW', 'TRAWIND', false, true, false, 'ACTIVE', '内贸航线', NOW(), NOW()),
('NOSCO_D', '宁波远洋内贸', 'NOSCO Domestic', 'NOSC', 'NOSCO', false, true, false, 'ACTIVE', '内贸航线', NOW(), NOW()),
('SAMUDERA', '萨姆达拉', 'Samudera', 'SIKU', 'SAMUDERA', false, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('JIHANG', '吉航海运', 'Jihang', 'JIHA', 'JIHANG', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('NNL', '新新航运', 'NNSL', 'NNSP', 'NNL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('KANWAY', '建华海运', 'Kanway', 'UNKN', 'KANWAY', false, false, true, 'ACTIVE', NULL, NOW(), NOW()),
('VOLTA', '瓦尔塔', 'Volta', 'VOLT', 'VOLTA', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('DSV', '丹麦物流', 'DSV', 'DFDS', 'DSV', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('BEN', '边航轮船', 'BEN Line', 'BENU', 'BEN', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('CCL', '中通航运', 'CCL', 'CCLU', 'CCL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('EAS', '达通航运', 'East Asia', 'EASC', 'EAS', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('XPRESS', 'X-Express', 'X-Press-Feeder', 'XPRS', 'XPRESS', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('YCKY', '优成凯运', 'YCKY', 'YCKY', 'YCKY', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('KAWA', '嘉华航运', 'Kawa', 'KAWA', 'KAWA', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('FPMC', '台塑航运', 'FPMC', 'FPMC', 'FPMC', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SACO', '中美合作', 'SACO', 'SACO', 'SACO', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SETH', '狮富海运', 'Seth', 'SSPH', 'SETH', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SHIPCO', '世舶科', 'Shipco', 'SHCO', 'SHIPCO', true, true, false, 'ACTIVE', NULL, NOW(), NOW()),
('UNIFEEDER', '优尼菲尔德', 'Unifeeder', 'UNFR', 'UNIFEEDER', false, true, true, 'ACTIVE', '暂不支持', NOW(), NOW()),
('WEC', '荷兰航运', 'WEC', 'WECL', 'WEC', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('SLG', '海杰航运', 'SLG', 'SLGS', 'SLG', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('ASL', '亚海', 'ASL', 'ASLU', 'ASL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('NZL', '新西兰航运', 'NZL', 'NZLU', 'NZL', true, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('HSL', '韩星航运', 'HSL', 'HSLU', 'HSL', false, true, true, 'ACTIVE', NULL, NOW(), NOW()),
('WHDT', '武汉大通', 'Wuhan Datong', 'WHDT', 'WHDT', true, true, true, 'ACTIVE', NULL, NOW(), NOW());

-- ============================================================
-- 货代公司字典 (dict_freight_forwarders)
-- ============================================================
INSERT INTO dict_freight_forwarders (forwarder_code, forwarder_name, forwarder_name_en, contact_phone, contact_email, status, remarks, created_at, updated_at) VALUES
('DHL', '敦豪全球货运', 'DHL Global Forwarding', '+49-180-3348111', 'info@dhl.com', 'ACTIVE', NULL, NOW(), NOW()),
('KUEHNE_NAGEL', '德迅物流', 'Kuehne + Nagel', '+41-584196969', 'info@kuehne-nagel.com', 'ACTIVE', NULL, NOW(), NOW()),
('DB_SCHENKER', '全球国际货运', 'DB Schenker', '+49-180-6334636', 'info@dbschenker.com', 'ACTIVE', NULL, NOW(), NOW()),
('EXPEDITORS', '康捷空物流', 'Expeditors International', '+1-206-6743400', 'info@expeditors.com', 'ACTIVE', NULL, NOW(), NOW()),
('DAMCO', '丹马士物流', 'Damco', '+45-33784000', 'info@damco.com', 'ACTIVE', NULL, NOW(), NOW()),
('UPS_SCS', 'UPS供应链', 'UPS Supply Chain Solutions', '+1-800-7425877', 'info@ups.com', 'ACTIVE', NULL, NOW(), NOW()),
('CEVA', '基华物流', 'CEVA Logistics', '+41-225880100', 'info@cevalogistics.com', 'ACTIVE', NULL, NOW(), NOW());

-- ============================================================
-- 清关公司字典 (dict_customs_brokers)
-- ============================================================
INSERT INTO dict_customs_brokers (broker_code, broker_name, broker_name_en, contact_phone, contact_email, status, remarks, created_at, updated_at) VALUES
('CB_US_WEST', '美国西海岸清关', 'US West Coast Customs Broker', '+1-310-5550100', 'info@uswestcustoms.com', 'ACTIVE', NULL, NOW(), NOW()),
('CB_US_EAST', '美国东海岸清关', 'US East Coast Customs Broker', '+1-212-5550200', 'info@useastcustoms.com', 'ACTIVE', NULL, NOW(), NOW()),
('CB_EU_NL', '荷兰清关代理', 'Netherlands Customs Broker', '+31-10-5550300', 'info@nlcustoms.com', 'ACTIVE', NULL, NOW(), NOW()),
('CB_EU_DE', '德国清关代理', 'Germany Customs Broker', '+49-40-5550400', 'info@decustoms.com', 'ACTIVE', NULL, NOW(), NOW()),
('CB_CA_BC', '加拿大BC省清关', 'Canada BC Customs Broker', '+1-604-5550500', 'info@cabcustoms.com', 'ACTIVE', NULL, NOW(), NOW());

-- ============================================================
-- 拖车公司字典 (dict_trucking_companies)
-- ============================================================
INSERT INTO dict_trucking_companies (company_code, company_name, company_name_en, contact_phone, contact_email, status, remarks, created_at, updated_at) VALUES
('TC_US_LAX', '洛杉矶拖车公司', 'Los Angeles Trucking Co', '+1-213-5550600', 'info@latrucking.com', 'ACTIVE', NULL, NOW(), NOW()),
('TC_US_NYC', '纽约拖车公司', 'New York Trucking Co', '+1-718-5550700', 'info@nytrucking.com', 'ACTIVE', NULL, NOW(), NOW()),
('TC_US_SEA', '西雅图拖车公司', 'Seattle Trucking Co', '+1-206-5550800', 'info@seatrucking.com', 'ACTIVE', NULL, NOW(), NOW()),
('TC_CA_VAN', '温哥华拖车公司', 'Vancouver Trucking Co', '+1-604-5550900', 'info@vantrucking.com', 'ACTIVE', NULL, NOW(), NOW()),
('TC_EU_RT', '鹿特丹拖车公司', 'Rotterdam Trucking Co', '+31-10-5551000', 'info@rtdrucking.com', 'ACTIVE', NULL, NOW(), NOW());

-- ============================================================
-- 柜型字典 (dict_container_types) - 标准化箱型
-- ============================================================
INSERT INTO dict_container_types (type_code, type_name_cn, type_name_en, size_ft, type_abbrev, full_name, dimensions, max_weight_kg, max_cbm, teu, sort_order, is_active, remarks, created_at, updated_at) VALUES
-- 普通柜
('20GP', '20英尺普柜', '20'' General Purpose', 20, 'GP', 'General Purpose', '20''x8''x8''6"', 21700, 33.1, 1, 1, true, NULL, NOW(), NOW()),
('40GP', '40英尺普柜', '40'' General Purpose', 40, 'GP', 'General Purpose', '40''x8''x8''6"', 26630, 67.3, 2, 2, true, NULL, NOW(), NOW()),
('45GP', '45英尺普柜', '45'' General Purpose', 45, 'GP', 'General Purpose', '45''x8''x8''6"', 28400, 86.0, 2.25, 3, true, NULL, NOW(), NOW()),
-- 高柜
('20HC', '20英尺高柜', '20'' High Cube', 20, 'HC', 'General Purpose High Cube', '20''x8''x9''6"', 21700, 33.9, 1, 4, true, NULL, NOW(), NOW()),
('40HC', '40英尺高柜', '40'' High Cube', 40, 'HC', 'General Purpose High Cube', '40''x8''x9''6"', 26580, 76.0, 2, 5, true, NULL, NOW(), NOW()),
('45HC', '45英尺高柜', '45'' High Cube', 45, 'HC', 'General Purpose High Cube', '45''x8''x9''6"', 27700, 85.9, 2.25, 6, true, NULL, NOW(), NOW()),
('53HC', '53英尺高柜', '53'' High Cube', 53, 'HC', 'General Purpose High Cube', '53''x8''x9''6"', 29480, 105.9, 2.65, 7, true, NULL, NOW(), NOW()),
-- 平板柜
('20FR', '20英尺平板柜', '20'' Flat Rack', 20, 'FR', 'Flat Rack', '20''x8''x8''6"', 27900, 31.5, 1, 8, true, NULL, NOW(), NOW()),
('40FR', '40英尺平板柜', '40'' Flat Rack', 40, 'FR', 'Flat Rack', '40''x8''x8''6"', 40200, 65.8, 2, 9, true, NULL, NOW(), NOW()),
('45FR', '45英尺平板柜', '45'' Flat Rack', 45, 'FR', 'Flat Rack', '45''x8''x8''6"', 42500, 85.0, 2.25, 10, true, NULL, NOW(), NOW()),
('20FQ', '20英尺高柜平板', '20'' Flat Rack High Cube', 20, 'FQ', 'Flat Rack High Cube', '20''x8''x9''6"', 27900, 32.5, 1, 11, true, NULL, NOW(), NOW()),
('40FQ', '40英尺高柜平板', '40'' Flat Rack High Cube', 40, 'FQ', 'Flat Rack High Cube', '40''x8''x9''6"', 40200, 68.0, 2, 12, true, NULL, NOW(), NOW()),
('45FQ', '45英尺高柜平板', '45'' Flat Rack High Cube', 45, 'FQ', 'Flat Rack High Cube', '45''x8''x9''6"', 42500, 88.0, 2.25, 13, true, NULL, NOW(), NOW()),
-- 开顶柜
('20OT', '20英尺开顶柜', '20'' Open Top', 20, 'OT', 'Open Top', '20''x8''x8''6"', 21700, 31.5, 1, 14, true, NULL, NOW(), NOW()),
('40OT', '40英尺开顶柜', '40'' Open Top', 40, 'OT', 'Open Top', '40''x8''x8''6"', 26630, 65.8, 2, 15, true, NULL, NOW(), NOW()),
('45OT', '45英尺开顶柜', '45'' Open Top', 45, 'OT', 'Open Top', '45''x8''x8''6"', 27700, 85.0, 2.25, 16, true, NULL, NOW(), NOW()),
('20OQ', '20英尺高柜开顶', '20'' Open Top High Cube', 20, 'OQ', 'Open Top High Cube', '20''x8''x9''6"', 21700, 32.5, 1, 17, true, NULL, NOW(), NOW()),
('40OQ', '40英尺高柜开顶', '40'' Open Top High Cube', 40, 'OQ', 'Open Top High Cube', '40''x8''x9''6"', 26630, 68.0, 2, 18, true, NULL, NOW(), NOW()),
('45OQ', '45英尺高柜开顶', '45'' Open Top High Cube', 45, 'OQ', 'Open Top High Cube', '45''x8''x9''6"', 27700, 88.0, 2.25, 19, true, NULL, NOW(), NOW()),
-- 罐式柜
('20TK', '20英尺罐式柜', '20'' Tank', 20, 'TK', 'Tank', '20''x8''x8''6"', 21700, 24.0, 1, 20, true, NULL, NOW(), NOW()),
('40TK', '40英尺罐式柜', '40'' Tank', 40, 'TK', 'Tank', '40''x8''x8''6"', 26630, 50.0, 2, 21, true, NULL, NOW(), NOW()),
('45TK', '45英尺罐式柜', '45'' Tank', 45, 'TK', 'Tank', '45''x8''x8''6"', 27700, 65.0, 2.25, 22, true, NULL, NOW(), NOW()),
('20TQ', '20英尺高柜罐式', '20'' Tank High Cube', 20, 'TQ', 'Tank High Cube', '20''x8''x9''6"', 21700, 25.0, 1, 23, true, NULL, NOW(), NOW()),
('40TQ', '40英尺高柜罐式', '40'' Tank High Cube', 40, 'TQ', 'Tank High Cube', '40''x8''x9''6"', 26630, 52.0, 2, 24, true, NULL, NOW(), NOW()),
('45TQ', '45英尺高柜罐式', '45'' Tank High Cube', 45, 'TQ', 'Tank High Cube', '45''x8''x9''6"', 27700, 68.0, 2.25, 25, true, NULL, NOW(), NOW()),
-- 冷藏柜
('20RF', '20英尺冷藏柜', '20'' Reefer', 20, 'RF', 'Reefer', '20''x8''x8''6"', 21000, 28.0, 1, 26, true, NULL, NOW(), NOW()),
('40RF', '40英尺冷藏柜', '40'' Reefer', 40, 'RF', 'Reefer', '40''x8''x8''6"', 27000, 58.0, 2, 27, true, NULL, NOW(), NOW()),
('45RF', '45英尺冷藏柜', '45'' Reefer', 45, 'RF', 'Reefer', '45''x8''x8''6"', 28500, 78.0, 2.25, 28, true, NULL, NOW(), NOW()),
('20RH', '20英尺高柜冷藏', '20'' Reefer High Cube', 20, 'RH', 'Reefer High Cube', '20''x8''x9''6"', 21000, 29.0, 1, 29, true, NULL, NOW(), NOW()),
('40RH', '40英尺高柜冷藏', '40'' Reefer High Cube', 40, 'RH', 'Reefer High Cube', '40''x8''x9''6"', 27000, 60.0, 2, 30, true, NULL, NOW(), NOW()),
('45RH', '45英尺高柜冷藏', '45'' Reefer High Cube', 45, 'RH', 'Reefer High Cube', '45''x8''x9''6"', 28500, 80.0, 2.25, 31, true, NULL, NOW(), NOW()),
-- 挂衣柜
('20HT', '20英尺挂衣柜', '20'' Dress Hanger', 20, 'HT', 'Dress Hanger', '20''x8''x8''6"', 21700, 31.0, 1, 32, true, NULL, NOW(), NOW()),
('40HT', '40英尺挂衣柜', '40'' Dress Hanger', 40, 'HT', 'Dress Hanger', '40''x8''x8''6"', 26630, 65.0, 2, 33, true, NULL, NOW(), NOW()),
('45HT', '45英尺挂衣柜', '45'' Dress Hanger', 45, 'HT', 'Dress Hanger', '45''x8''x8''6"', 27700, 85.0, 2.25, 34, true, NULL, NOW(), NOW()),
('20HH', '20英尺高柜挂衣', '20'' Dress Hanger High Cube', 20, 'HH', 'Dress Hanger High Cube', '20''x8''x9''6"', 21700, 32.0, 1, 35, true, NULL, NOW(), NOW()),
('40HH', '40英尺高柜挂衣', '40'' Dress Hanger High Cube', 40, 'HH', 'Dress Hanger High Cube', '40''x8''x9''6"', 26630, 67.0, 2, 36, true, NULL, NOW(), NOW()),
('45HH', '45英尺高柜挂衣', '45'' Dress Hanger High Cube', 45, 'HH', 'Dress Hanger High Cube', '45''x8''x9''6"', 27700, 88.0, 2.25, 37, true, NULL, NOW(), NOW());

-- ============================================================
-- 仓库字典 (dict_warehouses)
-- ============================================================
INSERT INTO dict_warehouses (warehouse_code, warehouse_name, warehouse_name_en, warehouse_type, address, city, state, country, contact_phone, contact_email, status, remarks, created_at, updated_at) VALUES
('WH_US_NJ_01', '新泽西仓库1', 'New Jersey Warehouse 1', 'PUBLIC', '123 Industrial Way', 'Newark', 'NJ', 'US', '+1-973-5551100', 'info@njwarehouse.com', 'ACTIVE', NULL, NOW(), NOW()),
('WH_US_CA_01', '加州仓库1', 'California Warehouse 1', 'PRIVATE', '456 Commerce Blvd', 'Los Angeles', 'CA', 'US', '+1-213-5551200', 'info@cawarehouse.com', 'ACTIVE', NULL, NOW(), NOW()),
('WH_EU_DE_01', '德国仓库1', 'Germany Warehouse 1', 'PUBLIC', '789 Logistik Str', 'Hamburg', NULL, 'DE', '+49-40-5551300', 'info@dewarehouse.com', 'ACTIVE', NULL, NOW(), NOW()),
('WH_CA_BC_01', '加拿大BC仓库1', 'Canada BC Warehouse 1', 'PUBLIC', '321 Port Road', 'Vancouver', 'BC', 'CA', '+1-604-5551400', 'info@bcwarehouse.com', 'ACTIVE', NULL, NOW(), NOW()),
('WH_EU_NL_01', '荷兰仓库1', 'Netherlands Warehouse 1', 'PUBLIC', '654 Havenweg', 'Rotterdam', NULL, 'NL', '+31-10-5551500', 'info@nlwarehouse.com', 'ACTIVE', NULL, NOW(), NOW());

-- ============================================================
-- 海外公司字典 (dict_overseas_companies)
-- AoSOM/MH 集团 9个海外子公司
-- ============================================================
INSERT INTO dict_overseas_companies (company_code, company_name, company_name_en, country, contact_person, contact_phone, contact_email, currency, sort_order, is_active, remarks, created_at, updated_at) VALUES
('AOSOM_US', 'AOSOM LLC', 'AOSOM LLC', 'US', NULL, '+1-XXX-XXXX', 'contact@aosom-us.com', 'USD', 1, true, NULL, NOW(), NOW()),
('AOSOM_CA', 'AOSOM CANADA INC.', 'AOSOM Canada Inc.', 'CA', NULL, '+1-XXX-XXXX', 'contact@aosom-ca.com', 'CAD', 2, true, NULL, NOW(), NOW()),
('MH_UK', 'MH STAR UK LTD', 'MH Star UK Ltd', 'GB', NULL, '+44-XXX-XXXX', 'contact@mh-uk.com', 'GBP', 3, true, NULL, NOW(), NOW()),
('MH_FR', 'MH FRANCE', 'MH France', 'FR', NULL, '+33-XXX-XXXX', 'contact@mh-fr.com', 'EUR', 4, true, NULL, NOW(), NOW()),
('MH_DE', 'MH HANDEL GMBH', 'MH Handel GmbH', 'DE', NULL, '+49-XXX-XXXX', 'contact@mh-de.com', 'EUR', 5, true, NULL, NOW(), NOW()),
('AOSOM_IT', 'AOSOM ITALY SRL', 'AOSOM Italy Srl', 'IT', NULL, '+39-XXX-XXXX', 'contact@aosom-it.com', 'EUR', 6, true, NULL, NOW(), NOW()),
('AOSOM_IE', 'AOSOM IRELAND LIMITED', 'AOSOM Ireland Ltd', 'IE', NULL, '+353-XXX-XXXX', 'contact@aosom-ie.com', 'EUR', 7, true, NULL, NOW(), NOW()),
('AOSOM_ES', 'SPANISH AOSOM, S.L.', 'Spanish Aosom S.L.', 'ES', NULL, '+34-XXX-XXXX', 'contact@aosom-es.com', 'EUR', 8, true, NULL, NOW(), NOW()),
('AOSOM_RO', 'AOSOM ROMANIA S.R.L.', 'AOSOM Romania S.R.L.', 'RO', NULL, '+40-XXX-XXXX', 'contact@aosom-ro.com', 'RON', 9, true, NULL, NOW(), NOW());

-- ============================================================
-- 客户表 (biz_customers) 初始化
-- ============================================================
\echo '开始初始化客户表数据...'
\echo 'Starting to initialize biz_customers data...'

-- 1. 平台客户 (PLATFORM)
INSERT INTO biz_customers (customer_code, customer_name, customer_type_code, country, customer_category, status, sort_order, remarks, created_at, updated_at) VALUES
('WAYFAIR', 'Wayfair LLC', 'PLATFORM', 'US', 'PLATFORM', 'ACTIVE', 1, NULL, NOW(), NOW()),
('AMAZON', 'Amazon.com, Inc.', 'PLATFORM', 'US', 'PLATFORM', 'ACTIVE', 2, NULL, NOW(), NOW()),
('TARGET', 'Target Corporation', 'PLATFORM', 'US', 'PLATFORM', 'ACTIVE', 3, NULL, NOW(), NOW()),
('WALMART', 'Walmart Inc.', 'PLATFORM', 'US', 'PLATFORM', 'ACTIVE', 4, NULL, NOW(), NOW()),
('OVERSTOCK', 'Overstock.com', 'PLATFORM', 'US', 'PLATFORM', 'ACTIVE', 5, NULL, NOW(), NOW()),
('HOMEGOODS', 'HomeGoods', 'PLATFORM', 'US', 'PLATFORM', 'ACTIVE', 6, NULL, NOW(), NOW()),
('BESTBUY', 'Best Buy Co., Inc.', 'PLATFORM', 'US', 'PLATFORM', 'ACTIVE', 7, NULL, NOW(), NOW());

-- 2. 集团内部子公司 (SUBSIDIARY) - 关联海外公司字典
INSERT INTO biz_customers (customer_code, customer_name, customer_type_code, country, overseas_company_code, customer_category, status, sort_order, remarks, created_at, updated_at) VALUES
('AOSOM_US', 'AOSOM LLC', 'SUBSIDIARY', 'US', 'AOSOM_US', 'SUBSIDIARY', 'ACTIVE', 11, NULL, NOW(), NOW()),
('AOSOM_CA', 'AOSOM CANADA INC.', 'SUBSIDIARY', 'CA', 'AOSOM_CA', 'SUBSIDIARY', 'ACTIVE', 12, NULL, NOW(), NOW()),
('MH_UK', 'MH STAR UK LTD', 'SUBSIDIARY', 'GB', 'MH_UK', 'SUBSIDIARY', 'ACTIVE', 13, NULL, NOW(), NOW()),
('MH_FR', 'MH FRANCE', 'SUBSIDIARY', 'FR', 'MH_FR', 'SUBSIDIARY', 'ACTIVE', 14, NULL, NOW(), NOW()),
('MH_DE', 'MH HANDEL GMBH', 'SUBSIDIARY', 'DE', 'MH_DE', 'SUBSIDIARY', 'ACTIVE', 15, NULL, NOW(), NOW()),
('AOSOM_IT', 'AOSOM ITALY SRL', 'SUBSIDIARY', 'IT', 'AOSOM_IT', 'SUBSIDIARY', 'ACTIVE', 16, NULL, NOW(), NOW()),
('AOSOM_IE', 'AOSOM IRELAND LIMITED', 'SUBSIDIARY', 'IE', 'AOSOM_IE', 'SUBSIDIARY', 'ACTIVE', 17, NULL, NOW(), NOW()),
('AOSOM_ES', 'SPANISH AOSOM, S.L.', 'SUBSIDIARY', 'ES', 'AOSOM_ES', 'SUBSIDIARY', 'ACTIVE', 18, NULL, NOW(), NOW()),
('AOSOM_RO', 'AOSOM ROMANIA S.R.L.', 'SUBSIDIARY', 'RO', 'AOSOM_RO', 'SUBSIDIARY', 'ACTIVE', 19, NULL, NOW(), NOW());

\echo '客户表数据初始化完成'
\echo 'Dictionary table data initialized successfully'
\echo ''
\echo '初始化统计:'
\echo '国别: ' || (SELECT COUNT(*) FROM dict_countries)
\echo '客户类型: ' || (SELECT COUNT(*) FROM dict_customer_types)
\echo '客户: ' || (SELECT COUNT(*) FROM biz_customers)
\echo '港口: ' || (SELECT COUNT(*) FROM dict_ports)
\echo '船公司: ' || (SELECT COUNT(*) FROM dict_shipping_companies)
\echo '货代公司: ' || (SELECT COUNT(*) FROM dict_freight_forwarders)
\echo '清关公司: ' || (SELECT COUNT(*) FROM dict_customs_brokers)
\echo '拖车公司: ' || (SELECT COUNT(*) FROM dict_trucking_companies)
\echo '柜型: ' || (SELECT COUNT(*) FROM dict_container_types)
\echo '仓库: ' || (SELECT COUNT(*) FROM dict_warehouses)
\echo '海外公司: ' || (SELECT COUNT(*) FROM dict_overseas_companies)
