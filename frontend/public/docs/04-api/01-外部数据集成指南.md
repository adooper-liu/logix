# 飞驼等外部数据源接入方案

## 概述

本文档说明如何接入飞驼等外部数据源的状态事件数据到 Logix 系统。

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      外部数据源                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │  飞驼   │  │   AIS   │  │ 船公司  │  │  码头   │       │
│  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘       │
└───────┼─────────────┼─────────────┼─────────────┼──────────┘
        │             │             │             │
        └─────────────┼─────────────┼─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │     Adapter层（适配器）   │
        │  ┌─────────────────────┐  │
        │  │   FeiTuoAdapter     │  │
        │  │   - 数据格式转换     │  │
        │  │   - 错误处理         │  │
        │  │   - 重试机制         │  │
        │  └─────────────────────┘  │
        └─────────────┬─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │  ExternalDataService     │
        │  - 数据清洗与验证         │
        │  - 去重与合并            │
        │  - 状态代码映射          │
        └─────────────┬─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │  ContainerStatusEvent表  │
        │  - 持久化存储            │
        │  - 支持历史查询          │
        │  - 数据来源追溯          │
        └─────────────┬─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │       前端展示            │
        │  - 状态事件时间线        │
        │  - 桑基图可视化          │
        │  - 实时状态更新          │
        └───────────────────────────┘
```

## 核心组件

### 1. 适配器层 (Adapter Layer)

#### FeiTuoAdapter

位置: `backend/src/adapters/FeiTuoAdapter.ts`

功能：
- 调用飞驼API获取数据
- 将飞驼数据格式转换为标准格式
- 健康检查与错误处理
- Webhook回调处理

关键方法：
```typescript
// 获取货柜状态事件
async getContainerStatusEvents(containerNumber: string): Promise<AdapterResponse<ContainerStatusNode[]>>

// 获取装载记录
async getContainerLoadingRecords(containerNumber: string): Promise<AdapterResponse<ContainerLoadingData[]>>

// 同步数据到数据库
async syncContainerData(containerNumber: string): Promise<AdapterResponse<boolean>>

