# LogiX 智能排柜新增参数与数据库修改方案

> 基于与外部脚本（containerPlanning_0815.py、ContainerPlanning - 0913_release.java）对照，补齐 LogiX 智能排柜能力。
> 版本：v1.0 | 2026-03

---

## 一、需新增的参数（按能力划分）

### 1. 车队送还能力（Drop 模式）

| 参数 | 含义 | 用途 |
|------|------|------|
| `daily_return_capacity` | 车队每日可还箱数量 | 限制车队当日还箱上限；NULL 表示与 daily_capacity 共用 |
| `daily_delivery_capacity` | 车队每日可送柜数量 | 可选，送还可共用 daily_capacity |

**说明**：当前 `dict_trucking_companies.daily_capacity` 仅用于送柜；Drop 模式下还箱日在卸柜日+1，需单独约束车队还箱档期。

### 2. 车队堆场

| 参数 | 含义 | 用途 |
|------|------|------|
| `has_yard` | 是否有堆场 | 有堆场时可提<送；无则提=送=卸（Live load） |
| `yard_daily_capacity` | 堆场每日可容纳柜数 | 堆场档期约束 |

**说明**：`dict_trucking_port_mapping` 已有 `yard_capacity`、`yard_operation_fee`，但为港口×车队维度；车队级 `has_yard` 用于判断是否支持 Drop 模式。

### 3. 仓库卸柜能力

| 参数 | 含义 | 用途 |
|------|------|------|
| `daily_unload_capacity` | 仓库每日卸柜容量 | 限制当日卸柜数量 |

**说明**：Warehouse 实体已有 `dailyUnloadCapacity`，但 `03_create_tables.sql` 中 `dict_warehouses` 表**未定义**该字段，需补充。

### 4. 周末/节假日

| 参数 | 含义 | 用途 |
|------|------|------|
| `skip_weekends` | 是否跳过周末 | 卸柜日、还箱日避开周六日 |
| `holiday_calendar` | 节假日配置 | 可选，用于更精细的日期约束 |

### 5. 成本相关（可选，用于后续优化）

| 参数 | 含义 | 用途 |
|------|------|------|
| `trucking_fee` | 拖卡费 | 港口×车队×仓库价格 |
| `yard_fee` | 堆场费 | 堆场停留费用 |

**说明**：`dict_trucking_port_mapping` 已有 `standard_rate`、`yard_operation_fee`，可复用或扩展。

---

## 二、数据库表修改方案

### 2.1 表结构修改（按优先级）

#### 2.1.1 `dict_trucking_companies`（车队表）

```sql
-- 新增字段
ALTER TABLE dict_trucking_companies
ADD COLUMN IF NOT EXISTS daily_return_capacity INTEGER DEFAULT NULL,   -- 每日还箱能力（柜数），NULL=与daily_capacity共用
ADD COLUMN IF NOT EXISTS has_yard BOOLEAN DEFAULT FALSE,                 -- 是否有堆场
ADD COLUMN IF NOT EXISTS yard_daily_capacity INTEGER DEFAULT NULL;       -- 堆场日容量（有堆场时）
```

#### 2.1.2 `dict_warehouses`（仓库表）

```sql
-- 新增字段（实体已有，SQL 表需补充）
ALTER TABLE dict_warehouses
ADD COLUMN IF NOT EXISTS daily_unload_capacity INTEGER DEFAULT 10;        -- 每日卸柜容量
```

#### 2.1.3 `ext_trucking_slot_occupancy`（拖车档期占用表）

**现状**：按 `(trucking_company_id, date, port_code, warehouse_code)` 记录送柜档期，**未区分还箱**。

**修改**：增加 `slot_type` 区分送柜与还箱：

```sql
-- 若表已存在，需迁移脚本；若在 03_create_tables.sql 中新建，则直接包含
ALTER TABLE ext_trucking_slot_occupancy
ADD COLUMN IF NOT EXISTS slot_type VARCHAR(16) DEFAULT 'delivery';        -- 'delivery' | 'return'

-- 还箱记录：port_code/warehouse_code 可空，或存 return_terminal_code
-- 唯一约束需调整：(trucking_company_id, date, slot_type, COALESCE(port_code,''), COALESCE(warehouse_code,''))
```

**或**：新建 `ext_trucking_return_slot_occupancy` 专门记录还箱档期（结构更清晰）：

```sql
CREATE TABLE IF NOT EXISTS ext_trucking_return_slot_occupancy (
  id SERIAL PRIMARY KEY,
  trucking_company_id VARCHAR(50) NOT NULL,
  slot_date DATE NOT NULL,
  planned_count INTEGER DEFAULT 0,
  capacity INTEGER DEFAULT 0,
  remaining INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trucking_company_id, slot_date)
);
```

#### 2.1.4 系统配置（周末/节假日）

**方案 A：若已有 system_config 或类似表**

```sql
INSERT INTO system_config (key, value, description) VALUES
('scheduling_skip_weekends', 'true', '智能排柜是否跳过周末'),
('scheduling_holiday_calendar', '[]', '节假日日期 JSON 数组')
ON CONFLICT (key) DO NOTHING;
```

**方案 B：新建配置表**

