-- 添加 schedule_status 字段到货柜表
-- 用于支持排产状态：initial(待排产) / issued(已排产) / adjusted(手工调整)

ALTER TABLE biz_containers ADD COLUMN IF NOT EXISTS schedule_status VARCHAR(20) DEFAULT 'initial';
CREATE INDEX IF NOT EXISTS idx_containers_schedule_status ON biz_containers(schedule_status);
