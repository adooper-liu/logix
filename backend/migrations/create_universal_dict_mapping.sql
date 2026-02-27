-- ============================================================
-- 通用字典映射表
-- Description: 通用字典映射框架,支持任何类型的名称到代码的映射
--              包括港口、国家、客户、船公司、仓库等所有字典表
-- ============================================================

CREATE TABLE IF NOT EXISTS dict_universal_mapping (
    id SERIAL PRIMARY KEY,

    -- 字典类型和目标表
    dict_type VARCHAR(50) NOT NULL,              -- 字典类型: PORT, COUNTRY, SHIPPING_COMPANY, CUSTOMER, WAREHOUSE, etc.
    target_table VARCHAR(50) NOT NULL,           -- 目标表名: dict_ports, dict_countries, etc.
    target_field VARCHAR(50) NOT NULL,           -- 目标字段名: port_code, country_code, etc.

    -- 标准化代码
    standard_code VARCHAR(50) NOT NULL,         -- 标准代码 (主键的值)
    standard_name VARCHAR(100),                  -- 标准名称

    -- 多语言别名支持
    name_cn VARCHAR(200) NOT NULL,               -- 中文名称
    name_en VARCHAR(200),                       -- 英文名称
    name_local VARCHAR(200),                     -- 本地语言名称

    -- 历史兼容
    old_code VARCHAR(50),                       -- 旧版代码(兼容历史数据)
    old_name VARCHAR(200),                      -- 旧版名称

    -- 映射属性
    is_primary BOOLEAN DEFAULT TRUE,             -- 是否为主名称
    is_active BOOLEAN DEFAULT TRUE,              -- 是否启用
    sort_order INT DEFAULT 0,                    -- 排序

    -- 扩展字段
    alias_names TEXT[],                          -- 别名数组 (JSON数组格式)
    mapping_rule TEXT,                          -- 映射规则说明

    -- 审计字段
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,

    -- 唯一约束: 同一字典类型下,中文名称唯一
    UNIQUE(dict_type, name_cn)
);

-- ============================================================
-- 创建索引
-- ============================================================

-- 高频查询索引
CREATE INDEX idx_mapping_dict_type ON dict_universal_mapping(dict_type);
CREATE INDEX idx_mapping_standard_code ON dict_universal_mapping(dict_type, standard_code);
CREATE INDEX idx_mapping_name_cn ON dict_universal_mapping(dict_type, name_cn);
CREATE INDEX idx_mapping_old_code ON dict_universal_mapping(dict_type, old_code);

-- 复合索引(优化常见查询)
CREATE INDEX idx_mapping_type_code ON dict_universal_mapping(dict_type, target_table, standard_code);
CREATE INDEX idx_mapping_active ON dict_universal_mapping(dict_type, is_active) WHERE is_active = TRUE;

-- 全文搜索索引(支持模糊匹配)
CREATE INDEX idx_mapping_name_cn_trgm ON dict_universal_mapping USING gin(name_cn gin_trgm_ops);
CREATE INDEX idx_mapping_name_en_trgm ON dict_universal_mapping USING gin(name_en gin_trgm_ops);

-- ============================================================
-- 插入港口映射数据 (示例)
-- ============================================================

