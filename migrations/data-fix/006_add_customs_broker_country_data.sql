-- ============================================================
-- Sample Data: Initialize customs brokers with country mapping
-- 清关公司示例数据（按国家分类）
-- ============================================================
-- Usage: Run this after 006_add_customs_broker_country.sql
-- ============================================================

-- 美国清关公司
INSERT INTO dict_customs_brokers (broker_code, broker_name, broker_name_en, country, status, remarks)
VALUES 
  ('CB_US_WEST', '美国西部清关公司', 'USA West Customs Broker', 'US', 'ACTIVE', '服务美西港口（LA/LB/SEA）'),
  ('CB_US_EAST', '美国东部清关公司', 'USA East Customs Broker', 'US', 'ACTIVE', '服务美东港口（NYC/SAV/MIA）')
ON CONFLICT (broker_code) DO NOTHING;

-- 加拿大清关公司
INSERT INTO dict_customs_brokers (broker_code, broker_name, broker_name_en, country, status, remarks)
VALUES 
  ('CB_CA_BC', '加拿大 BC 省清关公司', 'Canada BC Customs Broker', 'CA', 'ACTIVE', '服务温哥华港（VAN）'),
  ('CB_CA_ON', '加拿大安省清关公司', 'Canada ON Customs Broker', 'CA', 'ACTIVE', '服务多伦多地区')
ON CONFLICT (broker_code) DO NOTHING;

-- 欧洲清关公司
INSERT INTO dict_customs_brokers (broker_code, broker_name, broker_name_en, country, status, remarks)
VALUES 
  ('CB_EU_NL', '荷兰清关公司', 'Netherlands Customs Broker', 'NL', 'ACTIVE', '服务鹿特丹港（RTM）'),
  ('CB_EU_DE', '德国清关公司', 'Germany Customs Broker', 'DE', 'ACTIVE', '服务汉堡港（HAM）'),
  ('CB_UK_LDN', '英国清关公司', 'UK Customs Broker', 'GB', 'ACTIVE', '服务伦敦/费利克斯托港')
ON CONFLICT (broker_code) DO NOTHING;

-- 澳洲清关公司
INSERT INTO dict_customs_brokers (broker_code, broker_name, broker_name_en, country, status, remarks)
VALUES 
  ('CB_AU_SYD', '澳洲悉尼清关公司', 'Australia Sydney Customs Broker', 'AU', 'ACTIVE', '服务悉尼港（SYD）'),
  ('CB_AU_MEL', '澳洲墨尔本清关公司', 'Australia Melbourne Customs Broker', 'AU', 'ACTIVE', '服务墨尔本港（MEL）')
ON CONFLICT (broker_code) DO NOTHING;

-- 亚洲清关公司
INSERT INTO dict_customs_brokers (broker_code, broker_name, broker_name_en, country, status, remarks)
VALUES 
  ('CN_SH', '上海清关公司', 'Shanghai Customs Broker', 'CN', 'ACTIVE', '服务上海港（SHA）'),
  ('HK_HKG', '香港清关公司', 'Hong Kong Customs Broker', 'HK', 'ACTIVE', '服务香港港（HKG）')
ON CONFLICT (broker_code) DO NOTHING;

-- 验证：查看各国清关公司数量
-- SELECT country, COUNT(*) as count 
-- FROM dict_customs_brokers 
-- WHERE country IS NOT NULL AND broker_code != 'UNSPECIFIED'
-- GROUP BY country 
-- ORDER BY count DESC;
