# 当前数据库滞港费标准设计检查

## 结论概览

| 项目 | 状态 | 说明 |
|------|------|------|
| **主表结构 03_create_tables.sql** | ✅ 已纳入 | 已定义 **23. ext_demurrage_standards**、**24. ext_demurrage_records**（含 rate_per_day、tiers JSONB） |
| **TypeORM 实体** | ✅ 已实现 | `ExtDemurrageStandard`、`ExtDemurrageRecord`，已注册至 `database/index.ts` |
| **init-database-complete.sql** | ✅ 可参考 | 与主表结构对齐，可选同步增加 rate_per_day、tiers 等字段 |
| **全局配置** | ✅ 存在 | `sys_configs` 中有 `demurrage.default_free_days`、`demurrage.default_currency`（在 init-database-complete 中插入） |
| **迁移脚本** | ⚠️ 曾使用 | `migrations/fix_port_field_length.sql` 对 `ext_demurrage_standards.destination_port_code` 做过 ALTER；若从 03 新建库则无需该迁移 |

---

## 1. 主表结构（03_create_tables.sql）

- **约定**：项目以 `backend/03_create_tables.sql` 为表结构唯一基准。
- **现状**：已纳入 **23. ext_demurrage_standards**、**24. ext_demurrage_records**；标准表含 `rate_per_day`、`tiers`（JSONB）以支持单日费率与阶梯费率，记录表外键 `biz_containers(container_number) ON DELETE CASCADE`。
- **影响**：按 03_create_tables.sql 建库即可创建滞港费标准表与记录表，可供 last_free_date 计算与滞港费计算匹配标准使用。

---

## 2. init-database-complete.sql 中的设计

在 `backend/scripts/init-database-complete.sql` 中**已有**滞港费标准与记录表的完整定义，可与 [02-CONTAINER_SCHEDULING_AND_COST_OPTIMIZATION_PLAN.md](./02-CONTAINER_SCHEDULING_AND_COST_OPTIMIZATION_PLAN.md) 及 [01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md](./01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md) 对齐使用。

### 2.1 ext_demurrage_standards（滞港费标准表）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | SERIAL PRIMARY KEY | 主键 |
| foreign_company_code / foreign_company_name | VARCHAR | 境外/分公司（四字段匹配中用于识别**进口国**） |
| effective_date, expiry_date | DATE | 有效期 |
| destination_port_code, destination_port_name | VARCHAR | 目的港（匹配用） |
| shipping_company_code, shipping_company_name | VARCHAR | 船公司（匹配用） |
| terminal | VARCHAR | 码头 |
| origin_forwarder_code, origin_forwarder_name | VARCHAR | 货代（匹配用） |
| transport_mode_code, transport_mode_name | VARCHAR | 运输方式 |
| charge_type_code, charge_name | VARCHAR | 费用类型/名称（如 Demurrage Charge、Storage Charge） |
| is_chargeable | VARCHAR(1) | 收费标志（Y/N） |
| sequence_number | INT | 序列号 |
| port_condition | VARCHAR | 港口条件 |
| **free_days_basis** | VARCHAR(20) | 免费天数基准（自然日/工作日等） |
| **free_days** | INT | 免费天数 |
| **calculation_basis** | VARCHAR(20) | 计算方式（按到港/按卸船） |
| process_status | VARCHAR | 处理状态 |
| created_at, updated_at | TIMESTAMP | 审计 |

索引：destination_port_code、shipping_company_code、(effective_date, expiry_date)。

**主表 03 已包含**：`rate_per_day`、`tiers`（JSONB）、`currency`，支持单日费率与阶梯费率。  

**四字段匹配中的「进口国」**：不单独建 `destination_country` 列，通过 **`foreign_company_code` / `foreign_company_name`**（境外/分公司）识别进口国别；货柜侧用境外分公司或进口国维度与标准表匹配即可。

### 2.2 ext_demurrage_records（滞港费记录表）

用于存储按柜、按次的滞港费计算结果：container_number、charge_type、charge_name、free_days、free_days_basis、calculation_basis、charge_start_date、charge_end_date、charge_days、charge_amount、currency、charge_status 等。有外键到 `biz_containers(container_number)`。

### 2.3 sys_configs 中的默认配置

- `demurrage.default_free_days` = 7  
- `demurrage.default_currency` = USD  

可在无标准匹配时作为全局默认免费天数与币种。

---

## 3. 已完成的纳入工作

