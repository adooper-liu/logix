SELECT 'dict_trucking_port_mapping' as table_name, COUNT(*) as count FROM dict_trucking_port_mapping
UNION ALL
SELECT 'dict_warehouse_trucking_mapping', COUNT(*) FROM dict_warehouse_trucking_mapping
UNION ALL
SELECT 'dict_ports', COUNT(*) FROM dict_ports
UNION ALL
SELECT 'dict_trucking_companies', COUNT(*) FROM dict_trucking_companies;
