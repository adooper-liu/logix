-- ============================================================
-- 根据港口映射表同步车队公司的堆场信息
-- Sync Trucking Company Yard Info from Port Mapping Table
-- ============================================================
-- 业务规则：
-- 1. 如果 dict_trucking_port_mapping.yard_capacity > 0，则有堆场
-- 2. has_yard = true
-- 3. yard_daily_capacity = MAX(yard_capacity) from all mappings
-- ============================================================

\echo ''
\echo '=== 开始同步车队公司堆场信息 ==='
\echo ''

-- ============================================================
-- 第 1 步：检查当前数据状态
-- ============================================================
\echo '1. 当前堆场字段状态:'

SELECT 
    '总数' as metric,
    COUNT(*) as total_companies,
    COUNT(CASE WHEN has_yard = true THEN 1 END) as has_yard_count,
    COUNT(CASE WHEN has_yard = false THEN 1 END) as no_yard_count,
    COUNT(CASE WHEN yard_daily_capacity IS NOT NULL THEN 1 END) as has_capacity_count,
    AVG(yard_daily_capacity) as avg_yard_capacity
FROM dict_trucking_companies;

\echo ''
\echo '各车队堆场配置详情:'

SELECT 
    tc.company_code,
    tc.company_name,
    tc.has_yard,
    tc.yard_daily_capacity,
    COALESCE(pm.has_yard_mapping, 0) as port_has_yard,
    COALESCE(pm.max_yard_capacity, 0) as port_max_capacity,
    CASE 
        WHEN tc.has_yard = true AND COALESCE(pm.max_yard_capacity, 0) > 0 THEN '✓ 一致'
        WHEN tc.has_yard = false AND COALESCE(pm.max_yard_capacity, 0) = 0 THEN '✓ 一致'
        ELSE '✗ 不一致'
    END as status
FROM dict_trucking_companies tc
LEFT JOIN (
    SELECT 
        trucking_company_id,
        SUM(CASE WHEN yard_capacity > 0 THEN 1 ELSE 0 END) as has_yard_mapping,
        MAX(yard_capacity) as max_yard_capacity
    FROM dict_trucking_port_mapping
    GROUP BY trucking_company_id
) pm ON pm.trucking_company_id = tc.company_code
ORDER BY tc.has_yard DESC, pm.max_yard_capacity DESC, tc.company_code;

-- ============================================================
-- 第 2 步：更新 has_yard 和 yard_daily_capacity
-- ============================================================
\echo ''
\echo '2. 更新车队公司堆场信息...'

UPDATE dict_trucking_companies tc
SET 
    has_yard = (pm.max_yard_capacity > 0),
    yard_daily_capacity = CASE 
        WHEN pm.max_yard_capacity > 0 THEN pm.max_yard_capacity::integer
        ELSE NULL
    END
FROM (
    SELECT 
        trucking_company_id,
        MAX(yard_capacity) as max_yard_capacity
    FROM dict_trucking_port_mapping
    GROUP BY trucking_company_id
) pm
WHERE tc.company_code = pm.trucking_company_id;

\echo '✅ 已更新车队公司堆场信息！'

-- ============================================================
-- 第 3 步：验证更新结果
-- ============================================================
\echo ''
\echo '=== 验证更新结果 ==='

SELECT 
    '更新后统计' as metric,
    COUNT(*) as total_companies,
    COUNT(CASE WHEN has_yard = true THEN 1 END) as has_yard_count,
    COUNT(CASE WHEN has_yard = false THEN 1 END) as no_yard_count,
    COUNT(CASE WHEN yard_daily_capacity IS NOT NULL THEN 1 END) as has_capacity_count,
    MIN(yard_daily_capacity) as min_yard_capacity,
    MAX(yard_daily_capacity) as max_yard_capacity,
    ROUND(AVG(yard_daily_capacity), 2) as avg_yard_capacity
FROM dict_trucking_companies;

\echo ''
\echo '堆场配置一致性检查:'

SELECT 
    tc.has_yard,
    tc.yard_daily_capacity,
    COUNT(*) as company_count,
    CASE 
        WHEN tc.has_yard = true AND tc.yard_daily_capacity > 0 THEN '✓ 有效'
        WHEN tc.has_yard = false AND tc.yard_daily_capacity IS NULL THEN '✓ 有效'
        ELSE '✗ 无效'
    END as validity
FROM dict_trucking_companies tc
GROUP BY tc.has_yard, tc.yard_daily_capacity
ORDER BY tc.has_yard DESC, tc.yard_daily_capacity DESC NULLS LAST;

-- ============================================================
-- 第 4 步：显示最终结果
-- ============================================================
\echo ''
\echo '最终车队公司堆场配置:'

SELECT 
    tc.company_code,
    tc.company_name,
    tc.has_yard,
    tc.yard_daily_capacity,
    COALESCE(pm.mapping_count, 0) as mapping_count,
    COALESCE(pm.max_yard_capacity, 0) as source_max_capacity,
    CASE 
        WHEN tc.has_yard = true AND tc.yard_daily_capacity > 0 THEN '✓ 有堆场'
        WHEN tc.has_yard = false AND tc.yard_daily_capacity IS NULL THEN '✓ 无堆场'
        ELSE '✗ 数据异常'
    END as status
FROM dict_trucking_companies tc
LEFT JOIN (
    SELECT 
        trucking_company_id,
        COUNT(*) as mapping_count,
        MAX(yard_capacity) as max_yard_capacity
    FROM dict_trucking_port_mapping
    GROUP BY trucking_company_id
) pm ON pm.trucking_company_id = tc.company_code
ORDER BY tc.has_yard DESC, tc.yard_daily_capacity DESC NULLS LAST, tc.company_code;

\echo ''
\echo '✅ 车队公司堆场信息同步完成！'
\echo ''
