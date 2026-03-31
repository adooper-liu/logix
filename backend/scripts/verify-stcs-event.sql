-- ============================================================
-- 验证 HMMU6232153 的 STCS 事件数据
-- ============================================================

SELECT 
  '=== 1. ext_container_status_events 中的 STCS 事件详情 ===' AS section;

SELECT 
  id,
  container_number,
  status_code,
  status_name,
  occurred_at,
  location,
  terminal_name,
  data_source,
  raw_data->>'isEstimated' as is_estimated,
  raw_data->>'group' as event_group,
  created_at
FROM ext_container_status_events 
WHERE container_number = 'HMMU6232153' 
  AND status_code = 'STCS';

SELECT 
  '=== 2. ext_feituo_status_events 中的 STCS 事件详情 ===' AS section;

SELECT 
  id,
  container_number,
  event_code,
  event_time,
  port_type,
  is_estimated,
  data_source,
  created_at
FROM ext_feituo_status_events 
WHERE container_number = 'HMMU6232153' 
  AND event_code = 'STCS';

SELECT 
  '=== 3. process_port_operations 完整记录 ===' AS section;

SELECT 
  id,
  container_number,
  port_type,
  port_sequence,
  gate_out_time,
  gate_in_time,
  ata,
  available_time,
  dest_port_unload_date,
  data_source,
  created_at,
  updated_at
FROM process_port_operations 
WHERE container_number = 'HMMU6232153'
ORDER BY port_sequence;

SELECT 
  '=== 4. process_trucking_transport 完整记录 ===' AS section;

SELECT 
  container_number,
  pickup_date,
  pickup_date_source,
  planned_pickup_date,
  delivery_date,
  trucking_company_id,
  created_at,
  updated_at
FROM process_trucking_transport 
WHERE container_number = 'HMMU6232153';

SELECT 
  '=== 5. 所有状态事件的 isEstimated 分布 ===' AS section;

SELECT 
  status_code,
  raw_data->>'isEstimated' as is_estimated,
  COUNT(*) as count,
  MIN(occurred_at) as first_occurrence,
  MAX(occurred_at) as last_occurrence
FROM ext_container_status_events 
WHERE container_number = 'HMMU6232153'
GROUP BY status_code, raw_data->>'isEstimated'
ORDER BY status_code, is_estimated;
