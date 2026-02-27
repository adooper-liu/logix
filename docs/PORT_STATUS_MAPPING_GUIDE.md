# 中转港与目的港物流状态显示方案

## 问题背景

在 LogiX 货柜物流系统中，"已到中转港" 和 "到达目的港" 两种状态在 Excel 导入时都映射到了同一个数据库字段 `logistics_status = 'at_port'`。这导致前端显示时无法区分是中转港还是目的港。

## 解决方案概述

采用**动态显示方案**：
- 保持现有映射：`"已到中转港" → at_port`、`"到达目的港" → at_port`
- 前端根据 `port_type` 动态显示具体是中转港还是目的港
- 后端 API 返回时包含最新的港口操作信息
- **关键改进**：后端根据 `transit_arrival_date`（中转港）和 `ata_dest_port`（目的港）自动更新状态

## 数据库设计

### 核心表结构

#### 1. `containers` 表（货柜表）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `container_number` | VARCHAR(50) | 集装箱号（主键） |
| `order_number` | VARCHAR(50) | 备货单号 |
| `logistics_status` | VARCHAR(50) | 物流状态（桑基图状态） |
| `updated_at` | TIMESTAMP | 更新时间 |

**物流状态枚举值**：
- `not_shipped` - 未出运
- `shipped` - 已装船
- `in_transit` - 在途
- `at_port` - 已到港（中转港或目的港）
- `picked_up` - 已提柜
- `unloaded` - 已卸柜
- `returned_empty` - 已还箱

#### 2. `process_port_operations` 表（港口操作表）
| 字段名 | 类型 | 说明 |
|--------|------|------|
| `id` | SERIAL | 主键 |
| `container_number` | VARCHAR(50) | 集装箱号（外键） |
| `port_type` | VARCHAR(20) | 港口类型：origin/transit/destination |
| `port_sequence` | INTEGER | 港口序号 |
| `port_name` | VARCHAR(100) | 港口名称 |
| `port_code` | VARCHAR(50) | 港口编码 |
| `eta_dest_port` | TIMESTAMP | 预计到港日期 |
| `ata_dest_port` | TIMESTAMP | 实际到港日期（目的港） |
| `transit_arrival_date` | TIMESTAMP | 途经港到达日期（中转港） |
| `updated_at` | TIMESTAMP | 更新时间 |

**港口类型 (`port_type`) 枚举**：
- `origin` - 起运港
- `transit` - 中转港
- `destination` - 目的港

### 多港经停场景支持

一个货柜可以有多条港口操作记录，通过 `port_type` 和 `port_sequence` 区分：

```
集装箱: SUDU6797842
├── 港口操作 1: port_type=origin, port_sequence=1, port_name=深圳港
├── 港口操作 2: port_type=transit, port_sequence=2, port_name=洛杉矶港（中转）
└── 港口操作 3: port_type=destination, port_sequence=3, port_name=芝加哥港（目的）
```

## 后端实现

### API 返回数据结构

#### 1. 货柜列表 API (`GET /api/v1/containers`)

```json
{
  "success": true,
  "items": [
    {
      "containerNumber": "SUDU6797842",
      "orderNumber": "26DSA00167",
      "logisticsStatus": "at_port",
      "location": "洛杉矶港 (中转)",
      "currentPortType": "transit",
      "latestPortOperation": {
        "portType": "transit",
        "portName": "洛杉矶港",
        "portCode": "USLAX",
        "portSequence": 2
      },
      "etaDestPort": "2026-02-20T10:00:00Z",
      "ataDestPort": "2026-02-20T14:30:00Z",
      "customsStatus": "COMPLETED",
      "destinationPort": "USCHI",
      "billOfLadingNumber": "SUDU6797842",
      "lastUpdated": "2026-02-27T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

#### 2. 货柜详情 API (`GET /api/v1/containers/:id`)

```json
{
  "success": true,
  "data": {
    "containerNumber": "SUDU6797842",
    "orderNumber": "26DSA00167",
    "logisticsStatus": "at_port",
    "portOperations": [
      {
        "id": 1,
        "portType": "origin",
        "portSequence": 1,
        "portName": "深圳港",
        "portCode": "CNSZX",
        "etaDestPort": null,
        "ataDestPort": null,
        "updatedAt": "2026-02-10T08:00:00Z"
      },
      {
        "id": 2,
        "portType": "transit",
        "portSequence": 2,
        "portName": "洛杉矶港",
        "portCode": "USLAX",
        "etaDestPort": "2026-02-20T10:00:00Z",
        "ataDestPort": "2026-02-20T14:30:00Z",
        "updatedAt": "2026-02-20T14:30:00Z"
      },
      {
        "id": 3,
        "portType": "destination",
        "portSequence": 3,
        "portName": "芝加哥港",
        "portCode": "USCHI",
        "etaDestPort": "2026-02-25T08:00:00Z",
        "ataDestPort": null,
        "updatedAt": "2026-02-20T14:30:00Z"
      }
    ],
    "statusEvents": [...],
    "truckingTransports": [...],
    "warehouseOperations": [...],
    "emptyReturns": [...]
  }
}
```

### 后端核心逻辑

#### 1. 获取最新港口操作信息并自动更新状态

```typescript
// 获取最新的港口操作信息（中转港或目的港）
let latestPortOperation = null;
let currentPortType = null;
let needsStatusUpdate = false;

