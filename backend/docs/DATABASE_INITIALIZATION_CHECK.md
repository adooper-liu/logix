# 数据库初始化代码检查报告

**检查日期**: 2026-02-24
**检查范围**: SQL脚本、TypeORM配置、实体类同步
**版本**: v1.0

---

## 📋 执行摘要

| 检查项 | 状态 | 优先级 |
|--------|------|--------|
| SQL表结构脚本 | ⚠️ 需更新 | 高 |
| SQL初始数据脚本 | ✅ 完整 | 中 |
| TypeORM实体注册 | ⚠️ 不完整 | 高 |
| 字典表实体 | ❌ 缺失 | 高 |
| 同步配置 | ⚠️ 需优化 | 中 |

---

## 🔍 详细检查结果

### 1. SQL脚本检查

#### ✅ init-database-complete.sql (718行)

**位置**: `scripts/init-database-complete.sql`

**状态**: ✅ **完整但需更新**

**包含内容**:

##### ✅ 已创建的表 (26张)

| 类别 | 表数量 | 状态 |
|------|--------|------|
| 字典表 | 7 | ✅ |
| 业务表 | 2 | ✅ |
| 流程表 | 5 | ✅ |
| 飞驼扩展表 | 4 | ✅ |
| 扩展表 | 2 | ✅ |
| 系统表 | 6 | ✅ |

##### ⚠️ 发现的问题

**问题1: container_loading_records 表字段不完整**

SQL脚本中的字段 (27个):
```sql
CREATE TABLE IF NOT EXISTS container_loading_records (
    id, container_number, route_path,
    origin_code, origin_name_standard, origin_name_original,
    origin_latitude, origin_longitude, origin_timezone,
    destination_code, destination_name_standard, destination_name_original,
    destination_cargo_location, destination_latitude, destination_longitude, destination_timezone,
    transport_mode, transport_info,
    estimated_departure_time, estimated_arrival_time, actual_arrival_time,
    created_at, updated_at
)
```

实体类中的字段 (32个):
```typescript
// SQL 缺失的 5 个关键字段:
vesselName, voyageNumber,                    // 船舶信息
billOfLadingNumber, bookingNumber,          // 提单订舱
routeCode,                                   // 航线编码
carrierCode, carrierName, operator           // 船公司
```

**影响**: 🔴 严重 - FeiTuoAdapter 无法保存完整的装载记录

---

**问题2: container_loading_records 表列名与实体不匹配**

实体类使用 `@Column` 的 `name` 参数指定数据库列名:
```typescript
@Column({ type: 'varchar', length: 50, nullable: true, name: 'origin_port_code' })
originPortCode?: string;  // 数据库列名: origin_port_code
```

但 SQL 脚本中使用的是 `origin_code`，需要统一。

---

#### ✅ init-database.sql (205行)

**位置**: `scripts/init-database.sql`

**状态**: ✅ **初始数据完整**

**包含数据**:
- ✅ 港口字典 (7条)
- ✅ 船公司字典 (4条)
- ✅ 柜型字典 (5条)
- ✅ 货代公司字典 (3条)
- ✅ 拖车公司字典 (2条)
- ✅ 仓库字典 (3条)
- ✅ 系统用户 (2条)
- ✅ 角色 (3条)
- ✅ 示例业务数据 (备货单、货柜、海运、港口操作)
- ✅ 滞港费标准 (3条)

**问题**: ⚠️ 依赖表结构先创建，需要与 init-database-complete.sql 配合使用

---

### 2. TypeORM 配置检查

#### ⚠️ 实体注册不完整

**位置**: `src/database/index.ts`

**当前注册的实体** (14个):
```typescript
entities: [
  // 字典表 (Dictionary Tables) - 2个
  ContainerType,
  Warehouse,

  // 业务表 (Business Tables) - 2个
  ReplenishmentOrder,
  Container,

  // 流程表 (Process Tables) - 5个
  SeaFreight,
  PortOperation,
  TruckingTransport,
  WarehouseOperation,
  EmptyReturn,

  // 飞驼扩展表 (FeiTuo Extension Tables) - 4个
  ContainerStatusEvent,
  ContainerLoadingRecord,
  ContainerHoldRecord,
  ContainerCharge
]
```

