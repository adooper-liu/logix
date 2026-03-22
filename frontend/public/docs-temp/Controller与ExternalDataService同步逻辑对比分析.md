# Controller 与 ExternalDataService 同步逻辑对比分析

**分析日期**: 2026-03-18  
**目的**: 分析两套飞驼同步实现的差异、重复与不一致风险

> **2026-03-21 更新**：`ExternalDataService.fetchFromFeituo` 已改为与 FeiTuoAdapter 相同，使用 OpenAPI `POST /application/v1/query`，不再使用 `/tracking/batch`。下文「数据获取层」对比中关于 batch 的描述已过时，仅保留作历史记录。

---

## 一、调用关系与入口

| 维度 | Controller | ExternalDataService |
|------|------------|---------------------|
| **API 路由** | ✅ 使用 | ❌ 未接入 |
| **入口** | POST /api/external/sync/:id | 无 HTTP 入口，仅内部可调用 |
| **实际调用方** | externalData.routes.ts | 无（仅 syncBatchContainerEvents 内自调 syncContainerEvents） |

---

## 二、数据获取层对比

| 维度 | Controller | ExternalDataService |
|------|------------|---------------------|
| **数据源** | FeiTuoAdapter | 自建 apiClient |
| **API 地址** | `openapi.freightower.com` | `api.feituo.com/v1`（默认） |
| **请求方式** | POST `/application/v1/query` | POST `/tracking/batch` |
| **认证** | clientId+secret 换 Token / accessToken | Bearer apiKey |
| **请求参数** | containerNo, billNo, carrierCode, isExport | containerNumbers, includeHistory |
| **返回结构** | `result.containers[].status[]` | `data[].trackingEvents`, `data[].places` |

**结论**：两套实现调用的是**不同的飞驼 API 形态**，Controller 使用官方文档的订阅+查询接口，Service 使用可能是旧版或代理接口。

---

## 三、事件转换对比

### 3.1 输入数据结构

| 来源 | Controller (FeiTuoAdapter) | ExternalDataService |
|------|---------------------------|---------------------|
| 事件列表 | `status[]`（eventCode, eventTime, isEsti, eventPlace） | `trackingEvents[]` 或 `places[]` |
| 单事件字段 | statusCode, occurredAt, locationCode, isEstimated | statusCode, eventTime, locationCode, isEstimated |

### 3.2 转换逻辑差异

| 项目 | Controller.convertToStatusEvents | ExternalDataService.convertFeituoToStatusEvents |
|------|----------------------------------|--------------------------------------------------|
| statusCode 来源 | node.statusCode | event.statusCode \|\| event.eventCode |
| 时间字段 | node.occurredAt | new Date(event.eventTime) |
| 地点 | node.locationCode 等 | event.locationCode, event.locationNameEn 等 |
| 扩展字段 | 无 | latitude, longitude, terminalName, statusType 等 |
| places 分支 | 无 | convertPlacesToStatusEvents：仅 ARRI/DEPA |

### 3.3 places 支持

| 项目 | Controller | ExternalDataService |
|------|------------|---------------------|
| places 数据 | ❌ 不支持 | ✅ 支持 |
| 优先级策略 | - | places > trackingEvents |
| places 事件 | - | 仅 ARRI（到达）、DEPA（离港） |
| 核心字段更新 | - | updatePortOperationFromPlaces（eta/ata/etd/atd） |

---

## 四、核心字段更新对比

### 4.1 更新方法

| 项目 | Controller.applyFeiTuoToCoreFields | ExternalDataService |
|------|-------------------------------------|---------------------|
| **trackingEvents 路径** | applyFeiTuoToCoreFields(events) | updatePortOperationCoreFields(containerNumber, trackingEvents) |
| **places 路径** | 无 | updatePortOperationFromPlaces(containerNumber, places) |

### 4.2 字段覆盖范围

| 核心字段 | Controller | Service (trackingEvents) | Service (places) |
|----------|------------|---------------------------|------------------|
| return_time | ✅ process_empty_return | ❌ 未处理 | ❌ 未处理 |
| shipment_date | ✅ process_sea_freight | ❌ 未处理 | ❌ 未处理 |
| ata_dest_port | ✅ | ✅ | ✅ |
| eta_dest_port | ✅ | ❌ | ✅ |
| gate_in_time | ✅ | ✅ | ❌ |
| gate_out_time | ✅ | ✅ | ❌ |
| dest_port_unload_date | ✅ | ✅ | ❌ |
| discharged_time | ✅ | ✅ | ❌ |
| available_time | ✅ | ✅ | ❌ |
| transit_arrival_date | ✅ | ✅ | ❌ |
| atd_transit | ✅ | ✅ | ❌ |
| eta_origin_port | ❌ | ❌ | ✅ |
| ata_origin_port | ❌ | ❌ | ✅ |
| etd, atd | ❌ | ❌ | ✅ |

