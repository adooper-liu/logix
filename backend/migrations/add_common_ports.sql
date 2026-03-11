-- 补充常用港口到 dict_ports（解决「找不到港口」问题）
-- 若港口已存在则跳过
INSERT INTO dict_ports (port_code, port_name, port_name_en, country, city) VALUES
('USSAV', '萨凡纳', 'Savannah', '美国', '萨凡纳'),
('USNYC', '纽约', 'New York', '美国', '纽约'),
('USCHI', '芝加哥', 'Chicago', '美国', '芝加哥'),
('USHOU', '休斯顿', 'Houston', '美国', '休斯顿'),
('USSEA', '西雅图', 'Seattle', '美国', '西雅图'),
('USSFO', '旧金山', 'San Francisco', '美国', '旧金山'),
('USMIA', '迈阿密', 'Miami', '美国', '迈阿密'),
('USATL', '亚特兰大', 'Atlanta', '美国', '亚特兰大'),
('CNNGB', '宁波', 'Ningbo', '中国', '宁波'),
('CNSHA', '上海', 'Shanghai', '中国', '上海'),
('CNQNG', '青岛', 'Qingdao', '中国', '青岛'),
('CNXMN', '厦门', 'Xiamen', '中国', '厦门'),
('CNTAO', '天津', 'Tianjin', '中国', '天津'),
('CNDLC', '大连', 'Dalian', '中国', '大连'),
('SGSIN', '新加坡', 'Singapore', '新加坡', '新加坡'),
('JPTYO', '东京', 'Tokyo', '日本', '东京'),
('JPOSA', '大阪', 'Osaka', '日本', '大阪'),
('KRINC', '仁川', 'Incheon', '韩国', '仁川'),
('AEDXB', '迪拜', 'Dubai', '阿联酋', '迪拜'),
('AEJEA', '杰贝阿里', 'Jebel Ali', '阿联酋', '迪拜')
ON CONFLICT (port_code) DO NOTHING;
