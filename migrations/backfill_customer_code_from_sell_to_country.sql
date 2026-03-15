-- 数据回填：根据 sell_to_country 补全 customer_code
-- 规则：当 customer_code 为空且 sell_to_country 有值时，根据 biz_customers.customer_name 查找并回填

-- 1. 查看待回填的数据统计
SELECT 
    COUNT(*) as total_empty,
    COUNT(DISTINCT sell_to_country) as distinct_countries
FROM biz_replenishment_orders 
WHERE customer_code IS NULL 
    AND sell_to_country IS NOT NULL 
    AND sell_to_country != '';

-- 2. 执行回填
UPDATE biz_replenishment_orders ro
SET customer_code = c.customer_code
FROM biz_customers c
WHERE ro.customer_code IS NULL
    AND ro.sell_to_country IS NOT NULL
    AND ro.sell_to_country != ''
    AND c.customer_name = ro.sell_to_country;

-- 3. 查看回填结果
SELECT 
    COUNT(*) as updated_count
FROM biz_replenishment_orders 
WHERE customer_code IS NOT NULL 
    AND sell_to_country IS NOT NULL;

-- 4. 检查未匹配的数据（用于后续清理）
SELECT DISTINCT sell_to_country
FROM biz_replenishment_orders 
WHERE customer_code IS NULL 
    AND sell_to_country IS NOT NULL 
    AND sell_to_country != '';
