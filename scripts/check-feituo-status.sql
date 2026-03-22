-- 查询 ext_feituo_status_events 表
SELECT
    container_number,
    bill_of_lading_number,
    event_code,
    event_time,
    description_cn,
    event_place,
    is_estimated,
    port_code,
    terminal_name,
    data_source,
    created_at
FROM ext_feituo_status_events
ORDER BY container_number, event_time
LIMIT 20;
