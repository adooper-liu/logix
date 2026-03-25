-- ============================================================
-- 导出所有字典表的完整初始化数据
-- Export All Dictionary Tables Initial Data
-- ============================================================
-- 用途：从生产数据库提取完整的字典表数据，用于初始化脚本
-- ============================================================

\echo ''
\echo '=== 开始导出字典表数据 ==='
\echo ''

-- ============================================================
-- 1. dict_countries (43 个国家)
-- ============================================================
\echo '-- 1. dict_countries (43 个国家)'
SELECT 'INSERT INTO dict_countries (code, name_cn, name_en, region, continent, currency, phone_code, sort_order, is_active) VALUES (''' 
    || code || ''', ''' 
    || name_cn || ''', ''' 
    || name_en || ''', ''' 
    || COALESCE(region, '') || ''', ''' 
    || COALESCE(continent, '') || ''', ''' 
    || COALESCE(currency, '') || ''', ''' 
    || COALESCE(phone_code, '') || ''', ' 
    || COALESCE(sort_order, 0) || ', ' 
    || CASE WHEN is_active THEN 'true' ELSE 'false' END || ');'
FROM dict_countries
ORDER BY code;

-- ============================================================
-- 2. dict_customer_types (3 个类型)
-- ============================================================
\echo ''
\echo '-- 2. dict_customer_types (3 个类型)'
SELECT 'INSERT INTO dict_customer_types (type_code, type_name_cn, type_name_en, sort_order, is_active) VALUES (''' 
    || type_code || ''', ''' 
    || type_name_cn || ''', ''' 
    || type_name_en || ''', ' 
    || COALESCE(sort_order, 0) || ', ' 
    || CASE WHEN is_active THEN 'true' ELSE 'false' END || ');'
FROM dict_customer_types
ORDER BY type_code;

-- ============================================================
-- 3. dict_container_types (37 个箱型)
-- ============================================================
\echo ''
\echo '-- 3. dict_container_types (37 个箱型)'
SELECT 'INSERT INTO dict_container_types (type_code, type_name, length, width, height, volume, max_payload, is_active) VALUES (''' 
    || type_code || ''', ''' 
    || type_name || ''', ' 
    || COALESCE(length::text, 'NULL') || ', ' 
    || COALESCE(width::text, 'NULL') || ', ' 
    || COALESCE(height::text, 'NULL') || ', ' 
    || COALESCE(volume::text, 'NULL') || ', ' 
    || COALESCE(max_payload::text, 'NULL') || ', '
    || CASE WHEN is_active THEN 'true' ELSE 'false' END || ');'
FROM dict_container_types
ORDER BY type_code;

-- ============================================================
-- 4. dict_overseas_companies (9 个分公司)
-- ============================================================
\echo ''
\echo '-- 4. dict_overseas_companies (9 个分公司)'
SELECT 'INSERT INTO dict_overseas_companies (company_code, company_name, country, is_active) VALUES (''' 
    || company_code || ''', ''' 
    || REPLACE(company_name, '''', '''''') || ''', ''' 
    || COALESCE(country, '') || ''', ' 
    || CASE WHEN is_active THEN 'true' ELSE 'false' END || ');'
FROM dict_overseas_companies
ORDER BY company_code;

-- ============================================================
-- 5. dict_customs_brokers (12 个报关行)
-- ============================================================
\echo ''
\echo '-- 5. dict_customs_brokers (12 个报关行)'
SELECT 'INSERT INTO dict_customs_brokers (broker_code, broker_name, country, contact_phone, contact_email, is_active) VALUES (''' 
    || broker_code || ''', ''' 
    || REPLACE(broker_name, '''', '''''') || ''', ''' 
    || COALESCE(country, '') || ''', ''' 
    || COALESCE(contact_phone, '') || ''', ''' 
    || COALESCE(contact_email, '') || ''', ' 
    || CASE WHEN is_active THEN 'true' ELSE 'false' END || ');'
FROM dict_customs_brokers
ORDER BY broker_code;

-- ============================================================
-- 6. dict_freight_forwarders (7 个货代)
-- ============================================================
\echo ''
\echo '-- 6. dict_freight_forwarders (7 个货代)'
SELECT 'INSERT INTO dict_freight_forwarders (forwarder_code, forwarder_name, contact_phone, contact_email, is_active) VALUES (''' 
    || forwarder_code || ''', ''' 
    || REPLACE(forwarder_name, '''', '''''') || ''', ''' 
    || COALESCE(contact_phone, '') || ''', ''' 
    || COALESCE(contact_email, '') || ''', ' 
    || CASE WHEN is_active THEN 'true' ELSE 'false' END || ');'
FROM dict_freight_forwarders
ORDER BY forwarder_code;

-- ============================================================
-- 7. dict_shipping_companies (92 个船公司)
-- ============================================================
\echo ''
\echo '-- 7. dict_shipping_companies (92 个船公司)'
SELECT 'INSERT INTO dict_shipping_companies (company_code, company_name, company_name_en, scac_code, api_provider, support_booking, support_bill_of_lading, support_container, status) VALUES (''' 
    || company_code || ''', ''' 
    || REPLACE(company_name, '''', '''''') || ''', ''' 
    || REPLACE(COALESCE(company_name_en, ''), '''', '''''') || ''', ''' 
    || COALESCE(scac_code, '') || ''', ''' 
    || COALESCE(api_provider, '') || ''', ' 
    || CASE WHEN support_booking THEN 'true' ELSE 'false' END || ', ' 
    || CASE WHEN support_bill_of_lading THEN 'true' ELSE 'false' END || ', ' 
    || CASE WHEN support_container THEN 'true' ELSE 'false' END || ', ''' 
    || COALESCE(status, '') || ''');'
FROM dict_shipping_companies
ORDER BY company_code;

-- ============================================================
-- 8. dict_ports (72 个港口)
-- ============================================================
\echo ''
\echo '-- 8. dict_ports (72 个港口)'
SELECT 'INSERT INTO dict_ports (port_code, port_name, port_name_en, port_type, country, state, city, timezone, latitude, longitude, support_export, support_import, support_container_only, status) VALUES (''' 
    || port_code || ''', ''' 
    || REPLACE(port_name, '''', '''''') || ''', ''' 
    || REPLACE(COALESCE(port_name_en, ''), '''', '''''') || ''', ''' 
    || COALESCE(port_type, 'PORT') || ''', ''' 
    || COALESCE(country, '') || ''', ''' 
    || COALESCE(state, '') || ''', ''' 
    || COALESCE(city, '') || ''', ' 
    || COALESCE(timezone::text, 'NULL') || ', ' 
    || COALESCE(latitude::text, 'NULL') || ', ' 
    || COALESCE(longitude::text, 'NULL') || ', '
    || CASE WHEN support_export THEN 'true' ELSE 'false' END || ', '
    || CASE WHEN support_import THEN 'true' ELSE 'false' END || ', '
    || CASE WHEN support_container_only THEN 'true' ELSE 'false' END || ', '''
    || COALESCE(status, '') || ''');'
FROM dict_ports
ORDER BY port_code;

-- ============================================================
-- 9. dict_warehouses (149 个仓库)
-- ============================================================
\echo ''
\echo '-- 9. dict_warehouses (149 个仓库)'
SELECT 'INSERT INTO dict_warehouses (warehouse_code, warehouse_name, warehouse_name_en, short_name, property_type, warehouse_type, company_code, address, city, state, country, contact_phone, contact_email, status, daily_unload_capacity) VALUES (''' 
    || warehouse_code || ''', ''' 
    || REPLACE(warehouse_name, '''', '''''') || ''', ''' 
    || REPLACE(COALESCE(warehouse_name_en, ''), '''', '''''') || ''', ''' 
    || COALESCE(short_name, '') || ''', ''' 
    || COALESCE(property_type, '') || ''', ''' 
    || COALESCE(warehouse_type, '') || ''', ''' 
    || COALESCE(company_code, '') || ''', ''' 
    || COALESCE(address, '') || ''', ''' 
    || COALESCE(city, '') || ''', ''' 
    || COALESCE(state, '') || ''', ''' 
    || country || ''', ''' 
    || COALESCE(contact_phone, '') || ''', ''' 
    || COALESCE(contact_email, '') || ''', ''' 
    || COALESCE(status, 'ACTIVE') || ''', ' 
    || COALESCE(daily_unload_capacity::text, '10') || ');'
FROM dict_warehouses
ORDER BY warehouse_code;

-- ============================================================
-- 10. dict_trucking_companies (21 个车队)
-- ============================================================
\echo ''
\echo '-- 10. dict_trucking_companies (21 个车队)'
SELECT 'INSERT INTO dict_trucking_companies (company_code, company_name, company_name_en, contact_phone, contact_email, status, daily_capacity, daily_return_capacity, has_yard, yard_daily_capacity, country) VALUES (''' 
    || company_code || ''', ''' 
    || REPLACE(company_name, '''', '''''') || ''', ''' 
    || REPLACE(COALESCE(company_name_en, ''), '''', '''''') || ''', ''' 
    || COALESCE(contact_phone, '') || ''', ''' 
    || COALESCE(contact_email, '') || ''', ''' 
    || COALESCE(status, '') || ''', '
    || COALESCE(daily_capacity::text, '10') || ', '
    || COALESCE(daily_return_capacity::text, '10') || ', '
    || CASE WHEN has_yard THEN 'true' ELSE 'false' END || ', '
    || COALESCE(yard_daily_capacity::text, 'NULL') || ', '''
    || COALESCE(country, '') || ''');'
FROM dict_trucking_companies
ORDER BY country, company_code;

\echo ''
\echo '✅ 字典表数据导出完成！'
\echo ''
