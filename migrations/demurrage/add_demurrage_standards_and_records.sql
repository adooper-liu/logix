-- ============================================================
-- 迁移：在已有库中新增滞港费标准表与滞港费记录表
-- 来源：03_create_tables.sql 第 23、24 张扩展表（与主表结构完全一致）
-- 用法（任选其一）：
--   1. psql -h <host> -U <user> -d <database> -f backend/migrations/add_demurrage_standards_and_records.sql
--   2. 在 DBeaver / pgAdmin 等客户端中打开本文件并执行
--   3. 在项目根目录：psql $DATABASE_URL -f backend/migrations/add_demurrage_standards_and_records.sql
-- 说明：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，重复执行不会报错；需已存在 biz_containers 表。
--
-- 与文档对齐校验（DEMURRAGE_DATABASE_STATUS.md / CONTAINER_SCHEDULING / DEMURRAGE_LOGIC）：
--   ext_demurrage_standards：四字段匹配（进口国→foreign_company_*，目的港→destination_port_*，船公司→shipping_company_*，货代→origin_forwarder_*），
--     免费天数 free_days、免费天数基准 free_days_basis、计算方式 calculation_basis（按到港/按卸船）、rate_per_day、tiers(JSONB)、currency，索引同上。
--   ext_demurrage_records：按柜计算结果字段齐全，外键 biz_containers(container_number) ON DELETE CASCADE。
-- ============================================================

-- 23. 滞港费标准表 (ext_demurrage_standards)
CREATE TABLE IF NOT EXISTS ext_demurrage_standards (
    id SERIAL PRIMARY KEY,
    foreign_company_code VARCHAR(50),
    foreign_company_name VARCHAR(100),
    effective_date DATE,
    expiry_date DATE,
    destination_port_code VARCHAR(50),
    destination_port_name VARCHAR(100),
    shipping_company_code VARCHAR(50),
    shipping_company_name VARCHAR(100),
    terminal VARCHAR(100),
    origin_forwarder_code VARCHAR(50),
    origin_forwarder_name VARCHAR(100),
    transport_mode_code VARCHAR(20),
    transport_mode_name VARCHAR(50),
    charge_type_code VARCHAR(50),
    charge_name VARCHAR(100),
    is_chargeable VARCHAR(1) DEFAULT 'N',
    sequence_number INT,
    port_condition VARCHAR(20),
    free_days_basis VARCHAR(20),
    free_days INT,
    calculation_basis VARCHAR(20),
    rate_per_day DECIMAL(12,2),
    tiers JSONB,
    currency VARCHAR(10) DEFAULT 'USD',
    process_status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_demurrage_std_port ON ext_demurrage_standards(destination_port_code);
CREATE INDEX IF NOT EXISTS idx_demurrage_std_company ON ext_demurrage_standards(shipping_company_code);
CREATE INDEX IF NOT EXISTS idx_demurrage_std_effective ON ext_demurrage_standards(effective_date, expiry_date);

-- 24. 滞港费记录表 (ext_demurrage_records)
CREATE TABLE IF NOT EXISTS ext_demurrage_records (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(50) NOT NULL,
    charge_type VARCHAR(50),
    charge_name VARCHAR(100),
    free_days INT,
    free_days_basis VARCHAR(20),
    calculation_basis VARCHAR(20),
    charge_start_date DATE,
    charge_end_date DATE,
    charge_days INT,
    charge_amount DECIMAL(12,2),
    currency VARCHAR(10) DEFAULT 'USD',
    charge_status VARCHAR(20),
    invoice_number VARCHAR(50),
    invoice_date DATE,
    payment_date DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (container_number) REFERENCES biz_containers(container_number) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_demurrage_rec_container ON ext_demurrage_records(container_number);
CREATE INDEX IF NOT EXISTS idx_demurrage_rec_status ON ext_demurrage_records(charge_status);
