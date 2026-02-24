# LogiX 数据库完整指南

## 📋 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [数据库设计](#数据库设计)
- [实体类参考](#实体类参考)
- [字段一致性](#字段一致性)
- [常用命令](#常用命令)
- [故障排查](#故障排查)

---

## 概述

### 技术选型

| 数据库类型 | 用途 | 选型理由 |
|-----------|------|---------|
| **PostgreSQL** | 主数据库 | 支持复杂查询、事务、JSONB、全文检索 |
| **Redis** | 缓存/会话 | 高性能、支持发布订阅、分布式锁 |
| **Elasticsearch** | 日志/检索 | 全文搜索、日志分析 |

### 数据库分层

```
┌─────────────────────────────────────────────────────────┐
│                   主服务 (Node.js)                       │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ 业务逻辑层   │  │ 数据访问层   │  │ 缓存层     │
│  └──────────────┘  └──────────────┘  └────────────┘  │
└─────────────────────────────────────────────────────────┘
         ↓                     ↓                  ↓
┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐
│  PostgreSQL    │  │  Redis         │  │ Elasticsearch│
│  (主数据)       │  │  (缓存/队列)    │  │  (日志)      │
└─────────────────┘  └─────────────────┘  └─────────────┘
```

### 数据库分层策略

| 分层 | 表前缀 | 说明 |
|------|--------|------|
| **基础数据层** | `dict_` | 字典表(港口、船公司等) |
| **业务数据层** | `biz_` | 业务主表(备货单、货柜) |
| **流程数据层** | `process_` | 流程子表(海运、港口操作等) |
| **扩展数据层** | `ext_` | 扩展配置(滞港费标准等) |
| **系统数据层** | `sys_` | 系统管理(用户、权限等) |

---

## 快速开始

### 1. 安装 PostgreSQL

#### Windows
下载安装: https://www.postgresql.org/download/windows/

#### macOS
```bash
brew install postgresql@16
brew services start postgresql@16
```

#### Linux (Ubuntu)
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. 安装 Redis

#### Windows
下载安装: https://github.com/microsoftarchive/redis/releases

#### macOS
```bash
brew install redis
brew services start redis
```

#### Linux (Ubuntu)
```bash
sudo apt install redis-server
sudo systemctl start redis
```

### 3. 创建数据库

```bash
# 登录 PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE logix_db;

# 退出
\q
```

### 4. 配置环境变量

编辑项目根目录的 `.env` 文件：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_password
DB_DATABASE=logix_db
DB_POOL_MIN=2
DB_POOL_MAX=10

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### 5. 初始化数据库

#### 方法1: 使用SQL脚本（推荐）

```bash
# 执行初始化脚本
psql -U postgres -d logix_db -f scripts/init-database-complete.sql
```

#### 方法2: 使用TypeORM自动同步

```bash
# 安装依赖
npm install

# 启动服务，TypeORM会自动创建表结构
npm run dev
```

### 6. 验证安装

```bash
# 检查数据库连接
psql -U postgres -d logix_db -c "SELECT version();"

# 检查表是否创建
psql -U postgres -d logix_db -c "\dt"
```

应该看到如下表：
- dict_ports
- dict_container_types
- dict_warehouses
- biz_replenishment_orders
- biz_containers
- process_sea_freight
- process_port_operations
- process_trucking
- process_warehouse_operations
- process_empty_returns
- container_status_events
- container_loading_records
- container_hold_records
- container_charges

### Docker 快速启动 (TimescaleDB)

创建 `docker-compose.timescaledb.yml`：

```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    container_name: logix-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: logix_db
      TS_TUNE_MEMORY: 4GB
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ../backend/scripts/init-timescaledb.sql:/docker-entrypoint-initdb.d/init-timescaledb.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: logix-redis
    ports:
      - "6379:6379"

  grafana:
    image: grafana/grafana:latest
    container_name: logix-grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

  prometheus:
    image: prom/prometheus:latest
    container_name: logix-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ../prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
```

启动服务：

```bash
# Windows
tsdb-start

# Linux/Mac
make tsdb-up
```

查看详细 TimescaleDB 集成指南：[TIMESCALEDB_GUIDE.md](../../TIMESCALEDB_GUIDE.md)

  redis:
    image: redis:7-alpine
    container_name: logix-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  pgadmin:
    image: dpage/pgadmin4:latest
    container_name: logix-pgadmin
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@logix.com
      PGADMIN_DEFAULT_PASSWORD: admin123
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  postgres_data:
  redis_data:
```

启动：

```bash
docker-compose up -d
```

---

## 数据库设计

### 数据库表结构（26张表）

#### 表完成度统计

| 表类型 | 总数 | 已完成 | 待创建 | 完成度 |
|--------|------|--------|--------|--------|
| 字典表 | 7 | 3 | 4 | 43% |
| 业务表 | 2 | 2 | 0 | 100% |
| 流程表 | 5 | 5 | 0 | 100% |
| 飞驼扩展表 | 4 | 4 | 0 | 100% |
| 扩展表 | 2 | 0 | 2 | 0% |
| 系统表 | 6 | 0 | 6 | 0% |
| **总计** | **26** | **14** | **12** | **54%** |

#### 已完成的表（14张）

##### 1. 字典表 (3张)

**dict_ports** - 港口字典
- `port_code` (VARCHAR 20) - 港口代码，唯一索引
- `port_name` (VARCHAR 100) - 港口名称
- `port_name_en` (VARCHAR 100) - 港口英文名
- `port_type` (VARCHAR 20) - 港口类型
- `country` (VARCHAR 50) - 所属国家
- `region` (VARCHAR 50) - 所属区域
- `latitude`, `longitude` - 经纬度

**dict_container_types** - 柜型字典
- `type_code` (VARCHAR 20) - 柜型代码
- `type_name` (VARCHAR 100) - 柜型名称
- `length`, `width`, `height` - 尺寸
- `max_weight` - 最大载重

**dict_warehouses** - 仓库字典
- `warehouse_code` (VARCHAR 20) - 仓库代码
- `warehouse_name` (VARCHAR 100) - 仓库名称
- `address` - 地址
- `contact_info` - 联系信息

##### 2. 业务表 (2张)

**biz_replenishment_orders** - 备货单
- `order_number` (VARCHAR 50) - 备货单号，主键
- `main_order_number` - 主备货单号
- `sell_to_country` - 销往国家
- `customer_name` - 客户名称
- `order_status` - 备货单状态
- `trade_mode` - 采购贸易模式
- `price_term` - 价格条款
- `total_containers` - 箱数合计
- `total_volume` - 体积合计
- `total_weight` - 毛重合计
- `total_amount` - 出运总价
- `fob_amount`, `cif_amount`, `negotiation_amount` - 议付金额
- `wayfair_spo` - Wayfair SPO
- `container_required` - 是否需要装柜
- `special_cargo_volume` - 特殊货物体积
- `planned_ship_date`, `actual_ship_date` - 计划/实际出运日期

**biz_containers** - 货柜
- `container_number` (VARCHAR 20) - 集装箱号，主键
- `order_number` - 关联备货单号
- `container_type_code` - 柜型
- `cargo_description` - 货物描述
- `logistics_status` - 物流状态（桑基图状态）
- `inspection_required` - 是否查验
- `is_unboxing` - 是否开箱
- `requires_pallet` - 是否含打托产品
- `container_size` - 箱尺寸
- `is_rolled` - 是否甩柜
- `operator` - 运营方
- `container_holder` - 持箱人
- `tare_weight`, `total_weight` - 皮重/总重
- `over_length`, `over_height` - 超限尺寸
- `danger_class` - 危险品等级

##### 3. 流程表 (5张)

**process_sea_freight** - 海运信息
- `bill_of_lading_number` (VARCHAR 50) - 提单号，主键
- `container_number` - 关联货柜号
- `vessel_name` - 船名
- `voyage_number` - 航次
- `booking_number` - 订舱号
- `origin_port_code`, `dest_port_code` - 起运港/目的港
- `eta_dest_port`, `ata_dest_port` - 预计/实际到港日期
- `bill_type` - 提单类型
- `trade_mode` - 贸易方式
- `shipping_term` - 运输条款
- `mbl_scac`, `mbl_number` - MBL信息
- `hbl_scac`, `hbl_number` - HBL信息
- `ams_number` - AMS Number
- `transit_port_code` - 途经港
- `transport_mode` - 运输方式
- `mother_vessel_name`, `mother_voyage_number` - 母船信息
- `shipment_date`, `mother_shipment_date` - 出运日期
- `document_release_date` - 放单日期
- `port_entry_date` - 进港日期
- `rail_yard_entry_date`, `truck_yard_entry_date` - 堆场日期
- `route_code`, `imo_number`, `mmsi_number` - 航线/船舶信息
- `flag` - 船籍
- `eta_origin`, `ata_origin` - 起运港时间
- `port_open_date`, `port_close_date` - 开港/截港时间

**process_port_operations** - 港口操作
- 自增主键 ID
- `container_number` - 关联货柜号
- `port_type` (origin/transit/destination) - 港口类型
- `port_sequence` - 港口序号
- `port_code`, `port_name` - 港口信息
- `eta_dest_port`, `ata_dest_port` - 预计/实际到港日期
- `customs_status` - 清关状态
- `isf_status` - ISF申报状态
- `last_free_date` - 最后免费日期
- `gate_in_terminal`, `gate_out_terminal` - 进出码头
- `berth_position` - 泊位
- `eta_correction` - ETA修正
- `dest_port_unload_date` - 目的港卸船日期
- `planned_customs_date`, `actual_customs_date` - 清关日期
- `customs_broker_code` - 清关公司
- `document_status` - 清关单据状态
- `all_generated_date` - 全部生成日期
- `customs_remarks` - 异常原因
- `isf_declaration_date`, `document_transfer_date` - ISF/传递日期
- `status_code` - 状态代码
- `status_occurred_at` - 状态发生时间
- `has_occurred` - 是否已发生
- `location_name_en`, `location_name_cn` - 地点名称
- `location_type` - 地点类型
- `latitude`, `longitude` - 经纬度
- `timezone` - 时区
- `data_source` - 数据来源
- `cargo_location` - 货物存储位置

**process_trucking** - 拖卡运输
- 自增主键 ID
- `container_number` - 关联货柜号
- `pickup_company_code`, `pickup_company_name` - 提柜公司
- `pickup_location`, `pickup_address` - 提柜地点
- `pickup_date`, `pickup_time` - 提柜日期/时间
- `warehouse_code`, `warehouse_name` - 仓库信息
- `warehouse_address` - 仓库地址
- `delivery_date`, `delivery_time` - 送仓日期/时间
- `trucking_company_code`, `trucking_company_name` - 拖车公司
- `license_plate` - 车牌号
- `driver_name`, `driver_phone` - 司机信息

**process_warehouse_operations** - 仓库操作
- 自增主键 ID
- `container_number` - 关联货柜号
- `warehouse_code`, `warehouse_name` - 仓库信息
- `warehouse_address` - 仓库地址
- `planned_inbound_date`, `actual_inbound_date` - 入库日期
- `inbound_time` - 入库时间
- `unloading_method` - 卸货方式
- `storage_location` - 堆存位置
- `cargo_condition` - 货物状况
- `planned_outbound_date` - 计划出库日期
- `actual_outbound_date` - 实际出库日期
- `outbound_time` - 出库时间
- `inspector` - 检验员
- `remarks` - 备注

**process_empty_returns** - 还空箱
- 自增主键 ID
- `container_number` - 关联货柜号
- `return_terminal_code`, `return_terminal_name` - 还箱码头
- `return_date`, `return_time` - 还箱日期/时间
- `return_location` - 还箱地点
- `receipt_number` - 回单号

##### 4. 飞驼扩展表 (4张)

**container_status_events** - 集装箱状态节点
- 自增主键 ID
- `container_number` - 关联货柜号
- `event_id` - 事件ID
- `status_code` - 状态代码
- `status_name_en`, `status_name_cn` - 状态名称
- `occurred_at` - 发生时间
- `location_code`, `location_name_en`, `location_name_cn` - 位置信息
- `location_type` - 地点类型
- `latitude`, `longitude` - 经纬度
- `timezone` - 时区
- `data_source` - 数据来源
- `is_final` - 是否最终状态

**container_loading_records** - 集装箱装载记录
- 自增主键 ID
- `container_number` - 关联货柜号
- `record_id` - 记录ID
- `vessel_name`, `voyage_number` - 船名航次
- `bill_of_lading_number` - 提单号
- `booking_number` - 订舱号
- `origin_port_code`, `dest_port_code` - 起运港/目的港
- `eta_origin`, `ata_origin` - 起运港时间
- `eta_dest`, `ata_dest` - 目的港时间
- `loading_date` - 装载日期
- `discharge_date` - 卸货日期
- `route_code` - 航线代码
- `carrier_code`, `carrier_name` - 承运人
- `operator` - 运营方

**container_hold_records** - HOLD记录
- 自增主键 ID
- `container_number` - 关联货柜号
- `hold_reason` - HOLD原因
- `hold_date` - HOLD日期
- `release_date` - 释放日期
- `release_reason` - 释放原因

**container_charges** - 费用记录
- 自增主键 ID
- `container_number` - 关联货柜号
- `charge_type` - 费用类型
- `charge_amount` - 费用金额
- `currency` - 币种
- `charge_date` - 费用日期
- `description` - 费用描述

---

## 实体类参考

### 已创建的实体类（13个）

| 序号 | 实体名称 | 表名 | 说明 | 文件路径 |
|------|---------|------|------|---------|
| 1 | `ReplenishmentOrder` | `biz_replenishment_orders` | 备货单 | `entities/ReplenishmentOrder.ts` |
| 2 | `Container` | `biz_containers` | 货柜 | `entities/Container.ts` |
| 3 | `ContainerType` | `dict_container_types` | 柜型字典 | `entities/ContainerType.ts` |
| 4 | `SeaFreight` | `process_sea_freight` | 海运信息 | `entities/SeaFreight.ts` |
| 5 | `PortOperation` | `process_port_operations` | 港口操作 | `entities/PortOperation.ts` |
| 6 | `TruckingTransport` | `process_trucking` | 拖卡运输 | `entities/TruckingTransport.ts` |
| 7 | `WarehouseOperation` | `process_warehouse_operations` | 仓库操作 | `entities/WarehouseOperation.ts` |
| 8 | `EmptyReturn` | `process_empty_returns` | 还空箱 | `entities/EmptyReturn.ts` |
| 9 | `Warehouse` | `dict_warehouses` | 仓库字典 | `entities/Warehouse.ts` |
| 10 | `ContainerStatusEvent` | `container_status_events` | 状态节点（飞驼） | `entities/ContainerStatusEvent.ts` |
| 11 | `ContainerLoadingRecord` | `container_loading_records` | 装载记录（飞驼） | `entities/ContainerLoadingRecord.ts` |
| 12 | `ContainerHoldRecord` | `container_hold_records` | HOLD记录（飞驼） | `entities/ContainerHoldRecord.ts` |
| 13 | `ContainerCharge` | `container_charges` | 费用记录（飞驼） | `entities/ContainerCharge.ts` |

### 新增字段汇总

#### Container (货柜表) - 新增12个字段

```typescript
// Excel映射
requiresPallet: boolean;              // 是否含打托产品

// 飞驼数据
containerSize: number;                 // 箱尺寸
isRolled: boolean;                     // 是否甩柜
operator: string;                      // 运营方
containerHolder: string;               // 持箱人
tareWeight: number;                    // 箱皮重
totalWeight: number;                   // 箱总重
overLength: number;                    // 超限长度
overHeight: number;                    // 超高
dangerClass: string;                   // 危险品等级
currentStatusDescCn: string;           // 当前状态中文描述
currentStatusDescEn: string;           // 当前状态英文描述
```

#### ReplenishmentOrder (备货单表) - 新增3个字段

```typescript
// Excel映射
containerRequired: boolean;            // 是否需要装柜
specialCargoVolume: number;            // 特殊货物体积
wayfairSpo: string;                   // Wayfair SPO
```

#### SeaFreight (海运信息表) - 新增24个字段

```typescript
// Excel映射
mblScac: string;                      // MBL SCAC
mblNumber: string;                    // MBL Number
hblScac: string;                      // HBL SCAC
hblNumber: string;                    // HBL Number
amsNumber: string;                    // AMS Number
transitPortCode: string;              // 途经港
transportMode: string;                // 运输方式
motherVesselName: string;             // 母船船名
motherVoyageNumber: string;           // 母船航次
shipmentDate: Date;                   // 出运日期
motherShipmentDate: Date;             // 母船出运日期
documentReleaseDate: Date;            // 放单日期
portEntryDate: Date;                  // 进港日期
railYardEntryDate: Date;             // 进火车堆场日期
truckYardEntryDate: Date;            // 进卡车堆场日期

// 飞驼数据
routeCode: string;                    // 航线代码
imoNumber: string;                    // IMO号码
mmsiNumber: string;                  // MMSI号码
flag: string;                        // 船籍
etaOrigin: Date;                     // 起运港ETA
ataOrigin: Date;                     // 起运港ATA
portOpenDate: Date;                  // 开港时间
portCloseDate: Date;                 // 截港时间
```

#### PortOperation (港口操作表) - 新增21个字段

```typescript
// Excel映射
etaCorrection: Date;                  // ETA修正
destPortUnloadDate: Date;            // 目的港卸船/火车日期
plannedCustomsDate: Date;            // 计划清关日期
actualCustomsDate: Date;             // 实际清关日期
customsBrokerCode: string;           // 目的港清关公司
documentStatus: string;              // 清关单据状态
allGeneratedDate: Date;             // 全部生成日期
customsRemarks: string;              // 异常原因
isfDeclarationDate: Date;            // ISF申报日期
documentTransferDate: Date;           // 传递日期

// 飞驼数据
statusCode: string;                  // 状态代码
statusOccurredAt: Date;              // 状态发生时间
hasOccurred: boolean;                // 是否已发生
locationNameEn: string;              // 地点英文名
locationNameCn: string;              // 地点中文名
locationType: string;                // 地点类型
latitude: number;                    // 纬度
longitude: number;                   // 经度
timezone: number;                    // 时区
dataSource: string;                  // 数据来源
cargoLocation: string;               // 货物存储位置
```

### 新建实体详情

#### TruckingTransport (拖卡运输)

13个核心字段：
- 提柜信息：提柜公司、地点、日期、时间
- 送仓信息：仓库、地址、日期、时间
- 车辆信息：拖车公司、车牌、司机姓名、司机电话

#### WarehouseOperation (仓库操作)

17个核心字段：
- 入库信息：日期、时间、仓库、地址
- 操作信息：卸货方式、堆存位置、货物状况
- 时间记录：计划出库、实际出库、检验员

#### EmptyReturn (还空箱)

4个字段：
- 还箱码头、日期、时间、地点、回单号

#### ContainerStatusEvent (飞驼状态节点)

12个字段：
- 状态代码、名称、发生时间
- 位置信息：代码、名称、类型、经纬度
- 数据来源、是否最终状态

#### ContainerLoadingRecord (飞驼装载记录)

20个字段：
- 运输信息：船名、航次、提单号、订舱号
- 港口信息：起运港、目的港
- 时间信息：ETA/ATA、装载/卸货日期
- 承运人、运营方

#### ContainerHoldRecord (飞驼HOLD记录)

4个字段：
- HOLD原因、日期
- 释放日期、释放原因

#### ContainerCharge (飞驼费用记录)

6个字段：
- 费用类型、金额、币种
- 费用日期、描述

---

## 字段一致性

### Excel映射一致性

| 指标 | 更新前 | 更新后 | 提升 |
|------|--------|--------|------|
| 字段覆盖率 | 37% | **100%** | +63% |
| 匹配字段数 | 40 | 108 | +68 |

### 飞驼数据一致性

| 指标 | 更新前 | 更新后 | 提升 |
|------|--------|--------|------|
| 字段覆盖率 | 7% | **100%** | +93% |
| 匹配字段数 | 6 | 83 | +77 |

### 一致性验证

所有字段均已通过以下验证：
- ✅ 字段名称一致性
- ✅ 数据类型匹配
- ✅ 可空性一致
- ✅ 索引优化
- ✅ 外键约束
- ✅ 默认值设置

---

## 常用命令

### PostgreSQL

```bash
# 连接数据库
psql -U postgres -d logix_db

# 备份数据库
pg_dump -U postgres -d logix_db -F c -f logix_backup.dump

# 恢复数据库
pg_restore -U postgres -d logix_db -F c logix_backup.dump

# 查看所有表
\dt

# 查看表结构
\d table_name

# 查看表数据
SELECT * FROM table_name LIMIT 10;

# 执行SQL文件
\i path/to/script.sql

# 退出
\q
```

### Redis

```bash
# 连接 Redis
redis-cli

# 查看所有键
KEYS *

# 查看键的值
GET key

# 设置键值
SET key value

# 删除键
DEL key

# 清空所有数据
FLUSHALL

# 退出
exit
```

### TypeORM

```bash
# 同步数据库结构（开发环境）
npm run typeorm schema:sync

# 生成迁移文件
npm run typeorm migration:generate -n MigrationName

# 运行迁移
npm run typeorm migration:run

# 回滚迁移
npm run typeorm migration:revert
```

---

## 故障排查

### 问题1: 无法连接到 PostgreSQL

**解决方案:**
1. 检查 PostgreSQL 服务是否运行
   ```bash
   # Windows
   Get-Service postgresql-x64-16

   # macOS/Linux
   sudo systemctl status postgresql
   ```

2. 检查防火墙设置

3. 检查 `pg_hba.conf` 配置文件,允许本地连接

### 问题2: 端口已被占用

**解决方案:**
```bash
# 检查端口占用
# Windows
netstat -ano | findstr :5432

# macOS/Linux
lsof -i :5432

# 修改配置文件中的端口号
```

### 问题3: TypeORM 同步失败

**解决方案:**
1. 检查实体类定义是否正确
2. 检查 `.env` 文件配置
3. 查看详细日志:
   ```bash
   npm run dev 2>&1 | grep -i database
   ```

### 问题4: 权限错误

**解决方案:**
```bash
# 授予用户权限
psql -U postgres -d logix_db -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;"
psql -U postgres -d logix_db -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_username;"
```

### 问题5: 数据库性能问题

**解决方案:**
1. 检查慢查询日志
2. 创建合适的索引
3. 优化查询语句
4. 考虑使用连接池

---

## 数据库管理工具推荐

| 工具 | 平台 | 特点 |
|------|------|------|
| pgAdmin | Windows/Mac/Linux | 官方GUI工具,功能全面 |
| DBeaver | Windows/Mac/Linux | 通用数据库工具,支持多种数据库 |
| DataGrip | Windows/Mac/Linux | JetBrains出品,付费但强大 |
| TablePlus | Windows/Mac | 轻量级,界面美观 |
| Postico | Mac | macOS专用,简洁易用 |

---

## 下一步

- [ ] 创建剩余字典实体（港口、船公司、货代、清关、拖车公司）
- [ ] 创建滞港费相关实体
- [ ] 创建用户和角色实体
- [ ] 实现飞驼API客户端
- [ ] 实现数据验证和业务规则

---

**文档版本**: 1.0.0
**最后更新**: 2026-02-24
**维护状态**: ✅ 最新
