-- ============================================================
-- 配置费利克斯托港口的映射关系
-- Configure Mapping for Felixstowe Port
-- ============================================================

-- 1. 检查现有的港口 - 车队映射
SELECT 
    tpm.port_code,
    p.port_name,
    p.port_name_en,
    tpm.trucking_company_id,
    tc.trucking_company_name,
    tc.country,
    tpm.yard_capacity,
    tpm.standard_rate
FROM dict_trucking_port_mapping tpm
JOIN dict_ports p ON p.port_code = tpm.port_code
JOIN dict_trucking_companies tc ON tc.id = tpm.trucking_company_id
WHERE tpm.port_code = 'GBFXT';

-- 2. 查看所有可用的英国车队
SELECT id, trucking_company_code, trucking_company_name, country 
FROM dict_trucking_companies 
WHERE country = 'GB'
ORDER BY id;

-- 3. 查找销往英国的仓库（从补货订单中统计）
SELECT DISTINCT 
    ro.warehouse_id,
    w.warehouse_name,
    w.warehouse_code,
    ro.sell_to_country,
    COUNT(*) as order_count
FROM biz_replenishment_orders ro
JOIN dict_warehouses w ON w.id = ro.warehouse_id
WHERE ro.sell_to_country = 'GB'
GROUP BY ro.warehouse_id, w.warehouse_name, w.warehouse_code, ro.sell_to_country
ORDER BY order_count DESC;

-- 4. 检查这些仓库是否已有车队映射
SELECT DISTINCT
    ro.warehouse_id,
    w.warehouse_name,
    wtm.trucking_company_id,
    tc.trucking_company_name
FROM biz_replenishment_orders ro
JOIN dict_warehouses w ON w.id = ro.warehouse_id
LEFT JOIN dict_warehouse_trucking_mapping wtm ON wtm.warehouse_id = ro.warehouse_id
LEFT JOIN dict_trucking_companies tc ON tc.id = wtm.trucking_company_id
WHERE ro.sell_to_country = 'GB'
ORDER BY ro.warehouse_id;

-- ============================================================
-- 添加映射关系
-- ============================================================

-- 5a. 为销往英国的仓库添加与 YunExpress UK Ltd 的映射（假设车队 ID 需要从查询结果获取）
-- 先确认 YunExpress UK Ltd 的车队 ID
SELECT id, trucking_company_code, trucking_company_name 
FROM dict_trucking_companies 
WHERE trucking_company_code = 'YunExpress_UK_Ltd' OR trucking_company_name = 'YunExpress UK Ltd';

-- 5b. 为所有销往英国且没有映射的仓库添加映射（使用 YunExpress UK Ltd，假设其 ID 为查询结果）
-- 注意：请将 <YunExpress_ID> 替换为实际的车队 ID
INSERT INTO dict_warehouse_trucking_mapping (warehouse_id, trucking_company_id, is_default)
SELECT 
    ro.warehouse_id,
    (SELECT id FROM dict_trucking_companies WHERE trucking_company_code = 'YunExpress_UK_Ltd') as trucking_company_id,
    true as is_default
FROM biz_replenishment_orders ro
WHERE ro.sell_to_country = 'GB'
  AND ro.warehouse_id NOT IN (
    SELECT warehouse_id FROM dict_warehouse_trucking_mapping
  )
GROUP BY ro.warehouse_id
ON CONFLICT (warehouse_id, trucking_company_id) DO NOTHING;

-- 或者手动指定特定仓库的映射（推荐方式，更可控）
-- INSERT INTO dict_warehouse_trucking_mapping (warehouse_id, trucking_company_id, is_default)
-- VALUES 
--   (<warehouse_id_1>, <trucking_company_id>, true),
--   (<warehouse_id_2>, <trucking_company_id>, true)
-- ON CONFLICT (warehouse_id, trucking_company_id) DO NOTHING;

-- ============================================================
-- 验证配置结果
-- ============================================================

-- 6. 验证所有英国方向仓库的车队映射
SELECT 
    wtm.warehouse_id,
    w.warehouse_name,
    w.warehouse_code,
    wtm.trucking_company_id,
    tc.trucking_company_name,
    tc.country,
    wtm.is_default
FROM dict_warehouse_trucking_mapping wtm
JOIN dict_warehouses w ON w.id = wtm.warehouse_id
JOIN dict_trucking_companies tc ON tc.id = wtm.trucking_company_id
WHERE tc.country = 'GB'
ORDER BY wtm.warehouse_id;

-- 7. 验证费利克斯托港口的完整映射链
SELECT 
    w.warehouse_name AS "仓库名称",
    tc_from.trucking_company_name AS "仓库映射车队",
    tpm.port_code AS "港口代码",
    p.port_name AS "港口名称",
    tc_to.trucking_company_name AS "港口映射车队"
FROM dict_warehouses w
JOIN dict_warehouse_trucking_mapping wtm ON w.id = wtm.warehouse_id
JOIN dict_trucking_companies tc_from ON tc_from.id = wtm.trucking_company_id
CROSS JOIN dict_trucking_port_mapping tpm
JOIN dict_ports p ON p.port_code = tpm.port_code
JOIN dict_trucking_companies tc_to ON tc_to.id = tpm.trucking_company_id
WHERE wtm.trucking_company_id = tpm.trucking_company_id
  AND tpm.port_code = 'GBFXT'
  AND tc_from.country = 'GB';

-- 8. 测试排产（重新运行排产命令）
-- 在 Node.js 中执行：
-- npm run prod -- trucking-schedule create --mode manual --container-numbers "ECMU5397691,ECMU5399797,ECMU5399586,ECMU5381817,ECMU5400183"
