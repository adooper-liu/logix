-- ============================================================
-- 飞驼 Excel 导入表
-- Feituo Excel Import Tables
-- ============================================================
-- 表一：船公司/订阅维度（MBL + 集装箱号）
-- 表二：码头/港区维度（提单号 + 集装箱号 + 港口 + 码头）
-- ============================================================

-- 导入批次表
CREATE TABLE IF NOT EXISTS ext_feituo_import_batch (
    id SERIAL PRIMARY KEY,
    table_type SMALLINT NOT NULL,  -- 1=表一, 2=表二
    file_name VARCHAR(255),
    total_rows INT DEFAULT 0,
    success_count INT DEFAULT 0,
    error_count INT DEFAULT 0,
    error_details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 表一原始数据（船公司订阅维度）
CREATE TABLE IF NOT EXISTS ext_feituo_import_table1 (
    id SERIAL PRIMARY KEY,
    batch_id INT REFERENCES ext_feituo_import_batch(id) ON DELETE CASCADE,
    mbl_number VARCHAR(50),
    container_number VARCHAR(50) NOT NULL,
    raw_data JSONB,
    raw_data_by_group JSONB,  -- 按分组存储，避免同名字段错位，key 为 1-15
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feituo_t1_batch ON ext_feituo_import_table1(batch_id);
CREATE INDEX idx_feituo_t1_container ON ext_feituo_import_table1(container_number);
CREATE INDEX idx_feituo_t1_mbl ON ext_feituo_import_table1(mbl_number);

-- 表二原始数据（码头/港区维度）
CREATE TABLE IF NOT EXISTS ext_feituo_import_table2 (
    id SERIAL PRIMARY KEY,
    batch_id INT REFERENCES ext_feituo_import_batch(id) ON DELETE CASCADE,
    bill_number VARCHAR(50),
    container_number VARCHAR(50) NOT NULL,
    port_code VARCHAR(50),
    terminal_code VARCHAR(50),
    raw_data JSONB,
    raw_data_by_group JSONB,  -- 按分组存储，避免同名字段错位，key 为 1-17
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_feituo_t2_batch ON ext_feituo_import_table2(batch_id);
CREATE INDEX idx_feituo_t2_container ON ext_feituo_import_table2(container_number);
CREATE INDEX idx_feituo_t2_port ON ext_feituo_import_table2(port_code);
