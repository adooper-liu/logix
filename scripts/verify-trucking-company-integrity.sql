-- ============================================================
-- 验证车队公司代码关联完整性
-- Verify Trucking Company Code Referential Integrity
-- ============================================================

\echo ''
\echo '=== 车队公司代码关联完整性验证 ==='
\echo ''

-- ============================================================
-- 1. 检查 dict_trucking_companies 表的规范性
-- ============================================================
\echo '1. dict_trucking_companies 规范性检查:'

SELECT 
    '总数' as metric,
    COUNT(*) as total,
    COUNT(CASE WHEN company_code ~ '^[A-Z0-9_]+$' THEN 1 END) as standard_format,
    ROUND(100.0 * COUNT(CASE WHEN company_code ~ '^[A-Z0-9_]+$' THEN 1 END) / COUNT(*), 2) as pct_standard
FROM dict_trucking_companies;

-- 显示所有公司代码（按国家分组）
\echo ''
\echo '公司代码列表（按国家分组）:'

SELECT 
    country,
    company_code,
    company_name,
    LENGTH(company_code) as code_len,
    CASE 
        WHEN company_code ~ '^[A-Z0-9_]+$' THEN '✓'
        ELSE '✗'
    END as valid
FROM dict_trucking_companies
ORDER BY country, company_code;

-- ============================================================
-- 2. 检查 dict_trucking_port_mapping 的外键关联
-- ============================================================
\echo ''
\echo '2. dict_trucking_port_mapping 外键关联检查:'

-- 统计映射记录数
SELECT 
    '港口映射总数' as metric,
    COUNT(*) as total_mappings,
    COUNT(DISTINCT trucking_company_id) as distinct_companies
FROM dict_trucking_port_mapping;

-- 检查孤立记录
\echo ''
\echo '孤立记录检查（应该为 0）:'

SELECT 
    '孤立港口映射' as issue_type,
    tpm.trucking_company_id,
    COUNT(*) as orphan_count
FROM dict_trucking_port_mapping tpm
LEFT JOIN dict_trucking_companies tc ON tc.company_code = tpm.trucking_company_id
WHERE tc.company_code IS NULL
GROUP BY tpm.trucking_company_id;

-- 验证所有 trucking_company_id 都是大写格式
SELECT 
    '包含小写的港口映射' as issue_type,
    COUNT(*) as count
FROM dict_trucking_port_mapping
WHERE trucking_company_id ~ '[a-z]';

-- ============================================================
-- 3. 检查 dict_warehouse_trucking_mapping 的外键关联
-- ============================================================
\echo ''
\echo '3. dict_warehouse_trucking_mapping 外键关联检查:'

-- 统计映射记录数
SELECT 
    '仓库映射总数' as metric,
    COUNT(*) as total_mappings,
    COUNT(DISTINCT trucking_company_id) as distinct_companies
FROM dict_warehouse_trucking_mapping;

-- 检查孤立记录
\echo ''
\echo '孤立记录检查（应该为 0）:'

SELECT 
    '孤立仓库映射' as issue_type,
    wtm.trucking_company_id,
    COUNT(*) as orphan_count
FROM dict_warehouse_trucking_mapping wtm
LEFT JOIN dict_trucking_companies tc ON tc.company_code = wtm.trucking_company_id
WHERE tc.company_code IS NULL
GROUP BY wtm.trucking_company_id;

-- 验证所有 trucking_company_id 都是大写格式
SELECT 
    '包含小写的仓库映射' as issue_type,
    COUNT(*) as count
FROM dict_warehouse_trucking_mapping
WHERE trucking_company_id ~ '[a-z]';

-- ============================================================
-- 4. 综合统计
-- ============================================================
\echo ''
\echo '=== 综合统计 ==='

\echo ''
\echo '车队公司使用频率统计:'

SELECT 
    tc.country,
    tc.company_code,
    tc.company_name,
    (SELECT COUNT(*) FROM dict_trucking_port_mapping tpm WHERE tpm.trucking_company_id = tc.company_code) as port_mapping_count,
    (SELECT COUNT(*) FROM dict_warehouse_trucking_mapping wtm WHERE wtm.trucking_company_id = tc.company_code) as warehouse_mapping_count
FROM dict_trucking_companies tc
ORDER BY tc.country, port_mapping_count DESC, warehouse_mapping_count DESC;

\echo ''
\echo '国家分布统计:'

SELECT 
    country,
    COUNT(*) as company_count,
    SUM(CASE WHEN company_code ~ '^[A-Z0-9_]+$' THEN 1 ELSE 0 END) as standard_count,
    ROUND(AVG(LENGTH(company_code)), 1) as avg_code_length
FROM dict_trucking_companies
GROUP BY country
ORDER BY country;

-- ============================================================
-- 5. 最终验证报告
-- ============================================================
\echo ''
\echo '=== 最终验证报告 ==='

SELECT 
    'dict_trucking_companies' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN company_code ~ '^[A-Z0-9_]+$' THEN 1 END) as standard_records,
    0 as orphan_records,
    ROUND(100.0 * COUNT(CASE WHEN company_code ~ '^[A-Z0-9_]+$' THEN 1 END) / COUNT(*), 2) as compliance_rate
FROM dict_trucking_companies

UNION ALL

SELECT 
    'dict_trucking_port_mapping' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN trucking_company_id ~ '^[A-Z0-9_]+$' THEN 1 END) as standard_records,
    (SELECT COUNT(*) FROM dict_trucking_port_mapping tpm 
     LEFT JOIN dict_trucking_companies tc ON tc.company_code = tpm.trucking_company_id 
     WHERE tc.company_code IS NULL) as orphan_records,
    ROUND(100.0 * COUNT(CASE WHEN trucking_company_id ~ '^[A-Z0-9_]+$' THEN 1 END) / COUNT(*), 2) as compliance_rate
FROM dict_trucking_port_mapping

UNION ALL

SELECT 
    'dict_warehouse_trucking_mapping' as table_name,
    COUNT(*) as total_records,
    COUNT(CASE WHEN trucking_company_id ~ '^[A-Z0-9_]+$' THEN 1 END) as standard_records,
    (SELECT COUNT(*) FROM dict_warehouse_trucking_mapping wtm 
     LEFT JOIN dict_trucking_companies tc ON tc.company_code = wtm.trucking_company_id 
     WHERE tc.company_code IS NULL) as orphan_records,
    ROUND(100.0 * COUNT(CASE WHEN trucking_company_id ~ '^[A-Z0-9_]+$' THEN 1 END) / COUNT(*), 2) as compliance_rate
FROM dict_warehouse_trucking_mapping;

\echo ''
\echo '✅ 车队公司代码关联完整性验证完成！'
\echo ''
