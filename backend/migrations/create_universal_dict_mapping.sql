-- ============================================================
-- 通用字典映射表与函数
-- Universal Dictionary Mapping Table & Functions
-- ============================================================
-- 用途: 名称/别名 -> 标准代码映射，供 Excel 导入、查询等使用
-- 若未执行本迁移，前端「通用字典映射管理」会无数据且统计接口报错
-- ============================================================

-- 1. 表结构（与 backend 控制器 INSERT/UPDATE 一致）
CREATE TABLE IF NOT EXISTS dict_universal_mapping (
  id SERIAL PRIMARY KEY,
  dict_type VARCHAR(50) NOT NULL,
  target_table VARCHAR(100) NOT NULL,
  target_field VARCHAR(50) NOT NULL,
  standard_code VARCHAR(100) NOT NULL,
  standard_name VARCHAR(200),
  name_cn VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  old_code VARCHAR(100),
  aliases TEXT,
  is_primary BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(dict_type, name_cn)
);

CREATE INDEX IF NOT EXISTS idx_dict_universal_mapping_type ON dict_universal_mapping(dict_type);
CREATE INDEX IF NOT EXISTS idx_dict_universal_mapping_standard_code ON dict_universal_mapping(dict_type, standard_code);
CREATE INDEX IF NOT EXISTS idx_dict_universal_mapping_name_cn ON dict_universal_mapping(dict_type, name_cn);

COMMENT ON TABLE dict_universal_mapping IS '通用字典映射：名称/别名 -> 标准代码，供导入与查询使用';

-- 2. 按名称查标准代码（单条）
CREATE OR REPLACE FUNCTION get_standard_code(p_dict_type VARCHAR(50), p_name VARCHAR(200))
RETURNS VARCHAR(100) AS $$
  SELECT standard_code
  FROM dict_universal_mapping
  WHERE dict_type = p_dict_type
    AND is_active = TRUE
    AND (
      name_cn = p_name
      OR name_en = p_name
      OR old_code = p_name
      OR (aliases IS NOT NULL AND trim(p_name) != '' AND aliases LIKE '%' || trim(p_name) || '%')
    )
  ORDER BY is_primary DESC NULLS LAST, sort_order, id
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 3. 按类型返回所有映射（与 getMappingsByType 一致）
CREATE OR REPLACE FUNCTION get_all_mappings_by_type(p_dict_type VARCHAR(50))
RETURNS SETOF dict_universal_mapping AS $$
  SELECT *
  FROM dict_universal_mapping
  WHERE dict_type = p_dict_type
  ORDER BY sort_order, name_cn, id;
$$ LANGUAGE sql STABLE;

-- 4. 模糊搜索
CREATE OR REPLACE FUNCTION search_mappings_fuzzy(p_dict_type VARCHAR(50), p_keyword VARCHAR(200))
RETURNS SETOF dict_universal_mapping AS $$
  SELECT *
  FROM dict_universal_mapping
  WHERE dict_type = p_dict_type
    AND is_active = TRUE
    AND (
      name_cn ILIKE '%' || COALESCE(trim(p_keyword), '') || '%'
      OR name_en ILIKE '%' || COALESCE(trim(p_keyword), '') || '%'
      OR standard_code ILIKE '%' || COALESCE(trim(p_keyword), '') || '%'
      OR (aliases IS NOT NULL AND aliases ILIKE '%' || COALESCE(trim(p_keyword), '') || '%')
    )
  ORDER BY sort_order, name_cn, id;
$$ LANGUAGE sql STABLE;

-- 5. 批量查标准代码（返回 name -> standard_code 的 JSON）
CREATE OR REPLACE FUNCTION get_standard_codes_batch(p_dict_type VARCHAR(50), p_names TEXT[])
RETURNS JSONB AS $$
  SELECT COALESCE(
    jsonb_object_agg(
      n.n,
      (
        SELECT standard_code
        FROM dict_universal_mapping m
        WHERE m.dict_type = p_dict_type
          AND m.is_active = TRUE
          AND (m.name_cn = n.n OR m.name_en = n.n OR m.old_code = n.n
               OR (m.aliases IS NOT NULL AND m.aliases LIKE '%' || n.n || '%'))
        ORDER BY m.is_primary DESC NULLS LAST, m.sort_order, m.id
        LIMIT 1
      )
    ),
    '{}'::jsonb
  )
  FROM unnest(p_names) AS n(n);
$$ LANGUAGE sql STABLE;
