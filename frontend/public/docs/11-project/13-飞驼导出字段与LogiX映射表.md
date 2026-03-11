# 飞驼导出字段与 LogiX 映射表

> 飞驼 Excel/API 导出字段与 LogiX 数据库表、字段的对应关系，用于 Excel 导入或 API 数据落库。

**数据来源说明**：飞驼 Excel 数据来自**两个表**：
- **表一**：船公司/订阅维度（MBL + 集装箱号订阅），十五组，覆盖全球船公司及中国港区
- **表二**：码头/港区维度（港口代码 + 码头代码），十七组，侧重美国/加拿大/英国码头信息（卸船、提箱、免费期等）

---

## 一、映射总览（表一）

| 飞驼分组 | 主要用途 | LogiX 目标表 |
|:---------|:---------|:-------------|
| 一、基本信息 | 货柜主键、订单状态 | biz_containers, biz_replenishment_orders |
| 二、船公司信息 | 船公司字典 | process_sea_freight, dict_shipping_companies |
| 三、订舱信息 | 订舱状态 | 暂不落库 |
| 四、接货地信息 | 起运港 ETA/ATA/ETD/ATD | process_sea_freight, process_port_operations |
| 五、交货地信息 | 目的港 ETA/ATA | process_port_operations |
| 六、头程船信息 | 船名、航次、航线 | process_sea_freight |
| 七、当前状态信息 | 最新状态 | ext_container_status_events, process_port_operations |
| 八、发生地信息 | 起运港/目的港时间 | process_sea_freight, process_port_operations |
| 九、路径信息 | 多段路径 | 暂不落库（可扩展） |
| 十、港区船舶计划 | 开港/截港、港口代码、船代理 | process_sea_freight |
| 十一、集装箱物流信息 | 箱型、当前状态 | biz_containers |
| 十二、集装箱物流信息-状态 | 状态事件序列 | ext_container_status_events |
| 十三、船舶信息 | IMO、MMSI、船籍 | process_sea_freight |
| 十四、港区货运单证-装箱单 | 箱皮重、总重等 | biz_containers |
| 十五、港区货运单证-VGM | VGM | 暂不落库 |

---

## 二、字段级映射（按 LogiX 表）

### 2.1 biz_containers（货柜主表）

| 飞驼字段 | LogiX 字段 | 说明 |
|:---------|:-----------|:-----|
| 集装箱号（一） | container_number | 主键 |
| 箱型（十一） / 箱型（飞驼标准） | container_type_code | 如 40HC、40HQ |
| 铅封号（十一） | seal_number | |
| 当前状态代码（十一） | - | 用于状态机，不直接存 |
| 当前状态中文描述（十一） | current_status_desc_cn | |
| 当前状态英文描述（十一） | current_status_desc_en | |
| 是否甩柜（十一） | is_rolled | |
| 箱皮重（十四） | tare_weight | |
| 箱总重（十四） | total_weight | |
| 超限长度（十四） | over_length | |
| 超高（十四） | over_height | |
| 危险品等级（十四） | danger_class | |
| 持箱人（十四） | container_holder | |

### 2.2 process_sea_freight（海运信息）

| 飞驼字段 | LogiX 字段 | 说明 |
|:---------|:-----------|:-----|
| MBL Number（一） | mbl_number / bill_of_lading_number | 提单号主键 |
| 船公司SCAC（二） | mbl_scac | |
| 船公司代码（二） | shipping_company_id | 可存 code 或映射到 dict |
| 船公司中文名（二） | - | 用于字典解析 |
| 接货地名称（标准）（四） | port_of_loading | 起运港 |
| 接货地地点CODE（四） | - | 可映射到 dict_ports |
| 交货地名称（标准）（五） | port_of_discharge | 目的港 |
| 交货地地点CODE（五） | - | 可映射到 dict_ports |
| 船名（六/七/十三） | vessel_name | |
| 航次（六/七） | voyage_number | |
| 航线代码（六） | route_code | |
| 接货地预计到达时间（四） | eta_origin | |
| 接货地实际到达时间（四） | ata_origin | |
| 接货地预计离开时间（四） | etd | |
| 接货地实际离开时间（四） | atd | |
| 交货地预计到达时间（五） | eta | 目的港 ETA |
| 交货地实际到达时间（五） | ata | 目的港 ATA |
| 开港时间（十） | port_open_date | |
| 截港时间（十） | port_close_date | |
| imo（十三） | imo_number | |
| mmsi（十三） | mmsi_number | |
| 船籍（十三） | flag | |
| 实际装船时间（八） | shipment_date | LOBD 对应 |
| 实际卸船时间（八） | - | 目的港用 process_port_operations |

