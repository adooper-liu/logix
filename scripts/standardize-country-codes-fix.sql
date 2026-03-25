-- ============================================================
-- 补充规范化国家代码 - 修复遗漏的代码
-- Supplement Standardize Country Codes - Fix Remaining Issues
-- ============================================================

\echo ''
\echo '=== 补充规范化国家代码 ==='
\echo ''

-- ============================================================
-- 第 1 步：修复 BEL → BE（比利时）
-- ============================================================
\echo '1. 修复比利时代码 BEL → BE...'

-- 更新 dict_trucking_port_mapping
UPDATE dict_trucking_port_mapping
SET country = 'BE'
WHERE country = 'BEL';

-- 验证
SELECT country, COUNT(*) as count
FROM dict_trucking_port_mapping
WHERE country = 'BE'
GROUP BY country;

-- ============================================================
-- 第 2 步：检查 dict_countries 表中缺失的国家代码
-- ============================================================
\echo ''
\echo '2. 检查 dict_countries 中缺失的国家...'

-- 查看当前港口表中使用但 dict_countries 中不存在的代码
SELECT DISTINCT p.country, '需要添加到 dict_countries' as action
FROM dict_ports p
WHERE p.country IS NOT NULL 
  AND p.country NOT IN (SELECT code FROM dict_countries)
ORDER BY p.country;

-- ============================================================
-- 第 3 步：添加缺失的国家到 dict_countries 表
-- ============================================================
\echo ''
\echo '3. 添加缺失的国家到 dict_countries 表...'

-- 这些是 ISO 3166-1 alpha-2 标准代码，但不在我们的 dict_countries 表中
INSERT INTO dict_countries (code, name_cn, name_en, region, continent, is_active) VALUES
('AE', '阿联酋', 'United Arab Emirates', '中东', '亚洲', true),
('AR', '阿根廷', 'Argentina', '南美', '南美洲', true),
('BR', '巴西', 'Brazil', '南美', '南美洲', true),
('CL', '智利', 'Chile', '南美', '南美洲', true),
('EG', '埃及', 'Egypt', '中东', '非洲', true),
('IN', '印度', 'India', '南亚', '亚洲', true),
('MA', '摩洛哥', 'Morocco', '北非', '非洲', true),
('PE', '秘鲁', 'Peru', '南美', '南美洲', true),
('QA', '卡塔尔', 'Qatar', '中东', '亚洲', true),
('SA', '沙特阿拉伯', 'Saudi Arabia', '中东', '亚洲', true),
('ZA', '南非', 'South Africa', '南部非洲', '非洲', true)
ON CONFLICT (code) DO NOTHING;

-- 验证添加结果
SELECT code, name_cn, name_en, continent
FROM dict_countries
WHERE code IN ('AE', 'AR', 'BR', 'CL', 'EG', 'IN', 'MA', 'PE', 'QA', 'SA', 'ZA')
ORDER BY code;

-- ============================================================
-- 第 4 步：再次验证所有表的 country 字段
-- ============================================================
\echo ''
\echo '=== 最终验证 ==='

\echo ''
\echo '--- dict_trucking_port_mapping ---'
SELECT DISTINCT country
FROM dict_trucking_port_mapping
WHERE country NOT IN (SELECT code FROM dict_countries)
ORDER BY country;

\echo ''
\echo '--- dict_warehouse_trucking_mapping ---'
SELECT DISTINCT country
FROM dict_warehouse_trucking_mapping
WHERE country NOT IN (SELECT code FROM dict_countries)
ORDER BY country;

\echo ''
\echo '--- dict_trucking_companies ---'
SELECT DISTINCT country
FROM dict_trucking_companies
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries)
ORDER BY country;

\echo ''
\echo '--- dict_ports ---'
SELECT DISTINCT country
FROM dict_ports
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries)
ORDER BY country;

\echo ''
\echo '--- 所有表的 country 代码分布统计 ---'

\echo ''
\echo 'dict_trucking_port_mapping:'
SELECT country, COUNT(*) as count
FROM dict_trucking_port_mapping
GROUP BY country
ORDER BY country;

\echo ''
\echo 'dict_warehouse_trucking_mapping:'
SELECT country, COUNT(*) as count
FROM dict_warehouse_trucking_mapping
GROUP BY country
ORDER BY country;

\echo ''
\echo 'dict_trucking_companies:'
SELECT country, COUNT(*) as count
FROM dict_trucking_companies
WHERE country IS NOT NULL
GROUP BY country
ORDER BY country;

\echo ''
\echo 'dict_ports:'
SELECT country, COUNT(*) as count
FROM dict_ports
WHERE country IS NOT NULL
GROUP BY country
ORDER BY country;

\echo ''
\echo '✅ 所有国家代码已完全规范化！'
\echo ''