**❌ 缺失的实体** (5个):

1. **Port** (港口字典)
   - SQL表: `dict_ports`
   - 实体文件: ❌ 不存在
   - 状态: 🔴 需要创建

2. **ShippingCompany** (船公司字典)
   - SQL表: `dict_shipping_companies`
   - 实体文件: ❌ 不存在
   - 状态: 🔴 需要创建

3. **FreightForwarder** (货代公司字典)
   - SQL表: `dict_freight_forwarders`
   - 实体文件: ❌ 不存在
   - 状态: 🔴 需要创建

4. **CustomsBroker** (清关公司字典)
   - SQL表: `dict_customs_brokers`
   - 实体文件: ❌ 不存在
   - 状态: 🔴 需要创建

5. **TruckingCompany** (拖车公司字典)
   - SQL表: `dict_trucking_companies`
   - 实体文件: ❌ 不存在
   - 状态: 🔴 需要创建

---

#### ⚠️ 同步模式配置

**当前配置**:
```typescript
synchronize: databaseConfig.synchronize,
```

**问题**:
- ⚠️ 如果 `synchronize: true`，TypeORM 会自动同步，但可能与手动SQL冲突
- ⚠️ 建议生产环境使用 `synchronize: false`，配合迁移脚本

**建议**:
```typescript
// 开发环境
synchronize: config.nodeEnv === 'development',

// 生产环境使用迁移脚本
// npm run migration:run
```

---

### 3. 实体类与SQL脚本对比

#### ✅ 已匹配的表 (14张)

| 实体类 | SQL表 | 状态 |
|--------|-------|------|
| ContainerType | dict_container_types | ✅ |
| Warehouse | dict_warehouses | ✅ |
| ReplenishmentOrder | biz_replenishment_orders | ✅ |
| Container | biz_containers | ✅ |
| SeaFreight | process_sea_freight | ✅ |
| PortOperation | process_port_operations | ✅ |
| TruckingTransport | process_trucking | ✅ |
| WarehouseOperation | process_warehouse_operations | ✅ |
| EmptyReturn | process_empty_returns | ✅ |
| ContainerStatusEvent | container_status_events | ✅ |
| ContainerLoadingRecord | container_loading_records | ⚠️ 部分字段 |
| ContainerHoldRecord | container_hold_records | ✅ |
| ContainerCharge | container_charges | ✅ |

#### ❌ 缺失的实体 (5张)

| SQL表 | 对应实体 | 优先级 |
|-------|---------|--------|
| dict_ports | Port | 🔴 高 |
| dict_shipping_companies | ShippingCompany | 🔴 高 |
| dict_freight_forwarders | FreightForwarder | 🟡 中 |
| dict_customs_brokers | CustomsBroker | 🟡 中 |
| dict_trucking_companies | TruckingCompany | 🟡 中 |

---

### 4. 字段一致性检查

#### 🔴 ContainerLoadingRecord 字段差异

| 分类 | SQL脚本 | 实体类 | 差异 |
|------|---------|--------|------|
| **船舶信息** | 0 | 2 | ❌ -2 |
| - vesselName | ❌ | ✅ | 缺失 |
| - voyageNumber | ❌ | ✅ | 缺失 |
| **提单订舱** | 0 | 2 | ❌ -2 |
| - billOfLadingNumber | ❌ | ✅ | 缺失 |
| - bookingNumber | ❌ | ✅ | 缺失 |
| **时间节点** | 3 | 6 | ❌ -3 |
| - etaOrigin | ❌ | ✅ | 缺失 |
| - ataOrigin | ❌ | ✅ | 缺失 |
| - loadingDate | ❌ | ✅ | 缺失 |
| - dischargeDate | ❌ | ✅ | 缺失 |
| **航线船公司** | 0 | 4 | ❌ -4 |
| - routeCode | ❌ | ✅ | 缺失 |
| - carrierCode | ❌ | ✅ | 缺失 |
| - carrierName | ❌ | ✅ | 缺失 |
| - operator | ❌ | ✅ | 缺失 |

