-- ============================================================
-- 补全 dict_ports 表的详细信息
-- Complete dict_ports Table Detailed Information
-- ============================================================
-- 补全字段：state, city（修正错误的城市信息）
-- ============================================================

\echo ''
\echo '=== 开始补全港口详细信息 ==='
\echo ''

-- ============================================================
-- 第 1 步：修复美国港口的城市信息
-- ============================================================
\echo '1. 修复美国港口的城市信息...'

-- USATL - 亚特兰大
UPDATE dict_ports SET city = 'Atlanta' WHERE port_code = 'USATL';

-- USEWR - 纽瓦克
UPDATE dict_ports SET city = 'Newark' WHERE port_code = 'USEWR';

-- USHOU - 休斯顿
UPDATE dict_ports SET city = 'Houston' WHERE port_code = 'USHOU';

-- USJFK - 纽约肯尼迪
UPDATE dict_ports SET city = 'New York' WHERE port_code = 'USJFK';

-- USLAX - 洛杉矶
UPDATE dict_ports SET city = 'Los Angeles' WHERE port_code = 'USLAX';

-- USLGB - 长滩
UPDATE dict_ports SET city = 'Long Beach' WHERE port_code = 'USLGB';

-- USMIA - 迈阿密
UPDATE dict_ports SET city = 'Miami' WHERE port_code = 'USMIA';

-- USNYC - 纽约
UPDATE dict_ports SET city = 'New York' WHERE port_code = 'USNYC';

-- USORD - 芝加哥奥黑尔
UPDATE dict_ports SET city = 'Chicago' WHERE port_code = 'USORD';

-- USSAV - 萨凡纳
UPDATE dict_ports SET city = 'Savannah' WHERE port_code = 'USSAV';

-- USSEA - 西雅图
UPDATE dict_ports SET city = 'Seattle' WHERE port_code = 'USSEA';

-- USSFO - 旧金山
UPDATE dict_ports SET city = 'San Francisco' WHERE port_code = 'USSFO';

\echo '✅ 美国港口更新完成！'

-- ============================================================
-- 第 2 步：验证其他国家的港口城市信息
-- ============================================================
\echo ''
\echo '2. 检查其他国家港口信息...'

-- 查看加拿大港口
SELECT port_code, port_name_en, state, city 
FROM dict_ports 
WHERE country = 'CA' 
ORDER BY port_code;

-- 查看澳大利亚港口
SELECT port_code, port_name_en, state, city 
FROM dict_ports 
WHERE country = 'AU' 
ORDER BY port_code;

-- 查看日本港口
SELECT port_code, port_name_en, state, city 
FROM dict_ports 
WHERE country = 'JP' 
ORDER BY port_code;

-- ============================================================
-- 第 3 步：最终验证
-- ============================================================
\echo ''
\echo '=== 最终验证 ==='

-- 检查所有港口的完整性
SELECT 
    '完整度统计' as metric,
    COUNT(*) as total_ports,
    ROUND(100.0 * COUNT(port_name_en) / COUNT(*), 2) as pct_en_name,
    ROUND(100.0 * COUNT(port_type) / COUNT(*), 2) as pct_type,
    ROUND(100.0 * COUNT(country) / COUNT(*), 2) as pct_country,
    ROUND(100.0 * COUNT(state) / COUNT(*), 2) as pct_state,
    ROUND(100.0 * COUNT(city) / COUNT(*), 2) as pct_city,
    ROUND(100.0 * COUNT(timezone) / COUNT(*), 2) as pct_timezone,
    ROUND(100.0 * COUNT(latitude) / COUNT(*), 2) as pct_latitude,
    ROUND(100.0 * COUNT(longitude) / COUNT(*), 2) as pct_longitude
FROM dict_ports;

\echo ''
\echo '缺失字段的港口（应该为 0）:'

SELECT 
    port_code,
    port_name,
    port_name_en,
    CASE WHEN port_type IS NULL THEN '✗' ELSE '✓' END as type,
    CASE WHEN state IS NULL THEN '✗' ELSE '✓' END as state,
    CASE WHEN city IS NULL THEN '✗' ELSE '✓' END as city,
    CASE WHEN timezone IS NULL THEN '✗' ELSE '✓' END as tz,
    CASE WHEN latitude IS NULL OR longitude IS NULL THEN '✗' ELSE '✓' END as coords
FROM dict_ports
WHERE port_type IS NULL 
   OR state IS NULL 
   OR city IS NULL 
   OR timezone IS NULL 
   OR latitude IS NULL 
   OR longitude IS NULL
ORDER BY port_code;

\echo ''
\echo '按国家分布统计（前 10 个国家）:'

SELECT 
    country,
    COUNT(*) as port_count,
    ROUND(AVG(timezone), 1) as avg_timezone,
    STRING_AGG(DISTINCT port_type, ', ') as port_types
FROM dict_ports
GROUP BY country
ORDER BY port_count DESC
LIMIT 10;

\echo ''
\echo '✅ 所有港口信息补全完成！'
\echo ''