1. **03_create_tables.sql**  
   - 已新增 **23. ext_demurrage_standards**、**24. ext_demurrage_records**；标准表含 `rate_per_day`、`tiers`（JSONB）、`currency`，支持单日费率与阶梯费率。

2. **TypeORM 实体**  
   - `backend/src/entities/ExtDemurrageStandard.ts`、`ExtDemurrageRecord.ts` 已创建；  
   - 已在 `backend/src/entities/index.ts` 导出；  
   - 已在 `backend/src/database/index.ts` 的 `entities` 数组中注册。

3. **后续可选**  
   - **阶梯费率**：标准表已含 `tiers` JSONB，计算逻辑可与 [01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md](./01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md) 对齐。  
   - **四字段匹配**：「进口国」通过 **foreign_company_code / foreign_company_name**（境外/分公司）识别；目的港、船公司、货代对应 `destination_port_code`、`shipping_company_code`、`origin_forwarder_code`。  
   - **last_free_date 计算与滞港费计算服务**：在导入/飞驼同步或手动触发时，根据标准表匹配结果写回 `process_port_operations.last_free_date` 并写入 `ext_demurrage_records`。

---

## 4. 单独迁移（已有库未建滞港费表时）

**新库**：直接执行 `backend/03_create_tables.sql` 即可包含滞港费两张表。  

**已有库**（之前未建这两张表）：不要重跑整个 03，请只执行独立迁移脚本：

- **脚本路径**：`backend/migrations/add_demurrage_standards_and_records.sql`  
- **内容**：仅包含 23. ext_demurrage_standards、24. ext_demurrage_records 的建表与建索引（与 03 中一致）；使用 `CREATE TABLE IF NOT EXISTS`、`CREATE INDEX IF NOT EXISTS`，重复执行不会报错。  
- **前提**：库中已存在 `biz_containers` 表。  

**执行方式（任选其一）**：

```bash
# 方式 1：psql 指定连接参数
psql -h <host> -U <user> -d <database> -f backend/migrations/add_demurrage_standards_and_records.sql

# 方式 2：使用连接串（如 .env 中的 DATABASE_URL）
psql "$DATABASE_URL" -f backend/migrations/add_demurrage_standards_and_records.sql
```

也可在 DBeaver、pgAdmin 等客户端中打开该 SQL 文件并执行。

---

## 5. SQL 与文档一致性校验

迁移脚本 `backend/migrations/add_demurrage_standards_and_records.sql` 已与下列要求核对一致：

| 校验项 | 要求来源 | 结果 |
|--------|----------|------|
| 标准表：四字段匹配 | 03-DEMURRAGE_DATABASE_STATUS §2.1、01-DEMURRAGE_LOGIC §4.1 | 进口国→foreign_company_code/name，目的港→destination_port_code/name，船公司→shipping_company_code/name，货代→origin_forwarder_code/name，均已存在 |
| 标准表：免费天数与计算方式 | 02-方案文档 §2.1、§3.1 | free_days、free_days_basis、calculation_basis 存在且类型一致 |
| 标准表：费率与阶梯 | 02-方案文档 §5.2、03-DEMURRAGE_DATABASE_STATUS §2.1 | rate_per_day DECIMAL(12,2)、tiers JSONB、currency VARCHAR(10) 存在 |
| 标准表：索引 | 文档 | idx_demurrage_std_port、idx_demurrage_std_company、idx_demurrage_std_effective |
| 记录表：字段与外键 | 文档 §2.2 | container_number NOT NULL、charge_*、free_days、charge_amount、currency、charge_status、invoice_*、payment_date、remarks；FOREIGN KEY → biz_containers ON DELETE CASCADE |
| 记录表：索引 | 文档 | idx_demurrage_rec_container、idx_demurrage_rec_status |
| 与 03 主表一致 | 03_create_tables.sql | 建表语句与 03 第 23、24 节逐列一致；本迁移对索引使用 IF NOT EXISTS 以支持重复执行 |

---

**文档版本**：1.0  
**检查依据**：`backend/03_create_tables.sql`、`backend/scripts/init-database-complete.sql`、`backend/scripts/init-database.sql`、`migrations/fix_port_field_length.sql`、`backend/src/entities` 目录。

**本目录关联**：  
- [01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md](./01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md) — 滞港费计算逻辑与免费天数基准。  
- [02-CONTAINER_SCHEDULING_AND_COST_OPTIMIZATION_PLAN.md](./02-CONTAINER_SCHEDULING_AND_COST_OPTIMIZATION_PLAN.md) — 调度与费用优化方案、配置表设计。
