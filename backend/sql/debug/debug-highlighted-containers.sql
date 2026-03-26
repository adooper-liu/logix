-- ========================================
-- 诊断高亮货柜的状态
-- 目的：验证用户选择的 5 个货柜是否符合排产条件
-- ========================================

-- 1. 检查这 5 个货柜的基本信息
SELECT 
  c.container_number,
  c.schedule_status,
  c.logistics_status,
  ro.order_number,
  cu.country,
  po.port_type,
  po.eta,
  po.ata,
  pt.planned_pickup_date,
  pt.actual_pickup_date
FROM biz_containers c
JOIN biz_replenishment_orders ro ON c.order_number = ro.order_number
JOIN biz_customers cu ON ro.customer_code = cu.customer_code
LEFT JOIN process_port_operations po ON c.container_number = po.container_number 
  AND (po.port_type IS NULL OR po.port_type = 'destination' OR po.port_type = 'transit')
LEFT JOIN process_trucking_transports pt ON c.container_number = pt.container_number
WHERE c.container_number IN (
  'ECMU5400183',
  'ECMU5397691',
  'ECMU5399586',
  'ECMU5399797',
  'ECMU5381817'
)
AND cu.country = 'GB'
ORDER BY c.container_number;

-- 2. 检查这 5 个货柜的完整物流状态流转
SELECT 
  c.container_number,
  c.schedule_status,
  c.logistics_status,
  -- 海运信息
  sf.vessel_name,
  sf.etd_port_of_discharge,
  sf.eta_port_of_discharge,
  sf.atd_port_of_discharge,
  sf.ata_port_of_discharge,
  -- 港口操作
  po.eta as dest_eta,
  po.ata as dest_ata,
  po.last_free_date,
  -- 拖车运输
  pt.planned_pickup_date,
  pt.actual_pickup_date,
  pt.planned_delivery_date,
  pt.actual_delivery_date,
  -- 仓库操作
  wo.planned_unload_date,
  wo.actual_unload_date
FROM biz_containers c
LEFT JOIN process_sea_freight sf ON c.container_number = sf.container_number
LEFT JOIN process_port_operations po ON c.container_number = po.container_number 
  AND po.port_type = 'destination'
LEFT JOIN process_trucking_transports pt ON c.container_number = pt.container_number
LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
WHERE c.container_number IN (
  'ECMU5400183',
  'ECMU5397691',
  'ECMU5399586',
  'ECMU5399797',
  'ECMU5381817'
)
ORDER BY c.container_number;

-- 3. 检查哪些货柜已经提柜（不应该参与排产）
SELECT 
  c.container_number,
  c.schedule_status,
  c.logistics_status,
  pt.actual_pickup_date,
  pt.actual_delivery_date,
  CASE 
    WHEN pt.actual_pickup_date IS NOT NULL THEN '已提柜 - 不应排产'
    WHEN c.schedule_status IN ('initial', 'issued') AND po.ata IS NOT NULL THEN '已到港未提柜 - 应排产'
    WHEN c.schedule_status IN ('initial', 'issued') AND po.eta IS NOT NULL THEN '未到港 - 应排产'
    ELSE '其他状态'
  END as should_schedule
FROM biz_containers c
LEFT JOIN process_port_operations po ON c.container_number = po.container_number 
  AND po.port_type = 'destination'
LEFT JOIN process_trucking_transports pt ON c.container_number = pt.container_number
WHERE c.container_number IN (
  'ECMU5400183',
  'ECMU5397691',
  'ECMU5399586',
  'ECMU5399797',
  'ECMU5381817'
)
ORDER BY should_schedule, c.container_number;

-- 4. 检查所有 GB 国家待排产货柜的状态分布
SELECT 
  c.schedule_status,
  c.logistics_status,
  COUNT(*) as count,
  STRING_AGG(c.container_number, ', ' ORDER BY c.container_number) as container_numbers
FROM biz_containers c
JOIN biz_replenishment_orders ro ON c.order_number = ro.order_number
JOIN biz_customers cu ON ro.customer_code = cu.customer_code
LEFT JOIN process_trucking_transports pt ON c.container_number = pt.container_number
WHERE cu.country = 'GB'
AND c.schedule_status IN ('initial', 'issued')
GROUP BY c.schedule_status, c.logistics_status
ORDER BY c.schedule_status, count DESC;
