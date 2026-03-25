-- ============================================================
-- 诊断和修复目的港为空的货柜
-- Diagnose and Fix Containers with Missing Destination Port
-- ============================================================

-- 1. 统计目的港为空的货柜数量
SELECT 
    COUNT(*) AS total_containers,
    COUNT(sf.port_of_discharge) AS with_port,
    COUNT(*) - COUNT(sf.port_of_discharge) AS missing_port,
    ROUND((COUNT(*) - COUNT(sf.port_of_discharge))::numeric * 100 / COUNT(*), 2) AS missing_rate_percent
FROM biz_containers c
JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
WHERE sf.port_of_discharge IS NULL OR sf.port_of_discharge = '';

-- 2. 查看目的港为空的货柜详情（按国家分组）
SELECT 
    ro.sell_to_country AS "国家",
    COUNT(*) AS "货柜数",
    STRING_AGG(DISTINCT c.container_number, ', ' ORDER BY c.container_number) AS "箱号列表"
FROM biz_containers c
JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
WHERE sf.port_of_discharge IS NULL OR sf.port_of_discharge = ''
GROUP BY ro.sell_to_country
ORDER BY "国家", "箱号列表";

-- 3. 检查这些国家的常见目的港（从其他有港口的货柜推断）
SELECT 
    ro.sell_to_country AS "国家",
    sf.port_of_discharge AS "目的港",
    COUNT(*) AS "频次"
FROM biz_containers c
JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
WHERE ro.sell_to_country IN ('GB', 'US', 'CA', 'DE', 'FR')
  AND sf.port_of_discharge IS NOT NULL 
  AND sf.port_of_discharge != ''
GROUP BY ro.sell_to_country, sf.port_of_discharge
ORDER BY "国家", "频次" DESC;

-- 4. 示例修复（根据实际情况调整）
-- GB (英国) 的常见目的港可能是: GBPVG (Port of Grangemouth), GBSOU (Southampton), GBFXT (Felixstowe)
-- 需要根据实际业务数据确定

-- 5. 如果知道正确的目的港，可以执行以下更新
-- UPDATE process_sea_freight
-- SET port_of_discharge = 'GBPVG'  -- 替换为正确的目的港代码
-- WHERE bill_of_lading_number IN (
--   SELECT c.bill_of_lading_number
--   FROM biz_containers c
--   JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
--   WHERE c.container_number IN ('ECMU5397691', 'ECMU5399797', 'ECMU5399586')
-- );

-- 6. 验证修复结果
SELECT 
    c.container_number AS "箱号",
    sf.port_of_discharge AS "目的港",
    ro.sell_to_country AS "销往国家",
    CASE 
        WHEN sf.port_of_discharge IS NULL OR sf.port_of_discharge = '' THEN '❌ 缺失'
        ELSE '✅ 正常'
    END AS "状态"
FROM biz_containers c
JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
WHERE c.container_number IN ('ECMU5397691', 'ECMU5399797', 'ECMU5399586');
