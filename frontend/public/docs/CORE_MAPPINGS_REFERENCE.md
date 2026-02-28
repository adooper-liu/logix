# LogiX 核心映射参考

> 快速查询数据库表名、字段名、实体属性、API参数的映射关系

---

## 📋 完整表名映射

| 序号 | 功能模块 | 数据库表名 | TypeORM实体 | 前端API调用 |
|------|---------|-----------|-------------|-------------|
| 1 | 备货单 | `biz_replenishment_orders` | `ReplenishmentOrder` | `biz_replenishment_orders` |
| 2 | 货柜 | `biz_containers` | `Container` | `biz_containers` |
| 3 | 海运 | `process_sea_freight` | `SeaFreight` | `process_sea_freight` |
| 4 | 港口操作 | `process_port_operations` | `PortOperation` | `process_port_operations` |
| 5 | 拖卡运输 | `process_trucking_transport` | `TruckingTransport` | `process_trucking_transport` |
| 6 | 仓库操作 | `process_warehouse_operations` | `WarehouseOperation` | `process_warehouse_operations` |
| 7 | 还空箱 | `process_empty_returns` | `EmptyReturn` | `process_empty_return` |
| 8 | 集装箱类型 | `dict_container_types` | `ContainerType` | `dict_container_types` |
| 9 | 港口 | `dict_ports` | `Port` | `dict_ports` |
| 10 | 船公司 | `dict_shipping_companies` | `ShippingCompany` | `dict_shipping_companies` |
| 11 | 货代公司 | `dict_freight_forwarders` | `FreightForwarder` | `dict_freight_forwarders` |

---

## 🗃️ 备货单表 (biz_replenishment_orders)

| 序号 | 数据库字段 | TypeORM属性 | 前端API参数 | 说明 |
|------|-----------|-------------|-------------|------|
| 1 | `order_number` | `orderNumber` | `order_number` | 备货单号（主键） |
| 2 | `main_order_number` | `mainOrderNumber` | `main_order_number` | 主备货单号 |
| 3 | `sell_to_country` | `sellToCountry` | `sell_to_country` | 销往国家 |
| 4 | `customer_code` | `customerCode` | `customer_code` | 客户代码 |
| 5 | `customer_name` | `customerName` | `customer_name` | 客户名称 |
| 6 | `order_status` | `orderStatus` | `order_status` | 备货单状态 |
| 7 | `inspection_required` | `inspectionRequired` | `inspection_required` | 是否查验 |
| 8 | `is_assembly` | `isAssembly` | `is_assembly` | 是否装配件 |
| 9 | `procurement_trade_mode` | `procurementTradeMode` | `procurement_trade_mode` | 采购贸易模式 |
| 10 | `price_terms` | `priceTerms` | `price_terms` | 价格条款 |
| 11 | `special_cargo_volume` | `specialCargoVolume` | `special_cargo_volume` | 特殊货物体积 |
| 12 | `wayfair_spo` | `wayfairSPO` | `wayfair_spo` | Wayfair SPO |
| 13 | `pallet_required` | `palletRequired` | `pallet_required` | 含要求打托产品 |
| 14 | `total_boxes` | `totalBoxes` | `total_boxes` | 箱数合计 |
| 15 | `total_cbm` | `totalCbm` | `total_cbm` | 体积合计(m3) |
| 16 | `total_gross_weight` | `totalGrossWeight` | `total_gross_weight` | 毛重合计(KG) |
| 17 | `shipment_total_value` | `shipmentTotalValue` | `shipment_total_value` | 出运总价 |
| 18 | `fob_amount` | `fobAmount` | `fob_amount` | 议付金额FOB |
| 19 | `cif_amount` | `cifAmount` | `cif_amount` | 议付金额CIF |
| 20 | `negotiation_amount` | `negotiationAmount` | `negotiation_amount` | 议付金额 |

---

## 📦 货柜表 (biz_containers)

| 序号 | 数据库字段 | TypeORM属性 | 前端API参数 | 说明 |
|------|-----------|-------------|-------------|------|
| 1 | `container_number` | `containerNumber` | `container_number` | 集装箱号（主键） |
| 2 | `order_number` | `orderNumber` | `order_number` | 备货单号（外键） |
| 3 | `container_type_code` | `containerTypeCode` | `container_type_code` | 柜型编码（外键） |
| 4 | `cargo_description` | `cargoDescription` | `cargo_description` | 货物描述 |
| 5 | `seal_number` | `sealNumber` | `seal_number` | 封条号 |
| 6 | `gross_weight` | `grossWeight` | `gross_weight` | 毛重 |
| 7 | `net_weight` | `netWeight` | `net_weight` | 净重 |
| 8 | `cbm` | `cbm` | `cbm` | 体积(m3) |
| 9 | `packages` | `packages` | `packages` | 箱数 |
| 10 | `inspection_required` | `inspectionRequired` | `inspection_required` | 是否查验 |
| 11 | `is_unboxing` | `isUnboxing` | `is_unboxing` | 是否开箱 |
| 12 | `logistics_status` | `logisticsStatus` | `logistics_status` | 物流状态 |
| 13 | `requires_pallet` | `requiresPallet` | `requires_pallet` | 是否含打托产品 |
| 14 | `requires_assembly` | `requiresAssembly` | `requires_assembly` | 是否装配件 |

