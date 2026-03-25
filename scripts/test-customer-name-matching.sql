-- ============================================================
-- 测试客户名称匹配 customer_code 功能
-- Test: Auto-fill customer_code from customer_name during import
-- ============================================================
-- 目的：验证 Excel 导入时根据 customer_name 自动匹配 customer_code
-- 场景：货柜信息导入，备货单的 customer_code 字段补全
-- ============================================================

\echo ''
\echo '=== 当前客户数据概览 ==='
\echo ''

-- 1. 查看现有客户列表
SELECT 
    customer_code,
    customer_name,
    country,
    customer_type_code,
    status
FROM biz_customers
ORDER BY customer_code;

\echo ''
\echo '=== 模拟导入逻辑测试 ==='
\echo ''

-- 2. 测试用例 1: customer_name 精确匹配
\echo '-- 测试 1: 使用 "Test UK Customer" 匹配 customer_code'
SELECT 
    'Test UK Customer' as input_customer_name,
    c.customer_code as matched_customer_code,
    c.country as customer_country,
    CASE 
        WHEN c.customer_code IS NOT NULL THEN '✅ 匹配成功'
        ELSE '❌ 匹配失败'
    END as result
FROM biz_customers c
WHERE c.customer_name = 'Test UK Customer';

-- 3. 测试用例 2: 检查是否有多个同名客户
\echo ''
\echo '-- 检查是否有重复的客户名称（应该返回 0）'
SELECT 
    customer_name,
    COUNT(*) as duplicate_count
FROM biz_customers
GROUP BY customer_name
HAVING COUNT(*) > 1;

\echo ''
\echo '=== 验证现有备货单数据 ==='
\echo ''

-- 4. 检查哪些备货单有 customer_name 但无 customer_code
SELECT 
    ro.order_number,
    ro.container_number,
    ro.customer_name,
    ro.customer_code,
    ro.sell_to_country,
    c.country as expected_country
FROM biz_replenishment_orders ro
LEFT JOIN biz_customers c ON c.customer_name = ro.customer_name
WHERE ro.customer_code IS NULL OR ro.customer_code = ''
ORDER BY ro.order_number;

\echo ''
\echo '=== 执行批量补全（可选） ==='
\echo ''

-- 5. 批量补全所有能通过 customer_name 匹配的 customer_code
-- 注意：这只是演示，实际导入时会自动处理
UPDATE biz_replenishment_orders ro
SET customer_code = c.customer_code
FROM biz_customers c
WHERE ro.customer_code IS NULL 
   OR ro.customer_code = ''
AND c.customer_name = ro.customer_name
AND ro.customer_name IS NOT NULL
AND ro.customer_name != '';

\echo ''
\echo '已更新的记录数:'
SELECT COUNT(*) as updated_count
FROM biz_replenishment_orders ro
WHERE ro.customer_code IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM biz_customers c 
    WHERE c.customer_name = ro.customer_name
  );

\echo ''
\echo '=== 验证更新结果 ==='
\echo ''

-- 6. 验证更新后的数据
SELECT 
    ro.order_number,
    ro.container_number,
    ro.customer_name,
    ro.customer_code,
    ro.sell_to_country,
    c.country as customer_country,
    CASE 
        WHEN ro.customer_code = c.customer_code THEN '✅ 正确'
        ELSE '❌ 错误'
    END as validation
FROM biz_replenishment_orders ro
LEFT JOIN biz_customers c ON c.customer_name = ro.customer_name
WHERE ro.customer_code IS NOT NULL
  AND ro.customer_code != ''
ORDER BY ro.order_number;

\echo ''
\echo '=== 测试建议 ==='
\echo ''
\echo '1. 在前端导入包含 customer_name 但无 customer_code 的 Excel 数据'
\echo '2. 观察日志输出：[Import] 从 customer_name 补全 customer_code: xxx -> yyy'
\echo '3. 检查数据库中 customer_code 是否已自动填充'
\echo ''
\echo '示例 Excel 列名:'
\echo '  - 客户名称 (customer_name)'
\echo '  - 销往国家 (sell_to_country) - 可选，也会自动填充'
\echo ''
\echo '修正后的导入逻辑:'
\echo '  Step 1: customer_name → sell_to_country (通过查询 biz_customers.country)'
\echo '  Step 2: customer_name → customer_code (通过查询 biz_customers.customer_code)'
\echo ''