**缺失字段总计**: 🔴 **11 个字段**

---

### 5. 外键关联检查

#### ✅ 已定义的外键

| 表 | 外键 | 引用表 | 状态 |
|----|------|--------|------|
| biz_containers | order_number | biz_replenishment_orders | ✅ |
| biz_containers | container_type_code | dict_container_types | ✅ |
| process_sea_freight | container_number | biz_containers | ✅ |
| process_port_operations | container_number | biz_containers | ✅ |
| process_trucking | container_number | biz_containers | ✅ |
| process_warehouse_operations | container_number | biz_containers | ✅ |
| process_warehouse_operations | warehouse_id | dict_warehouses | ✅ |
| process_empty_returns | container_number | biz_containers | ✅ |
| container_status_events | container_number | biz_containers | ✅ |
| container_loading_records | container_number | biz_containers | ✅ |
| container_hold_records | container_number | biz_containers | ✅ |
| container_charges | container_number | biz_containers | ✅ |

#### ⚠️ 可能缺失的外键

| 表 | 字段 | 应引用 | 状态 |
|----|------|--------|------|
| process_sea_freight | shipping_company_id | dict_shipping_companies | ❌ 无外键 |
| process_sea_freight | freight_forwarder_id | dict_freight_forwarders | ❌ 无外键 |
| process_trucking | trucking_company_id | dict_trucking_companies | ❌ 无外键 |

**影响**: 🟡 中等 - 数据完整性约束不足

---

## 🎯 优先级修复建议

### 🔴 高优先级 (本周完成)

#### 1. 创建缺失的字典表实体

**文件位置**: `src/entities/Port.ts`
```typescript
@Entity('dict_ports')
export class Port {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  portCode: string;

  @Column({ type: 'varchar', length: 100 })
  portName: string;

  // ... 其他字段
}
```

**需要创建的实体**:
- `Port.ts` - 港口字典
- `ShippingCompany.ts` - 船公司字典
- `FreightForwarder.ts` - 货代公司字典
- `CustomsBroker.ts` - 清关公司字典
- `TruckingCompany.ts` - 拖车公司字典

---

#### 2. 更新 container_loading_records SQL表

**位置**: `scripts/init-database-complete.sql`

**需要添加的字段**:
```sql
ALTER TABLE container_loading_records ADD COLUMN vessel_name VARCHAR(200);
ALTER TABLE container_loading_records ADD COLUMN voyage_number VARCHAR(50);
ALTER TABLE container_loading_records ADD COLUMN bill_of_lading_number VARCHAR(100);
ALTER TABLE container_loading_records ADD COLUMN booking_number VARCHAR(100);
ALTER TABLE container_loading_records ADD COLUMN route_code VARCHAR(50);
ALTER TABLE container_loading_records ADD COLUMN carrier_code VARCHAR(50);
ALTER TABLE container_loading_records ADD COLUMN carrier_name VARCHAR(200);
ALTER TABLE container_loading_records ADD COLUMN operator VARCHAR(200);
ALTER TABLE container_loading_records ADD COLUMN eta_origin TIMESTAMP;
ALTER TABLE container_loading_records ADD COLUMN ata_origin TIMESTAMP;
ALTER TABLE container_loading_records ADD COLUMN loading_date TIMESTAMP;
ALTER TABLE container_loading_records ADD COLUMN discharge_date TIMESTAMP;

-- 重命名列以匹配实体
ALTER TABLE container_loading_records RENAME COLUMN origin_code TO origin_port_code;
ALTER TABLE container_loading_records RENAME COLUMN destination_code TO dest_port_code;
```

---

#### 3. 更新 TypeORM 实体注册

**位置**: `src/database/index.ts`

