-- 清关公司字典添加国家字段并更新数据
-- 为现有清关公司添加国家信息

-- 1. 添加国家字段（如果不存在）
ALTER TABLE dict_customs_brokers ADD COLUMN IF NOT EXISTS country VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_customs_brokers_country ON dict_customs_brokers(country);

-- 2. 更新清关公司国家信息
UPDATE dict_customs_brokers SET country = 'US' WHERE broker_code IN ('CB_US_WEST', 'CB_US_EAST');
UPDATE dict_customs_brokers SET country = 'NL' WHERE broker_code = 'CB_EU_NL';
UPDATE dict_customs_brokers SET country = 'DE' WHERE broker_code = 'CB_EU_DE';
UPDATE dict_customs_brokers SET country = 'CA' WHERE broker_code = 'CB_CA_BC';

-- 3. 添加"未指定"清关公司（如果不存在）
INSERT INTO dict_customs_brokers (broker_code, broker_name, broker_name_en, contact_phone, contact_email, status, country, remarks, created_at, updated_at)
SELECT 'UNSPECIFIED', '未指定清关公司', 'Unspecified Customs Broker', NULL, NULL, 'ACTIVE', NULL, '智能排柜时无匹配清关公司时使用', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM dict_customs_brokers WHERE broker_code = 'UNSPECIFIED');
