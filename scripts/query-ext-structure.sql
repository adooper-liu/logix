-- 查询 ext_feituo_status_events 表结构
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'ext_feituo_status_events'
ORDER BY ordinal_position;
