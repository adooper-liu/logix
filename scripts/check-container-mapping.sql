-- ============================================================
-- 诊断排产失败原因 - 检查映射关系
-- Diagnose Trucking Schedule Failure - Check Mapping
-- ============================================================

-- 1. 首先查看失败的货柜信息
SELECT 
    c.container_number AS "箱号",
    c.bill_of_lading_number AS "提单号",
    ro.order_number AS "订单号",
    ro.sell_to_country AS "销往国家",
    sf.port_of_discharge AS "目的港代码"
FROM biz_containers c
JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
WHERE c.container_number IN (
    'ECMU5397691', 'ECMU5399797', 'ECMU5399586',
    'ECMU5381817', 'ECMU5400183'
)
ORDER BY c.container_number;

-- 2. 检查英国 (GB) 的港口 - 车队映射
SELECT 
    tpm.country,
    tpm.port_code,
    p.port_name,
    tpm.trucking_company_id,
    tc.company_name AS trucking_company_name,
    tpm.is_active
FROM dict_trucking_port_mapping tpm
LEFT JOIN dict_ports p ON p.port_code = tpm.port_code
LEFT JOIN dict_trucking_companies tc ON tc.company_code = tpm.trucking_company_id
WHERE tpm.country = 'GB'
ORDER BY tpm.port_code;

-- 3. 检查英国 (GB) 的仓库 - 车队映射
SELECT 
    wtm.country,
    wtm.warehouse_code,
    w.warehouse_name,
    wtm.trucking_company_id,
    tc.company_name AS trucking_company_name,
    wtm.is_active
FROM dict_warehouse_trucking_mapping wtm
LEFT JOIN dict_warehouses w ON w.warehouse_code = wtm.warehouse_code
LEFT JOIN dict_trucking_companies tc ON tc.company_code = wtm.trucking_company_id
WHERE wtm.country = 'GB'
ORDER BY wtm.warehouse_code;

-- 4. 检查这些货柜销往国家的仓库映射总数
SELECT 
    ro.sell_to_country AS "国家",
    COUNT(DISTINCT wtm.warehouse_code) AS "有映射的仓库数",
    COUNT(DISTINCT wtm.trucking_company_id) AS "有映射的车队数"
FROM biz_replenishment_orders ro
LEFT JOIN dict_warehouse_trucking_mapping wtm ON wtm.country = ro.sell_to_country
WHERE ro.container_number IN (
    'ECMU5397691', 'ECMU5399797', 'ECMU5399586',
    'ECMU5381817', 'ECMU5400183'
)
GROUP BY ro.sell_to_country;

-- 5. 检查费利克斯托港口的映射
SELECT 
    tpm.country,
    tpm.port_code,
    p.port_name,
    p.port_name_en,
    tpm.trucking_company_id,
    tc.company_name AS trucking_company_name,
    tpm.yard_capacity,
    tpm.standard_rate,
    tpm.is_active
FROM dict_trucking_port_mapping tpm
LEFT JOIN dict_ports p ON p.port_code = tpm.port_code
LEFT JOIN dict_trucking_companies tc ON tc.company_code = tpm.trucking_company_id
WHERE tpm.port_code = 'GBFXT'
ORDER BY tpm.country;
