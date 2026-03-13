-- ============================================================
-- 港口相关数据诊断脚本
-- 用于排查「找不到港口」等问题
-- ============================================================

\echo '========== 1. dict_ports 港口字典 =========='
SELECT COUNT(*) AS "港口数量" FROM dict_ports;
SELECT port_code, port_name, port_name_en, country FROM dict_ports ORDER BY port_name LIMIT 20;

\echo ''
\echo '========== 2. dict_port_name_mapping（Excel 导入用，若表存在）=========='
-- 若表存在可执行: SELECT COUNT(*) AS mapping_count FROM dict_port_name_mapping;

\echo ''
\echo '========== 3. process_sea_freight 中的目的港代码 =========='
SELECT port_of_discharge AS "目的港代码", COUNT(*) AS "柜数"
FROM process_sea_freight
WHERE port_of_discharge IS NOT NULL AND port_of_discharge != ''
GROUP BY port_of_discharge
ORDER BY COUNT(*) DESC
LIMIT 15;

\echo ''
\echo '========== 4. 目的港代码在 dict_ports 中的匹配情况 =========='
SELECT
  sf.port_of_discharge AS "目的港代码",
  COUNT(*) AS "柜数",
  CASE WHEN p.port_code IS NOT NULL THEN '✓ 已匹配' ELSE '✗ 未匹配' END AS "字典状态"
FROM process_sea_freight sf
LEFT JOIN dict_ports p ON p.port_code = sf.port_of_discharge
WHERE sf.port_of_discharge IS NOT NULL AND sf.port_of_discharge != ''
GROUP BY sf.port_of_discharge, p.port_code
ORDER BY COUNT(*) DESC
LIMIT 15;

\echo ''
\echo '========== 5. process_port_operations 中的港口代码 =========='
SELECT port_type, port_code, port_name, COUNT(*) AS "记录数"
FROM process_port_operations
WHERE port_code IS NOT NULL
GROUP BY port_type, port_code, port_name
ORDER BY port_type, COUNT(*) DESC
LIMIT 20;
