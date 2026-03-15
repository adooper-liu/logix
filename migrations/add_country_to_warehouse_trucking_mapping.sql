-- 迁移脚本: 为仓库-车队映射表添加国家字段
-- 创建时间: 2026-03-14

-- 检查表是否存在，不存在则创建
CREATE TABLE IF NOT EXISTS dict_warehouse_trucking_mapping (
    id SERIAL PRIMARY KEY,
    country VARCHAR(50) NOT NULL DEFAULT 'AOSOM',
    warehouse_code VARCHAR(50) NOT NULL,
    warehouse_name VARCHAR(100),
    trucking_company_id VARCHAR(50) NOT NULL,
    trucking_company_name VARCHAR(100),
    mapping_type VARCHAR(20) DEFAULT 'DEFAULT',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 添加国家索引
CREATE INDEX IF NOT EXISTS idx_warehouse_trucking_country 
ON dict_warehouse_trucking_mapping(country);

-- 如果 warehouse_code 索引不存在则创建
CREATE INDEX IF NOT EXISTS idx_warehouse_trucking_warehouse 
ON dict_warehouse_trucking_mapping(warehouse_code);

-- 如果 trucking_company_id 索引不存在则创建
CREATE INDEX IF NOT EXISTS idx_warehouse_trucking_company 
ON dict_warehouse_trucking_mapping(trucking_company_id);

COMMENT ON TABLE dict_warehouse_trucking_mapping IS '仓库-车队映射表，用于甘特图分组显示';
