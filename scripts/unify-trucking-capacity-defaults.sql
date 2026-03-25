-- ============================================================
-- 统一车队容量字段默认值
-- Unify Trucking Company Capacity Default Values
-- ============================================================
-- 目标：将 daily_return_capacity 的默认值设置为与 daily_capacity 一致
-- ============================================================

\echo ''
\echo '=== 开始统一车队容量字段默认值 ==='
\echo ''

-- ============================================================
-- 第 1 步：检查当前数据状态
-- ============================================================
\echo '1. 当前容量字段状态:'

SELECT 
    '总数' as metric,
    COUNT(*) as total_companies,
    COUNT(daily_capacity) as has_daily_capacity,
    COUNT(daily_return_capacity) as has_daily_return_capacity,
    COUNT(CASE WHEN daily_return_capacity IS NULL THEN 1 END) as null_return_capacity,
    AVG(daily_capacity) as avg_daily_capacity
FROM dict_trucking_companies;

\echo ''
\echo '各车队容量详情:'

SELECT 
    company_code,
    company_name,
    daily_capacity,
    daily_return_capacity,
    CASE 
        WHEN daily_return_capacity IS NULL THEN '✗ 需要设置'
        ELSE '✓'
    END as status
FROM dict_trucking_companies
ORDER BY daily_capacity, company_code;

-- ============================================================
-- 第 2 步：更新 NULL 值为相同的容量值
-- ============================================================
\echo ''
\echo '2. 更新 daily_return_capacity 为 daily_capacity 的值...'

UPDATE dict_trucking_companies
SET daily_return_capacity = daily_capacity
WHERE daily_return_capacity IS NULL;

\echo '✅ 已更新所有 NULL 记录！'

-- ============================================================
-- 第 3 步：修改表结构，设置默认值
-- ============================================================
\echo ''
\echo '3. 设置默认值约束...'

-- 为 daily_return_capacity 设置默认值（与 daily_capacity 相同）
ALTER TABLE dict_trucking_companies
ALTER COLUMN daily_return_capacity SET DEFAULT 10;

\echo '✅ 默认值已设置！'

-- ============================================================
-- 第 4 步：验证更新结果
-- ============================================================
\echo ''
\echo '=== 验证更新结果 ==='

SELECT 
    '更新后统计' as metric,
    COUNT(*) as total_companies,
    COUNT(daily_capacity) as has_daily_capacity,
    COUNT(daily_return_capacity) as has_daily_return_capacity,
    COUNT(CASE WHEN daily_return_capacity IS NULL THEN 1 END) as null_return_capacity,
    MIN(daily_return_capacity) as min_return,
    MAX(daily_return_capacity) as max_return,
    ROUND(AVG(daily_return_capacity), 2) as avg_return
FROM dict_trucking_companies;

\echo ''
\echo '容量一致性检查:'

SELECT 
    daily_capacity,
    daily_return_capacity,
    COUNT(*) as company_count,
    CASE 
        WHEN daily_capacity = daily_return_capacity THEN '✓ 一致'
        ELSE '✗ 不一致'
    END as consistency
FROM dict_trucking_companies
GROUP BY daily_capacity, daily_return_capacity
ORDER BY daily_capacity, consistency;

-- ============================================================
-- 第 5 步：显示最终结果
-- ============================================================
\echo ''
\echo '最终车队容量配置:'

SELECT 
    company_code,
    company_name,
    daily_capacity,
    daily_return_capacity,
    CASE 
        WHEN daily_capacity = daily_return_capacity THEN '✓ 一致'
        ELSE '✗ 不一致'
    END as status
FROM dict_trucking_companies
ORDER BY daily_capacity DESC, company_code;

\echo ''
\echo '✅ 车队容量字段默认值统一完成！'
\echo ''