### 4.3 portOperation 匹配逻辑

| 项目 | Controller | Service.updatePortOperationCoreFields |
|------|------------|--------------------------------------|
| 匹配依据 | portType（transit/destination） | portType + locationCode/portName |
| 无匹配时 | 跳过，不更新 | 回退到同 portType 第一条或 portOperations[0] |
| 多港场景 | 取 portSequence DESC 第一条 | 按事件 locationCode 匹配 |

---

## 五、状态机重算对比

| 项目 | Controller.recalculateLogisticsStatus | ExternalDataService.recalculateLogisticsStatus |
|------|----------------------------------------|--------------------------------------------------|
| 加载 container | ✅ relations: ['seaFreight'] | ✅ 无 relations |
| 加载 portOperations | ✅ | ✅ |
| 加载 truckingTransport | ✅ | ❌ 传 undefined |
| 加载 warehouseOperation | ✅ | ❌ 传 undefined |
| 加载 emptyReturn | ✅ | ❌ 传 undefined |
| 传入 calculateLogisticsStatus | 6 个参数完整 | 仅 container + portOperations，其余 undefined |

**影响**：Service 路径下，picked_up、unloaded、returned_empty 无法正确计算，因状态机依赖 trucking、warehouse、emptyReturn。

---

## 六、滞港费重算

| 项目 | Controller | ExternalDataService |
|------|------------|---------------------|
| 触发条件 | updatedAtaFields 含 ATA_RELATED_FIELDS | updatedAtaFields.length > 0 |
| ATA_RELATED_FIELDS | ata_dest_port, dest_port_unload_date, discharged_time | 同上 + 更多 |
| 调用 | demurrageService.calculateForContainer | 同 |

---

## 七、重复与不一致汇总

### 7.1 重复实现

| 功能 | Controller | Service | 重复度 |
|------|------------|---------|--------|
| 事件保存 | saveStatusEvents | saveStatusEvents | 高（逻辑几乎相同） |
| 核心字段更新 | applyFeiTuoToCoreFields | updatePortOperationCoreFields | 高（字段列表、匹配逻辑不同） |
| 状态机重算 | recalculateLogisticsStatus | recalculateLogisticsStatus | 高（Service 版本不完整） |
| 滞港费触发 | 有 | 有 | 中 |

### 7.2 不一致点

| 不一致项 | Controller | Service | 风险 |
|----------|------------|---------|------|
| API 端点 | 官方 query | tracking/batch | 数据源可能不同 |
| return_time 写入 | ✅ | ❌ | Service 路径下还箱状态可能缺失 |
| shipment_date 写入 | ✅ | ❌ | Service 路径下 in_transit 可能缺失 |
| places 支持 | ❌ | ✅ | Controller 无法利用 places |
| 状态机入参 | 完整 | 不完整 | Service 路径下 picked_up/unloaded/returned_empty 异常 |
| portOperation 匹配 | 仅 portType | portType + locationCode | 多港场景结果可能不同 |

---

## 八、建议

### 8.1 统一入口（推荐）

让 Controller 调用 ExternalDataService，但需先修正 Service：

1. **修正 fetchFromFeituo**：改为使用 FeiTuoAdapter，或明确 `/tracking/batch` 与官方 API 的关系。
2. **修正 recalculateLogisticsStatus**：加载并传入 trucking、warehouse、emptyReturn。
3. **补全 updatePortOperationCoreFields**：支持 return_time、shipment_date（或复用 applyFeiTuoToCoreFields 逻辑）。
4. **Controller 改为**：`const result = await externalDataService.syncContainerEvents(containerNumber, 'Feituo')`，删除 Controller 内重复实现。

### 8.2 若保留双路径

- 在文档中明确：API 同步走 Controller，后台/批量走 Service。
- 统一核心字段更新逻辑：抽成共享函数（如 `applyFeiTuoEventsToCoreFields`），两处调用。
- 修正 Service 的 recalculateLogisticsStatus，保证入参完整。

### 8.3 若废弃 ExternalDataService

- 将 places 优先、updatePortOperationFromPlaces 等能力迁移到 Controller 或新服务。
- 删除或标记 ExternalDataService 为 deprecated。