try {
  // 查询所有港口操作记录，按更新时间倒序排列
  const portOperations = await this.portOperationRepository
    .createQueryBuilder('po')
    .where('po.containerNumber = :containerNumber', { containerNumber: container.containerNumber })
    .orderBy('po.updatedAt', 'DESC')
    .getMany();

  // 查找最新的中转港或目的港操作记录
  for (const po of portOperations) {
    if (po.portType === 'transit' || po.portType === 'destination') {
      latestPortOperation = po;
      currentPortType = po.portType;

      // 如果有实际到港时间但状态不是 at_port，需要更新状态
      // 中转港检查 transit_arrival_date，目的港检查 ata_dest_port
      const hasArrivalTime = po.portType === 'transit'
        ? !!po.transitArrivalDate
        : !!po.ataDestPort;

      if (hasArrivalTime && container.logisticsStatus !== 'at_port') {
        needsStatusUpdate = true;
        logger.info(`[Container] ${container.containerNumber} Port operation has arrival time (${po.portType}), will update status to 'at_port'`);
      }

      break;
    }
  }

  // 自动更新 logistics_status 为 at_port
  if (needsStatusUpdate) {
    container.logisticsStatus = 'at_port';
    await this.containerRepository.save(container);
    logger.info(`[Container] ${container.containerNumber} Auto-updated logistics_status to 'at_port' based on port operation`);
  }
} catch (error) {
  logger.warn(`[Container] ${container.containerNumber} Failed to fetch port operations:`, error);
}
```

**关键改进**：
- 根据港口类型选择正确的日期字段：中转港使用 `transit_arrival_date`，目的港使用 `ata_dest_port`
- 自动检测到港时间并更新 `logistics_status` 为 `at_port`

#### 2. 返回正确的到港日期

```typescript
// 扩展字段 - 根据当前港口类型选择正确的日期字段
etaDestPort: latestPortOperation?.etaDestPort || null,
etaCorrection: latestPortOperation?.etaCorrection || null,
// 中转港使用 transit_arrival_date，目的港使用 ata_dest_port
ataDestPort: currentPortType === 'transit'
  ? (latestPortOperation?.transitArrivalDate || null)
  : (latestPortOperation?.ataDestPort || null),
customsStatus: latestPortOperation?.customsStatus || null,
```
      currentPortType = po.portType;
      break;
    }
  }
} catch (error) {
  logger.warn(`[Container] ${container.containerNumber} Failed to fetch port operations:`, error);
}
```

#### 2. 动态计算当前位置

```typescript
// 计算当前位置
let currentLocation = '-'

if (latestEvent) {
  currentLocation = latestEvent.locationNameCn || latestEvent.locationNameEn || latestEvent.locationCode || '-'
} else if (container.logisticsStatus) {
  const statusLocationMap: Record<string, string> = {
    'not_shipped': '未出运',
    'shipped': '已装船',
    'in_transit': '在途',
    'at_port': currentPortType === 'transit'
      ? `${latestPortOperation?.portName || '中转港'} (中转)`
      : `${latestPortOperation?.portName || '目的港'} (目的)`,
    'picked_up': '提柜中',
    'unloaded': '仓库',
    'returned_empty': '已还箱'
  }
  currentLocation = statusLocationMap[container.logisticsStatus] || container.logisticsStatus
}
```

## 前端实现

### 1. 列表页面 (`Shipments.vue`)

#### 状态映射函数

```typescript
// 根据港口类型动态显示物流状态
const getLogisticsStatusText = (container: any): string => {
  const status = container.logisticsStatus
  const baseText = statusMap[status]?.text || status

  // 如果是 at_port 状态，根据 currentPortType 显示具体是中转港还是目的港
  if (status === 'at_port' && container.currentPortType) {
    if (container.currentPortType === 'transit') {
      return '已到中转港'
    } else if (container.currentPortType === 'destination') {
      return '已到目的港'
    }
  }

  return baseText
}
```