INSERT INTO dict_universal_mapping (
    dict_type,
    target_table,
    target_field,
    standard_code,
    standard_name,
    name_cn,
    name_en,
    old_code,
    is_primary,
    sort_order
) VALUES
-- 中国港口
('PORT', 'dict_ports', 'port_code', 'CNSHG', 'Shanghai', '上海', 'Shanghai', '上海', TRUE, 1),
('PORT', 'dict_ports', 'port_code', 'CNNGB', 'Ningbo', '宁波', 'Ningbo', '宁波', TRUE, 2),
('PORT', 'dict_ports', 'port_code', 'CNYTN', 'Yantian', '盐田', 'Yantian', '盐田', TRUE, 3),
('PORT', 'dict_ports', 'port_code', 'CNQNG', 'Qingdao', '青岛', 'Qingdao', '青岛', TRUE, 4),
('PORT', 'dict_ports', 'port_code', 'CNTAO', 'Tianjin', '天津', 'Tianjin', '天津', TRUE, 5),
('PORT', 'dict_ports', 'port_code', 'CNTSN', 'Tianjin Xingang', '天津新港', 'Tianjin Xingang', '天津新港', TRUE, 6),
('PORT', 'dict_ports', 'port_code', 'CNDLC', 'Dalian', '大连', 'Dalian', '大连', TRUE, 7),
('PORT', 'dict_ports', 'port_code', 'CNXMN', 'Xiamen', '厦门', 'Xiamen', '厦门', TRUE, 8),
('PORT', 'dict_ports', 'port_code', 'CNXMN', 'Xiamen', '厦门港', 'Xiamen', '厦门港', FALSE, 8), -- 别名

-- 美国港口
('PORT', 'dict_ports', 'port_code', 'USLAX', 'Los Angeles', '洛杉矶', 'Los Angeles', '洛杉矶', TRUE, 100),
('PORT', 'dict_ports', 'port_code', 'USNYC', 'New York', '纽约', 'New York', '纽约', TRUE, 101),
('PORT', 'dict_ports', 'port_code', 'USSAV', 'Savannah', '萨凡纳', 'Savannah', '萨凡纳', TRUE, 102),
('PORT', 'dict_ports', 'port_code', 'USOAK', 'Oakland', '奥克兰', 'Oakland', '奥克兰', TRUE, 103),
('PORT', 'dict_ports', 'port_code', 'USHOU', 'Houston', '休斯顿', 'Houston', '休斯顿', TRUE, 104),

-- 韩国港口
('PORT', 'dict_ports', 'port_code', 'KRPUS', 'Busan', '釜山', 'Busan', '釜山', TRUE, 200),

-- 新加坡
('PORT', 'dict_ports', 'port_code', 'SGSIN', 'Singapore', '新加坡', 'Singapore', '新加坡', TRUE, 300),

-- ============================================================
-- 插入国家映射数据 (示例)
-- ============================================================

INSERT INTO dict_universal_mapping (
    dict_type,
    target_table,
    target_field,
    standard_code,
    standard_name,
    name_cn,
    name_en,
    old_code,
    is_primary,
    sort_order
) VALUES
-- 国家映射
('COUNTRY', 'dict_countries', 'code', 'CN', 'China', '中国', 'China', '中国', TRUE, 1),
('COUNTRY', 'dict_countries', 'code', 'US', 'United States', '美国', 'United States', '美国', TRUE, 2),
('COUNTRY', 'dict_countries', 'code', 'UK', 'United Kingdom', '英国', 'United Kingdom', '英国', TRUE, 3),
('COUNTRY', 'dict_countries', 'code', 'DE', 'Germany', '德国', 'Germany', '德国', TRUE, 4),
('COUNTRY', 'dict_countries', 'code', 'FR', 'France', '法国', 'France', '法国', TRUE, 5),
('COUNTRY', 'dict_countries', 'code', 'JP', 'Japan', '日本', 'Japan', '日本', TRUE, 6),
('COUNTRY', 'dict_countries', 'code', 'KR', 'South Korea', '韩国', 'South Korea', '韩国', TRUE, 7),

-- ============================================================
-- 插入船公司映射数据 (示例)
-- ============================================================

