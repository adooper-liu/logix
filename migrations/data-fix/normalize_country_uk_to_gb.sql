-- ============================================================
-- 国家代码规范化：将误存的子公司名称转换为国家代码
-- 详见 frontend/public/docs/11-project/12-国家概念统一约定.md
-- ============================================================

-- 1. 规范化 UK → GB
UPDATE dict_trucking_port_mapping SET country = 'GB' WHERE country = 'UK';

-- 2. 规范化 BEL → BE
UPDATE dict_trucking_port_mapping SET country = 'BE' WHERE country = 'BEL';

-- 3. dict_warehouse_trucking_mapping: 子公司名称 → 国家代码
-- 通过 biz_customers.customer_name 关联获取国家代码
UPDATE dict_warehouse_trucking_mapping wtm
SET country = c.country
FROM biz_customers c
WHERE c.customer_name = wtm.country
  AND c.customer_type_code = 'SUBSIDIARY'
  AND wtm.country NOT IN (SELECT code FROM dict_countries WHERE is_active = true);

-- 4. 对仍未匹配成功的 warehouse_trucking_mapping，从 dict_warehouses 补全
-- 按 warehouse_code 查找仓库所在国
UPDATE dict_warehouse_trucking_mapping wtm
SET country = w.country
FROM dict_warehouses w
WHERE w.warehouse_code = wtm.warehouse_code
  AND (wtm.country IS NULL OR wtm.country = '' OR wtm.country NOT IN (SELECT code FROM dict_countries WHERE is_active = true));

-- 5. 规范化 dict_warehouses 中可能的错误值
UPDATE dict_warehouses SET country = 'PT' WHERE country = 'PT'; -- 葡萄牙（保持现状，待确认）

-- 6. 记录变更
SELECT 'UK→GB' as fix, count(*) as affected FROM dict_trucking_port_mapping WHERE country = 'GB'
UNION ALL
SELECT 'BEL→BE' as fix, count(*) as affected FROM dict_trucking_port_mapping WHERE country = 'BE'
UNION ALL
SELECT '子公司名称→国家代码' as fix, count(*) as affected FROM dict_warehouse_trucking_mapping WHERE country IN (SELECT code FROM dict_countries WHERE is_active = true);
