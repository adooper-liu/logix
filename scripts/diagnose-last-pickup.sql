-- ========================================
-- 最晚提柜统计为 0 的诊断脚本
-- Diagnose why Last Pickup statistics show 0
-- ========================================

-- 1. 检查 at_port 状态的货柜总数
SELECT '1. at_port 状态货柜总数' as check_item;
SELECT COUNT(*) as at_port_container_count 
FROM biz_containers 
WHERE logistics_status = 'at_port';

-- 2. 检查有目的港操作记录的 at_port 货柜
SELECT '2. 有目的港操作记录的 at_port 货柜' as check_item;
SELECT DISTINCT c.container_number, c.logistics_status
FROM biz_containers c
INNER JOIN process_port_operations po ON po.container_number = c.container_number
WHERE c.logistics_status = 'at_port'
AND po.port_type = 'destination';

-- 3. 检查这些货柜是否有拖卡运输记录
SELECT '3. 检查拖卡运输记录情况' as check_item;
SELECT 
    c.container_number,
    c.logistics_status,
    CASE WHEN tt.container_number IS NOT NULL THEN '有拖卡记录' ELSE '无拖卡记录' END as has_trucking,
    po.last_free_date
FROM biz_containers c
INNER JOIN process_port_operations po ON po.container_number = c.container_number
LEFT JOIN trucking_transport tt ON tt.container_number = c.container_number
WHERE c.logistics_status = 'at_port'
AND po.port_type = 'destination'
ORDER BY c.container_number;

-- 4. 统计各种情况的数量
SELECT '4. 统计分布情况' as check_item;
SELECT 
    CASE WHEN tt.container_number IS NOT NULL THEN '有拖卡记录' ELSE '无拖卡记录' END as trucking_status,
    CASE 
        WHEN po.last_free_date < CURRENT_DATE THEN '已逾期'
        WHEN po.last_free_date >= CURRENT_DATE AND po.last_free_date <= CURRENT_DATE + INTERVAL '3 days' THEN '1-3 天'
        WHEN po.last_free_date > CURRENT_DATE + INTERVAL '3 days' AND po.last_free_date <= CURRENT_DATE + INTERVAL '7 days' THEN '4-7 天'
        WHEN po.last_free_date > CURRENT_DATE + INTERVAL '7 days' THEN '7 天以上'
        ELSE '缺最后免费日'
    END as last_free_date_status,
    COUNT(DISTINCT c.container_number) as container_count
FROM biz_containers c
INNER JOIN process_port_operations po ON po.container_number = c.container_number
LEFT JOIN trucking_transport tt ON tt.container_number = c.container_number
WHERE c.logistics_status = 'at_port'
AND po.port_type = 'destination'
GROUP BY 
    CASE WHEN tt.container_number IS NOT NULL THEN '有拖卡记录' ELSE '无拖卡记录' END,
    CASE 
        WHEN po.last_free_date < CURRENT_DATE THEN '已逾期'
        WHEN po.last_free_date >= CURRENT_DATE AND po.last_free_date <= CURRENT_DATE + INTERVAL '3 days' THEN '1-3 天'
        WHEN po.last_free_date > CURRENT_DATE + INTERVAL '3 days' AND po.last_free_date <= CURRENT_DATE + INTERVAL '7 days' THEN '4-7 天'
        WHEN po.last_free_date > CURRENT_DATE + INTERVAL '7 days' THEN '7 天以上'
        ELSE '缺最后免费日'
    END
ORDER BY container_count DESC;

-- 5. 检查 lastFreeDate 字段是否有值
SELECT '5. 检查 lastFreeDate 字段填充情况' as check_item;
SELECT 
    COUNT(*) as total_destination_ports,
    COUNT(po.last_free_date) as has_last_free_date,
    COUNT(*) - COUNT(po.last_free_date) as missing_last_free_date,
    ROUND(COUNT(po.last_free_date)::numeric / COUNT(*)::numeric * 100, 2) as fill_rate_percent
FROM process_port_operations po
WHERE po.port_type = 'destination';

-- 6. 查看所有物流状态的分布
SELECT '6. 所有物流状态分布' as check_item;
SELECT logistics_status, COUNT(*) as count
FROM biz_containers
GROUP BY logistics_status
ORDER BY count DESC;