### 物流状态枚举值

| 中文名 | 英文值 | 说明 |
|--------|--------|------|
| 未出运 | `not_shipped` | 货物未出运 |
| 已装船 | `shipped` | 货物已装船 |
| 在途 | `in_transit` | 货物在运输途中 |
| 已到港 | `at_port` | 货物已到港 |
| 已提柜 | `picked_up` | 货柜已提走 |
| 已卸柜 | `unloaded` | 货柜已卸货 |
| 已还箱 | `returned_empty` | 空箱已归还 |
| 已取消 | `cancelled` | 订单已取消 |

---

## 🚢 海运表 (process_sea_freight)

| 序号 | 数据库字段 | TypeORM属性 | 前端API参数 | 说明 |
|------|-----------|-------------|-------------|------|
| 1 | `container_number` | `containerNumber` | `container_number` | 集装箱号（主键） |
| 2 | `bill_of_lading_number` | `billOfLadingNumber` | `bill_of_lading_number` | 提单号 |
| 3 | `booking_number` | `bookingNumber` | `booking_number` | 订舱号 |
| 4 | `shipping_company_id` | `shippingCompanyId` | `shipping_company_id` | 船公司编码 |
| 5 | `port_of_loading` | `portOfLoading` | `port_of_loading` | 起运港 |
| 6 | `port_of_discharge` | `portOfDischarge` | `port_of_discharge` | 目的港 |
| 7 | `freight_forwarder_id` | `freightForwarderId` | `freight_forwarder_id` | 货代公司编码 |
| 8 | `vessel_name` | `vesselName` | `vessel_name` | 船名 |
| 9 | `voyage_number` | `voyageNumber` | `voyage_number` | 航次 |
| 10 | `eta` | `eta` | `eta` | 预计到港日期 |
| 11 | `etd` | `etd` | `etd` | 预计离港日期 |
| 12 | `ata` | `ata` | `ata` | 实际到港日期 |
| 13 | `atd` | `atd` | `atd` | 实际离港日期 |
| 14 | `mbl_number` | `mblNumber` | `mbl_number` | MBL Number |
| 15 | `hbl_number` | `hblNumber` | `hbl_number` | HBL Number |
| 16 | `mbl_scac` | `mblScac` | `mbl_scac` | MBL SCAC |
| 17 | `hbl_scac` | `hblScac` | `hbl_scac` | HBL SCAC |
| 18 | `ams_number` | `amsNumber` | `ams_number` | AMS Number |
| 19 | `transit_port_code` | `transitPortCode` | `transit_port_code` | 途经港编码 |
| 20 | `transport_mode` | `transportMode` | `transport_mode` | 运输方式 |

---

## ⚓ 港口操作表 (process_port_operations)

| 序号 | 数据库字段 | TypeORM属性 | 前端API参数 | 说明 |
|------|-----------|-------------|-------------|------|
| 1 | `id` | `id` | `id` | 主键ID |
| 2 | `container_number` | `containerNumber` | `container_number` | 集装箱号（外键） |
| 3 | `port_type` | `portType` | `port_type` | 港口类型（origin/transit/destination） |
| 4 | `port_code` | `portCode` | `port_code` | 港口编码 |
| 5 | `port_name` | `portName` | `port_name` | 港口名称 |
| 6 | `port_sequence` | `portSequence` | `port_sequence` | 港口顺序 |
| 7 | `eta_dest_port` | `etaDestPort` | `eta_dest_port` | 目的港预计到港日期 |
| 8 | `ata_dest_port` | `ataDestPort` | `ata_dest_port` | 目的港实际到港日期 |
| 9 | `dest_port_unload_date` | `destPortUnloadDate` | `dest_port_unload_date` | 目的港卸船日期 |
| 10 | `transit_arrival_date` | `transitArrivalDate` | `transit_arrival_date` | 途经港到达日期 |
| 11 | `last_free_date` | `lastFreeDate` | `last_free_date` | 最后免费日期 |
| 12 | `customs_status` | `customsStatus` | `customs_status` | 清关状态 |
| 13 | `planned_customs_date` | `plannedCustomsDate` | `planned_customs_date` | 计划清关日期 |
| 14 | `actual_customs_date` | `actualCustomsDate` | `actual_customs_date` | 实际清关日期 |
| 15 | `customs_broker_code` | `customsBrokerCode` | `customs_broker_code` | 清关公司编码 |
| 16 | `customs_remarks` | `customsRemarks` | `customs_remarks` | 清关备注 |
| 17 | `isf_status` | `isfStatus` | `isf_status` | ISF申报状态 |
| 18 | `isf_declaration_date` | `isfDeclarationDate` | `isf_declaration_date` | ISF申报日期 |
| 19 | `gate_in_terminal` | `gateInTerminal` | `gate_in_terminal` | 进港码头 |
| 20 | `document_transfer_date` | `documentTransferDate` | `document_transfer_date` | 单据传递日期 |
| 21 | `free_storage_days` | `freeStorageDays` | `free_storage_days` | 免堆期(天) |
| 22 | `free_detention_days` | `freeDetentionDays` | `free_detention_days` | 场内免箱期(天) |
| 23 | `free_off_terminal_days` | `freeOffTerminalDays` | `free_off_terminal_days` | 场外免箱期(天) |