### 2.3 process_port_operations（港口操作）

需按 port_type 区分：origin（起运港）、transit（中转港）、destination（目的港）。

| 飞驼字段 | LogiX 字段 | port_type | 说明 |
|:---------|:-----------|:----------|:-----|
| 交货地预计到达时间（五） | eta_dest_port | destination | |
| 交货地实际到达时间（五） | ata_dest_port | destination | BDAR |
| 交货地码头名称（五） | gate_in_terminal | destination | |
| 交货地地点CODE（五） | port_code | destination | |
| 接货地实际到达时间（四） | ata_dest_port | origin | 起运港进闸 GITM |
| 接货地实际离开时间（四） | atd_transit | transit | 若途经港 |
| 实际卸船时间（八） | dest_port_unload_date | destination | DSCH |
| 实际装船时间（八） | - | origin | 对应 shipment_date 在 sea_freight |
| 状态代码（七/十二） | status_code | 按发生地判断 | |
| 状态发生时间（七/十二） | status_occurred_at | | |
| 是否已发生（七/十二） | has_occurred | | N/Y → false/true |
| 发生地（七/十二） | location_name_en | | |
| 地点CODE（七/十二） | port_code | | |
| 状态描述中文（标准）（七/十二） | location_name_cn | | |
| 数据来源（七/十二） | data_source | | |
| 货物存储位置（七/十二） | cargo_location | | |

### 2.4 ext_container_status_events（状态事件）

| 飞驼字段 | LogiX 字段 | 说明 |
|:---------|:-----------|:-----|
| 集装箱号（十二） | container_number | |
| 状态代码（十二） | status_code | LOBD、DSCH、BDAR 等 |
| 发生时间（十二） | occurred_at | |
| 是否预计（十二） | raw_data.isEstimated | N→false, Y→true |
| 发生地（十二） | location | |
| 地点CODE（十二） | - | 可存 raw_data |
| 状态描述中文（标准）（十二） | status_name | |
| 状态描述英文（标准）（十二） | description | |
| 码头名称（十二） | - | raw_data |
| 货物存储位置（十二） | - | raw_data |
| 数据来源（十二） | data_source | |

**状态码与核心字段**：按 `FeiTuoStatusMapping`，LOBD→shipment_date，DSCH→dest_port_unload_date，BDAR→ata_dest_port，STCS→gate_out_time，RCVE→return_time 等。

### 2.5 process_trucking_transport（拖卡运输）

飞驼导出中无直接对应字段，提柜/送仓日期通常需从状态事件推导或手工维护。

### 2.6 process_empty_return（还空箱）

| 飞驼字段 | LogiX 字段 | 说明 |
|:---------|:-----------|:-----|
| RCVE 状态发生时间（十二） | return_time | 还空箱 |

### 2.7 biz_replenishment_orders（备货单）

| 飞驼字段 | LogiX 字段 | 说明 |
|:---------|:-----------|:-----|
| 订单状态（一） | order_status | 需映射 PROCESS→PROCESSING 等 |
| 订单状态说明（一） | - | 可存 remarks |

**注意**：飞驼以 MBL+集装箱为主，备货单号需从业务系统关联，飞驼导出可能无备货单号。

---

## 三、状态码与核心字段（十二组）

| 状态代码 | 描述 | LogiX 核心字段 |
|:---------|:-----|:---------------|
| LOBD | 装船 | process_sea_freight.shipment_date |
| DLPT | 离港 | process_sea_freight.shipment_date |
| TSBA | 中转抵港 | process_port_operations.transit_arrival_date |
| TSDP | 中转离港 | process_port_operations.atd_transit |
| BDAR | 抵港 | process_port_operations.ata_dest_port |
| DSCH | 卸船 | process_port_operations.dest_port_unload_date |
| PCAB | 可提货 | process_port_operations.available_time |
| STCS | 提柜 | process_trucking_transport.pickup_date / gate_out_time |
| RCVE | 还空箱 | process_empty_return.return_time |
| GITM | 进场 | process_port_operations.gate_in_time |

---

## 四、Excel 导入建议

### 4.1 数据形态

- **宽表**：一行一柜，接货地/交货地/当前状态等为多列
- **状态明细**：十二组可能为多行（一柜多状态），需按 container_number 聚合

