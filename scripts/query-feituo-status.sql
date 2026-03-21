-- 详细查询：同一个提单下的货柜及海运信息

-- 1. 提单NGP3069047下的所有货柜
SELECT 
    c.container_number,
    c.logistics_status,
    c.bill_of_lading_number
FROM biz_containers c
WHERE c.bill_of_lading_number = 'NGP3069047';

-- 2. 提单NGP3069047的海运信息
SELECT * FROM process_sea_freight WHERE bill_of_lading_number = 'NGP3069047';

-- 3. 这5个货柜的港口操作（目的港）
SELECT 
    po.container_number,
    po.port_type,
    po.port_sequence,
    po.port_name,
    po.eta as eta,
    po.ata as ata,
    po.last_free_date
FROM process_port_operations po
WHERE po.container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399797', 'ECMU5399586', 'ECMU5400183')
AND po.port_type = 'destination'
ORDER BY po.container_number, po.port_sequence;

-- 4. 这5个货柜的海运关联
SELECT 
    c.container_number,
    sf.bill_of_lading_number as sf_bl,
    sf.eta as sf_eta,
    sf.ata as sf_ata,
    sf.shipment_date as sf_shipment_date
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON c.bill_of_lading_number = sf.bill_of_lading_number
WHERE c.container_number IN ('ECMU5381817', 'ECMU5397691', 'ECMU5399797', 'ECMU5399586', 'ECMU5400183');
