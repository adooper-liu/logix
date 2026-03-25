-- ============================================================
-- 修复备货单缺失客户信息导致的排产失败问题
-- Fix: Missing customer info in replenishment orders causing scheduling failure
-- ============================================================
-- 问题：5 个集装箱的备货单没有 customer_code，导致无法确定国家代码
-- 影响：无法找到候选仓库，排产失败
-- 解决方案：为备货单补充默认的客户和国家信息
-- ============================================================

\echo ''
\echo '=== 诊断问题 ==='
\echo ''

-- 1. 查看问题订单
SELECT 
    br.container_number,
    br.order_number,
    br.customer_code,
    bc.country as customer_country,
    psf.port_of_discharge,
    dp.country as dest_country
FROM biz_replenishment_orders br
LEFT JOIN biz_customers bc ON bc.customer_code = br.customer_code
LEFT JOIN biz_containers bct ON bct.container_number = br.container_number
LEFT JOIN process_sea_freight psf ON psf.bill_of_lading_number = bct.bill_of_lading_number
LEFT JOIN dict_ports dp ON dp.port_code = psf.port_of_discharge
WHERE br.container_number IN (
    'ECMU5399797', 'ECMU5381817', 'ECMU5397691', 
    'ECMU5399586', 'ECMU5400183'
);

\echo ''
\echo '=== 方案 1: 创建测试客户并关联订单 ==='
\echo ''

-- 1.1 创建英国测试客户（因为目的港是 GBFXT）
INSERT INTO biz_customers (customer_code, customer_name, customer_type_code, country, status)
VALUES ('TEST_UK_CUSTOMER', 'Test UK Customer', 'OTHER', 'GB', 'ACTIVE')
ON CONFLICT (customer_code) DO UPDATE SET 
    customer_name = EXCLUDED.customer_name,
    country = EXCLUDED.country,
    status = EXCLUDED.status;

-- 1.2 更新备货单的客户代码
UPDATE biz_replenishment_orders br
SET customer_code = 'TEST_UK_CUSTOMER'
WHERE br.container_number IN (
    'ECMU5399797', 'ECMU5381817', 'ECMU5397691', 
    'ECMU5399586', 'ECMU5400183'
)
AND (br.customer_code IS NULL OR br.customer_code = '');

\echo ''
\echo '=== 验证修复结果 ==='
\echo ''

-- 2. 验证订单是否已关联客户
SELECT 
    br.container_number,
    br.order_number,
    br.customer_code,
    bc.customer_name,
    bc.country as customer_country,
    psf.port_of_discharge,
    dp.country as dest_country
FROM biz_replenishment_orders br
LEFT JOIN biz_customers bc ON bc.customer_code = br.customer_code
LEFT JOIN biz_containers bct ON bct.container_number = br.container_number
LEFT JOIN process_sea_freight psf ON psf.bill_of_lading_number = bct.bill_of_lading_number
LEFT JOIN dict_ports dp ON dp.port_code = psf.port_of_discharge
WHERE br.container_number IN (
    'ECMU5399797', 'ECMU5381817', 'ECMU5397691', 
    'ECMU5399586', 'ECMU5400183'
);

\echo ''
\echo '=== 检查仓库映射配置 ==='
\echo ''

-- 3. 确认英国有仓库映射
SELECT 
    wtm.country,
    wtm.warehouse_code,
    wtm.trucking_company_id,
    dw.warehouse_name,
    dtc.company_name as trucking_company_name,
    dtc.has_yard,
    dtc.yard_daily_capacity
FROM dict_warehouse_trucking_mapping wtm
LEFT JOIN dict_warehouses dw ON dw.warehouse_code = wtm.warehouse_code
LEFT JOIN dict_trucking_companies dtc ON dtc.company_code = wtm.trucking_company_id
WHERE wtm.country = 'GB'
ORDER BY wtm.warehouse_code, wtm.trucking_company_id;

\echo ''
\echo '=== 检查港口映射配置 ==='
\echo ''

-- 4. 确认英国有港口映射
SELECT 
    tpm.country,
    tpm.port_code,
    tpm.trucking_company_id,
    dp.port_name,
    dtc.company_name as trucking_company_name,
    dtc.has_yard,
    dtc.yard_daily_capacity
FROM dict_trucking_port_mapping tpm
LEFT JOIN dict_ports dp ON dp.port_code = tpm.port_code
LEFT JOIN dict_trucking_companies dtc ON dtc.company_code = tpm.trucking_company_id
WHERE tpm.country = 'GB'
ORDER BY tpm.port_code, tpm.trucking_company_id;

\echo ''
\echo '✅ 修复完成！现在可以重新排产了'
\echo ''
\echo '提示：执行以下命令重新排产:'
\echo '  POST /api/intelligent-scheduling/schedule'
\echo '  { "containerNumbers": ["ECMU5399797", "ECMU5381817", "ECMU5397691", "ECMU5399586", "ECMU5400183"] }'
\echo ''