### 4.2 导入顺序

1. 解析 MBL Number、集装箱号、箱型 → 创建/更新 biz_containers、process_sea_freight
2. 解析船公司、起运港、目的港、船名、航次 → 更新 process_sea_freight
3. 解析接货地/交货地时间 → 写入 process_port_operations（按 port_type）
4. 解析十二组状态行 → 写入 ext_container_status_events，并按 FeiTuoStatusMapping 更新核心字段
5. 触发状态机重算 → 更新 biz_containers.logistics_status

### 4.3 日期格式

飞驼示例：`2026/3/8 18:16`、`2026/2/11 19:00`。导入时需统一解析为 ISO 或 Date。

---

## 五、暂不落库字段

- 三、订舱信息
- 九、路径信息（可后续扩展多段路径表）
- 十五、VGM
- 部分十四组装箱单字段（分件数、分重量、分体积等，属 SKU 级）

---

## 六、表二字段与映射（码头/港区维度）

### 6.1 表二完整字段清单

<details>
<summary>点击展开表二全部字段（按分组）</summary>

| 分组 | 字段名称 | 说明 |
|:-----|:---------|:-----|
| 一 | 提单号、集装箱号、港口代码、码头代码、码头名称、码头全称、订阅ID、单号、箱状态、箱型箱尺寸、箱型箱尺寸（标准化）、件数、重量、体积、时区、船名、航次、进出口标识、持箱人、港口名、卸船时间、重箱进场时间、免费提箱截止日、可提箱状态、可提箱日期、卡车预约提柜时间、实际提箱日期、出场时间、堆场地点、车架号、原始地点、创建时间、更新时间、上次重订阅日期、国家二字码、报错信息 | |
| 二 | HOLD类型、HOLD状态、HOLD日期、HOLD描述 | CUS/SRM/TML |
| 三 | 费用类型、费用、费用状态 | |
| 四 | 船公司中文名、船公司SCAC、船公司英文名、船公司代码、船公司网站url | |
| 五 | 订舱状态英文、订舱状态中文 | |
| 六 | 接货地名称（标准/原始）、时区、地点CODE、纬度、经度、码头名称、预计/实际到达/离开时间 | |
| 七 | 交货地名称（标准/原始）、时区、地点CODE、纬度、经度、码头名称、预计/实际到达/离开时间 | |
| 八 | 船名、航次、航线代码 | |
| 九 | 船名、航次、集装箱号、状态代码、状态发生时间、是否已发生、发生地、时区、状态描述中英文、地点CODE、纬度、经度、码头名称、货物存储位置、数据来源 | |
| 十 | 地点名称中英文、地点CODE、地点类型、纬度、经度、时区、预计离开/到港时间、实际到达/离开时间、首次获取到约etd/eta | |
| 十一 | 路径、起始地/目的地CODE/名称/纬度/经度/时区、运输方式、运输信息、船名、航次 | |
| 十二 | 预计/实际离开/到达时间、港口代码/名称、船名、航次、码头名称/代码、时区、开港/截港时间、船代理简称 | |
| 十三 | 集装箱号、箱型、箱尺寸、箱型（飞驼标准）、铅封号、当前状态代码/描述、是否用柜 | |
| 十四 | 船名/车牌号、航次、运输方式、状态代码、发生时间、是否预计、发生地、时区、状态描述、地点CODE、码头名称、货物存储位置、分单号 | |
| 十五 | 船名、imo、mmsi、船舶建造日、船籍、箱尺寸、运营方 | |
| 十六 | 箱号、持箱人、装/卸/目的港EDI、箱皮重、箱总重、超限长度、超高、危险品等级、提单号、分件数、分重量、分体积、箱型、箱量、出场/进场方式、箱高度、报关单号、箱预录时间、运抵报文发送时间、危险品标识、船公司操作、箱状态、铅封号、冷藏箱温度、联合国编号 | |
| 十七 | 箱号、VGM船公司报文重量、VGM报文时间 | |

</details>

### 6.2 表二分组总览

