-- ============================================================
-- 修复英国港口映射关系
-- Fix UK Port Mapping
-- ============================================================

-- 1. 查看当前 UK 的港口映射情况
SELECT 
    tpm.id,
    tpm.country,
    tpm.port_code,
    tpm.trucking_company_id,
    tpm.is_active
FROM dict_trucking_port_mapping tpm
WHERE tpm.country = 'UK';

-- 2. 查看当前 UK 公司的仓库映射情况
SELECT 
    wtm.id,
    wtm.country,
    wtm.warehouse_code,
    wtm.trucking_company_id,
    wtm.is_active
FROM dict_warehouse_trucking_mapping wtm
WHERE wtm.country LIKE '%UK%' OR wtm.country LIKE '%MH STAR UK%';

-- 3. 更新 UK 的港口映射，添加正确的港口代码
-- 3a. 更新费利克斯托港口的映射
UPDATE dict_trucking_port_mapping 
SET port_code = 'GBFXT'
WHERE country = 'UK' 
  AND trucking_company_id = 'YunExpress_UK_Ltd'
  AND (port_code IS NULL OR port_code = '');

UPDATE dict_trucking_port_mapping 
SET port_code = 'GBFXT'
WHERE country = 'UK' 
  AND trucking_company_id = 'CEVA_Freight__UK__Ltd'
  AND (port_code IS NULL OR port_code = '');

-- 4. 或者添加新的费利克斯托港口映射（如果不想修改现有记录）
-- INSERT INTO dict_trucking_port_mapping (country, port_code, trucking_company_id, is_active)
-- VALUES 
--   ('UK', 'GBFXT', 'YunExpress_UK_Ltd', true),
--   ('UK', 'GBFXT', 'CEVA_Freight__UK__Ltd', true)
-- ON CONFLICT (country, port_code, trucking_company_id) DO NOTHING;

-- 5. 更新仓库映射的国家代码为 GB
UPDATE dict_warehouse_trucking_mapping 
SET country = 'GB'
WHERE country = 'MH STAR UK LTD';

UPDATE dict_warehouse_trucking_mapping 
SET country = 'GB'
WHERE country = 'UK';

-- 6. 验证更新结果
\echo '=== UK 港口映射验证 ==='
SELECT 
    tpm.country,
    tpm.port_code,
    p.port_name,
    p.port_name_en,
    tpm.trucking_company_id,
    tpm.is_active
FROM dict_trucking_port_mapping tpm
LEFT JOIN dict_ports p ON p.port_code = tpm.port_code
WHERE tpm.country = 'GB' OR tpm.country = 'UK'
ORDER BY tpm.country, tpm.port_code;

\echo '=== GB 仓库映射验证 ==='
SELECT 
    wtm.country,
    wtm.warehouse_code,
    w.warehouse_name,
    wtm.trucking_company_id,
    wtm.is_active
FROM dict_warehouse_trucking_mapping wtm
LEFT JOIN dict_warehouses w ON w.warehouse_code = wtm.warehouse_code
WHERE wtm.country = 'GB'
ORDER BY wtm.warehouse_code;

-- 7. 测试排产
-- 现在应该可以成功排产了
