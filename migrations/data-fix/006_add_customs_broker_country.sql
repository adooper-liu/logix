-- ============================================================
-- Migration: Add country field to dict_customs_brokers
-- 为清关公司表添加国家字段并初始化数据
-- ============================================================
-- Date: 2026-03-17
-- Issue: Intelligent scheduling requires country-based broker matching
-- ============================================================

-- 1. 添加 country 字段（如果不存在）
ALTER TABLE dict_customs_brokers 
ADD COLUMN IF NOT EXISTS country VARCHAR(50);

-- 2. 创建索引
CREATE INDEX IF NOT EXISTS idx_customs_brokers_country ON dict_customs_brokers(country);
CREATE INDEX IF NOT EXISTS idx_customs_brokers_status ON dict_customs_brokers(status);

-- 3. 更新现有清关公司的国家信息
-- 美国清关公司
UPDATE dict_customs_brokers 
SET country = 'US' 
WHERE broker_code IN ('CB_US_WEST', 'CB_US_EAST') 
   OR broker_name LIKE '%US%'
   OR broker_name_en LIKE '%USA%';

-- 加拿大清关公司
UPDATE dict_customs_brokers 
SET country = 'CA' 
WHERE broker_code LIKE 'CB_CA%' 
   OR broker_name LIKE '%CA%'
   OR broker_name LIKE '%Canada%';

-- 荷兰清关公司（欧洲）
UPDATE dict_customs_brokers 
SET country = 'NL' 
WHERE broker_code = 'CB_EU_NL' 
   OR broker_name LIKE '%NL%'
   OR broker_name LIKE '%Netherlands%';

-- 德国清关公司（欧洲）
UPDATE dict_customs_brokers 
SET country = 'DE' 
WHERE broker_code = 'CB_EU_DE' 
   OR broker_name LIKE '%DE%'
   OR broker_name LIKE '%Germany%';

-- 英国清关公司
UPDATE dict_customs_brokers 
SET country = 'GB' 
WHERE broker_code LIKE 'CB_UK%' 
   OR broker_code LIKE 'CB_GB%'
   OR broker_name LIKE '%UK%'
   OR broker_name LIKE '%UK%';

-- 4. 添加"未指定"清关公司（用于智能排柜无匹配时）
INSERT INTO dict_customs_brokers (
    broker_code, 
    broker_name, 
    broker_name_en, 
    contact_phone, 
    contact_email, 
    status, 
    country, 
    remarks, 
    created_at, 
    updated_at
)
SELECT 
    'UNSPECIFIED', 
    '未指定清关公司', 
    'Unspecified Customs Broker', 
    NULL, 
    NULL, 
    'ACTIVE', 
    NULL, 
    '智能排柜时无匹配清关公司时使用', 
    NOW(), 
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM dict_customs_brokers WHERE broker_code = 'UNSPECIFIED'
);

-- 5. 验证数据
COMMENT ON COLUMN dict_customs_brokers.country IS '服务国家代码（ISO 3166-1 alpha-2），如 US/CA/GB/DE/NL';

-- 查询示例：查看各国清关公司分布
-- SELECT country, COUNT(*) as count 
-- FROM dict_customs_brokers 
-- WHERE country IS NOT NULL 
-- GROUP BY country 
-- ORDER BY count DESC;
