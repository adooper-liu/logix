-- 检查 TruckingPortMapping 数据
SELECT 
    id,
    country,
    portCode,
    truckingCompanyId,
    transportFee,
    standardRate,
    yardOperationFee,
    "isActive"
FROM "TruckingPortMapping"
WHERE "truckingCompanyId" = 'YunExpress UK Ltd'
  AND country = 'GB'
ORDER BY id DESC
LIMIT 10;
