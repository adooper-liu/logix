-- 添加LFD来源标记字段，区分自动计算和手工维护
-- computed: 自动计算（默认值）
-- manual: 手工维护（不会被自动计算覆盖）

ALTER TABLE process_port_operations ADD COLUMN IF NOT EXISTS last_free_date_source VARCHAR(20) DEFAULT 'computed';

-- 检查约束使用ALTER TABLE ... CHECK (PostgreSQL不支持ADD CONSTRAINT IF NOT EXISTS)
-- 先删除旧约束（如果存在），再添加新约束
ALTER TABLE process_port_operations DROP CONSTRAINT IF EXISTS chk_last_free_date_source;
ALTER TABLE process_port_operations ADD CONSTRAINT chk_last_free_date_source 
  CHECK (last_free_date_source IN ('computed', 'manual'));

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_port_ops_lfd_source ON process_port_operations(last_free_date_source);