#### 模板使用

```vue
<el-table-column prop="logisticsStatus" label="物流状态" width="120">
  <template #default="{ row }">
    <el-tag :type="statusMap[row.logisticsStatus]?.type || 'info'" size="small">
      {{ getLogisticsStatusText(row) || '-' }}
    </el-tag>
  </template>
</el-table-column>
```

### 2. 详情页面 (`ContainerDetail.vue`)

#### 状态映射函数

```typescript
// 根据港口类型动态显示物流状态
const getLogisticsStatusText = (status: string): string => {
  const baseText = statusMap[status]?.text || status

  // 如果是 at_port 状态，根据最新的港口操作显示具体是中转港还是目的港
  if (status === 'at_port' && containerData.value?.portOperations) {
    // 查找最新的港口操作记录
    const sortedPorts = [...containerData.value.portOperations].sort(
      (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    const latestPort = sortedPorts.find((po: any) => po.portType === 'transit' || po.portType === 'destination')

    if (latestPort?.portType === 'transit') {
      return '已到中转港'
    } else if (latestPort?.portType === 'destination') {
      return '已到目的港'
    }
  }

  return baseText
}
```

## Excel 导入映射规则

### 物流状态映射

| Excel 值 | 数据库值 | 说明 |
|----------|----------|------|
| 未出运 | `not_shipped` | - |
| 已装船 | `shipped` | - |
| 在途 | `in_transit` | - |
| **已到中转港** | `at_port` | 通过 port_type=transit 区分 |
| **到达目的港** | `at_port` | 通过 port_type=destination 区分 |
| 已提柜 | `picked_up` | - |
| 已卸柜 | `unloaded` | - |
| 已还箱 | `returned_empty` | - |

### 导入逻辑

```typescript
function transformLogisticsStatus(value: string): string {
  const map: Record<string, string> = {
    '未出运': 'not_shipped',
    '已装船': 'shipped',
    '在途': 'in_transit',
    '已到中转港': 'at_port',     // 新增映射
    '到达目的港': 'at_port',      // 新增映射
    '已提柜': 'picked_up',
    '已卸柜': 'unloaded',
    '已还箱': 'returned_empty',
  }
  return map[value] || value
}
```

### 港口操作表导入逻辑

Excel 中途经港信息会自动创建中转港记录：

```typescript
// 途经港 (transit)
const transitPort = row['途经港']
if (transitPort) {
  portOperations.push({
    container_number: containerNumber,
    port_type: 'transit',
    port_code: transitPortCode,
    port_name: transitPort,
    port_sequence: portSequence++,
    transit_arrival_date: parseDate(row['途经港到达日期'])
  })
  console.log('[splitRowToTables] 添加途经港:', transitPort, '代码:', transitPortCode, '到达日期:', row['途经港到达日期'])
}
```

**重要说明**：
- Excel 中"途经港"字段会创建 `port_type=transit` 的港口操作记录
- Excel 中"途经港到达日期"会映射到 `transit_arrival_date` 字段
- 后端会根据 `transit_arrival_date` 自动将 `logistics_status` 更新为 `at_port`

## 业务流程示例

### 场景：货物从深圳经洛杉矶中转至芝加哥

#### 阶段 1：未出运
- `logistics_status`: `not_shipped`
- 前端显示：**未出运**

#### 阶段 2：装船出运
- `logistics_status`: `shipped`
- 前端显示：**已装船**
- 港口操作：
  ```
  port_type=origin, port_name=深圳港, port_sequence=1
  ```

#### 阶段 3：在途航行
- `logistics_status`: `in_transit`
- 前端显示：**在途**

#### 阶段 4：到达中转港洛杉矶
- `logistics_status`: `at_port`
- `current_port_type`: `transit`
- 前端显示：**已到中转港**
- 港口操作：
  ```
  port_type=transit, port_name=洛杉矶港, port_sequence=2
  transit_arrival_date=2026-02-20 14:30:00  // 中转港使用此字段
  ```

#### 阶段 5：继续航行至目的港芝加哥
- `logistics_status`: `in_transit`
- 前端显示：**在途**

#### 阶段 6：到达目的港芝加哥
- `logistics_status`: `at_port`
- `current_port_type`: `destination`
- 前端显示：**已到目的港**
- 港口操作：
  ```
  port_type=destination, port_name=芝加哥港, port_sequence=3
  ata_dest_port=2026-02-25 10:00:00
  ```

