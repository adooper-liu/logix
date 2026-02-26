-- 修复传递日期和卸柜方式(计划)字段
-- Fix documentTransferDate and unloadModePlan fields

-- 更新 MRKU4896861 的传递日期
UPDATE process_port_operations
SET
    documentTransferDate = '2025-06-13 21:17:25'::timestamp,
    updated_at = NOW()
WHERE containerNumber = 'MRKU4896861';

-- 更新 MRKU4896861 的卸柜方式(计划)
UPDATE process_trucking
SET
    unloadModePlan = 'Drop off',
    updated_at = NOW()
WHERE containerNumber = 'MRKU4896861';

-- 验证更新结果
SELECT 'PortOperation' as table_name, containerNumber, documentTransferDate
FROM process_port_operations
WHERE containerNumber = 'MRKU4896861'
UNION ALL
SELECT 'TruckingTransport' as table_name, containerNumber, unloadModePlan::text
FROM process_trucking
WHERE containerNumber = 'MRKU4896861';
