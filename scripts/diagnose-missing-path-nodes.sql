-- 诊断脚本：检查飞驼数据是否正确同步到 ext_container_status_events
-- 用于排查物流路径节点缺失问题

-- 1. 查询 ext_feituo_status_events 表（飞驼原始数据）
SELECT 
    id,
    container_number,
    event_code,
    description_cn,
    event_time,
    is_estimated
FROM ext_feituo_status_events
WHERE container_number = 'HMMU6232153'
ORDER BY event_time;

-- 2. 查询 ext_container_status_events 表（核心状态事件表）
SELECT 
    id,
    container_number,
    status_code,
    status_name,
    occurred_at,
    data_source,
    raw_data
FROM ext_container_status_events
WHERE container_number = 'HMMU6232153'
ORDER BY occurred_at;

-- 3. 对比两个表的差异
SELECT 
    'feituo' as source,
    event_code as code,
    description_cn as name,
    event_time as occurred_at,
    is_estimated
FROM ext_feituo_status_events
WHERE container_number = 'HMMU6232153'

UNION ALL

SELECT 
    'core' as source,
    status_code as code,
    status_name as name,
    occurred_at,
    NULL as is_estimated
FROM ext_container_status_events
WHERE container_number = 'HMMU6232153'

ORDER BY occurred_at, source;

-- 4. 检查 process_empty_return 表（还箱流程表）
SELECT 
    container_number,
    return_time,
    last_return_date,
    planned_return_date
FROM process_empty_return
WHERE container_number = 'HMMU6232153';

-- 5. 检查 process_trucking_transport 表（提柜流程表）
SELECT 
    container_number,
    pickup_date,
    gate_out_time
FROM process_trucking_transport
WHERE container_number = 'HMMU6232153';

-- 6. 检查 process_port_operations 表（港口操作表）
SELECT 
    container_number,
    port_type,
    ata,
    dest_port_unload_date,
    available_time,
    gate_out_time,
    last_free_date
FROM process_port_operations
WHERE container_number = 'HMMU6232153'
ORDER BY port_sequence;