INSERT INTO dict_universal_mapping (
    dict_type,
    target_table,
    target_field,
    standard_code,
    standard_name,
    name_cn,
    name_en,
    old_code,
    is_primary,
    sort_order
) VALUES
-- 船公司
('SHIPPING_COMPANY', 'dict_shipping_companies', 'code', 'MSC', 'Mediterranean Shipping Company', '地中海航运', 'Mediterranean Shipping Company', 'MSC', TRUE, 1),
('SHIPPING_COMPANY', 'dict_shipping_companies', 'code', 'MAERSK', 'Maersk Line', '马士基', 'Maersk Line', '马士基', TRUE, 2),
('SHIPPING_COMPANY', 'dict_shipping_companies', 'code', 'CMA CGM', 'CMA CGM', '法国达飞', 'CMA CGM', '法国达飞', TRUE, 3),
('SHIPPING_COMPANY', 'dict_shipping_companies', 'code', 'COSCO', 'COSCO', '中远海运', 'COSCO', '中远海运', TRUE, 4),
('SHIPPING_COMPANY', 'dict_shipping_companies', 'code', 'HAPAG', 'Hapag-Lloyd', '赫伯罗特', 'Hapag-Lloyd', '赫伯罗特', TRUE, 5),

-- ============================================================
-- 插入柜型映射数据 (示例)
-- ============================================================

INSERT INTO dict_universal_mapping (
    dict_type,
    target_table,
    target_field,
    standard_code,
    standard_name,
    name_cn,
    name_en,
    old_code,
    is_primary,
    sort_order
) VALUES
-- 柜型
('CONTAINER_TYPE', 'dict_container_types', 'type_code', '20GP', '20ft General Purpose', '20英尺普柜', '20ft General Purpose', '20GP', TRUE, 1),
('CONTAINER_TYPE', 'dict_container_types', 'type_code', '40GP', '40ft General Purpose', '40英尺普柜', '40ft General Purpose', '40GP', TRUE, 2),
('CONTAINER_TYPE', 'dict_container_types', 'type_code', '40HQ', '40ft High Cube', '40英尺高柜', '40ft High Cube', '40HQ', TRUE, 3),
('CONTAINER_TYPE', 'dict_container_types', 'type_code', '45HQ', '45ft High Cube', '45英尺高柜', '45ft High Cube', '45HQ', TRUE, 4),

ON CONFLICT (dict_type, name_cn) DO UPDATE SET
    standard_code = EXCLUDED.standard_code,
    standard_name = EXCLUDED.standard_name,
    name_en = EXCLUDED.name_en,
    old_code = EXCLUDED.old_code,
    updated_at = NOW();

-- ============================================================
-- 创建通用查询函数
-- ============================================================

/**
 * 通过任意名称获取标准代码
 * @param dict_type 字典类型
 * @param input_name 输入的名称(可以是中文名、英文名、旧代码等)
 * @returns 标准代码
 */
CREATE OR REPLACE FUNCTION get_standard_code(
    dict_type TEXT,
    input_name TEXT
) RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN (
        SELECT standard_code
        FROM dict_universal_mapping
        WHERE dict_type = $1
          AND is_active = TRUE
          AND (
            name_cn = $2 OR
            name_en = $2 OR
            old_code = $2 OR
            old_name = $2 OR
            standard_code = $2 OR
            $2 = ANY(alias_names)
          )
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_standard_code IS '通用函数: 通过任意名称获取标准代码';

/**
 * 批量获取标准代码
 * @param dict_type 字典类型
 * @param input_names 输入的名称数组
 * @returns 标准代码映射对象
 */
CREATE OR REPLACE FUNCTION get_standard_codes_batch(
    dict_type TEXT,
    input_names TEXT[]
) RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}'::JSONB;
BEGIN
    SELECT jsonb_object_agg(input_name, standard_code)
    INTO result
    FROM unnest(input_names) AS input_name
    LEFT JOIN dict_universal_mapping ON (
        dict_universal_mapping.dict_type = dict_type
        AND dict_universal_mapping.is_active = TRUE
        AND (
            name_cn = input_name OR
            name_en = input_name OR
            old_code = input_name OR
            old_name = input_name OR
            standard_code = input_name OR
            input_name = ANY(alias_names)
        )
    );

    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_standard_codes_batch IS '批量获取标准代码';

/**
 * 获取字典类型的所有映射
 * @param dict_type 字典类型
 * @returns 映射数据数组
 */
