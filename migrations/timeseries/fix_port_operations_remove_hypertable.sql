-- ============================================================
-- 修复 process_port_operations 表的 ata 字段 NOT NULL 约束
-- 
-- 方案：删除 hypertable，使用普通表（移除 ata 的 NOT NULL 约束）
-- 原因：ata 在导入时可能为空，不适合作为 hypertable 分区键
-- ============================================================

BEGIN;

-- 1. 备份数据
CREATE TABLE process_port_operations_temp AS 
SELECT * FROM process_port_operations;

-- 2. 删除外键约束（如果存在）
ALTER TABLE IF EXISTS process_port_operations 
DROP CONSTRAINT IF EXISTS fk_container;

-- 3. 重命名旧表
ALTER TABLE process_port_operations RENAME TO process_port_operations_old;

-- 4. 重新创建表（普通表，没有 hypertable）
CREATE TABLE process_port_operations (
    id VARCHAR(50) PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    port_type VARCHAR(20) NOT NULL,
    port_code VARCHAR(50),
    port_name VARCHAR(100),
    port_sequence INTEGER DEFAULT 1,
    
    -- 时间字段（全部允许 NULL）
    eta TIMESTAMPTZ,
    ata TIMESTAMPTZ,              -- 改为允许 NULL
    revised_eta TIMESTAMPTZ,
    eta_correction TIMESTAMPTZ,
    discharged_time TIMESTAMPTZ,
    dest_port_unload_date TIMESTAMPTZ,
    etd TIMESTAMPTZ,
    atd TIMESTAMPTZ,
    transit_arrival_date TIMESTAMPTZ,
    gate_in_time TIMESTAMPTZ,
    gate_out_time TIMESTAMPTZ,
    available_time TIMESTAMPTZ,
    
    -- 清关相关
    customs_status VARCHAR(50),
    isf_status VARCHAR(50),
    last_free_date TIMESTAMPTZ,
    last_free_date_mode VARCHAR(20),
    last_free_date_source VARCHAR(20),
    
    -- 码头相关
    gate_in_terminal VARCHAR(100),
    gate_out_terminal VARCHAR(100),
    berth_position VARCHAR(50),
    
    -- 清关日期
    planned_customs_date TIMESTAMPTZ,
    actual_customs_date TIMESTAMPTZ,
    customs_broker_code VARCHAR(50),
    
    -- 文档状态
    document_status VARCHAR(50),
    all_generated_date TIMESTAMPTZ,
    customs_remarks TEXT,
    
    -- ISF 相关
    isf_declaration_date TIMESTAMPTZ,
    document_transfer_date TIMESTAMPTZ,
    manifest_release_date TIMESTAMPTZ,
    document_cutoff_date TIMESTAMPTZ,
    customs_cutoff_date TIMESTAMPTZ,
    customs_hold_date TIMESTAMPTZ,
    carrier_hold_date TIMESTAMPTZ,
    terminal_hold_date TIMESTAMPTZ,
    customs_release_date TIMESTAMPTZ,
    terminal_release_date TIMESTAMPTZ,
    
    -- 港口操作
    port_open_date TIMESTAMPTZ,
    port_close_date TIMESTAMPTZ,
    
    -- 铁路相关
    train_arrival_date TIMESTAMPTZ,
    train_discharge_date TIMESTAMPTZ,
    train_departure_time TIMESTAMPTZ,
    rail_last_free_date TIMESTAMPTZ,
    last_free_date_invalid BOOLEAN DEFAULT FALSE,
    last_free_date_remark TEXT,
    
    -- 免费期
    free_storage_days INTEGER,
    free_detention_days INTEGER,
    free_off_terminal_days INTEGER,
    
    -- 状态事件
    status_code VARCHAR(50),
    status_occurred_at TIMESTAMPTZ,
    has_occurred BOOLEAN DEFAULT FALSE,
    
    -- 位置信息
    location_name_en VARCHAR(100),
    location_name_cn VARCHAR(100),
    location_type VARCHAR(50),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    timezone VARCHAR(50),
    
    -- 数据来源
    data_source VARCHAR(50),
    cargo_location VARCHAR(200),
    
    -- 其他
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键
    CONSTRAINT fk_container FOREIGN KEY (container_number) 
        REFERENCES biz_containers(container_number) ON DELETE CASCADE
);

-- 5. 创建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_port_ops_container ON process_port_operations(container_number);
CREATE INDEX IF NOT EXISTS idx_port_ops_type ON process_port_operations(port_type);
CREATE INDEX IF NOT EXISTS idx_port_ops_ata ON process_port_operations(ata) WHERE ata IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_port_ops_eta ON process_port_operations(eta) WHERE eta IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_port_ops_rail_lfd ON process_port_operations(rail_last_free_date) WHERE rail_last_free_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_port_ops_train_arrival ON process_port_operations(train_arrival_date) WHERE train_arrival_date IS NOT NULL;

-- 6. 迁移数据
INSERT INTO process_port_operations 
SELECT * FROM process_port_operations_temp;

-- 7. 删除临时表和旧表
DROP TABLE process_port_operations_temp;
DROP TABLE IF EXISTS process_port_operations_old;

COMMIT;

-- 验证
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'process_port_operations' AND column_name = 'ata';