| 飞驼分组 | 主要用途 | LogiX 目标表 |
|:---------|:---------|:-------------|
| 一、基本信息 | 提单、箱号、港口、码头、卸船/提箱/免费期 | process_port_operations, process_trucking_transport |
| 二、HOLD信息 | 扣留类型 CUS/SRM/TML | process_port_operations.customs_status |
| 三、费用信息 | 费用类型、金额、状态 | 暂不落库 |
| 四、船公司信息 | 船公司 | process_sea_freight |
| 五、订舱信息 | 订舱状态 | 暂不落库 |
| 六、接货地信息 | 起运港 | process_sea_freight, process_port_operations |
| 七、交货地信息 | 目的港 | process_port_operations |
| 八、头程船信息 | 船名、航次、航线 | process_sea_freight |
| 九、当前状态信息 | 最新状态 | ext_container_status_events |
| 十、发生地信息 | 时间节点 | process_sea_freight, process_port_operations |
| 十一、路径信息 | 多段路径 | 暂不落库 |
| 十二、港区船舶计划 | 开港/截港 | process_sea_freight |
| 十三、集装箱物流信息 | 箱型、状态 | biz_containers |
| 十四、集装箱物流信息-状态 | 状态事件 | ext_container_status_events |
| 十五、船舶信息 | IMO、MMSI、船籍 | process_sea_freight |
| 十六、港区货运单证-装箱单 | 箱皮重、总重等 | biz_containers |
| 十七、港区货运单证-VGM | VGM | 暂不落库 |

### 6.3 表二特有字段（表一无）

| 飞驼字段 | 分组 | LogiX 字段 | 说明 |
|:---------|:-----|:-----------|:-----|
| 提单号 | 一 | bill_of_lading_number | 表二用「提单号」而非 MBL Number |
| 港口代码 | 一 | port_code | 起运港/目的港代码，如 USLAX |
| 码头代码 | 一 | gate_in_terminal | 如 Y773 |
| 码头名称 | 一 | gate_in_terminal | 如 WBCT |
| 码头全称 | 一 | - | 可存 remarks |
| 卸船时间 | 一 | dest_port_unload_date | 目的港卸船 |
| 重箱进场时间 | 一 | gate_in_time | 进闸 |
| 免费提箱截止日 | 一 | last_free_date | 滞港费免费期截止 |
| 可提箱状态 | 一 | - | YES/NO，可推导 available_time |
| 可提箱日期 | 一 | available_time | 可提货日期 |
| 卡车预约提柜时间 | 一 | - | 可扩展 planned_pickup_date |
| 实际提箱日期 | 一 | pickup_date / gate_out_time | 提柜 |
| 出场时间 | 一 | gate_out_time | 出闸 |
| 进出口标识 | 一 | - | E/I，用于判断方向 |
| 持箱人 | 一 | container_holder | |
| 国家二字码 | 一 | - | 可映射到 port 国家 |
| HOLD类型 | 二 | customs_status | CUS→海关扣留，SRM→船公司，TML→码头 |
| HOLD状态 | 二 | - | Release 等 |
| HOLD日期 | 二 | - | 可扩展 |
| HOLD描述 | 二 | customs_remarks | |
| 费用类型/费用/费用状态 | 三 | - | 暂不落库 |
| 是否用柜 | 十三 | is_rolled | 表二写法，同表一「是否甩柜」 |

### 6.4 表一与表二差异

| 项目 | 表一 | 表二 |
|:-----|:-----|:-----|
| 主键维度 | MBL Number + 集装箱号 | 提单号 + 集装箱号 + 港口代码 + 码头代码 |
| 数据范围 | 船公司订阅、全球 | 码头订阅、美/加/英码头 |
| 一、基本信息 | 订单状态、更新时间、是否3PL | 港口、码头、卸船、提箱、免费期、出场 |
| 特有分组 | 无 | 二 HOLD、三 费用 |
| 十一 是否甩柜 | 是否甩柜 | 是否用柜（同义） |

### 6.5 表二导入建议

1. **关联键**：表二按 提单号 + 集装箱号 与表一/LogiX 货柜关联；港口代码 + 码头代码 用于确定 process_port_operations 的 port_type（destination）记录。
2. **优先写回**：卸船时间、重箱进场时间、免费提箱截止日、可提箱日期、实际提箱日期、出场时间 → process_port_operations / process_trucking_transport。
3. **HOLD**：HOLD类型 CUS/SRM/TML 可映射到 customs_status 或扩展字段。
4. **合并导入**：若同时有表一、表二，建议先导入表一建基础，再导入表二补充码头维度数据。

---

## 七、相关文档

- [10-飞驼数据Excel导入打通指南](./10-飞驼数据Excel导入打通指南.md)
- [09-飞驼节点状态码解读与接入整合方案](./09-飞驼节点状态码解读与接入整合方案.md)
- [12-飞驼数据接入方式解读](./12-飞驼数据接入方式解读.md)
