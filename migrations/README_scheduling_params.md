# LogiX 智能排产数据库参数变更方案

## 变更背景

为支持智能排产功能，需要补充车队还箱能力、堆场能力、仓库卸柜能力等参数，并优化相关表结构。

## 新增参数清单

### 车队相关参数
| 参数 | 表 | 类型 | 默认值 | 说明 |
|------|-----|------|--------|------|
| daily_return_capacity | dict_trucking_companies | INT | NULL | 车队还箱日容量（柜/天）|
| has_yard | dict_trucking_companies | BOOLEAN | FALSE | 车队是否有堆场 |
| yard_daily_capacity | dict_trucking_companies | INT | NULL | 车队堆场日容量 |

### 仓库相关参数
| 参数 | 表 | 类型 | 默认值 | 说明 |
|------|-----|------|--------|------|
| daily_unload_capacity | dict_warehouses | INT | 10 | 仓库日卸柜能力（柜/天）|

### 系统配置参数
| 参数 | 表 | 类型 | 默认值 | 说明 |
|------|-----|------|--------|------|
| skip_weekends | dict_scheduling_config | BOOLEAN | true | 是否跳过周末 |
| default_pickup_days_before_customs | dict_scheduling_config | INT | 1 | 提柜在清关前 N 天 |
| default_delivery_days_after_pickup | dict_scheduling_config | INT | 1 | 送仓在提柜后 N 天 |
| default_return_days_after_unload | dict_scheduling_config | INT | 7 | 还箱在卸柜后 N 天 |

## 新建表结构

### 1. ext_trucking_return_slot_occupancy
车队还箱档期占用表

```sql
CREATE TABLE ext_trucking_return_slot_occupancy (
    id SERIAL PRIMARY KEY,
    trucking_company_id VARCHAR(50) NOT NULL,
    trucking_company_name VARCHAR(200),
    country VARCHAR(50) NOT NULL,
    slot_date DATE NOT NULL,
    slot_type VARCHAR(20) DEFAULT 'RETURN',
    used_capacity INTEGER DEFAULT 0,
    max_capacity INTEGER DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**用途**：记录车队每日还箱能力占用情况，与提柜档期分开管理。

### 2. dict_yards
堆场字典表

```sql
CREATE TABLE dict_yards (
    id SERIAL PRIMARY KEY,
    yard_code VARCHAR(50) NOT NULL UNIQUE,
    yard_name VARCHAR(200) NOT NULL,
    country VARCHAR(50) NOT NULL,
    trucking_company_id VARCHAR(50),
    trucking_company_name VARCHAR(200),
    daily_capacity INTEGER DEFAULT 20,
    address TEXT,
    contact_info TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**用途**：管理可用堆场信息，支持多车队、多国家。

### 3. ext_yard_daily_occupancy
堆场占用表（完整版本）

```sql
CREATE TABLE ext_yard_daily_occupancy (
    id SERIAL PRIMARY KEY,
    yard_id INTEGER NOT NULL REFERENCES dict_yards(id),
    yard_code VARCHAR(50) NOT NULL,
    yard_name VARCHAR(200),
    country VARCHAR(50) NOT NULL,
    occupancy_date DATE NOT NULL,
    used_capacity INTEGER DEFAULT 0,
    max_capacity INTEGER DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**用途**：记录每日堆场容量占用，支持还箱计划。

**注意**：create_resource_occupancy_tables.sql 中已存在基础版本的 ext_yard_daily_occupancy（使用 yard_code），此版本为更完整的实现。

### 4. dict_scheduling_config
智能排产配置表

```sql
CREATE TABLE dict_scheduling_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT,
    config_type VARCHAR(20) DEFAULT 'STRING',
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**用途**：集中管理智能排产配置参数，支持动态调整。

## 执行步骤

### 第一步：执行 P0 核心迁移

```bash
# 1. 仓库卸柜能力（已存在）
psql -U logix_user -d logix_db -f migrations/add_daily_unload_capacity_to_warehouses.sql

# 2. 车队提柜能力（已存在）
psql -U logix_user -d logix_db -f migrations/add_daily_capacity_to_trucking_companies.sql

# 3. 基础占用表（已存在）
psql -U logix_user -d logix_db -f migrations/create_resource_occupancy_tables.sql

# 4. 车队还箱能力和堆场支持（新建）
psql -U logix_user -d logix_db -f migrations/add_trucking_return_and_yard_capacity.sql
```

### 第二步：执行 P1 性能优化

```bash
# 索引优化（新建）
psql -U logix_user -d logix_db -f migrations/add_scheduling_config_indexes.sql
```

### 第三步：验证

```bash
# 检查表结构
psql -U logix_user -d logix_db -c "\d dict_trucking_companies"
psql -U logix_user -d logix_db -c "\d dict_warehouses"
psql -U logix_user -d logix_db -c "\dt ext_*"

# 检查配置
psql -U logix_user -d logix_db -c "SELECT * FROM dict_scheduling_config"

# 检查索引
psql -U logix_user -d logix_db -c "\di idx_*"
```

## 完整 SQL 汇总

详见文件：
- `migrations/add_trucking_return_and_yard_capacity.sql` - 核心参数和表
- `migrations/add_scheduling_config_indexes.sql` - 性能优化
- `migrations/IMPLEMENTATION_ORDER.md` - 实施顺序和验证

## 注意事项

1. **已有数据**：所有 ALTER TABLE 使用 `IF EXISTS` 和 `DEFAULT`，不影响现有数据
2. **外键约束**：ext_yard_daily_occupancy 引用 dict_yards，确保先创建字典表
3. **重复执行**：迁移文件可重复执行，不会报错
4. **性能影响**：索引创建可能耗时，建议在业务低峰期执行

## 后续工作

1. **实体更新**：backend/src/entities/ 中更新实体类
2. **服务集成**：intelligentScheduling.service.ts 中使用新参数
3. **前端配置**：提供配置界面管理 dict_scheduling_config
4. **数据初始化**：为现有车队和仓库补充能力数据
5. **测试验证**：执行完整排产流程，验证占用逻辑

## 回滚方案

如需回滚：

```bash
# 删除新建表（谨慎操作）
psql -U logix_user -d logix_db -c "DROP TABLE IF EXISTS ext_trucking_return_slot_occupancy CASCADE"
psql -U logix_user -d logix_db -c "DROP TABLE IF EXISTS ext_yard_daily_occupancy CASCADE"
psql -U logix_user -d logix_db -c "DROP TABLE IF EXISTS dict_yards CASCADE"
psql -U logix_user -d logix_db -c "DROP TABLE IF EXISTS dict_scheduling_config CASCADE"

# 删除字段
psql -U logix_user -d logix_db -c "ALTER TABLE dict_trucking_companies DROP COLUMN IF EXISTS daily_return_capacity"
psql -U logix_user -d logix_db -c "ALTER TABLE dict_trucking_companies DROP COLUMN IF EXISTS has_yard"
psql -U logix_user -d logix_db -c "ALTER TABLE dict_trucking_companies DROP COLUMN IF EXISTS yard_daily_capacity"
```
