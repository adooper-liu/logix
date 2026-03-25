-- ========================================
-- 诊断排产概览查询问题
-- 目的：验证 biz_containers.schedule_status 和 process_port_operations.port_type
-- ========================================

-- 1. 检查 schedule_status 的分布
SELECT 
  schedule_status,
  COUNT(*) as count
FROM biz_containers
GROUP BY schedule_status
ORDER BY count DESC;

-- 2. 检查 GB 国家的货柜 schedule_status 分布
SELECT 
  c.schedule_status,
  COUNT(*) as count
FROM biz_containers c
JOIN biz_replenishment_orders ro ON c.order_number = ro.order_number
JOIN biz_customers cu ON ro.customer_code = cu.customer_code
WHERE cu.country = 'GB'
GROUP BY c.schedule_status
ORDER BY count DESC;

-- 3. 检查 process_port_operations 表的 port_type 值
SELECT 
  port_type,
  COUNT(*) as count
FROM process_port_operations
GROUP BY port_type
ORDER BY count DESC;

-- 4. 检查有 destination 类型记录的货柜
SELECT 
  c.container_number,
  c.schedule_status,
  po.port_type,
  po.eta,
  po.ata
FROM biz_containers c
LEFT JOIN process_port_operations po ON c.container_number = po.container_number AND po.port_type = 'destination'
WHERE c.schedule_status IN ('initial', 'issued')
LIMIT 20;

-- 5. 模拟后端查询（测试用）
SELECT 
  COUNT(*) as count
FROM biz_containers c
WHERE c.schedule_status = 'initial'
AND EXISTS (
  SELECT 1 FROM process_port_operations po
  WHERE po.container_number = c.container_number 
    AND po.port_type = 'destination'
    AND (po.ata IS NOT NULL OR po.eta IS NOT NULL)
);

-- 6. 尝试不使用 port_type 过滤（看看是否有数据）
SELECT 
  COUNT(*) as count
FROM biz_containers c
WHERE c.schedule_status = 'initial'
AND EXISTS (
  SELECT 1 FROM process_port_operations po
  WHERE po.container_number = c.container_number 
    AND (po.ata IS NOT NULL OR po.eta IS NOT NULL)
);