// Webhook回调处理
async handleWebhook(payload: any): Promise<AdapterResponse<boolean>>
```

### 2. 外部数据控制器 (ExternalDataController)

位置: `backend/src/controllers/externalData.controller.ts`

API接口：

#### 同步单个货柜

```
POST /api/external/sync/:containerNumber
Body: { dataSource: 'Feituo' }
```

响应：
```json
{
  "success": true,
  "message": "成功同步 5 个状态事件",
  "data": {
    "containerNumber": "MRKU4896861",
    "eventCount": 5,
    "events": [...]
  }
}
```

#### 批量同步货柜

```
POST /api/external/sync/batch
Body: {
  "containerNumbers": ["MRKU4896861", "TEMU1234567"],
  "dataSource": "Feituo"
}
```

#### 获取货柜状态事件

```
GET /api/external/events/:containerNumber?limit=50
```

#### 删除货柜状态事件

```
DELETE /api/external/events/:containerNumber
```

#### 清理过期事件

```
POST /api/external/cleanup
Body: { days: 7 }
```

#### 获取统计信息

```
GET /api/external/stats
```

### 3. 路由配置

位置: `backend/src/routes/externalData.routes.ts`

路由已注册到主应用：`/api/external/*`

## 数据表结构

### container_status_events

| 字段 | 类型 | 说明 |
|------|------|------|
| id | varchar(50) | 主键 |
| containerNumber | varchar(50) | 集装箱号 |
| statusCode | varchar(20) | 状态代码 |
| occurredAt | timestamp | 发生时间 |
| isEstimated | boolean | 是否预计 |
| locationCode | varchar(50) | 地点代码 |
| locationNameEn | varchar(100) | 地点名称(英文) |
| locationNameCn | varchar(100) | 地点名称(中文) |
| locationNameOriginal | varchar(100) | 地点名称(原始) |
| statusType | varchar(20) | 状态类型 |
| latitude | decimal(10,6) | 纬度 |
| longitude | decimal(10,6) | 经度 |
| timezone | int | 时区 |
| terminalName | varchar(50) | 码头名称 |
| cargoLocation | varchar(200) | 货物位置 |
| dataSource | varchar(50) | 数据来源 |
| descriptionCn | varchar(100) | 描述(中文) |
| descriptionEn | varchar(100) | 描述(英文) |
| descriptionOriginal | varchar(100) | 描述(原始) |
| routePath | varchar(50) | 路径 |

## 配置说明

### 环境变量配置

在 `.env` 文件中添加：

```bash
# 飞驼API配置
FEITUO_API_KEY=your_api_key_here
FEITUO_API_URL=https://api.feituo.com/v1

# 同步配置
EXTERNAL_SYNC_ENABLED=true
EXTERNAL_SYNC_INTERVAL=3600000  # 同步间隔(毫秒)，1小时
EXTERNAL_SYNC_BATCH_SIZE=50    # 批量同步数量
EXTERNAL_SYNC_RETRY_COUNT=3     # 重试次数
EXTERNAL_SYNC_RETRY_DELAY=5000  # 重试延迟(毫秒)
```

### config/index.ts 配置

```typescript
export default {
  feituo: {
    apiKey: process.env.FEITUO_API_KEY || '',
    apiEndpoint: process.env.FEITUO_API_URL || 'https://api.feituo.com/v1',
  },
  externalData: {
    enabled: process.env.EXTERNAL_SYNC_ENABLED === 'true',
    syncInterval: Number(process.env.EXTERNAL_SYNC_INTERVAL) || 3600000,
    batchSize: Number(process.env.EXTERNAL_SYNC_BATCH_SIZE) || 50,
    retryCount: Number(process.env.EXTERNAL_SYNC_RETRY_COUNT) || 3,
    retryDelay: Number(process.env.EXTERNAL_SYNC_RETRY_DELAY) || 5000,
  }
}
```

## 使用方式

### 方式一: 手动触发同步

#### 1. 通过API同步单个货柜

```bash
curl -X POST http://localhost:3000/api/external/sync/MRKU4896861 \
  -H "Content-Type: application/json" \
  -d '{"dataSource": "Feituo"}'
```

#### 2. 通过API批量同步

```bash
curl -X POST http://localhost:3000/api/external/sync/batch \
  -H "Content-Type: application/json" \
  -d '{
    "containerNumbers": ["MRKU4896861", "TEMU1234567"],
    "dataSource": "Feituo"
  }'
```

### 方式二: 定时自动同步

创建定时任务服务：

```typescript
// backend/src/services/scheduler.service.ts
import cron from 'node-cron';
import { externalDataController } from '../controllers/externalData.controller';

export class SchedulerService {
  private syncJob: cron.ScheduledTask;

  constructor() {
    // 每小时同步一次活跃货柜
    this.syncJob = cron.schedule('0 * * * *', async () => {
      await this.syncActiveContainers();
    });
  }

  async syncActiveContainers() {
    // 获取活跃货柜列表
    const activeContainers = await this.getActiveContainers();

    // 批量同步
    await externalDataController.syncBatch({
      body: {
        containerNumbers: activeContainers,
        dataSource: 'Feituo'
      }
    } as any);
  }

  async getActiveContainers(): Promise<string[]> {
    // 查询最近30天有活动的货柜
    // ...
    return [];
  }
}
```

### 方式三: Webhook实时推送

配置飞驼Webhook，当有新事件时自动推送：

```typescript
// backend/src/controllers/webhook.controller.ts
export class WebhookController {
  handleFeituoWebhook = async (req: Request, res: Response): Promise<void> => {
    const payload = req.body;

    try {
      // 验证Webhook签名（可选）
      if (!this.verifyFeituoSignature(payload)) {
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }

      // 处理Webhook事件
      await feituoAdapter.handleWebhook(payload);

      res.json({ success: true });
    } catch (error) {
      logger.error('Feituo Webhook Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  private verifyFeituoSignature(payload: any): boolean {
    // 实现签名验证逻辑
    return true;
  }
}
```

## 状态代码映射

| 飞驼状态代码 | 系统状态代码 | 说明 |
|------------|------------|------|
| BO | shipped | 已装船 |
| DLPT | in_transit | 在途 |
| ARRIVE | at_port | 到港 |
| ATA | at_port | 实际到港 |
| ETA | in_transit | 预计到港 |
| GATE_IN | picked_up | 入闸 |
| GATE_OUT | unloaded | 出闸 |
| DISCHARGED | unloaded | 卸货 |
| AVAIL | picked_up | 可提货 |
| EMPTY_RETURN | returned_empty | 还空箱 |

## 错误处理

### API错误响应

```json
{
  "success": false,
  "message": "同步失败",
  "error": "Feitu API错误: Invalid API key"
}
```

### 错误码

| 错误码 | 说明 |
|-------|------|
| 400 | 请求参数错误 |
| 401 | API认证失败 |
| 404 | 货柜不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |

### 重试策略

```typescript
async fetchWithRetry(url: string, maxRetries = 3, delay = 5000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## 数据清理

### 清理过期的预计事件

```bash
curl -X POST http://localhost:3000/api/external/cleanup \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```

清理7天前的预计状态事件。

## 监控与日志

### 关键日志

```typescript
// 同步开始
logger.info(`[ExternalData] 开始同步: ${containerNumber}`);

// API调用
logger.info(`[FeituoAdapter] API请求: GET /containers/${containerNumber}/events`);

// 数据保存
logger.info(`[ExternalData] 创建状态事件: ${containerNumber} - ${statusCode}`);

// 错误日志
logger.error(`[ExternalData] 同步失败: ${error.message}`);
```

### 性能监控

```typescript
// 记录同步耗时
const startTime = Date.now();
await syncContainerEvents(containerNumber);
const duration = Date.now() - startTime;
logger.info(`[ExternalData] 同步耗时: ${duration}ms`);
```

## 前端集成

### 在货柜详情页添加同步按钮

```vue
<template>
  <el-button @click="syncFromFeituo" :loading="syncing">
    <el-icon><Refresh /></el-icon>
    同步外部数据
  </el-button>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import axios from 'axios'

const syncing = ref(false)

const syncFromFeituo = async () => {
  syncing.value = true
  try {
    const res = await axios.post(
      `/api/external/sync/${containerNumber.value}`,
      { dataSource: 'Feituo' }
    )
    if (res.data.success) {
      ElMessage.success(`成功同步 ${res.data.data.eventCount} 个状态事件`)
      loadContainerDetail() // 重新加载详情
    }
  } catch (error) {
    ElMessage.error('同步失败')
  } finally {
    syncing.value = false
  }
}
</script>
```

## 扩展其他数据源

### 添加新适配器

1. 创建新适配器类实现 `IExternalDataAdapter` 接口：

```typescript
// backend/src/adapters/XXXAdapter.ts
import { IExternalDataAdapter, ExternalDataSource, ... } from './ExternalDataAdapter.interface';

export class XXXAdapter implements IExternalDataAdapter {
  readonly name = 'XXX Adapter';
  readonly sourceType = ExternalDataSource.XXX;
  readonly enabled = true;

  async getContainerStatusEvents(containerNumber: string): Promise<AdapterResponse<ContainerStatusNode[]>> {
    // 实现数据获取逻辑
  }

  async syncContainerData(containerNumber: string): Promise<AdapterResponse<boolean>> {
    // 实现数据同步逻辑
  }

  async handleWebhook(payload: any): Promise<AdapterResponse<boolean>> {
    // 实现Webhook处理逻辑
  }
}
```

1. 在 `controllers/externalData.controller.ts` 中添加支持：

```typescript
if (dataSource === 'XXX') {
  const result = await xxxAdapter.getContainerStatusEvents(containerNumber);
  // ...
}
```

## 最佳实践

1. **批量同步**: 优先使用批量接口减少API调用
2. **错误重试**: 实现指数退避重试机制
3. **数据去重**: 根据容器号、状态代码、时间进行去重
4. **定期清理**: 定期清理过期的预计事件
5. **监控告警**: 监控API调用次数、错误率、同步耗时
6. **缓存策略**: 对不常变化的数据使用缓存

## 故障排查

### 问题: 同步失败

检查清单：
- [ ] API Key是否配置正确
- [ ] 网络连接是否正常
- [ ] 飞驼API服务是否可用
- [ ] 货柜号是否正确
- [ ] 查看日志中的详细错误信息

### 问题: 状态事件不显示

检查清单：
- [ ] 数据是否成功保存到数据库
- [ ] 前端是否正确获取数据
- [ ] 时间格式是否正确
- [ ] 是否有跨域问题

## 相关文档

- [FeiTuo API文档](https://docs.feituo.com)
- [ContainerStatusEvent实体定义](../backend/src/entities/ContainerStatusEvent.ts)
- [FeiTuoAdapter实现](../backend/src/adapters/FeiTuoAdapter.ts)
