# LogiX 数据库脚本索引

> 数据库脚本与实体一致性说明，reinit 执行顺序

---

## 一、脚本分类

### 1.1 主初始化脚本（backend/）

| 顺序 | 文件 | 用途 | 依赖 |
|------|------|------|------|
| 01 | `01_drop_all_tables.sql` | 删除所有表（CASCADE） | 无 |
| 02 | `03_create_tables.sql` | 创建核心表结构 | 01 执行后 |
| 03 | `02_init_dict_tables_final.sql` | 初始化字典数据（国家、港口、柜型等） | 02 执行后 |
| 04 | `04_fix_constraints.sql` | 外键、CHECK、索引 | 03 执行后 |
| 05 | `05_init_warehouses.sql` | 初始化仓库数据 | 04 执行后 |

### 1.2 迁移脚本（backend/migrations/）

| 文件 | 用途 |
|------|------|
| `add_sys_data_change_log.sql` | 系统变更日志表 |
| `add_demurrage_standards_and_records.sql` | 滞港费标准与记录表 |
| `add_destination_port_to_demurrage_records.sql` | 滞港费记录目的港字段 |
| `add_demurrage_record_permanence.sql` | 滞港费记录持久化 |
| `add_feituo_raw_data_by_group.sql` | 飞驼原始数据表 |
| `add_feituo_import_tables.sql` | 飞驼导入表 |
| `create_universal_dict_mapping.sql` | 通用字典映射表 |
| `add_inspection_records.sql` | 查验记录与事件表 |
| `add_common_ports.sql` | 常用港口数据 |
| `add_savannah_port.sql` | 萨凡纳港数据 |
| `add_demurrage_calculation_mode.sql` | 滞港费计算模式 |

### 1.3 迁移脚本（migrations/，项目根）

| 文件 | 用途 |
|------|------|
| `create_resource_occupancy_tables.sql` | 智能排柜资源占用表 |
| `add_trucking_port_mapping.sql` | 车队-港口映射（若未在 03 中） |
| `add_country_to_warehouse_trucking_mapping.sql` | 仓库-车队映射 country 字段 |
| `add_schedule_status.sql` | 货柜 schedule_status |
| `add_daily_unload_capacity_to_warehouses.sql` | 仓库 daily_unload_capacity |
| `add_daily_capacity_to_trucking_companies.sql` | 车队 daily_capacity |
| `add_country_to_dict_tables.sql` | 清关/车队 country 字段 |
| `convert_date_to_timestamp.sql` | 日期字段转 timestamp |

---

## 二、实体与表对应

| 实体 | 表名 |
|------|------|
| Country | dict_countries |
| CustomerType | dict_customer_types |
| Port | dict_ports |
| ContainerType | dict_container_types |
| Warehouse | dict_warehouses |
| ShippingCompany | dict_shipping_companies |
| FreightForwarder | dict_freight_forwarders |
| CustomsBroker | dict_customs_brokers |
| TruckingCompany | dict_trucking_companies |
| OverseasCompany | dict_overseas_companies |
| Customer | biz_customers |
| ReplenishmentOrder | biz_replenishment_orders |
| Container | biz_containers |
| ContainerSku | biz_container_skus |
| SeaFreight | process_sea_freight |
| PortOperation | process_port_operations |
| TruckingTransport | process_trucking_transport |
| WarehouseOperation | process_warehouse_operations |
| EmptyReturn | process_empty_return |
| ContainerStatusEvent | ext_container_status_events |
| ContainerLoadingRecord | ext_container_loading_records |
| ContainerHoldRecord | ext_container_hold_records |
| ContainerCharge | ext_container_charges |
| ExtDemurrageStandard | ext_demurrage_standards |
| ExtDemurrageRecord | ext_demurrage_records |
| ExtFeituoImportBatch | ext_feituo_import_batch |
| ExtFeituoImportTable1 | ext_feituo_import_table1 |
| ExtFeituoImportTable2 | ext_feituo_import_table2 |
| SysDataChangeLog | sys_data_change_log |
| InspectionRecord | ext_inspection_records |
| InspectionEvent | ext_inspection_events |
| PortWarehouseMapping | dict_port_warehouse_mapping |
| WarehouseTruckingMapping | dict_warehouse_trucking_mapping |
| TruckingPortMapping | dict_trucking_port_mapping |
| ExtWarehouseDailyOccupancy | ext_warehouse_daily_occupancy |
| ExtTruckingSlotOccupancy | ext_trucking_slot_occupancy |
| ExtYardDailyOccupancy | ext_yard_daily_occupancy |
| Yard | dict_yards |

---

## 三、reinit 执行顺序（完整）

```
1. 01_drop_all_tables.sql
2. 03_create_tables.sql
3. 02_init_dict_tables_final.sql
4. 04_fix_constraints.sql
5. 05_init_warehouses.sql
6. migrations: add_sys_data_change_log, add_demurrage_standards_and_records,
   add_destination_port_to_demurrage_records, add_demurrage_record_permanence,
   add_feituo_import_tables, add_feituo_raw_data_by_group,
   create_universal_dict_mapping, add_inspection_records
7. migrations: create_resource_occupancy_tables, add_schedule_status,
   add_daily_capacity_to_trucking_companies, add_country_to_dict_tables,
   add_country_to_warehouse_trucking_mapping
8. convert_date_to_timestamp.sql（若 03 中为 DATE）
9. add_common_ports.sql, add_savannah_port.sql
```

---

**最后更新**: 2026-03-14
