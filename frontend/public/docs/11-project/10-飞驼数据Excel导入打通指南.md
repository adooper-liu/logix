# 飞驼数据 Excel 导入打通指南

> 在正式对接飞驼 API 前，可先通过 Excel 导入模拟飞驼数据，打通「数据 → 存储 → 使用」全链路。

---

## 一、数据流概览

```
┌─────────────────────────────────────────────────────────────────────────┐
│  数据来源（二选一或并存）                                                  │
│  ┌─────────────────────┐    ┌─────────────────────┐                     │
│  │  Excel 导入（当前）  │    │  飞驼 API（后续）   │                     │
│  │  手动维护 / 批量    │    │  实时拉取 / 推送    │                     │
│  └──────────┬──────────┘    └──────────┬──────────┘                     │
└─────────────┼──────────────────────────┼────────────────────────────────┘
              │                          │
              └──────────────┬───────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  存储表（与飞驼核心字段对应）                                              │
│  biz_containers │ process_sea_freight │ process_port_operations │       │
│  process_trucking_transport │ process_empty_return │ ...               │
└─────────────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  使用场景                                                                 │
│  状态机(logistics_status) │ 货柜详情 │ 统计卡片 │ 滞港费计算 │ 甘特图   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 二、要导入哪些数据（与飞驼核心字段对应）

### 2.1 必填字段（保证货柜能创建）

| Excel 列名 | 数据库表 | 字段 | 说明 |
|:-----------|:---------|:-----|:-----|
| 备货单号 | biz_replenishment_orders | order_number | 主键 |
| 集装箱号 | biz_containers | container_number | 主键 |
| 柜型 | biz_containers | container_type_code | 如 40HQ、40HC |

### 2.2 飞驼核心字段（驱动状态机与滞港费）

这些字段与飞驼 API 会写入的字段一致，Excel 导入后即可模拟飞驼数据效果：

| Excel 列名 | 数据库表 | 字段 | 飞驼对应 | 用途 |
|:-----------|:---------|:-----|:---------|:-----|
| 提单号 | process_sea_freight | bill_of_lading_number | 关联 |
| 船公司 | process_sea_freight | shipping_company_id | carrierCode | 标准匹配 |
| 起运港 | process_sea_freight | port_of_loading | polCode | |
| 目的港 | process_sea_freight | port_of_discharge | podCode | |
| 装船日期 / 出运日期 | process_sea_freight | shipment_date | LOBD | 装船 |
| 预计到港日期 | process_port_operations | eta_dest_port | ETA | 目的港 ETA |
| 目的港到达日期 | process_port_operations | ata_dest_port | BDAR/ATA | 目的港 ATA |
| 目的港卸船/火车日期 | process_port_operations | dest_port_unload_date | DSCH | 卸船 |
| 最后免费日期 | process_port_operations | last_free_date | - | 滞港费免费期截止 |
| ETA修正 | process_port_operations | eta_correction | - | 修正 ETA |
| 计划提柜日期 | process_trucking_transport | planned_pickup_date | - | |
| 提柜日期 | process_trucking_transport | pickup_date | STCS | 实际提柜 |
| 最晚提柜日期 | process_trucking_transport | last_pickup_date | - | |
| 计划送仓日期 | process_trucking_transport | planned_delivery_date | - | |
| 送仓日期 | process_trucking_transport | delivery_date | - | |
| 最晚还箱日期 | process_empty_return | last_return_date | - | |
| 还箱日期 | process_empty_return | return_time | RCVE | 还空箱 |

### 2.3 其他常用字段（可选）

| Excel 列名 | 数据库表 | 字段 |
|:-----------|:---------|:-----|
| 销往国家 | biz_replenishment_orders | sell_to_country |
| 客户名称 | biz_replenishment_orders | customer_name |
| 货物描述 | biz_containers | cargo_description |
| 是否查验 | biz_containers | inspection_required |
| 航次 | process_sea_freight | voyage_number |
| 船名 | process_sea_freight | vessel_name |
| 起运港货代公司 | process_sea_freight | freight_forwarder_id |
| 清关状态 | process_port_operations | customs_status |
| 计划清关日期 | process_port_operations | planned_customs_date |
| 实际清关日期 | process_port_operations | actual_customs_date |
| 目的港码头 | process_port_operations | gate_in_terminal |
| 免堆期(天) | process_port_operations | free_storage_days |
| 场内免箱期(天) | process_port_operations | free_detention_days |
| 卸空日期 | process_warehouse_operations | unload_date |
| 还箱地点 | process_empty_return | return_terminal_name |

---

## 三、如何导入

### 3.1 入口

- 路径：`http://localhost:5173/#/import`（Excel 数据导入）
- 菜单位置：导入 → Excel数据导入

### 3.2 步骤

1. **下载模板**：点击「下载模板」获取 `物流数据导入模板.xlsx`
2. **填写数据**：按模板列名填写，表头与列名需与模板一致（支持部分别名，见下方）
3. **上传文件**：拖拽或选择 .xlsx / .xls 文件
4. **解析预览**：点击「解析 Excel」查看解析结果
5. **确认导入**：点击「确认导入」执行批量写入

