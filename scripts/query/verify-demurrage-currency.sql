-- 滞港费标准货币配置验证 SQL
-- 用于验证各国滞港费标准的货币配置是否正确

-- 查询各国滞港费标准的货币配置情况
SELECT 
  LEFT(s.destination_port_code, 2) as country_code,
  s.currency as standard_currency,
  c.currency as expected_currency,
  CASE 
    WHEN s.currency = c.currency THEN 'OK'
    ELSE 'MISMATCH'
  END as status,
  COUNT(*) as count
FROM ext_demurrage_standards s
LEFT JOIN dict_countries c ON LEFT(s.destination_port_code, 2) = c.code
WHERE s.is_chargeable = 'N' 
  AND s.destination_port_code IS NOT NULL
GROUP BY country_code, standard_currency, expected_currency
ORDER BY country_code;

-- 查看备份表信息
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(quote_ident(tablename))) as size
FROM pg_tables
WHERE tablename LIKE 'ext_demurrage_standards_currency_backup%'
ORDER BY tablename;
