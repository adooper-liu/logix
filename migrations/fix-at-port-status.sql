-- =====================================================
-- 修复 at_port 状态，排除中转港货柜
-- 生成时间: 2026-03-06
-- 用途: 按照状态机规则正确更新货柜状态
-- =====================================================

-- 状态机优先级规则：
-- 1. returned_empty - 有还箱记录
-- 2. unloaded - 有卸柜记录（WMS确认）
-- 3. picked_up - 有提柜记录
-- 4. at_port - 已到目的港（destination有ATA），不包括中转港
-- 5. in_transit - 有出运日期，无目的港ATA
-- 6. not_shipped - 无任何流程记录

-- 1. 首先将有中转港但无目的港ATA的货柜状态改为 in_transit
UPDATE biz_containers c
SET logistics_status = 'in_transit',
    updated_at = NOW()
WHERE c.logistics_status = 'at_port'
AND EXISTS (
  SELECT 1 FROM process_port_operations po
  WHERE po.container_number = c.container_number
  AND po.port_type = 'transit'
)
AND NOT EXISTS (
  SELECT 1 FROM process_port_operations po
  WHERE po.container_number = c.container_number
  AND po.port_type = 'destination'
  AND po.ata_dest_port IS NOT NULL
);

-- 2. 验证更新结果
SELECT
    logistics_status,
    COUNT(*) as count
FROM biz_containers
GROUP BY logistics_status
ORDER BY logistics_status;

-- 3. 检查 at_port 状态中的中转港情况
SELECT
    c.container_number,
    c.logistics_status,
    po_dest.port_name as dest_port,
    po_dest.ata_dest_port,
    po_transit.port_name as transit_port
FROM biz_containers c
LEFT JOIN process_port_operations po_dest ON c.container_number = po_dest.container_number AND po_dest.port_type = 'destination'
LEFT JOIN process_port_operations po_transit ON c.container_number = po_transit.container_number AND po_transit.port_type = 'transit'
WHERE c.logistics_status = 'at_port'
AND po_transit.port_name IS NOT NULL
LIMIT 10;
