-- ============================================================
-- 国家概念统一：为 country 相关字段添加语义注释
-- 约定：country 字段 = 该国分公司，存 dict_countries.code
-- sell_to_country 特例：存子公司名称(customer_name)，用于与 biz_customers 关联
-- 详见 frontend/public/docs/11-project/12-国家概念统一约定.md
-- ============================================================

-- biz_customers.country: 该国分公司，存国家代码
COMMENT ON COLUMN biz_customers.country IS '该国分公司，存 dict_countries.code；子公司类型客户时表示该国唯一子公司';

-- biz_replenishment_orders.sell_to_country: 特例，存子公司名称
COMMENT ON COLUMN biz_replenishment_orders.sell_to_country IS '销往该国分公司：存子公司名称(customer_name)，与 biz_customers.customer_name 关联取 cust.country';

-- dict_warehouses.country: 仓库所在国
COMMENT ON COLUMN dict_warehouses.country IS '该国分公司，存 dict_countries.code';

-- dict_trucking_port_mapping.country: 映射所属国
COMMENT ON COLUMN dict_trucking_port_mapping.country IS '该国分公司，存 dict_countries.code';

-- dict_warehouse_trucking_mapping.country: 映射所属国
COMMENT ON COLUMN dict_warehouse_trucking_mapping.country IS '该国分公司，存 dict_countries.code';
