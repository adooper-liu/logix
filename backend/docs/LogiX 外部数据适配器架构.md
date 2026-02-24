# LogiX 外部数据适配器架构

## 概述

LogiX 外部数据适配器架构提供了一个统一的接口来处理多个外部数据源（如飞驼API、物流路径微服务等），实现了：

- **数据源抽象**: 通过统一的接口访问不同的外部API
- **自动切换**: 支持主备切换和自动故障转移
- **健康检查**: 定期检查各数据源的健康状态
- **灵活配置**: 可动态启用/禁用适配器，切换默认数据源

---

## 架构设计

### 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Controller Layer                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Adapter Controller                            │  │
│  │  • getAdapterStatus()                                  │  │
│  • setDefaultAdapter()                                    │  │
│  • getContainerStatusEvents()                              │  │
│  • syncContainerData()                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Adapter Manager                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           • registerAdapter()                           │  │
│  • getBestAdapter() / getDefaultAdapter()                   │  │
│  • healthCheck() / startHealthCheck()                       │  │
│  • setAdapterEnabled()                                     │  │
│  • autoFailover support                                    │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ↓                    ↓                    ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  FeiTuo      │    │ Logistics    │    │ Custom API   │
│  Adapter     │    │ Path        │    │ Adapter      │
│              │    │ Adapter     │    │              │
│  (Primary)   │    │ (Secondary) │    │ (Fallback)   │
└──────┬───────┘    └──────┬───────┘    └──────┬───────┘
       │                   │                   │
       ↓                   ↓                   ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  飞驼API     │    │  GraphQL     │    │  自定义API    │
│  HTTP/HTTPS  │    │  Microservice│    │  HTTP/HTTPS  │
└──────────────┘    └──────────────┘    └──────────────┘
```

### 核心组件

#### 1. 适配器接口 (IExternalDataAdapter)

定义所有适配器必须实现的标准接口：

```typescript
interface IExternalDataAdapter {
  readonly name: string;
  readonly sourceType: ExternalDataSource;
  readonly enabled: boolean;

  healthCheck(): Promise<boolean>;
  getContainerStatusEvents(containerNumber: string): Promise<AdapterResponse<ContainerStatusNode[]>>;
  getContainerLoadingRecords(containerNumber: string): Promise<AdapterResponse<ContainerLoadingData[]>>;
  getContainerHoldRecords(containerNumber: string): Promise<AdapterResponse<ContainerHoldData[]>>;
  getContainerCharges(containerNumber: string): Promise<AdapterResponse<ContainerChargeData[]>>;
  syncContainerData(containerNumber: string): Promise<AdapterResponse<boolean>>;
  handleWebhook(payload: any): Promise<AdapterResponse<boolean>>;
}
```

#### 2. 适配器实现

| 适配器 | 数据源 | 优先级 | 说明 |
|--------|--------|--------|------|
| `FeiTuoAdapter` | 飞驼API | Primary | 主要数据源，提供完整的状态、装载、HOLD、费用数据 |
| `LogisticsPathAdapter` | 物流路径微服务 | Secondary | 备用数据源，提供状态路径数据 |
| `CustomApiAdapter` | 自定义API | Fallback | 扩展适配器，用于集成其他第三方API |

#### 3. 适配器管理器 (AdapterManager)

管理所有适配器的生命周期和健康状态：

- 注册/注销适配器
- 健康检查和自动故障转移
- 默认适配器设置
- 适配器启用/禁用控制

---

## 使用示例

### 1. 获取适配器状态

```bash
curl http://localhost:3001/api/v1/adapters/status
```

响应：

```json
{
  "success": true,
  "data": [
    {
      "sourceType": "feituo",
      "name": "FeiTuo Adapter",
      "priority": "primary",
      "enabled": true,
      "healthy": true,
      "lastHealthCheck": "2026-02-24T10:00:00.000Z"
    },
    {
      "sourceType": "logistics_path",
      "name": "Logistics Path Adapter",
      "priority": "secondary",
      "enabled": true,
      "healthy": true,
      "lastHealthCheck": "2026-02-24T10:00:00.000Z"
    }
  ],
  "timestamp": "2026-02-24T10:00:00.000Z"
}
```

### 2. 设置默认适配器

```bash
curl -X PUT http://localhost:3001/api/v1/adapters/default/feituo
```

### 3. 启用/禁用适配器

```bash
curl -X PUT http://localhost:3001/api/v1/adapters/feituo/enabled \
  -H "Content-Type: application/json" \
  -d '{ "enabled": false }'
```

### 4. 获取集装箱状态节点

```bash
# 使用默认适配器
curl http://localhost:3001/api/v1/adapters/container/CNTR1234567/status-events

# 指定数据源
curl "http://localhost:3001/api/v1/adapters/container/CNTR1234567/status-events?sourceType=feituo"
```

### 5. 同步集装箱数据

```bash
curl -X POST http://localhost:3001/api/v1/adapters/container/CNTR1234567/sync \
  -H "Content-Type: application/json" \
  -d '{ "sourceType": "feituo" }'