```sql
CREATE TABLE IF NOT EXISTS dict_scheduling_config (
  id SERIAL PRIMARY KEY,
  config_key VARCHAR(64) UNIQUE NOT NULL,
  config_value TEXT,
  description VARCHAR(255)
);

INSERT INTO dict_scheduling_config (config_key, config_value, description) VALUES
('skip_weekends', 'true', '卸柜/还箱日是否跳过周末')
ON CONFLICT (config_key) DO NOTHING;
```

### 2.2 需在 03_create_tables.sql 中补充的表

以下表在实体中存在、在 `01_drop_all_tables.sql` 中有 DROP，但 **03_create_tables.sql 中未定义**，需补充：

| 表名 | 用途 |
|------|------|
| `ext_warehouse_daily_occupancy` | 仓库日产能占用 |
| `ext_trucking_slot_occupancy` | 拖车送柜档期占用 |
| `ext_trucking_return_slot_occupancy` | 拖车还箱档期占用（新建） |
| `dict_yards` | 第三堆场字典 |
| `ext_yard_daily_occupancy` | 第三堆场日占用 |

**ext_warehouse_daily_occupancy**（参考 ExtWarehouseDailyOccupancy 实体）：

```sql
CREATE TABLE IF NOT EXISTS ext_warehouse_daily_occupancy (
  id SERIAL PRIMARY KEY,
  warehouse_code VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  planned_count INT DEFAULT 0,
  capacity INT DEFAULT 0,
  remaining INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(warehouse_code, date)
);
```

**ext_trucking_slot_occupancy**（参考 ExtTruckingSlotOccupancy 实体）：

```sql
CREATE TABLE IF NOT EXISTS ext_trucking_slot_occupancy (
  id SERIAL PRIMARY KEY,
  trucking_company_id VARCHAR(50) NOT NULL,
  date DATE NOT NULL,
  port_code VARCHAR(50),
  warehouse_code VARCHAR(50),
  planned_trips INT DEFAULT 0,
  capacity INT DEFAULT 0,
  remaining INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(trucking_company_id, date, COALESCE(port_code,''), COALESCE(warehouse_code,''))
);
```

**dict_yards**（参考 Yard 实体）：

```sql
CREATE TABLE IF NOT EXISTS dict_yards (
  yard_code VARCHAR(50) PRIMARY KEY,
  yard_name VARCHAR(100) NOT NULL,
  yard_name_en VARCHAR(200),
  port_code VARCHAR(50),
  daily_capacity INT DEFAULT 100,
  fee_per_day DECIMAL(10,2) DEFAULT 0,
  address VARCHAR(300),
  contact_phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**ext_yard_daily_occupancy**（参考 ExtYardDailyOccupancy 实体）：

```sql
CREATE TABLE IF NOT EXISTS ext_yard_daily_occupancy (
  id SERIAL PRIMARY KEY,
  yard_code VARCHAR(50) NOT NULL,
  yard_name VARCHAR(100),
  date DATE NOT NULL,
  planned_count INT DEFAULT 0,
  capacity INT DEFAULT 0,
  remaining INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(yard_code, date)
);
```

---

## 三、修改优先级建议

| 优先级 | 修改项 | 说明 |
|--------|--------|------|
| **P0** | `dict_trucking_companies` 新增 `daily_return_capacity` | 支持 Drop 模式车队还箱能力 |
| **P0** | `dict_warehouses` 新增 `daily_unload_capacity` | 与实体对齐，确保表有该字段 |
| **P0** | 03_create_tables.sql 补充 `ext_warehouse_daily_occupancy`、`ext_trucking_slot_occupancy` | 表结构基准完整性 |
| **P1** | `dict_trucking_companies` 新增 `has_yard`、`yard_daily_capacity` | 支持堆场方案 |
| **P1** | 新建 `ext_trucking_return_slot_occupancy` 或扩展 `ext_trucking_slot_occupancy` | 还箱档期约束 |
| **P1** | 系统配置 `skip_weekends` | 支持周末跳过 |
| **P2** | 03_create_tables.sql 补充 `dict_yards`、`ext_yard_daily_occupancy` | 第三堆场方案 |
| **P2** | `dict_trucking_port_mapping` 新增 `trucking_fee`（若与 standard_rate 语义不同） | 支持成本优化 |

---

## 四、与现有结构的关系

- **ExtWarehouseDailyOccupancy**：`daily_unload_capacity` 作为 capacity 上限，与 planned_count 比较。
- **ExtTruckingSlotOccupancy**：当前仅记录送柜；还箱需单独表或 slot_type 扩展。
- **dict_warehouse_trucking_mapping**：保持现有结构，车队送还能力在 `dict_trucking_companies` 中维护。
- **03_create_tables.sql**：所有新增字段和表需同步写入，作为唯一基准。

---

## 五、实施顺序建议

1. 在 `03_create_tables.sql` 中补充上述字段和表。
2. 编写迁移脚本（ALTER TABLE）供已有库升级。
3. 更新对应 TypeORM 实体（TruckingCompany、Warehouse、ExtTruckingSlotOccupancy 等）。
4. 在 `intelligentScheduling.service.ts` 中：
   - 读取 `daily_return_capacity`、`has_yard`、`yard_daily_capacity`；
   - 还箱日扣减 `ext_trucking_return_slot_occupancy` 或带 `slot_type='return'` 的记录；
   - 应用 `skip_weekends` 跳过周六日。
5. 前端如需配置，再增加配置界面和接口。
