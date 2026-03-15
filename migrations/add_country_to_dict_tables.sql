-- 添加 country 字段到 dict_customs_brokers 和 dict_trucking_companies
-- 用于支持按国家过滤下拉选择

-- 1. 添加 country 字段到清关公司表
ALTER TABLE dict_customs_brokers ADD COLUMN IF NOT EXISTS country VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_customs_brokers_country ON dict_customs_brokers(country);

-- 2. 添加 country 字段到拖车公司表
ALTER TABLE dict_trucking_companies ADD COLUMN IF NOT EXISTS country VARCHAR(50);
CREATE INDEX IF NOT EXISTS idx_trucking_companies_country ON dict_trucking_companies(country);

-- 3. 仓库表已有 country 字段，确保索引存在
CREATE INDEX IF NOT EXISTS idx_warehouses_country ON dict_warehouses(country);
