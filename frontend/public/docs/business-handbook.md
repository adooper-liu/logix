# LogiX 业务知识手册

## 业务概述

LogiX是智能集装箱物流管理系统，核心业务流程：

```
备货单 → 海运 → 目的港 → 拖卡运输 → 仓库卸柜 → 还空箱
         ↓
      智能排柜（成本优化）
         ↓
      滞港费预警
```

---

## 数据库结构（28张表）

### 字典表（11张）- 基础数据

#### dict_countries - 国家字典
- `code` (PK) - 国家代码，如 'US', 'CA'
- `name_cn` - 中文名称
- `name_en` - 英文名称
- `region` - 区域
- `continent` - 大洲

**业务规则**：
- `country`字段实质指该国分公司（子公司类型客户）
- 统一存`dict_countries.code`
- `sell_to_country`特例存子公司名称

#### dict_ports - 港口字典
- `port_code` (PK) - 港口代码，如 'LAX', 'SHA'
- `port_name` - 港口名称
- `country` - 所属国家
- `support_export/import` - 是否支持出口/进口

#### dict_container_types - 柜型字典
- `type_code` (PK) - 柜型代码，如 '40HQ', '20GP'
- `size_ft` - 尺寸（英尺）
- `max_weight_kg` - 最大载重
- `max_cbm` - 最大体积
- `teu` - 标准箱单位

#### dict_warehouses - 仓库字典
- `warehouse_code` (PK)
- `property_type` - 物业类型：SELF/3PL
- `daily_unload_capacity` - 每日卸柜容量（默认10）
- `country` - 所属国家
- `company_code` - 关联海外公司

#### dict_trucking_companies - 车队字典
- `company_code` (PK)
- `daily_capacity` - 每日可提柜数量
- `daily_return_capacity` - 每日可还箱数量（NULL=共用daily_capacity）
- `has_yard` - 是否有堆场（true=支持Drop模式）
- `yard_daily_capacity` - 堆场每日容量

**关键业务逻辑**：
- `has_yard = true` → 支持Drop off模式（提柜日 ≠ 送仓日）
- `has_yard = false` → 必须Live模式（提=送=卸同日）

#### 其他字典表
- `dict_customer_types` - 客户类型
- `dict_shipping_companies` - 船公司
- `dict_freight_forwarders` - 货代公司
- `dict_customs_brokers` - 清关公司
- `dict_overseas_companies` - 海外公司

---

### 业务表（4张）- 核心业务数据

#### biz_replenishment_orders - 备货单
- `order_number` (PK) - 备货单号
- `main_order_number` - 主备货单号
- `container_number` (FK) - 关联货柜
- `sell_to_country` - 销往国家（存子公司名称）
- `actual_ship_date` - 实际出运日期（**统一日期口径**）

#### biz_containers - 货柜
- `container_number` (PK) - 柜号
- `bill_of_lading_number` (FK) - 提单号
- `logistics_status` - 物流状态（7层简化状态）
- `eta_dest_port` - 预计到港时间
- `ata_dest_port` - 实际到港时间

#### biz_customers - 客户
- `customer_code` (PK) - 客户代码
- `customer_name` - 客户名称
- `country` (FK) - 所属国家
- `customer_type` (FK) - 客户类型

#### biz_container_skus - 柜内SKU
- `id` (PK)
- `container_number` (FK) - 关联货柜
- `sku_code` - SKU代码
- `quantity` - 数量

---

### 流程表（5张）- 业务流程记录

#### process_sea_freight - 海运记录
- `bill_of_lading_number` (PK) - 提单号
- `shipment_date` - 出运日期（备用日期口径）
- `vessel_name` - 船名
- `voyage_number` - 航次

#### process_port_operations - 港口操作
- `id` (PK)
- `container_number` (FK) - 关联货柜
- `port_type` - 港口类型：origin/transit/destination
- `ata` - 实际到港时间
- `eta` - 预计到港时间
- `last_free_date` - 最晚免费日期（滞港费计算关键）
- `available_time` - 可提货时间（飞驼PCAB/AVLE触发）

