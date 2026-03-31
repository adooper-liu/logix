-- 添加萨凡纳港口到字典（口径统一：货柜「萨凡纳」可解析为 USSAV 与滞港费标准匹配）
-- 若 dict_ports 已有 USSAV，则跳过
INSERT INTO dict_ports (port_code, port_name, port_name_en, port_type, country, state, city, timezone, latitude, longitude, status, created_at, updated_at)
SELECT 'USSAV', '萨凡纳', 'Savannah', 'PORT', 'US', 'GA', 'Savannah', -5, 32.0809, -81.0912, 'ACTIVE', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM dict_ports WHERE port_code = 'USSAV');