## 关键要点

### 1. 数据库设计原则
- `logistics_status` 字段存储单一状态值（替换而非重复）
- 通过 `process_port_operations` 表的 `port_type` 字段区分港口类型
- 支持多港经停场景，一个货柜可有多条港口操作记录

### 2. 状态更新规则
- 当货物到达中转港时，更新 `logistics_status = 'at_port'`，`current_port_type = 'transit'`
- 当货物离开中转港继续航行时，更新 `logistics_status = 'in_transit'`
- 当货物到达目的港时，更新 `logistics_status = 'at_port'`，`current_port_type = 'destination'`

### 3. 前端显示逻辑
- 列表页面：使用后端返回的 `currentPortType` 字段动态显示
- 详情页面：从 `portOperations` 数组中查找最新的港口操作记录判断

### 4. Excel 导入处理
- 导入时 `logistics_status` 会根据 Excel 中的"物流状态"字段映射
- Excel 中"途经港"会创建 `port_type=transit` 的记录
- Excel 中"途经港到达日期"会映射到 `transit_arrival_date` 字段
- 后端会根据 `transit_arrival_date`（中转港）或 `ata_dest_port`（目的港）自动更新状态为 `at_port`

### 5. 日期字段说明
- `transit_arrival_date`：中转港的实际到达日期
- `ata_dest_port`：目的港的实际到达日期
- 后端根据 `port_type` 自动选择正确的日期字段返回给前端

## 测试用例

### 测试用例 1：中转港场景
```json
{
  "containerNumber": "TEST001",
  "logisticsStatus": "at_port",
  "currentPortType": "transit",
  "location": "洛杉矶港 (中转)"
}
```
**预期结果**：前端显示 "已到中转港"

### 测试用例 2：目的港场景
```json
{
  "containerNumber": "TEST002",
  "logisticsStatus": "at_port",
  "currentPortType": "destination",
  "location": "芝加哥港 (目的)"
}
```
**预期结果**：前端显示 "已到目的港"

### 测试用例 3：无港口操作记录
```json
{
  "containerNumber": "TEST003",
  "logisticsStatus": "at_port",
  "currentPortType": null,
  "location": "目的港"
}
```
**预期结果**：前端显示 "已到港"（默认值）

### 测试用例 4：实际案例 - SUDU6797842

**Excel 原始数据**：
```
集装箱号: SUDU6797842
备货单号: 26DSA00167
物流状态: 已到中转港
途经港: 釜山
途经港到达日期: 2026-02-02 09:37:00
目的港: 洛杉矶
预计到港日期: 2026-03-12 08:00:00
```

**数据库记录**：
```
process_port_operations 表：
- 起运港: port_type=origin, port_name=厦门港, port_sequence=1
- 中转港: port_type=transit, port_name=釜山, port_sequence=2
          transit_arrival_date=2026-02-02 09:37:00
- 目的港: port_type=destination, port_name=洛杉矶, port_sequence=3
          eta_dest_port=2026-03-12 08:00:00

biz_containers 表：
- logistics_status: at_port (后端自动更新)
```

**API 返回数据**：
```json
{
  "containerNumber": "SUDU6797842",
  "logisticsStatus": "at_port",
  "currentPortType": "transit",
  "location": "釜山 (中转)",
  "latestPortOperation": {
    "portType": "transit",
    "portName": "釜山",
    "portCode": "KPUSN",
    "portSequence": 2
  },
  "ataDestPort": "2026-02-02T09:37:00Z",
  "etaDestPort": null
}
```

**前端显示**：
- 物流状态：**已到中转港**
- 当前位置：**釜山 (中转)**
- 预计到港：`-`（中转港没有此字段）
- 实际到港：`2026/02/02 09:37`

## 总结

本方案通过在 `process_port_operations` 表中区分 `port_type`（transit/destination），实现了在不改变数据库状态字段设计的前提下，动态显示中转港和目的港状态的能力。后端 API 返回最新的港口操作信息，前端根据 `currentPortType` 字段动态调整显示文本，确保用户能准确了解货柜当前位置。

**关键改进**：
1. 后端根据 `transit_arrival_date`（中转港）和 `ata_dest_port`（目的港）自动更新状态
2. 根据港口类型选择正确的日期字段返回给前端
3. Excel 导入时"途经港"和"途经港到达日期"正确映射到港口操作表

---

**文档版本**: 1.1
**创建日期**: 2026-02-27
**最后更新**: 2026-02-27
**最后更新**: 2026-02-27