#### process_trucking_transport - 拖卡运输
- `id` (PK)
- `container_number` (FK) - 关联货柜
- `trucking_company_code` (FK) - 车队代码
- `pickup_date` - 提柜日期
- `planned_pickup_date` - 计划提柜日期
- `unload_mode_plan` - 卸柜方式计划：Drop/Live

#### process_warehouse_operations - 仓库操作
- `id` (PK)
- `container_number` (FK) - 关联货柜
- `warehouse_code` (FK) - 仓库代码
- `unload_date` - 卸柜日期
- `wms_status` - WMS状态
- `ebs_status` - EBS状态
- `wms_confirm_date` - WMS确认日期

#### process_empty_return - 还空箱
- `id` (PK)
- `container_number` (FK) - 关联货柜
- `return_time` - 还箱时间
- `return_location` - 还箱地点

---

### 扩展表（8张）- 辅助数据

#### ext_container_status_events - 状态事件
- `id` (PK)
- `container_number` (FK)
- `status_code` - 状态码（飞驼API）
- `event_time` - 事件时间
- `is_estimated` - 是否预计值

#### ext_feituo_import_batch - 飞驼导入批次
- `batch_id` (PK)
- `import_time` - 导入时间
- `record_count` - 记录数
- `status` - 导入状态

#### ext_feituo_import_table1/2 - 飞驼原始数据
- 存储飞驼Excel导入的原始数据

#### ext_container_loading_records - 装柜记录
#### ext_container_hold_records - 扣货记录
#### ext_container_charges - 费用记录

---

## 核心业务流程

### 1. 备货单创建流程
```
用户创建备货单 → 生成biz_replenishment_orders
              → 关联biz_containers
              → 等待海运出运
```

### 2. 海运出运流程
```
备货单出运 → 创建process_sea_freight
          → 更新biz_containers.logistics_status = 'shipped'
          → 设置shipment_date
```

### 3. 目的港到港流程
```
船舶到港 → 创建process_port_operations (port_type='destination')
        → 设置ata_dest_port
        → 计算last_free_date = ata + free_days
        → 更新logistics_status = 'at_port'
```

### 4. 拖卡提柜流程
```
智能排柜引擎分派 → 选择车队(dict_trucking_companies)
                → 选择仓库(dict_warehouses)
                → 创建process_trucking_transport
                → 设置pickup_date
                → 更新logistics_status = 'picked_up'
```

### 5. 仓库卸柜流程
```
货柜送仓 → 创建process_warehouse_operations
        → WMS确认(wms_confirm_date)
        → 更新logistics_status = 'unloaded'
```

### 6. 还空箱流程
```
卸柜完成 → 创建process_empty_return
        → 设置return_time
        → 更新logistics_status = 'returned_empty'
```

---

## 关键业务规则

### 国家概念统一
- `country`字段 = 该国分公司（子公司类型客户）
- 统一存`dict_countries.code`
- `sell_to_country`特例存子公司名称

### 销往国家→排柜资源映射
```
sell_to_country → countryCode → 清关行/车队/仓库
                  ↓
            dict_warehouse_trucking_mapping
            dict_trucking_port_mapping
```

### 清关行/车队/仓库缺省规则
无该国记录时使用「XX清关行」「XX车队」「XX仓库」（XX=国家中文名）

### 日期口径统一
- **全项目统一**：所有数据展示以顶部日期范围为筛选条件
- **对应字段**：`actual_ship_date`（备货单）或`shipment_date`（海运）
- **后端口径**：优先`actual_ship_date`，为空时用`shipment_date`

---

## 参考文档

- 数据库定义：`backend/sql/schema/03_create_tables.sql`
- 实体定义：`backend/src/entities/*.ts`
- 状态机实现：`backend/src/utils/logisticsStatusMachine.ts`

---

**维护者**: LogiX Team  
**最后更新**: 2026-06-23
