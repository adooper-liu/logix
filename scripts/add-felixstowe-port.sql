-- ============================================================
-- 添加费利克斯托港口（Felixstowe, UK）
-- Add Felixstowe Port to Dictionary
-- ============================================================

-- 1. 检查是否已存在
SELECT port_code, port_name, port_name_en 
FROM dict_ports 
WHERE port_name ILIKE '%费利克斯托%' 
   OR port_name_en ILIKE '%felixstowe%'
   OR port_code = 'GBFXT';

-- 2. 添加费利克斯托港口
INSERT INTO dict_ports (port_code, port_name, port_name_en, country)
VALUES ('GBFXT', '费利克斯托', 'Felixstowe', 'GB')
ON CONFLICT (port_code) DO NOTHING;

-- 3. 验证添加结果
SELECT port_code, port_name, port_name_en, country 
FROM dict_ports 
WHERE port_code = 'GBFXT';

-- 4. 更新已导入货柜的目的港字段
UPDATE process_sea_freight sf
SET port_of_discharge = 'GBFXT'
WHERE port_of_discharge IS NULL 
  AND bill_of_lading_number IN (
    SELECT c.bill_of_lading_number
    FROM biz_containers c
    JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
    WHERE c.container_number IN (
      'ECMU5397691', 'ECMU5399797', 'ECMU5399586',
      'ECMU5381817', 'ECMU5400183'
    )
);

-- 5. 验证更新结果
SELECT 
    c.container_number AS "箱号",
    sf.port_of_discharge AS "目的港代码",
    p.port_name AS "目的港名称",
    ro.sell_to_country AS "销往国家"
FROM biz_containers c
JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
JOIN biz_replenishment_orders ro ON c.container_number = ro.container_number
LEFT JOIN dict_ports p ON p.port_code = sf.port_of_discharge
WHERE c.container_number IN (
  'ECMU5397691', 'ECMU5399797', 'ECMU5399586',
  'ECMU5381817', 'ECMU5400183'
)
ORDER BY c.container_number;
