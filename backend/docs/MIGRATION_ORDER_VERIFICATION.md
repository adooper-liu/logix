# 迁移脚本执行顺序验证

## 依赖关系图

```
01_drop_all_tables
       ↓
03_create_tables (创建所有基础表)
       ↓
02_init_dict_tables_final (INSERT 字典数据，含 dict_ports, dict_warehouses 等)
       ↓
04_fix_constraints (ALTER 添加 FK、CHECK 等约束)
       ↓
05_init_warehouses (TRUNCATE dict_warehouses + INSERT 129 个真实仓库)
       ↓
[迁移 1] add_sys_data_change_log          ← 独立表，无 FK
[迁移 2] add_destination_port_to_demurrage_records  ← ALTER ext_demurrage_records
[迁移 3] add_demurrage_record_permanence   ← ALTER ext_demurrage_records
[迁移 4] add_feituo_raw_data_by_group     ← ALTER ext_feituo_import_table1/2
[迁移 5] create_universal_dict_mapping    ← 独立表 + 函数，无 FK
       ↓
[数据] add_savannah_port    ← INSERT dict_ports (USSAV 完整数据，先执行以覆盖)
[数据] add_common_ports     ← INSERT dict_ports (ON CONFLICT DO NOTHING)
```

## 验证结论

### 1. 主流程 (01→03→02→04→05)

| 步骤 | 依赖 | 验证 |
|------|------|------|
| 01 | 无 | ✅ |
| 03 | 无 | ✅ 创建表，含 dict_*, biz_*, process_*, ext_* |
| 02 | 03 | ✅ 需 dict_* 表存在；INSERT 顺序与 03 表顺序一致 |
| 04 | 03, 02 | ✅ FK 引用 dict_ports, dict_shipping_companies 等，02 已插入 |
| 05 | 03, 02 | ✅ TRUNCATE dict_warehouses CASCADE；需 dict_overseas_companies 存在（02 已插入） |

### 2. 迁移脚本 (依赖 03)

| 迁移 | 操作对象 | 依赖 | 验证 |
|------|----------|------|------|
| add_sys_data_change_log | CREATE sys_data_change_log | 无 | ✅ 独立表 |
| add_destination_port_to_demurrage_records | ALTER ext_demurrage_records | 03 创建 ext_demurrage_records | ✅ |
| add_demurrage_record_permanence | ALTER ext_demurrage_records | 同上 | ✅ 与上一迁移同表，顺序无影响 |
| add_feituo_raw_data_by_group | ALTER ext_feituo_import_table1/2 | 03 创建 | ✅ |
| create_universal_dict_mapping | CREATE dict_universal_mapping + 函数 | 无 | ✅ 独立表 |

### 3. 港口数据 (依赖 02 或 03)

| 脚本 | 操作 | 依赖 | 验证 |
|------|------|------|------|
| add_savannah_port | INSERT dict_ports (USSAV) | dict_ports 存在 | ✅ 先执行，写入 USSAV 完整数据 |
| add_common_ports | INSERT dict_ports (22 港) | dict_ports 存在 | ✅ ON CONFLICT DO NOTHING，USSAV 已存在则跳过 |

### 4. 潜在冲突与处理

- **dict_warehouses**：02 插入 5 条，05 TRUNCATE 后插入 129 条 →  intentional，05 为最终数据源
- **dict_ports USSAV**：add_savannah_port 先执行，写入完整 USSAV；add_common_ports 后执行，USSAV 冲突则跳过
- **ext_demurrage_records**：迁移 2、3 均 ALTER 同一表，ADD COLUMN IF NOT EXISTS 可重复执行，顺序无影响

### 5. 01_drop_all_tables 删除顺序

子表先删，避免 FK 级联异常：

- biz_container_skus → biz_containers
- ext_feituo_import_table1/2 → ext_feituo_import_batch
- 其余表 CASCADE 可处理依赖