```typescript
entities: [
  // 字典表 (Dictionary Tables) - 7个
  Port,                    // ✅ 新增
  ShippingCompany,         // ✅ 新增
  FreightForwarder,        // ✅ 新增
  CustomsBroker,           // ✅ 新增
  TruckingCompany,         // ✅ 新增
  ContainerType,
  Warehouse,

  // 业务表 (Business Tables) - 2个
  ReplenishmentOrder,
  Container,

  // 流程表 (Process Tables) - 5个
  SeaFreight,
  PortOperation,
  TruckingTransport,
  WarehouseOperation,
  EmptyReturn,

  // 飞驼扩展表 (FeiTuo Extension Tables) - 4个
  ContainerStatusEvent,
  ContainerLoadingRecord,
  ContainerHoldRecord,
  ContainerCharge
]
```

---

### 🟡 中优先级 (本月完成)

#### 4. 创建TypeORM迁移脚本

**位置**: `src/database/migrations/`

**示例迁移文件**: `1700000000000-InitialSchema.ts`
```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 创建所有表
    await queryRunner.query(`
      CREATE TABLE dict_ports (
        port_code VARCHAR(50) PRIMARY KEY,
        port_name VARCHAR(100) NOT NULL,
        ...
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 回滚
    await queryRunner.query(`DROP TABLE dict_ports`);
  }
}
```

---

#### 5. 优化同步配置

**位置**: `src/config/database.config.ts`

```typescript
export const databaseConfig = {
  // ... 其他配置
  synchronize: process.env.NODE_ENV === 'development',  // 仅开发环境同步
  logging: process.env.NODE_ENV === 'development',      // 仅开发环境日志
};
```

---

### 🟢 低优先级 (下月完成)

#### 6. 添加数据完整性约束

```sql
-- 添加缺失的外键约束
ALTER TABLE process_sea_freight
  ADD CONSTRAINT fk_sea_freight_shipping_company
  FOREIGN KEY (shipping_company_id) REFERENCES dict_shipping_companies(company_code);

ALTER TABLE process_sea_freight
  ADD CONSTRAINT fk_sea_freight_freight_forwarder
  FOREIGN KEY (freight_forwarder_id) REFERENCES dict_freight_forwarders(forwarder_code);
```

---

## 📊 统计汇总

### 完成度统计

| 类别 | SQL表 | 实体类 | 完成度 |
|------|-------|--------|--------|
| 字典表 | 7 | 2 | 29% 🔴 |
| 业务表 | 2 | 2 | 100% ✅ |
| 流程表 | 5 | 5 | 100% ✅ |
| 飞驼扩展表 | 4 | 4 | 100% ✅ |
| 扩展表 | 2 | 0 | 0% ⚠️ |
| 系统表 | 6 | 0 | 0% ⚠️ |
| **总计** | **26** | **13** | **50%** 🟡 |

### 字段匹配度

| 表 | SQL字段 | 实体字段 | 匹配度 |
|----|---------|---------|--------|
| container_loading_records | 27 | 32 | 84% ⚠️ |
| 其他13张表 | - | - | 100% ✅ |

---

## 🚀 修复计划

### Week 1 (立即执行)

- [ ] 创建5个缺失的字典表实体
- [ ] 更新 container_loading_records SQL表
- [ ] 更新 TypeORM 实体注册
- [ ] 运行数据库迁移测试

### Week 2

- [ ] 创建完整的 TypeORM 迁移脚本
- [ ] 优化同步配置
- [ ] 添加数据完整性约束

### Week 3-4

- [ ] 编写单元测试
- [ ] 集成测试
- [ ] 文档更新

---

## 📝 相关文件

| 文件 | 状态 | 说明 |
|------|------|------|
| `scripts/init-database-complete.sql` | ✅ 存在 | 完整的表结构脚本 |
| `scripts/init-database.sql` | ✅ 存在 | 初始数据脚本 |
| `src/database/index.ts` | ⚠️ 需更新 | TypeORM 配置和实体注册 |
| `src/entities/` | ⚠️ 不完整 | 实体类目录 |

---

**检查完成时间**: 2026-02-24
**检查人员**: Auto (AI Assistant)
**总体评价**: 🟡 **中等** - SQL脚本完整，但实体类不完整
