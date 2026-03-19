-- 新增状态事件表的terminal_name字段
-- 用于存储状态信息中的码头名称
ALTER TABLE ext_container_status_events 
ADD COLUMN IF NOT EXISTS terminal_name VARCHAR(100);
