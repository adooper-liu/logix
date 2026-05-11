-- ============================================================
-- LogiX 全球快递费规则表结构创建脚本
-- Global Express Cost Rules Schema Creation Script
-- ============================================================
-- 说明: 此脚本创建快递费规则相关的字典表和 SKU 物流主数据表
-- Usage: Create tables for express cost rules and SKU logistics attributes
-- ============================================================

-- ============================================================
-- 1. 快递费规则版本表 (dict_express_surcharge_version)
-- ============================================================
CREATE TABLE IF NOT EXISTS dict_express_surcharge_version (
    id SERIAL PRIMARY KEY,
    version_key VARCHAR(50) NOT NULL UNIQUE,
    source_file_name VARCHAR(200),
    effective_from DATE,
    imported_by VARCHAR(50) DEFAULT 'system',
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_version_key ON dict_express_surcharge_version(version_key);
CREATE INDEX idx_version_effective ON dict_express_surcharge_version(effective_from);

COMMENT ON TABLE dict_express_surcharge_version IS '快递费规则版本管理表';
COMMENT ON COLUMN dict_express_surcharge_version.version_key IS '版本标识，如 20260214';
COMMENT ON COLUMN dict_express_surcharge_version.effective_from IS '规则生效日期';

-- ============================================================
-- 2. 承运商服务表 (dict_express_carrier_service)
-- ============================================================
CREATE TABLE IF NOT EXISTS dict_express_carrier_service (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(50) NOT NULL,
    service_name VARCHAR(200) NOT NULL,
    default_length_unit VARCHAR(10) DEFAULT 'in',
    default_weight_unit VARCHAR(10) DEFAULT 'lb',
    external_code VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(country_code, service_name)
);

CREATE INDEX idx_carrier_country ON dict_express_carrier_service(country_code);
CREATE INDEX idx_carrier_service_name ON dict_express_carrier_service(service_name);

COMMENT ON TABLE dict_express_carrier_service IS '快递承运商服务字典表';
COMMENT ON COLUMN dict_express_carrier_service.country_code IS '国家代码，关联 dict_countries.code';
COMMENT ON COLUMN dict_express_carrier_service.service_name IS '承运商+服务名称，如 FedEx Ground';
COMMENT ON COLUMN dict_express_carrier_service.external_code IS '外部系统编码，用于 OMS 映射';

-- ============================================================
-- 3. 附加费规则主表 (dict_express_surcharge_rule)
-- ============================================================
CREATE TABLE IF NOT EXISTS dict_express_surcharge_rule (
    id SERIAL PRIMARY KEY,
    version_id INT NOT NULL REFERENCES dict_express_surcharge_version(id) ON DELETE CASCADE,
    carrier_service_id INT NOT NULL REFERENCES dict_express_carrier_service(id) ON DELETE CASCADE,
    source_line_number INT,
    
    -- 类型字段
    type_raw TEXT,
    type_normalized VARCHAR(50),
    
    -- 尺寸阈值（英制，单位：英寸）
    longest_in DECIMAL(8,2),
    second_in DECIMAL(8,2),
    shortest_in DECIMAL(8,2),
    girth_in DECIMAL(8,2),
    l_plus_s_in DECIMAL(8,2),
    three_sides_sum_in DECIMAL(8,2),
    diagonal_in DECIMAL(8,2),
    vol_m3_threshold DECIMAL(10,6),
    
    -- 重量阈值
    gross_wt_value DECIMAL(10,2),
    rate_wt_single DECIMAL(10,2),
    rate_wt_multi DECIMAL(10,2),
    min_billable_lbs DECIMAL(10,2),
    weight_input_unit VARCHAR(10) DEFAULT 'lb',
    dim_unit VARCHAR(10) DEFAULT 'in',
    
    -- 文本比较符（处理 >120, <175 等非纯数字阈值）
    condition_literal TEXT,
    
    -- 金额
    amount_fixed DECIMAL(10,2),
    amount_min DECIMAL(10,2),
    amount_max DECIMAL(10,2),
    min_base_price DECIMAL(10,2),
    currency VARCHAR(10) DEFAULT 'USD',
    charge_basis VARCHAR(20),
    
    -- 复杂条件（JSONB，支持 AND/OR 嵌套）
    conditions_json JSONB,
    
    -- 数据质量标记
    ingest_completeness VARCHAR(20) DEFAULT 'FULL' CHECK (ingest_completeness IN ('FULL', 'INCOMPLETE')),
    
    -- 备注
    notes TEXT,
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 性能优化索引（国别不冗余在规则表，按国别查询时 join dict_express_carrier_service 再带 country_code 条件即可）
CREATE INDEX idx_rule_lookup ON dict_express_surcharge_rule 
    (version_id, carrier_service_id, type_normalized);
CREATE INDEX idx_rule_version_country ON dict_express_surcharge_rule 
    (version_id, type_normalized);
CREATE INDEX idx_rule_ingest ON dict_express_surcharge_rule(ingest_completeness);

-- GIN 索引加速 JSONB 查询
CREATE INDEX idx_rule_conditions_gin ON dict_express_surcharge_rule 
    USING GIN (conditions_json);

COMMENT ON TABLE dict_express_surcharge_rule IS '快递附加费规则主表';
COMMENT ON COLUMN dict_express_surcharge_rule.type_normalized IS '规范化类型：REJECT/AHS_DIM/AHS_WEIGHT/OVERSIZE/UNAUTH_OS/PACKAGING 等';
COMMENT ON COLUMN dict_express_surcharge_rule.conditions_json IS '复杂条件树，如 Seller Flex 三条件 AND';
COMMENT ON COLUMN dict_express_surcharge_rule.ingest_completeness IS '数据完整性：FULL=完整, INCOMPLETE=待补全（如 FR/IT × 金额）';

-- ============================================================
-- 4. 互斥策略表 (dict_express_stack_policy)
-- ============================================================
CREATE TABLE IF NOT EXISTS dict_express_stack_policy (
    id SERIAL PRIMARY KEY,
    version_id INT NOT NULL REFERENCES dict_express_surcharge_version(id) ON DELETE CASCADE,
    country_code VARCHAR(50) NOT NULL,
    carrier_service_id INT NOT NULL REFERENCES dict_express_carrier_service(id) ON DELETE CASCADE,
    
    -- 策略类型
    policy_type VARCHAR(50) NOT NULL,
    
    -- 策略配置（JSONB）
    policy_json JSONB NOT NULL,
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(version_id, country_code, carrier_service_id, policy_type)
);

CREATE INDEX idx_policy_version ON dict_express_stack_policy(version_id);
CREATE INDEX idx_policy_country_carrier ON dict_express_stack_policy(country_code, carrier_service_id);

-- GIN 索引加速 JSONB 查询
CREATE INDEX idx_policy_json_gin ON dict_express_stack_policy USING GIN (policy_json);

COMMENT ON TABLE dict_express_stack_policy IS '快递费互斥策略表';
COMMENT ON COLUMN dict_express_stack_policy.policy_type IS '策略类型：IF_THEN_DISABLE/MAX_GROUP';
COMMENT ON COLUMN dict_express_stack_policy.policy_json IS '策略配置，如 {"if_triggered": ["OVERSIZE"], "disable": ["AHS_DIM"]}';

-- ============================================================
-- 5. SKU 物流属性主数据表 (ext_sku_logistics_attributes)
-- ============================================================
CREATE TABLE IF NOT EXISTS ext_sku_logistics_attributes (
    sku_code VARCHAR(50) PRIMARY KEY,
    sku_name VARCHAR(200),
    
    -- 尺寸信息（统一使用 cm/kg）
    length_cm DECIMAL(8,2),
    width_cm DECIMAL(8,2),
    height_cm DECIMAL(8,2),
    gross_weight_kg DECIMAL(8,2),
    net_weight_kg DECIMAL(8,2),
    volume_m3 DECIMAL(10,6),
    
    -- 包装属性
    packaging_type VARCHAR(50),
    is_fragile BOOLEAN DEFAULT false,
    is_assembly_required BOOLEAN DEFAULT false,
    
    -- 物流分类标签（用于快速筛选）
    category_tags JSONB,
    
    -- 元数据
    source_system VARCHAR(50) DEFAULT 'MANUAL',
    last_verified_at TIMESTAMP,
    
    -- 审计字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sku_packaging ON ext_sku_logistics_attributes(packaging_type);
CREATE INDEX idx_sku_category_gin ON ext_sku_logistics_attributes USING GIN (category_tags);

COMMENT ON TABLE ext_sku_logistics_attributes IS 'SKU 物流属性主数据表';
COMMENT ON COLUMN ext_sku_logistics_attributes.packaging_type IS '包装类型：CARTON=瓦楞纸箱, CYLINDER=圆柱形, SOFT_PACK=软包, NON_CORRUGATED=非瓦楞';
COMMENT ON COLUMN ext_sku_logistics_attributes.category_tags IS '物流分类标签，如 ["oversize_risk", "heavy_item", "fragile"]';

-- ============================================================
-- 6. 数据迁移：从 biz_container_skus 初始化 SKU 主数据（可选）
-- ============================================================
-- 取消注释以下语句以从现有货柜-SKU 关联表提取唯一 SKU 并初始化主数据
/*
INSERT INTO ext_sku_logistics_attributes (sku_code, sku_name, gross_weight_kg, volume_m3, source_system)
SELECT DISTINCT ON (sku_code) 
    sku_code, 
    sku_name, 
    gross_weight_per_unit / 2.20462 AS gross_weight_kg,  -- lb → kg
    cbm_per_unit,
    'MIGRATED_FROM_CONTAINER_SKUS'
FROM biz_container_skus
WHERE sku_code IS NOT NULL
  AND sku_code NOT IN (SELECT sku_code FROM ext_sku_logistics_attributes)
ON CONFLICT (sku_code) DO NOTHING;
*/

-- ============================================================
-- 完成
-- ============================================================
