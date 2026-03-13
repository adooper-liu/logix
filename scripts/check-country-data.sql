-- ============================================================
-- 检查和修复国家数据
-- Check and Fix Country Data
-- ============================================================

-- 1. 检查国家数据
SELECT '=== 检查国家数据 ===' as info;

SELECT 
    COUNT(*) as total_countries,
    COUNT(*) FILTER (WHERE is_active = true) as active_countries
FROM dict_countries;

SELECT 
    code, 
    name_cn, 
    name_en, 
    is_active,
    sort_order
FROM dict_countries 
WHERE is_active = true
ORDER BY sort_order, code
LIMIT 10;

-- 2. 检查是否有任何国家数据
SELECT '=== 检查是否有国家数据 ===' as info;

SELECT EXISTS (
    SELECT 1 FROM dict_countries
) as has_country_data;

-- 3. 如果没有数据，显示插入语句
DO $$
DECLARE
    country_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO country_count FROM dict_countries;
    
    IF country_count = 0 THEN
        RAISE NOTICE '⚠️  警告: dict_countries 表为空！';
        RAISE NOTICE '请执行初始化脚本: backend/02_init_dict_tables_final.sql';
    ELSE
        RAISE NOTICE '✅ 找到 % 个国家记录', country_count;
    END IF;
END $$;

-- 4. 检查客户表中是否有国家字段数据
SELECT '=== 检查客户表中的国家数据 ===' as info;

SELECT 
    COUNT(DISTINCT country) as unique_countries,
    COUNT(*) as total_customers
FROM biz_customers
WHERE country IS NOT NULL;

SELECT 
    country,
    COUNT(*) as customer_count
FROM biz_customers
WHERE country IS NOT NULL
GROUP BY country
ORDER BY customer_count DESC
LIMIT 10;

-- 5. 检查备货单与客户的关联
SELECT '=== 检查备货单与客户关联 ===' as info;

SELECT 
    c.name_cn as country_name,
    COUNT(DISTINCT o.order_number) as order_count
FROM dict_countries c
INNER JOIN biz_customers cust ON cust.country = c.code
INNER JOIN biz_replenishment_orders o ON o.sell_to_country = cust.customer_name
GROUP BY c.code, c.name_cn
ORDER BY order_count DESC
LIMIT 10;
