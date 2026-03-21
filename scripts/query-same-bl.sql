-- 查询所有货柜
SELECT container_number, logistics_status, bill_of_lading_number
FROM biz_containers
ORDER BY created_at DESC;

-- 查询所有海运记录
SELECT bill_of_lading_number, mbl_number, hbl_number, vessel_name, eta, ata
FROM process_sea_freight
ORDER BY created_at DESC;

-- 查询所有货柜的目的港操作
SELECT po.container_number, po.port_type, po.port_sequence,
       po.port_name, po.eta, po.ata
FROM process_port_operations po
WHERE po.port_type = 'destination'
ORDER BY po.container_number, po.port_sequence;
