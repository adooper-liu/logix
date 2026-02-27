-- ============================================================
-- 创建港口名称映射表
-- 说明: 支持中文港口名称到标准 port_code 的映射
--       用于 Excel 导入时的数据标准化转换
-- ============================================================

CREATE TABLE IF NOT EXISTS dict_port_name_mapping (
    id SERIAL PRIMARY KEY,
    port_code VARCHAR(50) NOT NULL,           -- 标准港口代码
    port_name_cn VARCHAR(100) NOT NULL,       -- 中文港口名称(唯一)
    port_name_en VARCHAR(100),               -- 英文港口名称
    port_code_old VARCHAR(50),               -- 旧版港口代码(兼容历史数据)
    is_primary BOOLEAN DEFAULT TRUE,         -- 是否为主名称
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(port_name_cn)
);

-- 创建索引
CREATE INDEX idx_port_mapping_code ON dict_port_name_mapping(port_code);
CREATE INDEX idx_port_mapping_old_code ON dict_port_name_mapping(port_code_old);

-- ============================================================
-- 插入常用中文港口名称映射数据
-- ============================================================

INSERT INTO dict_port_name_mapping (port_code, port_name_cn, port_name_en, port_code_old, is_primary) VALUES

-- 中国港口
('CNSHG', '上海', 'Shanghai', '上海', TRUE),
('CNSZX', '深圳', 'Shenzhen', '深圳', TRUE),
('CNNGB', '宁波', 'Ningbo', '宁波', TRUE),
('CNYTN', '盐田', 'Yantian', '盐田', TRUE),
('CNQNG', '青岛', 'Qingdao', '青岛', TRUE),
('CNTAO', '天津', 'Tianjin', '天津', TRUE),
('CNTSN', '天津新港', 'Tianjin Xingang', '天津新港', TRUE),
('CNDLC', '大连', 'Dalian', '大连', TRUE),
('CNXMN', '厦门', 'Xiamen', '厦门', TRUE),
('CNXMN', '厦门港', 'Xiamen', '厦门港', FALSE),  -- 别名
('CNGZU', '广州', 'Guangzhou', '广州', TRUE),
('CNLZU', '连云港', 'Lianyungang', '连云港', TRUE),
('CNWHU', '武汉', 'Wuhan', '武汉', TRUE),
('CNQNZ', '泉州', 'Quanzhou', '泉州', TRUE),
('CNSZW', '石围', 'Shiwei', '石围', TRUE),
('CNYKT', '营口', 'Yingkou', '营口', TRUE),
('CNTAI', '太仓', 'Taicang', '太仓', TRUE),
('CNFZU', '福州', 'Fuzhou', '福州', TRUE),
('CNDLC', '丹戎帕拉帕斯', 'Tanjung Pelepas', '丹戎帕拉帕斯', TRUE),

-- 韩国港口
('KRPUS', '釜山', 'Busan', '釜山', TRUE),

-- 美国港口
('USLAX', '洛杉矶', 'Los Angeles', '洛杉矶', TRUE),
('USNYC', '纽约', 'New York', '纽约', TRUE),
('USCHI', '芝加哥', 'Chicago', '芝加哥', TRUE),
('USHOU', '休斯顿', 'Houston', '休斯顿', TRUE),
('USSEA', '西雅图', 'Seattle', '西雅图', TRUE),
('USMIA', '迈阿密', 'Miami', '迈阿密', TRUE),
('USOAK', '奥克兰', 'Oakland', '奥克兰', TRUE),
('USSAV', '萨凡纳', 'Savannah', '萨凡纳', TRUE),
('USJAX', '杰克逊维尔', 'Jacksonville', '杰克逊维尔', TRUE),
('USCHS', '查尔斯顿', 'Charleston', '查尔斯顿', TRUE),

-- 加拿大港口
('CAVAN', '温哥华', 'Vancouver', '温哥华', TRUE),
('CAMTR', '蒙特利尔', 'Montreal', '蒙特利尔', TRUE),
('CATOR', '多伦多', 'Toronto', '多伦多', TRUE),

-- 欧洲港口
('NLRTM', '鹿特丹', 'Rotterdam', '鹿特丹', TRUE),
('DEHAM', '汉堡', 'Hamburg', '汉堡', TRUE),
('GBLON', '伦敦', 'London', '伦敦', TRUE),
('GBFXT', '费利克斯托', 'Felixstowe', '费利克斯托', TRUE),
('ITGOA', '热那亚', 'Genoa', '热那亚', TRUE),
('FRLEH', '勒阿弗尔', 'Le Havre', '勒阿弗尔', TRUE),

-- 东南亚港口
('SGSIN', '新加坡', 'Singapore', '新加坡', TRUE),
('MYKUL', '吉隆坡', 'Kuala Lumpur', '吉隆坡', TRUE),
('THBKK', '曼谷', 'Bangkok', '曼谷', TRUE),
('IDJKT', '雅加达', 'Jakarta', '雅加达', TRUE),
('VNSGN', '胡志明市', 'Ho Chi Minh City', '胡志明市', TRUE),

-- 中东港口
('AEDXB', '迪拜', 'Dubai', '迪拜', TRUE),
('JEDJED', '吉达', 'Jeddah', '吉达', TRUE),

-- 澳洲港口
('AUSYD', '悉尼', 'Sydney', '悉尼', TRUE),
('AUMEL', '墨尔本', 'Melbourne', '墨尔本', TRUE),

ON CONFLICT (port_name_cn) DO UPDATE SET
    port_code = EXCLUDED.port_code,
    port_name_en = EXCLUDED.port_name_en,
    updated_at = NOW();

-- ============================================================
-- 创建视图: 港口完整信息(包含中文映射)
-- ============================================================
CREATE OR REPLACE VIEW v_ports_with_mapping AS
SELECT
    p.port_code,
    p.port_name,
    p.port_name_en,
    p.port_type,
    p.country,
    p.state,
    p.city,
    p.timezone,
    p.latitude,
    p.longitude,
    p.support_export,
    p.support_import,
    p.support_container_only,
    p.status,
    p.remarks,
    -- 添加中文映射信息
    COALESCE(m.port_name_cn, p.port_name) as port_name_cn,
    m.port_code_old as legacy_code
FROM dict_ports p
LEFT JOIN dict_port_name_mapping m ON p.port_code = m.port_code AND m.is_primary = TRUE;

COMMENT ON VIEW v_ports_with_mapping IS '港口字典视图(包含中文名称映射)';

-- ============================================================
-- 创建函数: 通过中文港口名称获取标准 port_code
-- ============================================================
CREATE OR REPLACE FUNCTION get_port_code_by_name(port_name TEXT)
RETURNS VARCHAR(50) AS $$
BEGIN
    RETURN (
        SELECT port_code
        FROM dict_port_name_mapping
        WHERE port_name_cn = port_name OR port_name_old = port_name
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_port_code_by_name IS '通过中文港口名称获取标准port_code,找不到则返回NULL';