CREATE OR REPLACE FUNCTION get_all_mappings_by_type(
    dict_type TEXT
) RETURNS TABLE (
    id INT,
    standard_code VARCHAR,
    standard_name VARCHAR,
    name_cn VARCHAR,
    name_en VARCHAR,
    old_code VARCHAR,
    is_primary BOOLEAN,
    sort_order INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.standard_code,
        m.standard_name,
        m.name_cn,
        m.name_en,
        m.old_code,
        m.is_primary,
        m.sort_order
    FROM dict_universal_mapping m
    WHERE m.dict_type = dict_type
      AND m.is_active = TRUE
    ORDER BY m.sort_order, m.standard_code;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_all_mappings_by_type IS '获取指定类型的所有映射';

/**
 * 模糊搜索映射
 * @param dict_type 字典类型
 * @param keyword 关键词
 * @returns 匹配的映射数据
 */
CREATE OR REPLACE FUNCTION search_mappings_fuzzy(
    dict_type TEXT,
    keyword TEXT
) RETURNS TABLE (
    id INT,
    standard_code VARCHAR,
    standard_name VARCHAR,
    name_cn VARCHAR,
    name_en VARCHAR,
    similarity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.id,
        m.standard_code,
        m.standard_name,
        m.name_cn,
        m.name_en,
        -- 计算相似度(0-1)
        CASE
            WHEN m.name_cn = keyword THEN 1.0
            WHEN m.name_en = keyword THEN 1.0
            WHEN m.standard_code = keyword THEN 1.0
            ELSE GREATEST(
                SIMILARITY(m.name_cn, keyword),
                SIMILARITY(m.name_en, keyword),
                SIMILARITY(m.standard_code, keyword)
            )
        END AS similarity_score
    FROM dict_universal_mapping m
    WHERE m.dict_type = dict_type
      AND m.is_active = TRUE
      AND (
        m.name_cn ILIKE '%' || keyword || '%' OR
        m.name_en ILIKE '%' || keyword || '%' OR
        m.standard_code ILIKE '%' || keyword || '%'
      )
    ORDER BY similarity_score DESC, m.sort_order;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION search_mappings_fuzzy IS '模糊搜索映射';

-- ============================================================
-- 创建触发器: 自动更新 updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_universal_mapping_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_universal_mapping_updated_at
    BEFORE UPDATE ON dict_universal_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_universal_mapping_timestamp();

-- ============================================================
-- 视图: 所有活跃映射
-- ============================================================

CREATE OR REPLACE VIEW v_active_mappings AS
SELECT
    dict_type,
    target_table,
    target_field,
    standard_code,
    standard_name,
    name_cn,
    name_en,
    old_code,
    is_primary,
    sort_order,
    -- 标准化显示名称
    COALESCE(name_cn, name_en, standard_name) as display_name
FROM dict_universal_mapping
WHERE is_active = TRUE
ORDER BY dict_type, sort_order, standard_code;

COMMENT ON VIEW v_active_mappings IS '所有活跃的字典映射';

-- ============================================================
-- 添加表注释
-- ============================================================

COMMENT ON TABLE dict_universal_mapping IS '通用字典映射表 - 支持所有字典类型的名称到代码映射';
COMMENT ON COLUMN dict_universal_mapping.dict_type IS '字典类型: PORT, COUNTRY, SHIPPING_COMPANY, CONTAINER_TYPE, etc.';
COMMENT ON COLUMN dict_universal_mapping.target_table IS '目标字典表名';
COMMENT ON COLUMN dict_universal_mapping.standard_code IS '标准代码(对应目标表的主键)';
COMMENT ON COLUMN dict_universal_mapping.name_cn IS '中文名称';
COMMENT ON COLUMN dict_universal_mapping.name_en IS '英文名称';
COMMENT ON COLUMN dict_universal_mapping.old_code IS '旧版代码(兼容历史数据)';
COMMENT ON COLUMN dict_universal_mapping.alias_names IS '别名数组(JSON)';
COMMENT ON COLUMN dict_universal_mapping.is_primary IS '是否为主名称';
