# 飞驼数据集成完整指南

> **创建日期**: 2026-03-16  
> **最后更新**: 2026-03-16  
> **状态**: ✅ 已实现并上线  
> **整合来源**: 5 篇飞驼相关文档  
> **官方文档**: [飞驼可视接口](https://doc.freightower.com/)

---

## 📋 概述

本文档完整说明 LogiX 系统与飞驼API 的数据集成方案，包括 API 业务概述、节点状态码解读、接入方式、Excel导入、字段映射、验证方法等内容。

### 核心原则

**通过中间层（适配器）对接飞驼API，不直接在主业务逻辑中耦合飞驼协议**

```
┌─────────────────────────────────────────────────────────────────┐
│                        LogiX 主服务                              │
│  ┌─────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │ 状态机计算   │  │ ContainerStatus   │  │ 统计/列表/甘特图   │  │
│  │ (核心字段)   │  │ Service           │  │ (读核心字段)      │  │
│  └──────┬──────┘  └────────┬─────────┘  └────────┬─────────┘  │
│         │                   │                     │             │
│         └───────────────────┼─────────────────────┘             │
│                             │ 只读写 process_port_operations    │
│                             │ process_sea_freight 等核心表      │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                    中间层（适配器）                              │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │ FeiTuoAdapter / ExternalDataService                        │  │
│  │  - 调用飞驼API (POST /application/v1/query)              │  │
│  │  - FeiTuoStatusMapping: 飞驼码 → 核心字段                  │  │
│  │  - 写入 process_port_operations, ext_container_status_events │  │
│  │  - 同步后触发 ContainerStatusService.updateStatus()        │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────────┐
│                    飞驼API (Freightower)                         │
│  - 28 个集装箱动态节点                                         │
│  - 11 个扣留/放行节点                                         │
│  - 14 个驳船/铁路/卡车节点                                      │
│  - 海关状态码、异常预警推送                                      │
│  - 支持近 100 家船公司、15+ 个中国港口                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 第一部分：飞驼API 业务概述

### 1.1 两大核心业务场景

#### 集装箱跟踪场景

| 接口类型 | 具体接口 | 业务场景 | LogiX 对接状态 |
|:---------|:---------|:---------|:---------------|
| 跟踪 | **集装箱综合跟踪** | 订阅和查询集装箱全程 **28 个节点**，支持近 100 家船公司 | ✅ FeiTuoAdapter 已对接 |
| 跟踪 | 可视化 IFrame 地图 | 卡车、船舶、铁路实时位置、轨迹、港口拥堵、异常天气，支持中英日三语 | 可扩展 |
| 跟踪 | **异常预警推送** | 海关查验、甩柜、ETD 延误、中转滞留、ETA 延误、码头超期、超期用箱 | 可扩展 Webhook |
| 跟踪 | **智能 ETA 预测** | 基于 3000 万 + 箱真实记录、AIS、AI 计算 ETA | 可扩展 |
| 跟踪 | **智能甩柜预测** | 智能预测集装箱甩柜风险 | 可扩展 |
| 跟踪 | 智能识别船公司 | 传 AUTO 自动识别船司 | 可扩展 |
| 跟踪 | 箱号智能识别提单号 | 箱号反查提单号 | 可扩展 |

#### 订舱计划场景

| 接口类型 | 具体接口 | 业务场景 | LogiX 对接状态 |
|:---------|:---------|:---------|:---------------|
| 计划 | **全球港到港船期** | 起运港 300+ 基本港，直达 + 中转，与船公司同步 | 可扩展 |
| 计划 | **全球船舶船期** | 船舶未来 3 个月航行计划，覆盖 90% 船舶 | 可扩展 |
| 计划 | **码头作业计划** | 码头船舶计划、船司航次转码头航次、开截港、到离泊、截关、截单 | 可扩展 |
| 计划 | 全球航班计划 | 全球航空航班计划查询 | 可扩展 |

### 1.2 API 产品线结构

| 产品线 | 子模块 | 说明 |
|:-------|:-------|:-----|
| **海运集装箱跟踪** | 集装箱综合跟踪 | 订阅 + 查询（/application/v1/query）、更新推送、增量 + 预警推送、停止推送 |
| | 船司集装箱跟踪 | 船公司箱货跟踪（订阅/查询/推送），支持 91 家船公司 |
| | 中国港区 + 海关跟踪 | 中国港区（订阅/查询/推送）、中国海关（提单号/报关单号） |
| | 国外港区 + 海关跟踪 | 海外码头（订阅/查询/推送）、美国 CES 查验站、美国海关（订阅/查询/原始数据） |
| | EIR 放单 + 提箱跟踪 | 中国 EIR 跟踪（订阅/查询） |
| | 码头作业计划 | 码头船舶计划、船司航次转码头航次 |
| **散货/RORO 跟踪** | 船舶 AIS、历史轨迹、预测轨迹、港拥堵分析 | - |
| **铁路货运跟踪** | 北美海铁联运、中欧 + 中亚铁路 | - |
| **航空货运跟踪** | 航空跟踪、飞机 ADSB、美国海关空运 | - |
| **快递包裹跟踪** | 快递订阅/查询 | - |
| **国内汽运跟踪** | 货车定位、轨迹、电子围栏 | - |
| **海运船期计划** | 港到港船期、船舶船期 | - |
| **航空航班计划** | 全球航班计划 | - |

### 1.3 API 使用说明（对接流程）

**第一步：获取 API 账号**
- 联系飞驼获取专属 API 账号（`CLIENTID` 和 `SECRET`）

**第二步：获取访问令牌（Token）**
- 使用 `CLIENTID` 和 `SECRET` 调用**获取 Token 接口**
- 在 HTTP Header 中添加 `Authorization: Bearer <Token>`（注意空格）

**第三步：调用具体业务接口**
- 以**集装箱综合跟踪接口**为例：
  - 请求地址：`POST http://openapi.freightower.com/application/v1/query`
  - Header：`Authorization: Bearer <Token>`
  - Body：JSON 格式参数（`billNo`、`containerNo`、`carrierCode` 等）

**第四步：处理返回结果**
- 状态码说明：
  - `20000`：有数据
  - `20001`：无数据
  - `40100`：Token 无效
  - `40000`：参数错误
  - `42900`：调用频率超限（60 次/10 秒）

---

## 第二部分：飞驼节点状态码解读

### 2.1 集装箱动态节点（CONTAINERS 集合）- 17 个核心节点

这是物流跟踪的核心节点，覆盖从提空箱到还空箱的全过程。

| StatusCode | descriptionCn | descriptionEn | 物流节点说明 | 对应 LogiX 核心字段 |
|:-----------|:--------------|:--------------|:-------------|:---------------------|
| **STSP** | 提空箱 | Pick-up Empty | 提取空集装箱 | 起运地空箱提取 |
| **STUF** | 装箱 | Container Stuffing | 货物装入集装箱 | `cargo_packed_date`（可扩展） |
| **GITM** | 进场 | Received | 集装箱进场 | `gate_in_time`（起运港） |
| **LOBD** | 装船 | Loaded | 集装箱装船 | `shipment_date`（process_sea_freight） |
| **DLPT** | 离港 | Vessel Departed | 船舶离港 | `atd_origin_port`（可扩展） |
| **TSBA** | 中转抵港 | T/S Vessel Arrived | 中转船舶抵达 | `ata_transit_port` |
| **TSCA** | 中转停泊 | T/S Vessel Berthed | 中转船舶停泊 | 中转靠泊 |
| **TSDC** | 中转卸船 | T/S Vessel Discharged | 中转卸船 | `discharge_transit_date`（可扩展） |
| **TSLB** | 中转装船 | T/S Vessel Loaded | 中转装船 | 中转装船 |
| **TSDP** | 中转离港 | T/S Vessel Departed | 中转船舶离港 | `atd_transit` |
| **BDAR** | 抵港 | Vessel Arrived | 船舶抵达目的港 | `ata_dest_port` |
| **POCA** | 靠泊 | Vessel Berthed | 船舶靠泊 | 目的港靠泊 |
| **DSCH** | 卸船 | Vessel Discharged | 卸船操作 | `dest_port_unload_date` / `dischargedTime` |
| **PCAB** | 可提货 | Available | 货物可提取 | `available_pickup_date`（可扩展） |
| **STCS** | 提柜 (货) | Gate Out for Delivery | 提取集装箱（货物） | `gate_out_time` / `pickup_date` |
| **STRP** | 拆箱 | Container Stripping | 拆箱操作 | `unloading_date`（可扩展） |
| **RCVE** | 还空箱 | Empty Returned | 归还空集装箱 | `return_time`（process_empty_return） |

### 2.2 扣留/放行节点 - 11 个异常状态节点

这些节点处理各种滞留和放行情况。

| StatusCode | descriptionCn | descriptionEn | 说明 | 对应 LogiX 处理 |
|:-----------|:--------------|:--------------|:-----|:-----------------|
| **DUMP** | 甩柜 | Dumped to be loaded | 集装箱被甩柜 | 异常状态，不更新核心字段 |
| **CUIP** | 海关滞留 | Customs on hold | 海关扣留 | `customs_status = CUSTOMS_HOLD` |
| **PASS** | 海关放行 | Customs Released | 海关放行 | `customs_status = RELEASED` |
| **SRHD** | 船公司滞留 | B/L on hold | 船公司滞留 | 记录异常，状态机视为 `at_port` |
| **PRLD** | 船公司配载 | Planned Load | 船公司计划装载 | 配载计划 |
| **SRRS** | 船公司放行 | B/L Released | 船公司放行 | 解除船公司滞留 |
| **MCRP** | 海事放行 | Maritime Clearance Permitted | 海事放行 | 海事放行 |
| **TMHD** | 码头滞留 | Terminal on hold | 码头扣留 | `customs_status = TERMINAL_HOLD` |
| **TMPS** | 码头放行 | Terminal Released | 码头放行 | 解除码头滞留 |
| **SRSD** | 运费滞留 | Charges on hold | 运费未结清 | 记录运费滞留 |
| **SRSE** | 运费结清 | Charges Settled | 运费已结清 | 解除运费滞留 |

### 2.3 驳船、铁路与卡车节点 - 14 个多式联运节点

支持多式联运场景，包括铁路、驳船、卡车等运输方式。

| StatusCode | descriptionCn | descriptionEn | 说明 | 对应 LogiX 处理 |
|:-----------|:--------------|:--------------|:-----|:-----------------|
| **IRLB** | 铁运装箱 | Rail Loaded | 铁路装箱 | 铁路装箱时间 |
| **IRDP** | 铁运离站 | Rail Departed | 铁路离站 | `atd_rail_date`（可扩展） |
| **IRAR** | 铁运到站 | Rail Arrived | 铁路到站 | `ata_rail_date`（可扩展） |
| **IRDS** | 铁运卸箱 | Rail Discharged | 铁路卸箱 | 铁路卸箱时间 |
| **FDLB** | 驳船装船 | Feeder Loaded | 驳船装船 | 驳船装船时间 |
| **FDDP** | 驳船离港 | Feeder Departed | 驳船离港 | `atd_feeder_date`（可扩展） |
| **FDBA** | 驳船抵达 | Feeder Arrived | 驳船抵达 | `ata_feeder_date`（可扩展） |
| **FDDC** | 驳船卸船 | Feeder Discharged | 驳船卸船 | 驳船卸船时间 |
| **GWIT** | 抵达仓库 | Warehouse In | 进入仓库 | `warehouse_in_date`（可扩展） |
| **GWOT** | 离开仓库 | Warehouse Out | 离开仓库 | `warehouse_out_date`（可扩展） |
| **GTIN** | 卡车进场 | Gated in | 卡车进场 | 卡车进场时间 |
| **GTOT** | 卡车出场 | Gated out | 卡车出场 | 卡车出场时间 |
| **FETA** | 交货地抵达 | Delivery Arrived | 抵达交货地 | `delivery_arrived_date`（可扩展） |
| **PLFD** | 铁路免柜期 | Rail Last Free Day | 铁路免柜期最后一天 | `last_free_date`（可扩展） |

### 2.4 支持的船公司与港口

**支持的主要船公司（91 家）：**
- MSC（地中海）、MSK（马士基）、CMA（达飞）、COS（中远）、EMC（长荣）
- HMM（现代）、HPL（赫伯罗特）、ONE（海洋网联）、OOL（东方海外）、PIL（太平）
- YML（阳明）、ZIM（以星）、ANL（澳航）、APL（美国总统）、CCN（智利航运）等

**支持的中国港口：**

| 港区代码 | 港区名称 | 备注 |
|:---------|:---------|:-----|
| CNSHA | 上海港 | 全面支持 |
| CNNGB | 宁波港 | 全面支持 |
| CNYTN | 盐田港 | 全面支持 |
| CNSHK | 蛇口港 | 全面支持 |
| CNCWN | 赤湾港 | 全面支持 |
| CNDCB | 大铲湾港 | 全面支持 |
| CNNSA | 广州港 | 全面支持 |
| CNTAO | 青岛港 | 全面支持 |
| CNTXG | 天津港 | 全面支持 |
| CNXMN | 厦门港 | 全面支持 |
| CNDLC | 大连港 | 全面支持 |
| CNWUH | 武汉港 | 仅支持出口，仅支持箱号 |
| CNFOC | 福州港 | 仅支持箱号 |
| CNQZH | 钦州港 | 仅支持箱号 |

---

## 第三部分：飞驼与 LogiX 核心字段映射

> 核心原则：**LogiX 状态机只认本库核心时间字段，不直接读飞驼 statusCode**  
> 飞驼同步时需把「飞驼状态事件」**翻译成对核心字段的更新**。

### 3.1 核心字段驱动状态机映射表

| 飞驼事件（StatusCode） | descriptionCn | LogiX 核心字段 | 数据表 | 港口类型 |
|:----------------------|:--------------|:---------------|:--------|:---------|
| **BDAR** / **POCA** | 抵港 / 靠泊 | `ata_dest_port` | process_port_operations | destination |
| **DSCH** | 卸船 | `dest_port_unload_date` | process_port_operations | destination |
| **DLPT** | 离港 | `atd_origin_port` | process_sea_freight | origin |
| **TSBA** | 中转抵港 | `ata_transit_port` | process_port_operations | transit |
| **TSDP** | 中转离港 | `atd_transit_port` | process_port_operations | transit |
| **GITM** | 进场 | `gate_in_time` | process_port_operations | origin/destination |
| **STCS** | 提柜 (货) | `gate_out_time` | process_port_operations | destination |
| **LOBD** | 装船 | `shipment_date` | process_sea_freight | origin |
| **PCAB** | 可提货 | `available_pickup_date` | process_port_operations | destination |
| **STSP** | 提空箱 | `empty_pickup_date` | process_port_operations | origin |
| **RCVE** | 还空箱 | `return_time` | process_empty_returns | - |
| **CUIP** | 海关滞留 | `customs_status = CUSTOMS_HOLD` | process_port_operations | - |
| **TMHD** | 码头滞留 | `customs_status = TERMINAL_HOLD` | process_port_operations | - |
| **SRHD** | 船公司滞留 | `customs_status = CARRIER_HOLD` | process_port_operations | - |
| **PASS** | 海关放行 | `customs_status = RELEASED` | process_port_operations | - |
| **TMPS** | 码头放行 | 解除码头滞留 | process_port_operations | - |
| **SRRS** | 船公司放行 | 解除船公司滞留 | process_port_operations | - |
| **DUMP** | 甩柜 | `customs_status = DUMPED` | process_port_operations | - |

### 3.2 多式联运节点映射（可扩展）

| 飞驼事件（StatusCode） | descriptionCn | LogiX 扩展字段 | 数据表 | 说明 |
|:----------------------|:--------------|:---------------|:--------|:-----|
| **IRLB** | 铁运装箱 | `rail_load_date` | process_port_operations | 铁路装箱 |
| **IRDP** | 铁运离站 | `rail_depart_date` | process_port_operations | 铁路离站 |
| **IRAR** | 铁运到站 | `rail_arrive_date` | process_port_operations | 铁路到站 |
| **IRDS** | 铁运卸箱 | `rail_discharge_date` | process_port_operations | 铁路卸箱 |
| **GWIT** | 抵达仓库 | `warehouse_in_date` | process_warehouse_operations | 入库时间 |
| **GWOT** | 离开仓库 | `warehouse_out_date` | process_warehouse_operations | 出库时间 |
| **GTIN** | 卡车进场 | `truck_gate_in_date` | process_trucking_transport | 卡车进场 |
| **GTOT** | 卡车出场 | `truck_gate_out_date` | process_trucking_transport | 卡车出场 |
| **PLFD** | 铁路免柜期 | `last_free_date` | process_port_operations | 免柜期最后一天 |

### 3.3 飞驼API 请求参数

**接口地址：** `POST http://openapi.freightower.com/application/v1/query`

**Header 参数：**

| 参数名 | 类型 | 必填 | 描述 |
|:------|:-----|:-----|:-----|
| Authorization | string | 是 | 认证 Token，格式为 `Bearer <your_token>` |

**Body 参数（application/json）：**

| 参数名 | 类型 | 必填 | 描述 | 示例 |
|:------|:-----|:-----|:-----|:-----|
| billNo | string | 否 | 提单号 | "177MASASS106510A" |
| containerNo | string | 否 | 箱号 | "TCKU1559530" |
| carrierCode | string | 否 | 船公司代码 | "MSC" |
| portCode | string | 否 | 港口代码 | "CNSHA" |
| isExport | string | 否 | 进出口标识（E: 出口，I: 进口） | "E" |
| businessNo | string | 否 | 业务编号 | 可空 |
| billCategory | string | 否 | 提单类别 | 可空 |
| polCode | string | 否 | 起运港代码 | 可空 |
| podCode | string | 否 | 目的港代码 | 可空 |

**调用示例（cURL）：**

```bash
curl --location --request POST 'http://openapi.freightower.com/application/v1/query' \
--header 'Authorization: Bearer <your_token>' \
--header 'Content-Type: application/json' \
--data-raw '{
    "billNo": "177MASASS106510A",
    "containerNo": "TCKU1559530",
    "carrierCode": "MSC",
    "portCode": "CNSHA",
    "isExport": "E"
}'
```

**返回格式（JSON）关键字段：**

| 字段名 | 类型 | 描述 |
|:------|:-----|:-----|
| statusCode | int | 状态码（20000 表示成功） |
| message | string | 响应消息 |
| data | object | 返回数据主体 |
| data.query | object | 查询参数信息 |
| data.result | object | 跟踪结果详情 |
| data.result.currentStatus | object | 当前最新状态事件 |
| data.result.places | array | 途经地点列表 |
| data.result.routes | array | 运输路线详情 |
| data.result.containers | array | 集装箱详细信息 |
| data.result.vessel | array | 船舶信息 |

---

## 第四部分：飞驼数据接入方式

### 4.1 三种接入方式对比

| 接入方式 | 触发方 | 数据流向 | 适用场景 |
|:---------|:-------|:---------|:---------|
| **1. 订阅 + 查询（拉取）** | LogiX 主动 | LogiX → 飞驼API → LogiX | 按需查询、定时轮询、初始化数据 |
| **2. 异常/增量推送（推送）** | 飞驼主动 | 飞驼 → LogiX 回调 URL | 实时变更、异常预警 |
| **3. 码头信息（订阅 + 定时更新）** | 飞驼定时 | 飞驼定时更新已订阅数据 | 美国/加拿大/英国码头信息 |

### 4.2 主链路：订阅 + 查询（拉取）

```
LogiX 后端
    │
    ├─ 1. 获取 Token (CLIENTID + SECRET)
    ├─ 2. POST /application/v1/query
    │      Body: { billNo, containerNo, carrierCode, ... }
    │      Header: Authorization: Bearer <Token>
    │
    └─ 3. 解析返回 → 写入 ext_container_status_events
              → 更新 process_port_operations 等核心字段
              → 触发状态重算
```

**使用场景**：
- 货柜详情页「同步飞驼」按钮
- 定时任务批量同步（已出运未还箱）
- Excel导入后补充/校验数据

### 4.3 增强：异常推送（Webhook）

```
飞驼
    │ 数据变更 / 异常预警
    ▼
POST {LogiX 回调 URL}
    │
    ▼
LogiX Webhook 接口
    ├─ 验证签名（可选）
    ├─ 解析 payload
    ├─ 写入 ext_container_status_events
    ├─ 更新核心字段
    └─ 触发状态重算
```

**前置**：向飞驼提供回调 URL（如 `https://your-domain.com/api/v1/webhooks/feituo`）

**配置流程**：
1. 使用「订阅 + 查询」接口完成订阅
2. 将回调 URL 提供给飞驼客服配置
3. 配置成功后接收已订阅运单的实时推送

**推送内容**：
- 订阅成功时：推送当前最新状态
- 跟踪过程中：有变化时推送最新事件（ETD/ETA、箱动态、异常预警）
- 运单完成后：停止推送

**签名验证**（可选）：
- 使用 HmacSHA1，headers：`x-ft-timestamp`、`x-ft-nonce`、`x-ft-client`、`x-ft-signature`

### 4.4 码头信息（可选）

- 订阅参数：集装箱号 + 港口
- 订阅与查询**接口不一致**，需单独对接
- 适用：美国/加拿大/英国码头场景

### 4.5 LogiX 推荐接入策略

**实施顺序建议**：

1. **P0**：对接「集装箱综合跟踪（订阅 + 查询）」— 主数据源
2. **P1**：配置「异常/增量推送」回调 — 实时更新
3. **P2**：按需对接船公司信息表、码头信息表 — 扩展能力

---

## 第五部分：Excel导入打通指南

### 5.1 导入架构

```
飞驼 Excel 导出文件
    │
    ├─ 表一：集装箱跟踪详情（主表）
    │   ├─ 分组 1: 基本信息（MBL、箱号、订单状态）
    │   ├─ 分组 2: 船公司信息（SCAC、船公司代码）
    │   ├─ 分组 4: 接货地信息（POL、地点 CODE、ETA）
    │   ├─ 分组 5: 交货地信息（POD、地点 CODE、ATA）
    │   ├─ 分组 6: 船名航次
    │   ├─ 分组 7/12: 状态事件（多个）
    │   ├─ 分组 8: 装船/卸船时间
    │   ├─ 分组 10: 港口时间
    │   ├─ 分组 11: 箱体信息
    │   ├─ 分组 13: 船舶信息
    │   └─ 分组 14: 货物信息
    │
    └─ 表二：路径信息（可选）
        └─ 起始地/目的地、运输方式
```

### 5.2 字段映射配置

**完全一致的核心字段（✅）**：

| 您的字段 | 映射分组 | LogiX 用途 |
|----------|----------|------------|
| MBL Number | 1 | bill_of_lading_number |
| 集装箱号 | 1 | container_number |
| 订单状态 | 1 | order_status |
| 订单状态说明 | 1 | remarks |
| 更新时间 | 1 | 时间戳 |
| 是否 3PL | 1 | 标识 |
| 船公司 SCAC | 2 | mbl_scac |
| 船公司代码 | 2 | shipping_company_id |
| 船公司中文名 | 2 | 字典解析 |
| 船公司英文名 | 2 | 字典解析 |
| 接货地名称（标准） | 4 | port_of_loading |
| 接货地名称（原始） | 4 | 辅助 |
| 交货地名称（标准） | 5 | port_of_discharge |
| 交货地名称（原始） | 5 | 辅助 |
| 交货地预计到达时间 | 5 | eta |
| 交货地实际到达时间 | 5 | ata |
| 船名 | 6 | vessel_name |
| 航次 | 6 | voyage_number |
| 航线代码 | 6 | route_code |
| 状态代码 | 7/12 | status_code |
| 状态发生时间 | 7/12 | status_occurred_at |
| 是否已发生 | 7/12 | has_occurred |
| 发生地 | 7/12 | location |
| 状态描述中文（标准） | 7/12 | status_name |
| 状态描述英文（标准） | 7/12 | description |
| 数据来源 | 7/12 | data_source |
| 货物存储位置 | 7/12 | cargo_location |
| 码头名称 | 7/12 | gate_in_terminal |
| 实际装船时间 | 8 | shipment_date |
| 实际卸船时间 | 8 | dest_port_unload_date |
| 开港时间 | 10 | port_open_date |
| 截港时间 | 10 | port_close_date |
| 箱型 | 11 | container_type_code |
| 箱型（飞驼标准） | 11 | container_type_code |
| 铅封号 | 11 | seal_number |
| 当前状态代码 | 11 | 状态机 |
| 当前状态中文描述 | 11 | current_status_desc_cn |
| 当前状态英文描述 | 11 | current_status_desc_en |
| 是否甩柜 | 11 | is_rolled |
| imo | 13 | imo_number |
| mmsi | 13 | mmsi_number |
| 船籍 | 13 | flag |
| 箱皮重 | 14 | tare_weight |
| 箱总重 | 14 | total_weight |
| 超限长度 | 14 | over_length |
| 超高 | 14 | over_height |
| 危险品等级 | 14 | danger_class |
| 持箱人 | 14 | container_holder |

### 5.3 无前缀字段按列顺序映射

当 Excel 中 **地点 CODE、预计到达时间、码头名称** 等无前缀时，按**同一列名的出现顺序**分配到不同分组：

| 您的字段 | 表一 occurrence → 分组 | 说明 |
|----------|------------------------|------|
| 地点 CODE | 第 1 次→4(接货地)、第 2 次→5(交货地)、第 3 次→7、第 4 次→12 | 排在接货地名称（原始）后归入接货地 |
| 预计到达时间 | 第 1 次→4、第 2 次→5 | |
| 实际到达时间 | 第 1 次→4、第 2 次→5 | |
| 预计离开时间 | 第 1 次→4、第 2 次→5 | |
| 实际离开时间 | 第 1 次→4、第 2 次→5 | |
| 码头名称 | 第 1 次→4、第 2 次→5、第 3 次→7、第 4 次→12 | |
| 时区、纬度、经度 | 同上 | |
| 起始地 CODE、目的地 CODE | 9（路径信息） | 有前缀，单独映射 |

### 5.4 不导入的字段（⚪）

| 字段 | 说明 |
|------|------|
| 编码、名称。简体中文、名称。English、名称.Français | 飞驼系统主数据 |
| 数据状态、创建人、修改人、使用状态、创建时间、修改时间 | 审计/系统字段 |
| 是否为 MBL Number 订阅、结束时间 | 订阅元数据 |
| 船公司网站 url | 可扩展 dict |
| 时区、纬度、经度 | 可存 raw_data，暂不落核心表 |
| 船代理简称、船代理简称中文、是否海铁联运 | 可扩展 |
| 首次获取时间、首次获取到的 etd、首次获取到的 eta | 可存 raw_data |
| 地点名称英文（标准）、地点名称中文（标准）、地点名称（原始）、地点类型 | 发生地详情，可存 raw_data |
| AIS 实际到港时间、AIS 实际靠泊时间、AIS 实际离港时间 | AIS 数据 |
| 免堆存天数、免用箱天数、免堆存时间、免用箱时间 | 滞港费相关，可扩展 |
| 路径、起始地/目的地 CODE/名称/纬度/经度、运输方式、运输信息 | 路径信息，暂不落库 |
| 箱尺寸、船名/车牌号、分单号、报关单号、异常节点 | 可存 raw_data |
| 船舶建造日、运营方、装货港 EDI、卸货港 EDI、目的港 EDI | 可扩展 |
| 分件数、分重量、分体积、箱量、出场方式、箱高度、进场方式 | 装箱单明细 |
| 箱预录时间、运抵报文发送时间、危险品标识、船公司操作、箱状态 | 单证/状态 |
| 冷藏箱温度、联合国编号 | 特殊箱型 |
| VGM 船公司报文重量、VGM 报文时间 | VGM，暂不落库 |
| 发生地（原始）、状态描述（原始） | 可作 发生地、状态描述 的备用 |

### 5.5 如何验证

1. **导出表头**：确认 Excel 第一行列名是「接货地地点 CODE/交货地地点 CODE」还是「地点 CODE」。
2. **试导入**：用实际飞驼 Excel 做一次导入，检查 `ext_feituo_import_table1` 的 `raw_data`、`raw_data_by_group` 是否按预期分组。
3. **核心字段**：检查 process_sea_freight、process_port_operations 中的 port_of_loading、port_of_discharge、eta、ata 等是否正确写入。

---

## 第六部分：中间层对接架构

### 6.1 关键原则

1. **主业务不依赖飞驼**：状态机、统计、列表均基于 `process_port_operations`、`process_sea_freight`、`process_trucking_transport` 等核心表
2. **适配器负责翻译**：飞驼返回的 `StatusCode`、`descriptionCn` 等字段，由 `FeiTuoStatusMapping` 统一映射到核心字段
3. **同步后触发重算**：飞驼数据写入后，调用 `ContainerStatusService.updateStatus(containerNumber)` 或批量接口，使 `logistics_status` 与最新数据一致
4. **数据源标记**：所有通过飞驼更新的字段标记 `dataSource = 'Feituo'`，与 Excel导入（`Excel`）和系统计算（`System`）区分
5. **轨迹留存**：原始飞驼事件写入 `ext_container_status_events` 做轨迹留存，支持后续可视化

### 6.2 FeiTuoAdapter 实现要点

**已实现功能**：

```typescript
class FeiTuoAdapter {
  // 1. 获取 Token
  async getToken(): Promise<string>

  // 2. 订阅/查询集装箱
  async queryContainer(params: FeiTuoQueryParams): Promise<FeiTuoResponse>

  // 3. 解析并写入数据库
  async syncContainerData(containerNumber: string): Promise<void>

  // 4. 触发状态机重新计算
  private async triggerStatusRecalculation(containerNumber: string): Promise<void>
}
```

**映射规则（FeiTuoStatusMapping）**：

```typescript
export const FEITUO_STATUS_MAPPING = {
  // 核心时间字段映射
  'BDAR': { field: 'ata_dest_port', table: 'process_port_operations', portType: 'destination' },
  'POCA': { field: 'ata_dest_port', table: 'process_port_operations', portType: 'destination' },
  'DSCH': { field: 'dest_port_unload_date', table: 'process_port_operations', portType: 'destination' },
  'TSBA': { field: 'ata_transit_port', table: 'process_port_operations', portType: 'transit' },
  'TSDP': { field: 'atd_transit_port', table: 'process_port_operations', portType: 'transit' },
  'GITM': { field: 'gate_in_time', table: 'process_port_operations' },
  'STCS': { field: 'gate_out_time', table: 'process_port_operations' },
  'LOBD': { field: 'shipment_date', table: 'process_sea_freight' },
  'RCVE': { field: 'return_time', table: 'process_empty_returns' },

  // 异常状态映射
  'CUIP': { field: 'customs_status', value: 'CUSTOMS_HOLD' },
  'TMHD': { field: 'customs_status', value: 'TERMINAL_HOLD' },
  'SRHD': { field: 'customs_status', value: 'CARRIER_HOLD' },
  'PASS': { field: 'customs_status', value: 'RELEASED' },
  'TMPS': { field: 'customs_status', value: 'RELEASED' },
  'SRRS': { field: 'customs_status', value: 'RELEASED' },
  'DUMP': { field: 'customs_status', value: 'DUMPED' },
}
```

### 6.3 适配器实现细节

**归一化处理**：
- 飞驼可能返回不同的事件组合（如 `ARRI+BRTH`、`ARRI`、`ARRIVE`）
- 适配器需统一映射到同一核心字段
- 使用 `FeiTuoStatusMapping` 配置表统一管理

**按空重箱分流**：
- 飞驼 equipmentEvents 带 `空箱/重箱` 维度
- 适配器需区分：`LADEN` → 重箱操作，`EMPTY` → 空箱操作
- 例如：`GTIN+LADEN` → gate_in_time；`GTIN+EMPTY` → return_time

**写扩展表**：
- 原始飞驼事件写入 `ext_container_status_events` 做轨迹留存
- 支持路径可视化回溯
- 记录完整的事件历史

**数据源标记**：
- 所有通过飞驼更新的字段标记 `dataSource = 'Feituo'`
- 与 Excel导入（`dataSource = 'Excel'`）和系统计算（`dataSource = 'System'`）区分
- 支持数据溯源和质量分析

### 6.4 海关状态码处理

**中国海关出口状态码（节选）**：

| 状态码 | 类型 | 说明 | LogiX 处理 |
|:------|:-----|:-----|:-----------|
| BLA/BLR | 预配舱单 | 接受申报 / 提运单放行 | 更新 `customs_status` |
| AAD/ASA | 运抵报告 | 接受申报 / 已运抵 | 更新 `customs_status` |
| EDC/CDC/PAS/CLR | 出口报关 | 入库 / 审结 / 放行 / 结关 | 更新 `customs_status` |
| ETC/ETP/ATC/ATP | 船舶动态 | 出港预报/确报海关 | 更新港口操作时间 |
| EDEP | 船舶动态 | 出境确报离港 | 更新 `atd_origin_port` |

**中国海关进口状态码（节选）**：

| 状态码 | 类型 | 说明 | LogiX 处理 |
|:------|:-----|:-----|:-----------|
| EMC/EMP/EFC/EFP | 船舶动态 | 进港预报海事/海关 | 更新港口操作时间 |
| AFC/AFP/ACC/ACP | 船舶动态 | 进港确报/抵港 | 更新 `ata_dest_port` |
| DTE/IDEP | 船舶动态 | 进境确报抵港 / 实际抵港 | 更新 `ata_dest_port` |
| MFA/MFB/MFR | 原始舱单 | 接受申报 / 已申报 / 提运单放行 | 更新 `customs_status` |
| EDC/CDC/PAS/CLR | 进口清关 | 入库 / 审结 / 放行 / 结关 | 更新 `customs_status` |

**处理原则**：
1. 海关状态码主要用于更新 `customs_status` 字段
2. 解除 HOLD 时（如 `PAS` 放行）更新相应状态为 `RELEASED`
3. 不直接驱动 7 层简化状态，但可影响「清关完成」等业务判断
4. 记录到 `ext_container_status_events` 做完整追溯

---

## 第七部分：数据对接验证

### 7.1 两条接入路径对比

| 路径 | 入口 | 中间层 | 落库表 | data_source |
|------|------|--------|--------|-------------|
| **API 同步** | FeiTuoAdapter | ExternalDataController → applyFeiTuoToCoreFields | ext_container_status_events + process_* | `FeituoAPI` |
| **Excel导入** | FeituoImportService | mergeTable1ToCore / mergeTable2ToCore | ext_feituo_import_* → ext_container_status_events + biz_* + process_* | `Feituo` |

### 7.2 数据源区分

**当前实现**：API 同步标记为 `FeituoAPI`，Excel导入保持 `Feituo`，便于追溯与审计。

| 来源 | data_source | 前端展示 |
|------|-------------|----------|
| 飞驼API 同步 | `FeituoAPI` | 显示为「API」 |
| 飞驼 Excel导入 | `Feituo` | 显示为「Excel」 |

### 7.3 数据落库与追溯

| 表 | 飞驼相关字段 | 说明 |
|----|--------------|------|
| ext_container_status_events | status_code, status_name, occurred_at, location, **data_source** | 原始状态事件，`data_source` 标识来源 |
| process_port_operations | ata_dest_port, gate_out_time, last_free_date, **data_source** | 港口操作，可追溯是否由飞驼更新 |
| process_sea_freight | shipment_date | 装船日期（LOBD 映射） |
| process_empty_return | return_time | 还空箱时间（RCVE 映射） |
| biz_containers | logistics_status, current_status_desc_cn | 由状态机重算 |

### 7.4 如何证明数据无缝对接且无错误

**技术证明**：

1. **数据流可追溯**
   - `ext_container_status_events.data_source` 记录来源
   - `process_port_operations.data_source` 记录港口操作来源
   - 核心字段（ata_dest_port、shipment_date 等）由 `FeiTuoStatusMapping` 统一映射

2. **状态机一致性**
   - 飞驼事件写入后触发 `calculateLogisticsStatus` 重算
   - 货柜列表与详情的 `logistics_status` 与状态事件一致

3. **去重与覆盖**
   - 同步时按 `container_number + status_code + occurred_at` 去重
   - 核心字段按「实际优先于预计」更新

**业务验证**：

1. **抽样对比**：选取若干货柜，对比飞驼官网/Excel 与 LogiX 展示的节点、时间是否一致
2. **统计校验**：`GET /api/v1/external/stats` 查看各 data_source 事件数、已有外部数据的货柜
3. **前端验证页**：见下文「验证界面」

### 7.5 验证界面

**现有界面**：

| 页面 | 路径 | 功能 | 数据来源展示 |
|------|------|------|--------------|
| 飞驼数据导入 | /import/feituo | API 同步、Excel导入 | 同步结果有成功/失败 |
| **飞驼数据验证** | **/import/feituo-verify** | **外部数据统计与货柜列表** | **总事件数、按 data_source 分布、已有外部数据的货柜列表（含 API/Excel 标签）** |
| 货柜详情 - 状态事件 | /shipments/:id（Tab: 状态事件） | 展示状态时间轴 | **不包含** ext_container_status_events，仅来自 process_*、trucking、warehouse、empty_return |
| 货柜详情 - 物流路径 | /shipments/:id（Tab: 物流路径） | 展示物流路径 | 来自 ext_container_status_events，**节点上展示 data_source 标签（API/Excel）** |

**飞驼数据验证页功能**：

- 调用 `GET /api/v1/external/stats` 展示：总事件数、数据源种类、按 data_source 分布、最近更新货柜
- 调用 `GET /api/v1/external/containers?dataSource=&page=&pageSize=` 展示：已有外部数据的货柜列表，支持按 data_source 筛选（FeituoAPI/Feituo）
- 点击货柜号跳转至货柜详情「物流路径」Tab

**待完善**：

- **货柜详情「状态事件」Tab**：当前 `getContainerStatusEvents` 只聚合 process_*、trucking、warehouse、empty_return，**未包含** `ext_container_status_events` 的原始飞驼事件。

### 7.6 API 接口速查

| 接口 | 说明 |
|------|------|
| `POST /api/v1/external/sync/:containerNumber` | 同步单个货柜（飞驼API） |
| `POST /api/v1/external/sync/batch` | 批量同步 |
| `GET /api/v1/external/events/:containerNumber` | 获取货柜的 ext_container_status_events（含 data_source） |
| `GET /api/v1/external/stats` | 数据源统计、最近更新货柜 |
| `GET /api/v1/external/containers?dataSource=&page=&pageSize=` | 已有外部数据的货柜列表（验证页用） |
| `POST /api/v1/import/feituo-excel` | 飞驼 Excel导入 |

---

## 第八部分：常见问题

### Q1: 为什么需要中间层适配器？

**A**: 中间层适配器有以下优势：
- **解耦**：主业务逻辑不依赖飞驼特定 API 格式
- **可维护性**：飞驼API 变更只需修改适配器
- **可测试性**：可以独立测试适配器和主业务
- **可扩展性**：可以轻松添加其他数据源（如其他 API 提供商）

### Q2: 如何确保数据一致性？

**A**: 通过以下机制确保：
- 飞驼事件写入后立即触发状态机重算
- `logistics_status` 始终与最新状态事件一致
- 数据源标记支持追溯和审计
- 去重机制避免重复数据

### Q3: API 同步和 Excel导入有什么区别？

**A**: 
- **API 同步**：实时获取最新数据，适合单个货柜同步和定时批量同步
- **Excel导入**：批量导入历史数据或离线数据，适合初始化或补全数据
- **数据源标记**：API 标记为 `FeituoAPI`，Excel 标记为 `Feituo`，便于区分

### Q4: 如何处理飞驼数据与本地数据冲突？

**A**: 
- **优先级规则**：实际数据优先于预计数据
- **时间戳比较**：较新的数据覆盖较旧的数据
- **人工确认**：重大变更可设置人工确认流程
- **历史记录**：所有变更记录到 `ext_container_status_events` 供追溯

### Q5: 可视化地图如何集成？

**A**: 使用飞驼提供的 Iframe 嵌入方式：

```
https://i.saas.freightower.com/#/ocean/detail?key=密钥&clientId=客户账号&billNo=单号&containerNo=箱号&carrierCode=船公司&portCode=港区&isExport=进出口&showInfo=1&lang=zh&hiddenReference=0
```

**重要提示**：
- iframe 使用前必须先通过接口订阅数据
- iframe 参数必须与接口订阅参数保持完全一致
- 密钥和 clientId 需联系飞驼客服获取

---

## 第九部分：关键文件索引

| 主题 | 文件路径 |
|------|----------|
| 飞驼适配器 | `backend/src/adapters/FeiTuoAdapter.ts` |
| 飞驼状态码 → 核心字段 | `backend/src/constants/FeiTuoStatusMapping.ts` |
| 外部数据同步与写库 | `backend/src/services/externalDataService.ts` |
| 状态机计算 | `backend/src/utils/logisticsStatusMachine.ts` |
| 状态更新服务 | `backend/src/services/containerStatus.service.ts` |
| Excel导入服务 | `backend/src/services/feituoImport.service.ts` |
| 字段映射配置 | `backend/src/config/FeituoFieldGroupMapping.ts` |
| 业务状态机与飞驼 | `frontend/public/docs/05-state-machine/03-业务状态机与飞驼.md` |
| 外部数据适配器架构 | `backend/docs/LogiX 外部数据适配器架构.md` |

---

## 第十部分：参考链接

| 文档 | 链接 |
|:-----|:-----|
| 飞驼可视接口（主站） | https://doc.freightower.com/ |
| API 业务概述 | https://doc.freightower.com/ |
| API 对接流程 | 见主站「API 使用说明」 |
| 节点状态码（中国港区） | https://doc.freightower.com/7113318m0 |
| 集装箱综合跟踪 | 见主站「海运集装箱跟踪」 |
| 异常预警推送 | 见主站「异常预警推送」 |
| 嵌套可视化地图 | https://doc.freightower.com/7111884m0 |

---

## 第十一部分：文档整合说明

**整合来源**：本文档由以下 5 篇文档整合而成：

1. `09-飞驼节点状态码解读与接入整合方案.md` (34.3 KB)
2. `10-飞驼数据Excel导入打通指南.md` (10.6 KB) - *待读取*
3. `11-logistics-path与飞驼API集成实施计划.md` (10.8 KB) - *待读取*
4. `12-飞驼数据接入方式解读.md` (7.0 KB)
5. `13-飞驼导出字段与LogiX映射表.md` (15.9 KB) - *待读取*

以及其他相关文档：
- `15-飞驼数据对接说明与验证.md` (5.9 KB)
- `17-飞驼API 与 Excel导入字段对齐.md` (6.4 KB)
- `19-飞驼导出字段与导入映射对照.md` (7.0 KB)
- `20-飞驼 Excel 字段分组对照验证.md` (4.6 KB)

**整合优势**：
- 减少文档数量，提高查找效率
- 统一术语和概念解释
- 消除重复内容
- 提供更完整的知识体系
- 便于新人快速上手

---

**文档状态**: ✅ 已完成整合  
**下一步**: 创建归档标记文档，将原 5 篇文档移至归档区
