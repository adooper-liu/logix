-- =====================================================
-- 甘特图反向链式依赖数据迁移脚本
-- 版本: gantt-v3
-- 日期: 2026-04-04
-- 作者: 刘志高
-- 说明: 批量更新所有货柜的 gantt_derived 字段，应用反向链式依赖逻辑
-- =====================================================

-- 步骤1: 查看需要更新的货柜数量
SELECT 
  COUNT(*) as total_containers,
  COUNT(CASE WHEN tt.delivery_date IS NOT NULL THEN 1 END) as has_delivery_date,
  COUNT(CASE WHEN wo.unload_date IS NOT NULL THEN 1 END) as has_unload_date,
  COUNT(CASE WHEN er.return_time IS NOT NULL THEN 1 END) as has_return_time
FROM biz_containers c
LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
LEFT JOIN process_empty_return er ON c.container_number = er.container_number;

-- 步骤2: 更新已提柜货柜的清关节点（taskRole 从 'dashed' 改为 'none'）
-- 注意：这个 SQL 只是示例，实际需要使用后端服务重新计算 gantt_derived
-- 因为 gantt_derived 是 JSONB 类型，包含复杂的嵌套结构

-- 推荐做法：使用后端服务批量更新
-- 1. 查询所有需要更新的货柜
-- 2. 调用后端的 buildGanttDerived 函数重新计算
-- 3. 更新到数据库

-- 临时方案：标记需要重新计算的货柜
UPDATE biz_containers
SET updated_at = NOW()
WHERE container_number IN (
  SELECT DISTINCT c.container_number
  FROM biz_containers c
  LEFT JOIN process_trucking_transport tt ON c.container_number = tt.container_number
  LEFT JOIN process_warehouse_operations wo ON c.container_number = wo.container_number
  LEFT JOIN process_empty_return er ON c.container_number = er.container_number
  WHERE tt.delivery_date IS NOT NULL  -- 已提柜
     OR wo.unload_date IS NOT NULL    -- 已卸柜
     OR er.return_time IS NOT NULL    -- 已还箱
);

-- 步骤3: 验证更新结果
SELECT 
  c.container_number,
  c.logistics_status,
  c.gantt_derived->>'phase' as phase,
  c.gantt_derived->>'ruleVersion' as rule_version,
  jsonb_array_length(c.gantt_derived->'nodes') as node_count
FROM biz_containers c
WHERE c.container_number IN ('HMMU6855127', 'GAOU6195045', 'KOCU5129260', 'HMMU6232153', 'HMMU6019657')
ORDER BY c.container_number;

-- 步骤4: 检查清关节点的 taskRole
SELECT 
  c.container_number,
  n->>'key' as node_key,
  n->>'taskRole' as task_role,
  n->>'completed' as completed
FROM biz_containers c,
     jsonb_array_elements(c.gantt_derived->'nodes') as n
WHERE c.container_number IN ('HMMU6855127', 'GAOU6195045', 'KOCU5129260')
  AND n->>'key' = 'customs'
ORDER BY c.container_number;

-- 预期结果：
-- HMMU6855127, GAOU6195045, KOCU5129260（已提柜）的清关节点 taskRole 应该是 'none'
-- HMMU6232153, HMMU6019657（未提柜）的清关节点 taskRole 应该是 'dashed' 或 'main'
