-- 迁移脚本: 添加车队-港口映射表
-- 创建时间: 2026-03-14

-- 25. 车队-港口映射表
CREATE TABLE IF NOT EXISTS dict_trucking_port_mapping (
    id SERIAL PRIMARY KEY,
    country VARCHAR(50) NOT NULL,
    trucking_company_id VARCHAR(50) NOT NULL,
    trucking_company_name VARCHAR(200),
    port_code VARCHAR(50) NOT NULL,
    port_name VARCHAR(100),
    yard_capacity DECIMAL(10,2) DEFAULT 0,
    standard_rate DECIMAL(10,2) DEFAULT 0,
    unit VARCHAR(20),
    yard_operation_fee DECIMAL(10,2) DEFAULT 0,
    mapping_type VARCHAR(20) DEFAULT 'DEFAULT',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trucking_port_country ON dict_trucking_port_mapping(country);
CREATE INDEX idx_trucking_port_company ON dict_trucking_port_mapping(trucking_company_id);
CREATE INDEX idx_trucking_port_port ON dict_trucking_port_mapping(port_code);
CREATE INDEX idx_trucking_port_active ON dict_trucking_port_mapping(is_active);

COMMENT ON TABLE dict_trucking_port_mapping IS '车队-港口映射表，包含费用信息，用于甘特图分组显示';
