-- ============================================================
-- 规范化所有字典表中的国家代码
-- Standardize Country Codes Across All Dictionary Tables
-- ============================================================
-- 目标：统一使用 ISO 3166-1 alpha-2 标准国家代码（基于 dict_countries 表）
-- 问题：当前存在公司全名、非标准缩写等不规范代码
-- ============================================================

\echo ''
\echo '=== 开始规范化国家代码 ==='
\echo ''

-- ============================================================
-- 第 1 步：创建国家代码映射表（临时表）
-- ============================================================
\echo '1. 创建国家代码映射表...'

CREATE TEMP TABLE country_code_mapping (
    old_code VARCHAR(50),
    new_code VARCHAR(50),
    description TEXT
);

-- 插入需要转换的国家代码映射
INSERT INTO country_code_mapping (old_code, new_code, description) VALUES
-- 英国相关
('UK', 'GB', '英国非标准缩写 → ISO 标准代码'),
('MH STAR UK LTD', 'GB', '公司全名 → 国家代码'),

-- 加拿大相关
('AOSOM CANADA INC.', 'CA', '公司全名 → 国家代码'),

-- 意大利相关
('AOSOM ITALY SRL', 'IT', '公司全名 → 国家代码'),
('IT', 'IT', '已正确'),

-- 美国相关
('AOSOM LLC', 'US', '公司全名 → 国家代码'),

-- 法国相关
('MH FRANCE', 'FR', '公司简称 → 国家代码'),

-- 德国相关
('MH HANDEL GMBH', 'DE', '公司全名 → 国家代码'),

-- 西班牙相关
('SPANISH AOSOM, S.L.', 'ES', '公司全名 → 国家代码'),

-- 中国相关
('中国', 'CN', '中文 → ISO 代码'),

-- 其他已正确的代码（用于验证）
('CA', 'CA', '已正确'),
('DE', 'DE', '已正确'),
('ES', 'ES', '已正确'),
('FR', 'FR', '已正确'),
('GB', 'GB', '已正确'),
('IE', 'IE', '已正确'),
('IT', 'IT', '已正确'),
('NL', 'NL', '已正确'),
('PT', 'PT', '已正确'),
('RO', 'RO', '已正确'),
('US', 'US', '已正确');

-- ============================================================
-- 第 2 步：查看需要规范化的数据
-- ============================================================
\echo ''
\echo '2. 需要规范化的数据统计...'

\echo ''
\echo '--- dict_trucking_port_mapping 表 ---'
SELECT DISTINCT country, '需要转换' as status
FROM dict_trucking_port_mapping
WHERE country NOT IN (SELECT code FROM dict_countries)
ORDER BY country;

\echo ''
\echo '--- dict_warehouse_trucking_mapping 表 ---'
SELECT DISTINCT country, '需要转换' as status
FROM dict_warehouse_trucking_mapping
WHERE country NOT IN (SELECT code FROM dict_countries)
ORDER BY country;

\echo ''
\echo '--- dict_trucking_companies 表 ---'
SELECT DISTINCT country, '需要转换' as status
FROM dict_trucking_companies
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries)
ORDER BY country;

\echo ''
\echo '--- dict_ports 表 ---'
SELECT DISTINCT country, '需要转换' as status
FROM dict_ports
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries)
ORDER BY country;

-- ============================================================
-- 第 3 步：更新各个表的 country 字段
-- ============================================================

-- 3a. 更新 dict_trucking_port_mapping
\echo ''
\echo '3a. 更新 dict_trucking_port_mapping...'

UPDATE dict_trucking_port_mapping tpm
SET country = m.new_code
FROM country_code_mapping m
WHERE tpm.country = m.old_code
  AND m.new_code IS NOT NULL
  AND m.new_code != '跳过';

-- 3b. 更新 dict_warehouse_trucking_mapping
\echo '3b. 更新 dict_warehouse_trucking_mapping...'

UPDATE dict_warehouse_trucking_mapping wtm
SET country = m.new_code
FROM country_code_mapping m
WHERE wtm.country = m.old_code
  AND m.new_code IS NOT NULL
  AND m.new_code != '跳过';

-- 3c. 更新 dict_trucking_companies
\echo '3c. 更新 dict_trucking_companies...'

UPDATE dict_trucking_companies tc
SET country = m.new_code
FROM country_code_mapping m
WHERE tc.country = m.old_code
  AND m.new_code IS NOT NULL
  AND m.new_code != '跳过';

-- 3d. 更新 dict_ports
\echo '3d. 更新 dict_ports...'

UPDATE dict_ports p
SET country = m.new_code
FROM country_code_mapping m
WHERE p.country = m.old_code
  AND m.new_code IS NOT NULL
  AND m.new_code != '跳过';

-- ============================================================
-- 第 4 步：验证更新结果
-- ============================================================
\echo ''
\echo '=== 验证更新结果 ==='

\echo ''
\echo '--- dict_trucking_port_mapping 国家代码分布 ---'
SELECT country, COUNT(*) as count
FROM dict_trucking_port_mapping
GROUP BY country
ORDER BY country;

\echo ''
\echo '--- dict_warehouse_trucking_mapping 国家代码分布 ---'
SELECT country, COUNT(*) as count
FROM dict_warehouse_trucking_mapping
GROUP BY country
ORDER BY country;

\echo ''
\echo '--- dict_trucking_companies 国家代码分布 ---'
SELECT country, COUNT(*) as count
FROM dict_trucking_companies
WHERE country IS NOT NULL
GROUP BY country
ORDER BY country;

\echo ''
\echo '--- dict_ports 国家代码分布 ---'
SELECT country, COUNT(*) as count
FROM dict_ports
WHERE country IS NOT NULL
GROUP BY country
ORDER BY country;

-- ============================================================
-- 第 5 步：检查是否还有不规范的代码
-- ============================================================
\echo ''
\echo '=== 检查是否还有不规范的代码 ==='

\echo ''
\echo '--- dict_trucking_port_mapping 中的非标准代码 ---'
SELECT DISTINCT country
FROM dict_trucking_port_mapping
WHERE country NOT IN (SELECT code FROM dict_countries)
ORDER BY country;

\echo ''
\echo '--- dict_warehouse_trucking_mapping 中的非标准代码 ---'
SELECT DISTINCT country
FROM dict_warehouse_trucking_mapping
WHERE country NOT IN (SELECT code FROM dict_countries)
ORDER BY country;

\echo ''
\echo '--- dict_trucking_companies 中的非标准代码 ---'
SELECT DISTINCT country
FROM dict_trucking_companies
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries)
ORDER BY country;

\echo ''
\echo '--- dict_ports 中的非标准代码 ---'
SELECT DISTINCT country
FROM dict_ports
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries)
ORDER BY country;

-- ============================================================
-- 第 6 步：清理临时表
-- ============================================================
\echo ''
\echo '=== 清理完成 ==='

-- 临时表会在会话结束时自动删除

\echo ''
\echo '✅ 国家代码规范化完成！'
\echo ''
\echo '注意：如果还有非标准代码，说明需要添加新的映射关系到 country_code_mapping 表'
\echo ''
