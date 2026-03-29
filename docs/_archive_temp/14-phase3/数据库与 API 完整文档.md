# 数据库与 API 完整文档

**创建日期**: 2026-03-21  
**整合范围**: 数据库迁移、API 文档、TypeORM 问题解决方案  
**状态**: ✅ 已完成

---

## 📋 **目录**

1. [数据库架构](#数据库架构)
2. [数据表设计](#数据表设计)
3. [数据库迁移](#数据库迁移)
4. [API 端点](#api-端点)
5. [TypeORM 命名策略](#typeorm-命名策略)
6. [最佳实践](#最佳实践)

---

## 数据库架构

### 技术栈

- **数据库**: PostgreSQL 14+
- **ORM**: TypeORM 0.3.x
- **连接池**: TypeORM Connection Pool
- **命名规范**: Snake Case（数据库） → Camel Case（代码）

### 数据库表分类

#### 1. 字典表 (dict\_\*)

存储系统配置和字典数据

| 表名                      | 用途     | 关键字段                       |
| ------------------------- | -------- | ------------------------------ |
| `dict_countries`          | 国家字典 | country_code, country_name     |
| `dict_ports`              | 港口字典 | port_code, port_name           |
| `dict_warehouses`         | 仓库字典 | warehouse_code, warehouse_name |
| `dict_trucking_companies` | 车队字典 | company_code, company_name     |
| `dict_scheduling_config`  | 排柜配置 | config_key, config_value       |

#### 2. 业务表 (biz\_\*)

核心业务数据

| 表名                       | 用途   | 关键字段                           |
| -------------------------- | ------ | ---------------------------------- |
| `biz_replenishment_orders` | 备货单 | order_number, customer_name        |
| `biz_containers`           | 货柜   | container_number, logistics_status |

#### 3. 过程表 (process\_\*)

业务流程数据

| 表名                           | 用途     | 关键字段                            |
| ------------------------------ | -------- | ----------------------------------- |
| `process_sea_freight`          | 海运信息 | bill_of_lading_number, vessel_name  |
| `process_port_operations`      | 港口操作 | port_type, port_sequence            |
| `process_trucking_transport`   | 拖卡运输 | trucking_company_id, transport_date |
| `process_warehouse_operations` | 仓库操作 | warehouse_id, operation_date        |
| `process_empty_return`         | 还空箱   | return_time, return_location        |

#### 4. 外部数据表 (ext\_\*)

外部系统数据

| 表名                       | 用途         | 关键字段                |
| -------------------------- | ------------ | ----------------------- |
| `ext_feituo_raw_data`      | 飞驼原始数据 | batch_number, data_json |
| `ext_feituo_status_events` | 飞驼状态事件 | event_code, event_time  |

---

## 数据表设计

### biz_containers (货柜表)

**结构**:

```sql
CREATE TABLE biz_containers (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(20) NOT NULL UNIQUE,  -- 箱号
    order_number VARCHAR(50),                       -- 备货单号
    bill_of_lading_number VARCHAR(50),              -- 提单号
    logistics_status VARCHAR(50),                   -- 物流状态
    container_type VARCHAR(10),                     -- 柜型 (20GP/40HQ 等)
    total_packages INTEGER,                         -- 总箱数
    total_cbm DECIMAL(10,3),                        -- 总体积 (m3)
    total_gross_weight DECIMAL(10,3),               -- 总毛重 (KG)
    last_free_date DATE,                            -- 最晚提柜日期
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_container_number ON biz_containers(container_number);
CREATE INDEX idx_logistics_status ON biz_containers(logistics_status);
CREATE INDEX idx_last_free_date ON biz_containers(last_free_date);
```

**实体类**:

```typescript
@Entity("biz_containers")
export class Container {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "container_number", length: 20, unique: true })
  container_number: string;

  @Column({ name: "order_number", length: 50, nullable: true })
  order_number: string;

  @Column({ name: "bill_of_lading_number", length: 50, nullable: true })
  bill_of_lading_number: string;

  @Column({ name: "logistics_status", length: 50, nullable: true })
  logistics_status: string;

  @Column({ name: "container_type", length: 10, nullable: true })
  container_type: string;

  @Column({ name: "total_packages", nullable: true })
  total_packages: number;

  @Column({ name: "total_cbm", type: "decimal", precision: 10, scale: 3, nullable: true })
  total_cbm: number;

  @Column({ name: "total_gross_weight", type: "decimal", precision: 10, scale: 3, nullable: true })
  total_gross_weight: number;

  @Column({ name: "last_free_date", type: "date", nullable: true })
  last_free_date: Date;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at: Date;

  // 关联关系
  @OneToMany(() => PortOperation, (op) => op.container)
  portOperations: PortOperation[];
}
```

### process_port_operations (港口操作表)

**结构**:

```sql
CREATE TABLE process_port_operations (
    id SERIAL PRIMARY KEY,
    container_number VARCHAR(20) NOT NULL,         -- 箱号（外键）
    port_type VARCHAR(20) NOT NULL,                -- 港口类型 (origin/transit/destination)
    port_code VARCHAR(10) NOT NULL,                -- 港口代码
    port_name VARCHAR(100),                        -- 港口名称
    port_sequence INTEGER NOT NULL,                -- 港口顺序
    eta DATE,                                      -- 预计到港
    ata DATE,                                      -- 实际到港
    gate_in_time DATE,                             -- 进港时间
    gate_out_time DATE,                            -- 提柜时间
    shipment_date DATE,                            -- 装船/离港时间
    dest_port_unload_date DATE,                    -- 卸船时间
    available_time DATE,                           -- 可提货时间
    free_storage_days INTEGER,                     -- 免堆期 (天)
    free_detention_days INTEGER,                   -- 免箱期 (天)
    last_free_date DATE,                           -- 最晚提柜日期
    stuffed_date DATE,                             // 装箱时间
    dumped_date DATE,                              // 甩柜时间
    transit_arrival_date DATE,                     // 中转抵港
    atd DATE,                                      // 中转离港
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_container
        FOREIGN KEY (container_number)
        REFERENCES biz_containers(container_number)
);

-- 索引
CREATE INDEX idx_port_container ON process_port_operations(container_number);
CREATE INDEX idx_port_type ON process_port_operations(port_type);
CREATE INDEX idx_port_sequence ON process_port_operations(port_sequence);
CREATE UNIQUE INDEX idx_unique_container_port_seq
    ON process_port_operations(container_number, port_sequence);
```

**实体类**:

```typescript
@Entity("process_port_operations")
export class PortOperation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "container_number", length: 20 })
  container_number: string;

  @Column({ name: "port_type", length: 20 })
  port_type: "origin" | "transit" | "destination";

  @Column({ name: "port_code", length: 10 })
  port_code: string;

  @Column({ name: "port_name", length: 100, nullable: true })
  port_name: string;

  @Column({ name: "port_sequence" })
  port_sequence: number;

  @Column({ name: "eta", type: "date", nullable: true })
  eta: Date;

  @Column({ name: "ata", type: "date", nullable: true })
  ata: Date;

  @Column({ name: "gate_in_time", type: "date", nullable: true })
  gate_in_time: Date;

  @Column({ name: "gate_out_time", type: "date", nullable: true })
  gate_out_time: Date;

  @Column({ name: "shipment_date", type: "date", nullable: true })
  shipment_date: Date;

  @Column({ name: "dest_port_unload_date", type: "date", nullable: true })
  dest_port_unload_date: Date;

  @Column({ name: "available_time", type: "date", nullable: true })
  available_time: Date;

  @Column({ name: "free_storage_days", nullable: true })
  free_storage_days: number;

  @Column({ name: "free_detention_days", nullable: true })
  free_detention_days: number;

  @Column({ name: "last_free_date", type: "date", nullable: true })
  last_free_date: Date;

  @CreateDateColumn({ name: "created_at" })
  created_at: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updated_at: Date;

  // 关联关系
  @ManyToOne(() => Container, (container) => container.portOperations)
  @JoinColumn({ name: "container_number" })
  container: Container;
}
```

---

## 数据库迁移

### 迁移文件组织

```
migrations/
├── 001_add_scheduling_optimization_config.sql
├── 006_add_customs_broker_country.sql
├── 008_add_intelligent_processing.sql
├── add_cost_optimization_config.sql
├── add_cost_optimization_mapping_fields.sql
├── create_flow_definitions_table.sql
└── ...
```

### 迁移执行顺序

**原则**:

1. 按文件名数字前缀排序执行
2. 先创建基础表，再添加字段
3. 先创建主表，再添加外键约束

**示例**:

```bash
# 执行所有迁移
for file in migrations/*.sql; do
  echo "Executing $file..."
  psql -U logix_user -d logix_db -f "$file"
done

# 验证迁移结果
psql -U logix_user -d logix_db -c "\dt"
```

### 关键迁移脚本

#### 1. 创建成本优化配置项

**文件**: `add_cost_optimization_config.sql`

**内容**:

```sql
-- 添加成本优化相关配置项
INSERT INTO dict_scheduling_config (config_key, config_value, description) VALUES
('transport_direct_rate', '1.0', '直送模式基础费率'),
('transport_drop_off_rate', '0.85', 'Drop off 模式费率系数'),
('transport_expedited_rate', '1.5', '加急模式费率系数'),
('external_storage_daily_rate', '50.00', '外部仓储日费率 (USD/天)'),
('expedited_handling_fee', '100.00', '加急处理费 (USD/票)')
ON CONFLICT (config_key) DO NOTHING;
```

**验证**:

```sql
SELECT config_key, config_value, description
FROM dict_scheduling_config
WHERE config_key LIKE 'transport_%'
   OR config_key IN ('external_storage_daily_rate', 'expedited_handling_fee');
```

#### 2. 创建流程定义表

**文件**: `create_flow_definitions_table.sql`

**内容**:

```sql
CREATE TABLE flow_definitions (
    id SERIAL PRIMARY KEY,
    flow_code VARCHAR(50) NOT NULL UNIQUE,
    flow_name VARCHAR(100) NOT NULL,
    flow_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    config_json JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_flow_code ON flow_definitions(flow_code);
CREATE INDEX idx_flow_type ON flow_definitions(flow_type);
```

---

## API 端点

### API 规范

**基础路径**: `/api/v1`  
**认证方式**: JWT Token  
**响应格式**: JSON  
**错误码**: HTTP Status Code

### 智能排柜 API

#### 1. 评估单个方案

**端点**: `POST /api/v1/scheduling/evaluate-cost`

**请求体**:

```json
{
  "optionType": "Direct",
  "warehouseId": "WH001",
  "truckingCompanyId": "TC001",
  "date": "2026-03-20"
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "optionType": "Direct",
    "warehouse": "WH001",
    "truckingCompany": "TC001",
    "estimatedCost": 1500.0,
    "costBreakdown": {
      "transportCost": 1200.0,
      "storageCost": 200.0,
      "laborCost": 100.0,
      "totalCost": 1500.0
    }
  }
}
```

**控制器实现**:

```typescript
@Post('/evaluate-cost')
async evaluateCost(@Body() request: EvaluateCostRequest) {
  const result = await this.schedulingService.evaluateCost({
    optionType: request.optionType,
    warehouseId: request.warehouseId,
    truckingCompanyId: request.truckingCompanyId,
    date: request.date
  });

  return {
    success: true,
    data: result
  };
}
```

#### 2. 对比多个方案

**端点**: `POST /api/v1/scheduling/compare-options`

**请求体**:

```json
{
  "options": [
    {
      "optionType": "Direct",
      "warehouseId": "WH001"
    },
    {
      "optionType": "Drop off",
      "warehouseId": "WH002"
    }
  ]
}
```

**响应**:

```json
{
  "success": true,
  "data": {
    "comparison": [
      {
        "optionType": "Direct",
        "warehouse": "WH001",
        "estimatedCost": 1500.0,
        "rank": 1
      },
      {
        "optionType": "Drop off",
        "warehouse": "WH002",
        "estimatedCost": 1800.0,
        "rank": 2
      }
    ],
    "recommendation": {
      "optionType": "Direct",
      "reason": "成本最低，且时效满足要求"
    }
  }
}
```

#### 3. 获取推荐方案

**端点**: `GET /api/v1/scheduling/recommend-option?containerId=CNT001`

**响应**:

```json
{
  "success": true,
  "data": {
    "optionType": "Direct",
    "warehouse": "WH001",
    "truckingCompany": "TC001",
    "estimatedCost": 1500.0,
    "savings": 300.0,
    "confidence": 0.95,
    "reasons": ["成本比平均水平低 20%", "仓库容量充足", "车队评分 4.8/5.0"]
  }
}
```

### 数据导入 API

#### 1. 批量导入 Excel 数据

**端点**: `POST /api/v1/import/excel/batch`

**请求体**:

```json
{
  "batch": [
    {
      "tables": {
        "biz_replenishment_orders": {...},
        "biz_containers": {...},
        "process_sea_freight": {...},
        "process_port_operations": [...]
      }
    }
  ],
  "batchIndex": 1
}
```

**响应**:

```json
{
  "success": true,
  "message": "批量导入完成：成功 5 条，失败 0 条",
  "data": {
    "total": 5,
    "success": 5,
    "failed": 0,
    "results": [...],
    "errors": []
  }
}
```

**服务层实现**:

```typescript
async batchImport(batchData: ImportBatch[]) {
  const results: ImportResult[] = [];
  const errors: ImportError[] = [];

  for (const item of batchData) {
    try {
      await this.dataSource.transaction(async (manager) => {
        // 按顺序插入各表数据
        for (const tableName in item.tables) {
          const data = item.tables[tableName];

          if (Array.isArray(data)) {
            // 数组格式（如多港经停）
            for (const row of data) {
              await manager.insert(tableName, row);
            }
          } else {
            // 对象格式
            await manager.insert(tableName, data);
          }
        }
      });

      results.push({ success: true });
    } catch (error) {
      errors.push({
        error: error.message,
        data: item
      });
    }
  }

  return {
    total: batchData.length,
    success: results.length,
    failed: errors.length,
    results,
    errors
  };
}
```

---

## TypeORM 命名策略

### 问题背景

**现象**: 数据库字段使用 snake_case，但 TypeORM 默认使用 camelCase

**症状**:

- 查询时字段名不匹配
- 保存数据时报错
- 元数据警告

### 解决方案

#### 方案 1: 自定义 NamingStrategy

**创建文件**: `backend/src/config/SnakeNamingStrategy.ts`

**代码**:

```typescript
import { DefaultNamingStrategy, NamingStrategyInterface } from "typeorm";
import { snakeCase } from "typeorm/util/StringUtils";

export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  tableName(className: string, customName: string): string {
    return customName ? customName : snakeCase(className);
  }

  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return customName ? customName : snakeCase(embeddedPrefixes.concat([propertyName]).join("_"));
  }

  relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  joinTableName(firstTableName: string, secondTableName: string): string {
    return snakeCase(`${firstTableName}_${secondTableName}`);
  }
}
```

**配置使用**:

```typescript
// backend/src/config/database.config.ts
import { SnakeNamingStrategy } from "./SnakeNamingStrategy";

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: "postgres",
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "5432"),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      entities: [__dirname + "/../**/*.entity{.ts,.js}"],
      namingStrategy: new SnakeNamingStrategy(),
      synchronize: false,
    }),
  ],
})
export class DatabaseModule {}
```

#### 方案 2: 手动指定字段名

**适用场景**: 少量字段或临时解决方案

**代码**:

```typescript
@Entity("biz_containers")
export class Container {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "container_number" }) // 手动指定数据库字段名
  container_number: string;

  @Column({ name: "logistics_status" })
  logistics_status: string;

  @Column({ name: "last_free_date", type: "date" })
  last_free_date: Date;
}
```

### 最佳实践

**推荐方案**: 使用自定义 NamingStrategy + 手动指定相结合

**原则**:

1. 全局配置 SnakeNamingStrategy
2. 对于特殊字段，手动指定 `name` 属性
3. 实体类属性使用 camelCase（符合 TypeScript 规范）
4. 数据库字段保持 snake_case（符合 SQL 规范）

---

## 最佳实践

### 1. 数据库查询优化

#### 使用索引

```sql
-- 为常用查询条件添加索引
CREATE INDEX idx_containers_status ON biz_containers(logistics_status);
CREATE INDEX idx_containers_last_free ON biz_containers(last_free_date);
CREATE INDEX idx_port_ops_container ON process_port_operations(container_number);

-- 复合索引（针对组合查询）
CREATE INDEX idx_containers_status_last_free
    ON biz_containers(logistics_status, last_free_date);
```

#### 避免 N+1 查询

**错误示例**:

```typescript
// ❌ 会导致 N+1 查询问题
const containers = await containerRepo.find();
for (const container of containers) {
  const portOps = await portOpRepo.find({
    where: { container_number: container.container_number },
  });
}
```

**正确示例**:

```typescript
// ✅ 使用 JOIN 一次性加载
const containers = await containerRepo.find({
  relations: ["portOperations"],
});
```

### 2. 事务处理

**场景**: 批量导入数据时保证一致性

**代码**:

```typescript
async importContainerData(data: ImportData) {
  return await this.dataSource.transaction(async (manager) => {
    // 1. 插入备货单
    await manager.insert('biz_replenishment_orders', data.order);

    // 2. 插入货柜
    await manager.insert('biz_containers', data.container);

    // 3. 插入海运信息
    await manager.insert('process_sea_freight', data.seaFreight);

    // 4. 插入港口操作（可能有多条）
    if (Array.isArray(data.portOperations)) {
      for (const portOp of data.portOperations) {
        await manager.insert('process_port_operations', portOp);
      }
    }

    // 5. 插入其他过程表...

    return { success: true };
  });
}
```

### 3. 错误处理

**统一错误响应格式**:

```typescript
@Catch(TypeORMError)
export class TypeOrmExceptionFilter implements ExceptionFilter {
  catch(exception: TypeORMError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "数据库操作失败";

    if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      message = "数据验证失败";
    }

    response.status(status).json({
      success: false,
      error: {
        code: exception.name,
        message: message,
        details: exception.message,
      },
    });
  }
}
```

### 4. 性能监控

**慢查询日志**:

```sql
-- PostgreSQL 配置
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- 记录超过 1 秒的查询
```

**TypeORM 日志**:

```typescript
TypeOrmModule.forRoot({
  // ... 其他配置
  logging: ["error", "warn", "query", "slow-query"],
  maxQueryExecutionTime: 1000, // 慢查询阈值 (ms)
});
```

---

## 附录

### A. 相关文档索引

**必读文档**:

1. [DATABASE_SCRIPTS_INDEX.md](../../backend/docs/DATABASE_SCRIPTS_INDEX.md)
2. [MIGRATION_ORDER_VERIFICATION.md](../../backend/docs/MIGRATION_ORDER_VERIFICATION.md)
3. [TypeORM-NamingStrategy-Issue.md](../../backend/docs/TypeORM-NamingStrategy-Issue.md)
4. [TypeORM-SnakeNamingStrategy-Investigation.md](../../backend/docs/TypeORM-SnakeNamingStrategy-Investigation.md)
5. [API_DOCS_UPDATE.md](../../backend/docs/API_DOCS_UPDATE.md)

**参考资料**:

1. [TypeORM 官方文档](https://typeorm.io/)
2. [PostgreSQL 官方文档](https://www.postgresql.org/docs/)

### B. 常用 SQL 查询

```sql
-- 查询所有表及其行数
SELECT
    schemaname,
    relname AS table_name,
    n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

-- 查询表结构
SELECT
    column_name,
    data_type,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'biz_containers'
ORDER BY ordinal_position;

-- 查询索引
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'biz_containers';

-- 查询外键约束
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';
```

### C. 下一步行动

**立即可做**:

- [ ] 添加更多数据库索引
- [ ] 优化慢查询
- [ ] 完善 API 文档

**长期规划**:

- [ ] 实施数据库读写分离
- [ ] 添加数据归档机制
- [ ] 实施分库分表策略

---

**文档状态**: ✅ 已完成  
**最后更新**: 2026-03-21  
**维护人**: AI Development Team

🎉 **数据库与 API 文档整理完成！** 🎉
