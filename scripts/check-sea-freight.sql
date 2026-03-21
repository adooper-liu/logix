-- 查看海运表数据
SELECT container_number, bill_of_lading_number, port_of_loading, port_of_discharge, eta FROM process_sea_freight;

-- 查看货柜表的海运关联
SELECT container_number, bill_of_lading_number FROM biz_containers;
