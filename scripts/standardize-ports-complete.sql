-- ============================================================
-- 规范化与补全 dict_ports 表的所有信息
-- Standardize and Complete dict_ports Table Information
-- ============================================================
-- 补全字段：port_name_en, port_type, country, state, city, timezone, latitude, longitude
-- ============================================================

\echo ''
\echo '=== 开始规范化 dict_ports 表 ==='
\echo ''

-- ============================================================
-- 第 1 步：查看当前数据质量
-- ============================================================
\echo '1. 当前数据质量检查:'

SELECT 
    '总数' as metric,
    COUNT(*) as total,
    COUNT(port_name_en) as has_en_name,
    COUNT(port_type) as has_type,
    COUNT(country) as has_country,
    COUNT(state) as has_state,
    COUNT(city) as has_city,
    COUNT(timezone) as has_timezone,
    COUNT(latitude) as has_lat,
    COUNT(longitude) as has_lon
FROM dict_ports;

\echo ''
\echo '缺失数据的港口:'

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

-- ============================================================
-- 第 2 步：补全缺失的港口信息
-- ============================================================
\echo ''
\echo '2. 补全缺失的港口信息...'

-- 2a. 补全 CNSHA（上海）
UPDATE dict_ports
SET 
    port_type = 'PORT',
    state = 'SH',
    city = 'Shanghai',
    timezone = 8,
    latitude = 31.230400,
    longitude = 121.473700
WHERE port_code = 'CNSHA';

-- 2b. 补全 GBFXT（费利克斯托）
UPDATE dict_ports
SET 
    port_type = 'PORT',
    state = 'ENG',
    city = 'Felixstowe',
    timezone = 0,
    latitude = 51.956100,
    longitude = 1.351900
WHERE port_code = 'GBFXT';

\echo '✅ 更新完成！'

-- ============================================================
-- 第 3 步：规范化 port_type 字段
-- ============================================================
\echo ''
\echo '3. 规范化 port_type 字段...'

-- 确保所有港口的 port_type 都是标准值
UPDATE dict_ports
SET port_type = 'PORT'
WHERE port_type IS NULL OR port_type = '';

UPDATE dict_ports
SET port_type = 'RAIL'
WHERE port_type = 'RAILWAY';

UPDATE dict_ports
SET port_type = 'INLAND'
WHERE port_type = 'INLAND_DEPOT';

-- 验证 port_type 的取值
SELECT port_type, COUNT(*) as count
FROM dict_ports
GROUP BY port_type
ORDER BY count DESC;

-- ============================================================
-- 第 4 步：验证所有港口的时区设置
-- ============================================================
\echo ''
\echo '4. 验证时区设置...'

-- 按国家验证时区（主要港口的标准时区）
SELECT 
    country,
    AVG(timezone) as avg_timezone,
    MIN(timezone) as min_tz,
    MAX(timezone) as max_tz,
    COUNT(*) as port_count
FROM dict_ports
GROUP BY country
ORDER BY country;

-- ============================================================
-- 第 5 步：验证坐标数据
-- ============================================================
\echo ''
\echo '5. 验证坐标数据...'

-- 检查坐标是否在合理范围内
SELECT 
    port_code,
    port_name,
    latitude,
    longitude,
    CASE 
        WHEN latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180 THEN '✓'
        ELSE '✗'
    END as valid
FROM dict_ports
WHERE latitude IS NULL OR longitude IS NULL
   OR latitude NOT BETWEEN -90 AND 90
   OR longitude NOT BETWEEN -180 AND 180;

-- ============================================================
-- 第 6 步：最终验证
-- ============================================================
\echo ''
\echo '=== 最终验证 ==='

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
\echo '按国家分布统计:'

SELECT 
    country,
    COUNT(*) as port_count,
    ROUND(AVG(timezone), 1) as avg_timezone,
    STRING_AGG(DISTINCT port_type, ', ') as port_types
FROM dict_ports
GROUP BY country
ORDER BY port_count DESC, country;

\echo ''
\echo 'port_type 分布:'

SELECT 
    port_type,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM dict_ports
GROUP BY port_type
ORDER BY count DESC;

\echo ''
\echo '✅ dict_ports 表规范化完成！'
\echo ''
