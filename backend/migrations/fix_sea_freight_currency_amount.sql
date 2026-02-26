-- 修复海运费币种和标准海运费金额
-- Fix freight currency and standard freight amount

-- 更新 MRKU4896861 的海运费信息
UPDATE process_sea_freight
SET
    freightCurrency = 'USD',
    standardFreightAmount = 2749.00,
    updated_at = NOW()
WHERE containerNumber = 'MRKU4896861';

-- 验证更新结果
SELECT
    containerNumber,
    freightCurrency,
    standardFreightAmount
FROM process_sea_freight
WHERE containerNumber = 'MRKU4896861';
