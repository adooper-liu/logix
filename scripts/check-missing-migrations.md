# 迁移脚本完整性检查报告

## 📊 检查结果

### ✅ 已包含在 `reinit_database_docker.ps1` 中的脚本（共 53 个）

#### Step 1: 基础表创建 (6 个)
- ✅ 01_drop_all_tables.sql
- ✅ 03_create_tables.sql
- ✅ 03_create_tables_supplement.sql
- ✅ 02_init_dict_tables_final.sql
- ✅ 04_fix_constraints.sql
- ✅ 05_init_warehouses.sql

#### Step 2: 核心迁移 (22 个)
- ✅ add_demurrage_standards_and_records.sql
- ✅ add_destination_port_to_demurrage_records.sql
- ✅ add_demurrage_record_permanence.sql
- ✅ add_demurrage_calculation_mode.sql
- ✅ add_feituo_import_tables.sql
- ✅ add_feituo_raw_data_by_group.sql
- ✅ add_feituo_port_operation_fields.sql
- ✅ add_ext_feituo_places.sql
- ✅ add_ext_feituo_status_events.sql
- ✅ add_ext_feituo_vessels.sql
- ✅ fix_ext_feituo_places_nullable.sql
- ✅ fix_ext_feituo_status_events_nullable.sql
- ✅ add_sys_data_change_log.sql
- ✅ create_universal_dict_mapping.sql
- ✅ add_inspection_records.sql
- ✅ create_resource_occupancy_tables.sql
- ✅ add_schedule_status.sql
- ✅ add_daily_unload_capacity_to_warehouses.sql
- ✅ add_daily_capacity_to_trucking_companies.sql
- ✅ add_trucking_return_and_yard_capacity.sql
- ✅ add_trucking_port_mapping.sql
- ✅ add_scheduling_config_indexes.sql
- ✅ add_train_port_operation_fields.sql
- ✅ add_trucking_foreign_keys.sql
- ✅ add_last_free_date_source.sql

#### Step 3: 配置与索引 (4 个)
- ✅ add_cost_optimization_config.sql
- ✅ add_cost_optimization_mapping_fields.sql
- ✅ add_calendar_based_capacity.sql
- ✅ 001_add_scheduling_optimization_config.sql

#### Step 4: 数据修复与扩展 (13 个)
- ✅ add_country_to_dict_tables.sql
- ✅ add_country_to_warehouse_trucking_mapping.sql
- ✅ normalize_country_uk_to_gb.sql
- ✅ add_country_concept_comments.sql
- ✅ 006_add_customs_broker_country.sql
- ✅ add_country_to_customs_brokers.sql
- ✅ 006_add_customs_broker_country_data.sql
- ✅ convert_date_to_timestamp.sql
- ✅ add_actual_loading_date.sql
- ✅ add_last_free_date_mode.sql
- ✅ fix-at-port-status.sql
- ✅ update-container-statuses.sql
- ✅ batch-update-all-statuses.sql

#### Step 5: 港口数据 (3 个)
- ✅ add_common_ports.sql
- ✅ add_savannah_port.sql
- ✅ fix_port_field_length.sql

#### Step 6: 智能处理与其他 (11 个)
- ✅ 008_add_intelligent_processing.sql
- ✅ add_transport_fee_to_warehouse_trucking_mapping.sql
- ✅ add_transport_fee_to_trucking_port_mapping.sql
- ✅ add_manual_override_fields_to_occupancy_tables.sql
- ✅ create_flow_definitions_table.sql
- ✅ create_flow_instances_table.sql
- ✅ backfill_customer_code_from_sell_to_country.sql
- ✅ backfill_last_free_date.sql
- ✅ backfill_last_return_date.sql
- ✅ add_container_number_to_replenishment_orders.sql
- ✅ add_hold_date_fields.sql
- ✅ add_status_event_terminal_name.sql
- ✅ insert_empty_return_data.sql

---

### ❌ 缺失的脚本（共 17 个）

#### 1. **Hypertable 相关脚本**（不需要，已回滚）
以下脚本是 TimescaleDB hypertable 相关，但数据库已改为普通 PostgreSQL 表，**不应执行**：
- ❌ add-hypertable-primary-keys.sql
- ❌ change_port_operations_hypertable_partition_key.sql
- ❌ convert-to-hypertables.sql
- ❌ execute-hypertable-migration-fixed.sql
- ❌ execute-hypertable-migration.sql
- ❌ fix-remaining-hypertables.sql
- ❌ fix_port_operations_remove_hypertable.sql
- ❌ rollback-hypertable.sql

**状态**: ✅ **正确排除** - 这些脚本不应该加入

#### 2. **日期字段修复脚本**（需要添加）
- ❌ **fix_actual_loading_date_null_constraint.sql** - 修复 actual_loading_date NULL约束
- ❌ **remove_actual_loading_date_not_null.sql** - 移除 NOT NULL约束
- ❌ **rollback_timestamp_to_date.sql** - 日期类型回滚

**建议**: 检查是否需要添加到 Step 4

#### 3. **状态事件修复脚本**（需要添加）
- ❌ **add_status_event_terminal_name.sql** - ✅ 已包含在 Step 6
- ❌ **fix_port_operations_ata_manual.sql** - 修复 ATA 手动填充逻辑
- ❌ **fix_port_operations_ata_null.sql** - 修复 ATA NULL 约束

**建议**: 检查后两个脚本是否需要

#### 4. **统一时间类型脚本**（重要）
- ❌ **unify-datetime-types.sql** - 统一时间字段类型

**建议**: 应该添加到 Step 4

#### 5. **其他脚本**
- ❌ **add_transport_fee_to_mapping.sql** - 通用运输费用字段（可能是重复或总括脚本）
- ❌ **update-container-statuses.sql** - ✅ 已包含在 Step 4

---

## ✅ 最终建议

### 应该添加的脚本（优先级排序）

#### P0 - 必须添加
1. **unify-datetime-types.sql** - 统一时间字段类型，避免类型冲突

#### P1 - 建议添加
2. **fix_actual_loading_date_null_constraint.sql** - 如果存在 NULL约束问题
3. **remove_actual_loading_date_not_null.sql** - 如果需要允许 NULL

#### P2 - 待确认
4. **fix_port_operations_ata_manual.sql** - 需要检查内容
5. **fix_port_operations_ata_null.sql** - 需要检查内容

### 不应该添加的脚本
- ❌ 所有 hypertable 相关脚本（8 个）- 数据库架构已改变
- ❌ rollback_timestamp_to_date.sql - 除非需要回滚日期类型

---

## 🔍 验证方法

执行以下命令检查数据库实际结构：

```powershell
# 检查时间字段类型是否统一
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name IN ('process_sea_freight', 'biz_containers') 
AND column_name LIKE '%date%' 
ORDER BY table_name, column_name;
"

# 检查 actual_loading_date 约束
docker exec -i logix-timescaledb-prod psql -U logix_user -d logix_db -c "
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'process_sea_freight' 
AND column_name = 'actual_loading_date';
"
```

---

**生成时间**: 2026-03-24  
**检查依据**: SKILL 规范 - 基于权威源验证，杜绝虚构