### 港口类型枚举值

| 中文名 | 英文值 | 说明 |
|--------|--------|------|
| 起运港 | `origin` | 货物装船的港口 |
| 途经港 | `transit` | 中转港口 |
| 目的港 | `destination` | 货物卸货的港口 |

---

## 🚛 拖卡运输表 (process_trucking_transport)

| 序号 | 数据库字段 | TypeORM属性 | 前端API参数 | 说明 |
|------|-----------|-------------|-------------|------|
| 1 | `container_number` | `containerNumber` | `container_number` | 集装箱号（主键） |
| 2 | `is_pre_pickup` | `isPrePickup` | `is_pre_pickup` | 是否预提 |
| 3 | `trucking_company_id` | `truckingCompanyId` | `trucking_company_id` | 拖车公司编码 |
| 4 | `pickup_notification` | `pickupNotification` | `pickup_notification` | 提柜通知 |
| 5 | `carrier_company` | `carrierCompany` | `carrier_company` | 承运商公司 |
| 6 | `driver_name` | `driverName` | `driver_name` | 司机姓名 |
| 7 | `driver_phone` | `driverPhone` | `driver_phone` | 司机电话 |
| 8 | `truck_plate` | `truckPlate` | `truck_plate` | 车牌号 |
| 9 | `last_pickup_date` | `lastPickupDate` | `last_pickup_date` | 最晚提柜日期 |
| 10 | `planned_pickup_date` | `plannedPickupDate` | `planned_pickup_date` | 计划提柜日期 |
| 11 | `pickup_date` | `pickupDate` | `pickup_date` | 实际提柜日期 |
| 12 | `last_delivery_date` | `lastDeliveryDate` | `last_delivery_date` | 最晚送仓日期 |
| 13 | `planned_delivery_date` | `plannedDeliveryDate` | `planned_delivery_date` | 计划送仓日期 |
| 14 | `delivery_date` | `deliveryDate` | `delivery_date` | 实际送仓日期 |
| 15 | `pickup_location` | `pickupLocation` | `pickup_location` | 提柜地点 |
| 16 | `delivery_location` | `deliveryLocation` | `delivery_location` | 送达地点 |
| 17 | `unload_mode_plan` | `unloadModePlan` | `unload_mode_plan` | 卸柜方式（计划） |

### 卸柜方式枚举值

| 中文名 | 英文值 | 说明 |
|--------|--------|------|
| 卸柜 | `Drop off` | 车辆将货柜放下后离开 |
| 现场卸货 | `Live load` | 现场直接卸货 |

---

## 🏭 仓库操作表 (process_warehouse_operations)

| 序号 | 数据库字段 | TypeORM属性 | 前端API参数 | 说明 |
|------|-----------|-------------|-------------|------|
| 1 | `container_number` | `containerNumber` | `container_number` | 集装箱号（主键） |
| 2 | `warehouse_id` | `warehouseId` | `warehouse_id` | 仓库ID |
| 3 | `planned_warehouse` | `plannedWarehouse` | `planned_warehouse` | 计划仓库 |
| 4 | `actual_warehouse` | `actualWarehouse` | `actual_warehouse` | 实际仓库 |
| 5 | `warehouse_group` | `warehouseGroup` | `warehouse_group` | 仓库组 |
| 6 | `warehouse_arrival_date` | `warehouseArrivalDate` | `warehouse_arrival_date` | 入库日期 |
| 7 | `planned_unload_date` | `plannedUnloadDate` | `planned_unload_date` | 计划卸柜日期 |
| 8 | `last_unload_date` | `lastUnloadDate` | `last_unload_date` | 最晚卸柜日期 |
| 9 | `unload_date` | `unloadDate` | `unload_date` | 卸柜时间 |
| 10 | `unload_mode_actual` | `unloadModeActual` | `unload_mode_actual` | 卸柜方式（实际） |
| 11 | `wms_status` | `wmsStatus` | `wms_status` | WMS入库状态 |
| 12 | `ebs_status` | `ebsStatus` | `ebs_status` | EBS入库状态 |
| 13 | `wms_confirm_date` | `wmsConfirmDate` | `wms_confirm_date` | WMS确认日期 |
| 14 | `warehouse_remarks` | `warehouseRemarks` | `warehouse_remarks` | 仓库备注 |

