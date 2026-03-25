-- ============================================================
-- 验证所有字典表的 country 字段是否规范
-- Verify Country Code Standardization Across All Dictionary Tables
-- ============================================================

\echo ''
\echo '=== 字典表国家代码规范性验证 ==='
\echo ''

-- 1. 统计所有包含 country 字段的字典表
\echo '1. 包含 country 字段的字典表列表:'
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name IN ('country', 'country_code')
  AND table_name LIKE 'dict_%'
ORDER BY table_name, column_name;

-- 2. 检查每个表的不规范代码数量
\echo ''
\echo '2. 各表不规范 country 代码统计:'

-- dict_customs_brokers
SELECT 'dict_customs_brokers' as table_name, 
       COUNT(*) as non_standard_count
FROM dict_customs_brokers
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries);

-- dict_overseas_companies
SELECT 'dict_overseas_companies' as table_name, 
       COUNT(*) as non_standard_count
FROM dict_overseas_companies
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries);

-- dict_ports
SELECT 'dict_ports' as table_name, 
       COUNT(*) as non_standard_count
FROM dict_ports
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries);

-- dict_trucking_companies
SELECT 'dict_trucking_companies' as table_name, 
       COUNT(*) as non_standard_count
FROM dict_trucking_companies
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries);

-- dict_trucking_port_mapping
SELECT 'dict_trucking_port_mapping' as table_name, 
       COUNT(*) as non_standard_count
FROM dict_trucking_port_mapping
WHERE country NOT IN (SELECT code FROM dict_countries);

-- dict_warehouse_trucking_mapping
SELECT 'dict_warehouse_trucking_mapping' as table_name, 
       COUNT(*) as non_standard_count
FROM dict_warehouse_trucking_mapping
WHERE country NOT IN (SELECT code FROM dict_countries);

-- dict_warehouses
SELECT 'dict_warehouses' as table_name, 
       COUNT(*) as non_standard_count
FROM dict_warehouses
WHERE country NOT IN (SELECT code FROM dict_countries);

-- 3. 如果有不规范代码，详细列出
\echo ''
\echo '3. 不规范代码详情 (如果有的话):'

SELECT 'dict_trucking_port_mapping' as table_name, country, COUNT(*) as count
FROM dict_trucking_port_mapping
WHERE country NOT IN (SELECT code FROM dict_countries)
GROUP BY country

UNION ALL

SELECT 'dict_warehouse_trucking_mapping', country, COUNT(*)
FROM dict_warehouse_trucking_mapping
WHERE country NOT IN (SELECT code FROM dict_countries)
GROUP BY country

UNION ALL

SELECT 'dict_trucking_companies', country, COUNT(*)
FROM dict_trucking_companies
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries)
GROUP BY country

UNION ALL

SELECT 'dict_ports', country, COUNT(*)
FROM dict_ports
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries)
GROUP BY country

UNION ALL

SELECT 'dict_customs_brokers', country, COUNT(*)
FROM dict_customs_brokers
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries)
GROUP BY country

UNION ALL

SELECT 'dict_overseas_companies', country, COUNT(*)
FROM dict_overseas_companies
WHERE country IS NOT NULL AND country NOT IN (SELECT code FROM dict_countries)
GROUP BY country

UNION ALL

SELECT 'dict_warehouses', country, COUNT(*)
FROM dict_warehouses
WHERE country NOT IN (SELECT code FROM dict_countries)
GROUP BY country

ORDER BY table_name, country;

-- 4. 统计信息
\echo ''
\echo '4. 规范化统计汇总:'

SELECT 
    'dict_trucking_port_mapping' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT country) as distinct_countries
FROM dict_trucking_port_mapping

UNION ALL

SELECT 
    'dict_warehouse_trucking_mapping',
    COUNT(*),
    COUNT(DISTINCT country)
FROM dict_warehouse_trucking_mapping

UNION ALL

SELECT 
    'dict_trucking_companies',
    COUNT(*),
    COUNT(DISTINCT country)
FROM dict_trucking_companies
WHERE country IS NOT NULL

UNION ALL

SELECT 
    'dict_ports',
    COUNT(*),
    COUNT(DISTINCT country)
FROM dict_ports
WHERE country IS NOT NULL

UNION ALL

SELECT 
    'dict_customs_brokers',
    COUNT(*),
    COUNT(DISTINCT country)
FROM dict_customs_brokers
WHERE country IS NOT NULL

UNION ALL

SELECT 
    'dict_overseas_companies',
    COUNT(*),
    COUNT(DISTINCT country)
FROM dict_overseas_companies
WHERE country IS NOT NULL

UNION ALL

SELECT 
    'dict_warehouses',
    COUNT(*),
    COUNT(DISTINCT country)
FROM dict_warehouses

ORDER BY table_name;

-- 5. 显示所有使用的国家代码
\echo ''
\echo '5. 所有表使用的国家代码分布:'

SELECT 
    country,
    COUNT(*) as usage_count,
    dc.name_cn,
    dc.name_en
FROM (
    SELECT country FROM dict_trucking_port_mapping WHERE country IS NOT NULL
    UNION ALL
    SELECT country FROM dict_warehouse_trucking_mapping WHERE country IS NOT NULL
    UNION ALL
    SELECT country FROM dict_trucking_companies WHERE country IS NOT NULL
    UNION ALL
    SELECT country FROM dict_ports WHERE country IS NOT NULL
    UNION ALL
    SELECT country FROM dict_customs_brokers WHERE country IS NOT NULL
    UNION ALL
    SELECT country FROM dict_overseas_companies WHERE country IS NOT NULL
    UNION ALL
    SELECT country FROM dict_warehouses WHERE country IS NOT NULL
) all_countries
LEFT JOIN dict_countries dc ON dc.code = all_countries.country
GROUP BY country, dc.name_cn, dc.name_en
ORDER BY usage_count DESC, country;

\echo ''
\echo '=== 验证完成 ==='
\echo ''
\echo '如果不规范代码统计全部为 0，说明所有 country 字段已完全规范化！'
\echo ''
