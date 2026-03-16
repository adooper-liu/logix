-- ============================================================
-- 数据变更日志表
-- Data Change Log / Audit Log
-- ============================================================
-- 记录 Excel 导入、飞驼 API、手工维护、状态更新等数据变动
-- ============================================================

CREATE TABLE IF NOT EXISTS sys_data_change_log (
    id BIGSERIAL PRIMARY KEY,
    source_type VARCHAR(32) NOT NULL,   -- 'excel_import' | 'feituo_api' | 'feituo_excel' | 'manual' | 'status_update'
    entity_type VARCHAR(64) NOT NULL,   -- 'biz_containers' | 'process_port_operations' | ...
    entity_id VARCHAR(128),             -- 主键或业务键，如 container_number
    action VARCHAR(16) NOT NULL,        -- 'INSERT' | 'UPDATE' | 'DELETE'
    changed_fields JSONB,               -- 变更字段及新旧值，如 {"ata_dest_port": {"old": null, "new": "2025-03-10"}}
    batch_id VARCHAR(64),                -- 批次号（导入/批量操作时）
    operator_id VARCHAR(64),             -- 操作人（可选）
    operator_ip VARCHAR(64),             -- 请求 IP（可选）
    remark TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_change_log_source ON sys_data_change_log(source_type);
CREATE INDEX IF NOT EXISTS idx_change_log_entity ON sys_data_change_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_change_log_created ON sys_data_change_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_change_log_container ON sys_data_change_log(entity_id) WHERE entity_id IS NOT NULL;

COMMENT ON TABLE sys_data_change_log IS '数据变更审计日志';
COMMENT ON COLUMN sys_data_change_log.source_type IS '数据来源: excel_import, feituo_api, feituo_excel, manual, status_update';
COMMENT ON COLUMN sys_data_change_log.entity_type IS '实体表名';
COMMENT ON COLUMN sys_data_change_log.entity_id IS '业务主键，如 container_number';
COMMENT ON COLUMN sys_data_change_log.changed_fields IS '变更字段 JSONB，格式 {"field": {"old": v1, "new": v2}}';