---

## 📦 还空箱表 (process_empty_returns)

| 序号 | 数据库字段 | TypeORM属性 | 前端API参数 | 说明 |
|------|-----------|-------------|-------------|------|
| 1 | `container_number` | `containerNumber` | `container_number` | 集装箱号（主键） |
| 2 | `last_return_date` | `lastReturnDate` | `last_return_date` | 最晚还箱日期 |
| 3 | `planned_return_date` | `plannedReturnDate` | `planned_return_date` | 计划还箱日期 |
| 4 | `return_time` | `returnTime` | `return_time` | 还箱时间 |
| 5 | `notification_return_date` | `notificationReturnDate` | `notification_return_date` | 通知取空日期 |
| 6 | `notification_return_time` | `notificationReturnTime` | `notification_return_time` | 取空时间 |
| 7 | `return_terminal_code` | `returnTerminalCode` | `return_terminal_code` | 还箱码头编码 |
| 8 | `return_terminal_name` | `returnTerminalName` | `return_terminal_name` | 还箱码头名称 |
| 9 | `container_condition` | `containerCondition` | `container_condition` | 箱况 |

---

## 🔄 API接口映射示例

### 创建货柜

**请求URL**: `POST /api/containers`

**请求体**（使用 snake_case）:
```json
{
  "container_number": "CONT202600001",
  "order_number": "ORD202600001",
  "container_type_code": "40HQ",
  "cargo_description": "示例货物",
  "gross_weight": 1500.50,
  "logistics_status": "not_shipped"
}
```

**响应体**:
```json
{
  "success": true,
  "data": {
    "container_number": "CONT202600001",
    "order_number": "ORD202600001",
    "container_type_code": "40HQ",
    "created_at": "2026-02-26T10:00:00Z"
  }
}
```

---

### Excel导入字段映射

**前端配置**（ExcelImport.vue）:
```typescript
const FIELD_MAPPINGS = [
  {
    excelField: '集装箱号',
    table: 'biz_containers',        // 数据库表名
    field: 'container_number',      // 数据库字段名
    required: true
  },
  {
    excelField: '物流状态',
    table: 'biz_containers',
    field: 'logistics_status',
    required: false,
    transform: transformLogisticsStatus
  }
];
```

---

## 📊 快速查询

### 常用外键关系

| 主表 | 外键表 | 外键字段 |
|------|--------|---------|
| biz_replenishment_orders | biz_containers | container.order_number → order_number |
| biz_containers | process_sea_freight | sea_freight.container_number |
| biz_containers | process_port_operations | port_operations.container_number |
| biz_containers | process_trucking_transport | trucking.container_number |
| biz_containers | process_warehouse_operations | warehouse.container_number |
| biz_containers | process_empty_return | empty_return.container_number |
| dict_container_types | biz_containers | container.container_type_code → type_code |

### 主键字段速查

| 表名 | 主键字段 | 类型 |
|------|---------|------|
| biz_replenishment_orders | order_number | VARCHAR(50) |
| biz_containers | container_number | VARCHAR(50) |
| process_sea_freight | container_number | VARCHAR(50) |
| process_port_operations | id | VARCHAR(50) |
| process_trucking_transport | container_number | VARCHAR(50) |
| process_warehouse_operations | container_number | VARCHAR(50) |
| process_empty_returns | container_number | VARCHAR(50) |

---

## 🚨 常见错误速查

| 错误现象 | 原因 | 解决方法 |
|---------|------|---------|
| 表名不存在 | 使用了错误的表名 | 使用完整的数据库表名（如 `biz_containers`） |
| 字段不存在 | 使用了错误的字段名 | 使用 `snake_case` 字段名（如 `container_number`） |
| 外键约束错误 | 关联数据不存在 | 先插入主表数据，再插入从表数据 |
| 类型错误 | 字段类型不匹配 | 确保数据类型正确（String/Number/Date） |

---

## 📖 相关文档

- [开发规范](../DEVELOPMENT_STANDARDS.md) - 完整的开发流程和规范
- [数据库初始化](../DATABASE_INIT_CONSISTENCY_VERIFICATION.md) - 数据库初始化指南
- [前端字段映射](./CORRECT_FIELD_MAPPINGS.ts) - Excel导入字段映射配置

---

**最后更新**: 2026-02-26
