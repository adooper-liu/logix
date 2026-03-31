-- 验证 GAOU6195045 的 gate_out_time 是否是 STSP 更新的
SELECT 
  '=== 1. 检查两个货柜的 process_port_operations 更新时间线 ===' AS section;

SELECT 
  container_number,
  port_type,
  port_sequence,
  gate_out_time,
  gate_in_time,
  ata,
  data_source,
  created_at,
  updated_at,
  EXTRACT(EPOCH FROM (updated_at - created_at)) as seconds_after_create
FROM process_port_operations 
WHERE container_number IN ('GAOU6195045', 'HMMU6232153')
ORDER BY container_number, port_sequence;

SELECT 
  '=== 2. 检查 STSP 事件与 gate_out_time 的关系 ===' AS section;

-- GAOU6195045 的 STSP 时间 vs gate_out_time
SELECT 
  'GAOU6195045' as container,
  e.status_code,
  e.occurred_at as stsp_time,
  p.gate_out_time,
  p.data_source,
  p.updated_at,
  EXTRACT(EPOCH FROM (p.updated_at - e.occurred_at))/3600 as hours_diff
FROM ext_container_status_events e
JOIN process_port_operations p ON e.container_number = p.container_number
WHERE e.container_number = 'GAOU6195045'
  AND e.status_code = 'STSP'
  AND p.port_type = 'origin';

SELECT 
  '=== 3. 对比两个货柜的所有可能更新 gate_out_time 的事件 ===' AS section;

-- 列出所有能更新 gate_out_time 的事件
SELECT 
  container_number,
  status_code,
  occurred_at,
  CASE 
    WHEN status_code = 'STSP' THEN 'Pick-up Empty (提空箱)'
    WHEN status_code = 'STCS' THEN 'Gate Out for Delivery (提重箱)'
    WHEN status_code = 'GTOT' THEN 'Gate Out (出闸)'
    WHEN status_code = 'GATE_OUT' THEN 'Gate Out (出闸别名)'
  END as description
FROM ext_container_status_events 
WHERE container_number IN ('GAOU6195045', 'HMMU6232153')
  AND status_code IN ('STCS', 'GTOT', 'GATE_OUT', 'STSP')
ORDER BY container_number, occurred_at;