```

### 6. 处理Webhook

```bash
curl -X POST http://localhost:3001/api/v1/adapters/feituo/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "STATUS_UPDATE",
    "containerNumber": "CNTR1234567",
    "data": { ... }
  }'
```

---

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DEFAULT_ADAPTER_SOURCE` | 默认适配器数据源 | `logistics_path` |
| `ADAPTER_HEALTH_CHECK_INTERVAL` | 健康检查间隔（毫秒） | `60000` (1分钟) |
| `ADAPTER_ENABLE_AUTO_FAILOVER` | 是否启用自动故障转移 | `true` |

### 飞驼API配置

| 变量 | 说明 |
|------|------|
| `FEITUO_API_ENDPOINT` | 飞驼API端点 |
| `FEITUO_API_KEY` | 飞驼API密钥 |

---

## 添加新的适配器

### 步骤

1. **实现接口**

```typescript
// src/adapters/YourAdapter.ts
import { IExternalDataAdapter, ... } from './ExternalDataAdapter.interface.js';

export class YourAdapter implements IExternalDataAdapter {
  readonly name = 'Your Adapter';
  readonly sourceType = ExternalDataSource.CUSTOM_API;
  readonly enabled = true;

  // 实现所有接口方法...
}
```

2. **注册适配器**

```typescript
// src/adapters/AdapterManager.ts
import { YourAdapter } from './YourAdapter.js';

export class AdapterManager {
  constructor() {
    // ...
    this.registerAdapter(new YourAdapter(), AdapterPriority.FALLBACK);
  }
}
```

3. **更新配置**

在 `.env` 中添加适配器特定的环境变量。

---

## 自动故障转移

### 工作原理

1. **健康检查**: 定期检查所有适配器的健康状态
2. **故障检测**: 当主适配器失败时，自动切换到备用适配器
3. **自动恢复**: 主适配器恢复后，自动切回

### 配置

```typescript
// 启用自动故障转移
config.adapters.enableAutoFailover = true;

// 设置健康检查间隔
config.adapters.healthCheckInterval = 60000; // 1分钟
```

---

## 数据映射

### 标准数据结构

所有适配器返回统一的数据格式：

#### ContainerStatusNode

```typescript
{
  statusCode: string;           // 状态代码
  statusNameEn: string;         // 英文状态名称
  statusNameCn: string;         // 中文状态名称
  occurredAt: Date;            // 发生时间
  locationCode: string;         // 位置代码
  locationNameEn: string;       // 英文位置名称
  locationNameCn: string;       // 中文位置名称
  locationType: string;         // 位置类型
  latitude?: number;            // 纬度
  longitude?: number;           // 经度
  timezone?: number;            // 时区
  dataSource: string;           // 数据来源
  isFinal: boolean;            // 是否最终状态
}
```

#### ContainerLoadingData

```typescript
{
  vesselName: string;           // 船名
  voyageNumber: string;         // 航次
  billOfLadingNumber: string;   // 提单号
  bookingNumber: string;        // 订舱号
  originPortCode: string;       // 起运港代码
  destPortCode: string;         // 目的港代码
  etaOrigin: Date;              // 起运港预计时间
  ataOrigin: Date;              // 起运港实际时间
  etaDest: Date;                // 目的港预计时间
  ataDest: Date;                // 目的港实际时间
  loadingDate: Date;            // 装载日期
  dischargeDate: Date;          // 卸货日期
  routeCode: string;            // 航线代码
  carrierCode: string;          // 承运人代码
  carrierName: string;          // 承运人名称
  operator: string;             // 运营方
}
```

---

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/adapters/status` | 获取所有适配器状态 |
| POST | `/api/v1/adapters/health-check` | 健康检查所有适配器 |
| PUT | `/api/v1/adapters/default/:sourceType` | 设置默认适配器 |
| PUT | `/api/v1/adapters/:sourceType/enabled` | 启用/禁用适配器 |
| GET | `/api/v1/adapters/container/:containerNumber/status-events` | 获取状态节点 |
| POST | `/api/v1/adapters/container/:containerNumber/sync` | 同步数据 |
| POST | `/api/v1/adapters/:sourceType/webhook` | 处理Webhook |

---

## 最佳实践

1. **使用默认适配器**: 不要指定 `sourceType`，让系统自动选择最佳适配器
2. **监控健康状态**: 定期检查 `/api/v1/adapters/status` 端点
3. **配置重试**: 为每个适配器配置合适的重试策略
4. **错误处理**: 检查响应的 `success` 字段和 `error` 字段
5. **数据验证**: 适配器内部进行数据验证和转换

---

## 扩展建议

### 短期

- [ ] 实现数据缓存层（Redis）
- [ ] 添加适配器指标监控
- [ ] 实现数据去重和合并逻辑

### 中期

- [ ] 添加更多外部API适配器
- [ ] 实现适配器配置的动态更新
- [ ] 添加适配器性能分析

### 长期

- [ ] 实现机器学习模型选择最佳适配器
- [ ] 添加适配器A/B测试支持
- [ ] 实现分布式适配器管理

---

**文档版本**: 1.0.0
**最后更新**: 2026-02-24