### 3.3 列名别名（兼容不同模板）

| 标准列名 | 别名 |
|:---------|:-----|
| 销往国家 | 进口国 |
| 船公司 | 船公司名称、船公司.供应商全称（中） |
| 目的港 | 目的港名称、目的港.名称 |
| 起运港 | 起运港.名称 |
| 途经港 | 途经港.名称 |
| 起运港货代公司 | 起运港货代、起运港货代公司.供应商全称（中） |

### 3.4 日期格式

- 支持：`YYYY-MM-DD`、`YYYY/MM/DD`、`YYYY.MM.DD`
- 示例：`2026-02-18`、`2026/02/18`

### 3.5 港口名称

- 支持港口名称或代码，系统会尝试映射到 `dict_ports` 标准代码
- 常见港口：上海港、宁波港、洛杉矶港、纽约港、纽瓦克港 等

---

## 四、数据存放在哪

| 表名 | 用途 |
|:-----|:-----|
| biz_replenishment_orders | 备货单 |
| biz_containers | 货柜主表 |
| process_sea_freight | 海运信息（提单、船、港口、出运） |
| process_port_operations | 港口操作（起运港/中转港/目的港，ETA/ATA/卸船/最晚提柜等） |
| process_trucking_transport | 拖卡运输（提柜、送仓） |
| process_warehouse_operations | 仓库操作（卸柜、入库） |
| process_empty_return | 还空箱 |

**关联关系**：`biz_replenishment_orders.container_number` → `biz_containers`；`biz_containers.bill_of_lading_number` → `process_sea_freight`；流程表均通过 `container_number` 关联 `biz_containers`。

---

## 五、如何使用

### 5.1 状态机

- 系统根据 `process_port_operations`、`process_trucking_transport`、`process_empty_return` 等核心字段计算 `logistics_status`
- 优先级：还箱 > WMS 卸柜 > 提柜 > 目的港 ATA > 中转港 ATA/进闸 > 海运出运 > 未出运

### 5.2 货柜详情

- 路径：`/shipments/:containerNumber`
- 展示：关键日期、海运信息、港口操作、拖卡、仓库、还空箱、滞港费等

### 5.3 统计卡片

- 路径：`/shipments`、`/dashboard`
- 按状态、按到港、按最晚提柜、按最晚还箱等维度统计

### 5.4 滞港费

- 依赖：目的港 ATA/ETA/卸船日、最晚提柜日、实际提柜日、实际还箱日
- 需导入滞港费标准表（`ext_demurrage_standards`）后才有费用计算

### 5.5 飞驼 API 接入后

- 飞驼同步会写入 `ext_container_status_events` 及更新 `process_port_operations` 等核心字段
- Excel 导入与飞驼 API 可并存：Excel 做基础数据，飞驼做增量更新

---

## 六、最小可导入示例（一行）

| 列 | 值 |
|:---|:---|
| 备货单号 | ORD202600001 |
| 集装箱号 | BEAU5730626 |
| 柜型 | 40HC |
| 提单号 | BL202600001 |
| 船公司 | 马士基 |
| 起运港 | 上海港 |
| 目的港 | 纽瓦克港 |
| 装船日期 | 2026-02-10 |
| 预计到港日期 | 2026-02-18 |
| 目的港到达日期 | 2026-02-18 |
| 目的港卸船/火车日期 | 2026-02-18 |
| 最后免费日期 | 2026-02-27 |
| 计划提柜日期 | 2026-02-25 |
| 提柜日期 | （留空则无实际提柜，滞箱费不计） |
| 最晚还箱日期 | 2026-03-04 |
| 还箱日期 | （留空则未还箱） |

---

## 七、常见问题

### Q1：Excel 导入失败？

- 检查必填列：备货单号、集装箱号、柜型
- 检查日期格式：`YYYY-MM-DD` 或 `YYYY/MM/DD`
- 检查港口名称：需在 `dict_ports` 中有映射，或使用标准名称

### Q2：导入后状态不对？

- 检查目的港 ATA、卸船日、提柜日、还箱日等是否按时间顺序填写
- 状态机按优先级计算，后发生事件会覆盖前状态

### Q3：滞港费不显示？

- 需导入滞港费标准（`/import/demurrage-standards`）
- 需有目的港、船公司、货代等匹配维度
- 滞箱费需有实际提柜日才计算

### Q4：与飞驼 API 冲突？

- Excel 导入写基础字段；飞驼 API 同步会更新这些字段
- 建议：Excel 先导入基础数据，飞驼 API 用于后续实时更新

---

## 八、相关文档

- [09-飞驼节点状态码解读与接入整合方案](./09-飞驼节点状态码解读与接入整合方案.md)
- [04-api/01-外部数据集成指南](../04-api/01-外部数据集成指南.md)
- [demurrage/01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM](../demurrage/01-DEMURRAGE_LOGIC_FROM_CONTAINER_SYSTEM.md)
