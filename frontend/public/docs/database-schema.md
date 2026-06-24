# LogiX 数据库结构

## 表分类

| 前缀 | 数量 | 用途 |
|------|------|------|
| `biz_` | 4 | 业务核心表（货柜、备货单、客户） |
| `process_` | 5 | 流程记录表（海运、港口、拖卡、仓库、还箱） |
| `dict_` | 11 | 字典表（国家、港口、柜型等基础数据） |
| `ext_` | 8 | 扩展表（飞驼事件、导入批次等） |

---

## 核心业务表

### biz_containers - 货柜表
```sql
CREATE TABLE biz_containers (
  container_number VARCHAR(20) PRIMARY KEY,
  bill_of_lading_number VARCHAR(30),
  logistics_status VARCHAR(20),
  eta_dest_port TIMESTAMP,
  ata_dest_port TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**关键字段**:
- `logistics_status`: 7层简化状态（returned_empty/unloaded/picked_up/at_port/in_transit/shipped/not_shipped）
- `eta_dest_port`: 预计到港时间（来自飞驼API）
- `ata_dest_port`: 实际到港时间（触发滞港费计算）

**关联关系**:
- FK: `bill_of_lading_number` → `process_sea_freight.bill_of_lading_number`
- 1:N: `container_number` → `process_port_operations.container_number`
- 1:N: `container_number` → `process_trucking_transport.container_number`

---

### biz_replenishment_orders - 备货单表
```sql
CREATE TABLE biz_replenishment_orders (
  order_number VARCHAR(30) PRIMARY KEY,
  main_order_number VARCHAR(30),
  container_number VARCHAR(20),
  sell_to_country VARCHAR(50),
  actual_ship_date DATE,
  customer_code VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**关键字段**:
- `actual_ship_date`: **统一日期口径**，所有统计以此为准
- `sell_to_country`: 销往国家（存子公司名称，如"CA-S003"）
- `customer_code`: 客户代码（空时从sell_to_country回填）

**关联关系**:
- FK: `container_number` → `biz_containers.container_number`

---

### process_port_operations - 港口操作表
```sql
CREATE TABLE process_port_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_number VARCHAR(20),
  port_type VARCHAR(20),  -- origin/transit/destination
  eta TIMESTAMP,
  ata TIMESTAMP,
  last_free_date DATE,
  available_time TIMESTAMP,
  revised_eta TIMESTAMP
);
```

**关键字段**:
- `port_type`: 区分起运港/中转港/目的港
- `last_free_date`: 最晚免费日期（LFD），滞港费计算关键
- `available_time`: 可提货时间（飞驼AVLE事件触发）
- `revised_eta`: 修正ETA（forecast模式使用）

**索引**:
```sql
CREATE INDEX idx_po_container ON process_port_operations(container_number);
CREATE INDEX idx_po_port_type ON process_port_operations(port_type);
```

---

### process_trucking_transport - 拖卡运输表
```sql
CREATE TABLE process_trucking_transport (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_number VARCHAR(20),
  trucking_company_code VARCHAR(20),
  pickup_date DATE,
  planned_pickup_date DATE,
  unload_mode_plan VARCHAR(10)  -- Drop/Live
);
```

**关键字段**:
- `unload_mode_plan`: 卸柜方式（Drop=提柜日≠送仓日，Live=同日）
- `planned_pickup_date`: 计划提柜日期（智能排柜引擎分派）

**关联关系**:
- FK: `trucking_company_code` → `dict_trucking_companies.company_code`

---

### process_warehouse_operations - 仓库操作表
```sql
CREATE TABLE process_warehouse_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_number VARCHAR(20),
  warehouse_code VARCHAR(20),
  unload_date DATE,
  wms_status VARCHAR(20),
  ebs_status VARCHAR(20),
  wms_confirm_date TIMESTAMP
);
```

**关键字段**:
- `wms_confirm_date`: WMS确认日期（触发logistics_status='unloaded'）
- `ebs_status`: EBS系统状态（财务对账用）

**关联关系**:
- FK: `warehouse_code` → `dict_warehouses.warehouse_code`

---

## 字典表

### dict_countries - 国家字典
```sql
CREATE TABLE dict_countries (
  code VARCHAR(10) PRIMARY KEY,
  name_cn VARCHAR(50),
  name_en VARCHAR(50),
  region VARCHAR(20),
  continent VARCHAR(20)
);
```

**示例数据**:
```sql
INSERT INTO dict_countries VALUES 
  ('US', '美国', 'United States', 'North America', 'Americas'),
  ('CA', '加拿大', 'Canada', 'North America', 'Americas'),
  ('GB', '英国', 'United Kingdom', 'Europe', 'Europe');
```

---

### dict_warehouses - 仓库字典
```sql
CREATE TABLE dict_warehouses (
  warehouse_code VARCHAR(20) PRIMARY KEY,
  property_type VARCHAR(10),  -- SELF/3PL
  daily_unload_capacity INT DEFAULT 10,
  country VARCHAR(10),
  company_code VARCHAR(20)
);
```

**业务规则**:
- `daily_unload_capacity`: 每日卸柜容量，智能排柜引擎据此分配
- `property_type`: SELF=自营仓库，3PL=第三方物流

---

### dict_trucking_companies - 车队字典
```sql
CREATE TABLE dict_trucking_companies (
  company_code VARCHAR(20) PRIMARY KEY,
  daily_capacity INT,
  daily_return_capacity INT,
  has_yard BOOLEAN DEFAULT false,
  yard_daily_capacity INT
);
```

**业务规则**:
- `has_yard = true`: 支持Drop off模式（有堆场）
- `has_yard = false`: 必须Live模式（无堆场）
- `daily_return_capacity`: NULL时共用`daily_capacity`

---

## 映射表

### dict_warehouse_trucking_mapping - 仓库车队映射
```sql
CREATE TABLE dict_warehouse_trucking_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(10),
  warehouse_code VARCHAR(20),
  trucking_company_code VARCHAR(20),
  priority INT DEFAULT 999,
  is_active BOOLEAN DEFAULT true
);
```

**用途**: 智能排柜引擎根据此表选择最优仓库+车队组合

**示例**:
```sql
INSERT INTO dict_warehouse_trucking_mapping VALUES
  (gen_random_uuid(), 'CA', 'CA-S003', 'TRUCK-CA-001', 1, true),
  (gen_random_uuid(), 'CA', 'CA-S004', 'TRUCK-CA-002', 2, true);
```

---

## 扩展表

### ext_container_status_events - 飞驼状态事件
```sql
CREATE TABLE ext_container_status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_number VARCHAR(20),
  status_code VARCHAR(20),
  event_time TIMESTAMP,
  location VARCHAR(100),
  is_estimated BOOLEAN DEFAULT false,
  raw_data JSONB
);
```

**用途**: 存储飞驼API原始事件，用于追溯和调试

**索引**:
```sql
CREATE INDEX idx_cse_container ON ext_container_status_events(container_number);
CREATE INDEX idx_cse_event_time ON ext_container_status_events(event_time);
```

---

## 常用查询

### 查询货柜完整信息
```sql
SELECT 
  c.container_number,
  c.logistics_status,
  c.ata_dest_port,
  po.last_free_date,
  tt.pickup_date,
  wo.wms_confirm_date,
  er.return_time
FROM biz_containers c
LEFT JOIN process_port_operations po 
  ON c.container_number = po.container_number AND po.port_type = 'destination'
LEFT JOIN process_trucking_transport tt 
  ON c.container_number = tt.container_number
LEFT JOIN process_warehouse_operations wo 
  ON c.container_number = wo.container_number
LEFT JOIN process_empty_return er 
  ON c.container_number = er.container_number
WHERE c.container_number = 'MSKU1234567';
```

### 查询待计算滞港费的货柜
```sql
SELECT 
  c.container_number,
  po.ata_dest_port,
  po.last_free_date,
  CURRENT_DATE - po.last_free_date AS days_overdue
FROM biz_containers c
JOIN process_port_operations po 
  ON c.container_number = po.container_number
WHERE po.port_type = 'destination'
  AND po.last_free_date < CURRENT_DATE
  AND c.logistics_status != 'returned_empty'
ORDER BY days_overdue DESC;
```

---

## 参考文档

- 完整SQL定义: `backend/sql/schema/03_create_tables.sql`
- TypeORM实体: `backend/src/entities/*.ts`
- 业务知识手册: `business-handbook.md`

---

**维护者**: LogiX Team  
**最后更新**: 2026-06-23
