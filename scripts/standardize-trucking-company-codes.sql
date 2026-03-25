-- ============================================================
-- 规范化车队公司代码 (company_code)
-- Standardize Trucking Company Codes
-- ============================================================
-- 目标：统一使用全大写字母 + 数字 + 下划线的格式
-- ============================================================

\echo ''
\echo '=== 开始规范化车队公司代码 ==='
\echo ''

-- ============================================================
-- 第 1 步：检查当前数据质量
-- ============================================================
\echo '1. 当前 company_code 规范性检查:'

-- 统计包含小写字母的 code
SELECT 
    '包含小写字母的 code' as issue_type,
    COUNT(*) as count
FROM dict_trucking_companies
WHERE company_code ~ '[a-z]';

-- 查看具体哪些 code 不规范
SELECT 
    company_code,
    company_name,
    LENGTH(company_code) as code_length,
    CASE 
        WHEN company_code ~ '[a-z]' THEN '✗ 包含小写'
        ELSE '✓'
    END as format_check
FROM dict_trucking_companies
WHERE company_code ~ '[^A-Z0-9_]'
ORDER BY company_code;

-- ============================================================
-- 第 2 步：规范化 company_code（转换为全大写）
-- ============================================================
\echo ''
\echo '2. 规范化 company_code 为全大写...'

-- 更新所有包含小写字母的 code
UPDATE dict_trucking_companies
SET company_code = UPPER(company_code)
WHERE company_code ~ '[a-z]';

\echo '✅ company_code 已转换为全大写！'

-- ============================================================
-- 第 3 步：同步更新映射表中的 trucking_company_id
-- ============================================================
\echo ''
\echo '3. 同步更新映射表中的 trucking_company_id...'

-- 更新 dict_trucking_port_mapping
UPDATE dict_trucking_port_mapping tpm
SET trucking_company_id = UPPER(tpm.trucking_company_id)
WHERE tpm.trucking_company_id ~ '[a-z]';

-- 更新 dict_warehouse_trucking_mapping
UPDATE dict_warehouse_trucking_mapping wtm
SET trucking_company_id = UPPER(wtm.trucking_company_id)
WHERE wtm.trucking_company_id ~ '[a-z]';

\echo '✅ 映射表已同步更新！'

-- ============================================================
-- 第 4 步：验证外键关联
-- ============================================================
\echo ''
\echo '4. 验证外键关联...'

-- 检查是否有孤立的映射记录
SELECT 
    '孤立港口映射' as check_item,
    COUNT(*) as orphan_count
FROM dict_trucking_port_mapping tpm
LEFT JOIN dict_trucking_companies tc ON tc.company_code = tpm.trucking_company_id
WHERE tc.company_code IS NULL

UNION ALL

SELECT 
    '孤立仓库映射' as check_item,
    COUNT(*) as orphan_count
FROM dict_warehouse_trucking_mapping wtm
LEFT JOIN dict_trucking_companies tc ON tc.company_code = wtm.trucking_company_id
WHERE tc.company_code IS NULL;

-- ============================================================
-- 第 5 步：最终验证
-- ============================================================
\echo ''
\echo '=== 最终验证 ==='

-- 检查是否还有小写字母
SELECT 
    '剩余不规范 code 数' as metric,
    COUNT(*) as count
FROM dict_trucking_companies
WHERE company_code ~ '[a-z]';

-- 显示所有 company_code 的格式
SELECT 
    company_code,
    company_name,
    LENGTH(company_code) as code_length,
    CASE 
        WHEN company_code ~ '^[A-Z0-9_]+$' THEN '✓ 规范'
        ELSE '✗ 不规范'
    END as format_status
FROM dict_trucking_companies
ORDER BY company_code;

-- 统计信息
\echo ''
\echo '统计汇总:'

SELECT 
    '总数' as metric,
    COUNT(*) as total_companies,
    ROUND(100.0 * COUNT(CASE WHEN company_code ~ '^[A-Z0-9_]+$' THEN 1 END) / COUNT(*), 2) as pct_standard,
    MAX(LENGTH(company_code)) as max_length,
    MIN(LENGTH(company_code)) as min_length,
    ROUND(AVG(LENGTH(company_code)), 1) as avg_length
FROM dict_trucking_companies;

\echo ''
\echo '✅ 车队公司代码规范化完成！'
\echo ''
