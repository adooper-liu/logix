-- 检查仓库和车队数据
SELECT 
    'Warehouse' as type,
    id,
    name,
    code,
    country
FROM "Warehouses"
WHERE code = 'Bedford'

UNION ALL

SELECT 
    'TruckingCompany' as type,
    id,
    name,
    code,
    country
FROM "TruckingCompanies"
WHERE code = 'YunExpress UK Ltd';
