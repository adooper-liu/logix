# 外部数据接入快速开始

## 5分钟快速接入飞驼数据

### 第一步: 配置API密钥

在 `.env` 文件中添加飞驼API配置：

```bash
FEITUO_API_KEY=your_feituo_api_key
FEITUO_API_URL=https://api.feituo.com/v1
```

### 第二步: 同步单个货柜

使用curl命令同步一个货柜的状态事件：

```bash
curl -X POST http://localhost:3000/api/external/sync/MRKU4896861 \
  -H "Content-Type: application/json" \
  -d '{"dataSource": "Feituo"}'
```

### 第三步: 查看同步结果

成功响应示例：

```json
{
  "success": true,
  "message": "成功同步 5 个状态事件",
  "data": {
    "containerNumber": "MRKU4896861",
    "eventCount": 5,
    "events": [
      {
        "id": "MRKU4896861-ATA-xxx",
        "containerNumber": "MRKU4896861",
        "statusCode": "ATA",
        "occurredAt": "2025-07-18T10:30:00.000Z",
        "locationNameCn": "纽瓦克",
        "locationNameEn": "Newark",
        "isEstimated": false,
        "dataSource": "Feituo"
      }
    ]
  }
}
```

### 第四步: 在前端查看

刷新货柜详情页面，状态事件页签将显示同步后的状态时间线。

## 常用API命令

### 批量同步多个货柜

```bash
curl -X POST http://localhost:3000/api/external/sync/batch \
  -H "Content-Type: application/json" \
  -d '{
    "containerNumbers": ["MRKU4896861", "TEMU1234567", "HJMU9876543"],
    "dataSource": "Feituo"
  }'
```

### 查看货柜的所有状态事件

```bash
curl http://localhost:3000/api/external/events/MRKU4896861?limit=50
```

### 删除货柜的所有状态事件

```bash
curl -X DELETE http://localhost:3000/api/external/events/MRKU4896861
```

### 清理7天前的过期事件

```bash
curl -X POST http://localhost:3000/api/external/cleanup \
  -H "Content-Type: application/json" \
  -d '{"days": 7}'
```

### 查看数据统计

```bash
curl http://localhost:3000/api/external/stats
```

## JavaScript/TypeScript 调用示例

### 同步单个货柜

```typescript
import axios from 'axios'

async function syncContainer(containerNumber: string) {
  try {
    const response = await axios.post(
      `http://localhost:3000/api/external/sync/${containerNumber}`,
      { dataSource: 'Feituo' }
    )

    if (response.data.success) {
      console.log(`成功同步 ${response.data.data.eventCount} 个状态事件`)
      return response.data.data.events
    }
  } catch (error) {
    console.error('同步失败:', error)
    throw error
  }
}

// 使用
syncContainer('MRKU4896861')
```

### 批量同步

```typescript
async function syncBatch(containerNumbers: string[]) {
  try {
    const response = await axios.post(
      'http://localhost:3000/api/external/sync/batch',
      {
        containerNumbers,
        dataSource: 'Feituo'
      }
    )

    console.log(`成功: ${response.data.data.success.length}`)
    console.log(`失败: ${response.data.data.failed.length}`)

    return response.data.data
  } catch (error) {
    console.error('批量同步失败:', error)
    throw error
  }
}

// 使用
syncBatch(['MRKU4896861', 'TEMU1234567'])
```

### 获取状态事件

```typescript
async function getEvents(containerNumber: string, limit: number = 50) {
  try {
    const response = await axios.get(
      `http://localhost:3000/api/external/events/${containerNumber}`,
      { params: { limit } }
    )

    return response.data.data
  } catch (error) {
    console.error('获取事件失败:', error)
    throw error
  }
}

// 使用
getEvents('MRKU4896861').then(events => {
  console.log(`共 ${events.length} 个状态事件`)
})
```

## Vue 3 组件示例

### 同步按钮组件

```vue
<template>
  <el-button
    type="primary"
    :icon="Refresh"
    :loading="syncing"
    @click="handleSync"
  >
    同步外部数据
  </el-button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import axios from 'axios'

const props = defineProps<{
  containerNumber: string
}>()

const syncing = ref(false)

const handleSync = async () => {
  syncing.value = true
  try {
    const response = await axios.post(
      `/api/external/sync/${props.containerNumber}`,
      { dataSource: 'Feituo' }
    )

    if (response.data.success) {
      ElMessage.success(
        `成功同步 ${response.data.data.eventCount} 个状态事件`
      )
      // 触发刷新事件
      emit('refresh')
    } else {
      ElMessage.error(response.data.message)
    }
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

const emit = defineEmits<{
  refresh: []
}>()
</script>
```

## 定时任务配置

### 使用 node-cron 设置定时同步

```typescript
// backend/src/jobs/externalSync.job.ts
import cron from 'node-cron'
import axios from 'axios'
import { logger } from '../utils/logger'

export class ExternalSyncJob {
  private job: cron.ScheduledTask

  constructor() {
    // 每小时执行一次
    this.job = cron.schedule('0 * * * *', async () => {
      await this.syncActiveContainers()
    })

    logger.info('[ExternalSync] 定时同步任务已启动')
  }

  async syncActiveContainers() {
    try {
      // 获取最近更新的货柜列表
      const containers = await this.getActiveContainers()

      if (containers.length === 0) {
        logger.info('[ExternalSync] 没有需要同步的货柜')
        return
      }

      logger.info(`[ExternalSync] 开始同步 ${containers.length} 个货柜`)

      // 分批同步（每批50个）
      const batchSize = 50
      for (let i = 0; i < containers.length; i += batchSize) {
        const batch = containers.slice(i, i + batchSize)

        try {
          await axios.post(
            'http://localhost:3000/api/external/sync/batch',
            {
              containerNumbers: batch,
              dataSource: 'Feituo'
            }
          )
          logger.info(`[ExternalSync] 批次 ${i / batchSize + 1} 同步完成`)
        } catch (error) {
          logger.error(`[ExternalSync] 批次 ${i / batchSize + 1} 同步失败:`, error)
        }
      }

    } catch (error) {
      logger.error('[ExternalSync] 定时同步失败:', error)
    }
  }

  async getActiveContainers(): Promise<string[]> {
    // 查询最近7天有更新的货柜
    const response = await axios.get(
      'http://localhost:3000/api/containers',
      { params: { days: 7 } }
    )

    return response.data.items.map((item: any) => item.containerNumber)
  }

  stop() {
    this.job.stop()
    logger.info('[ExternalSync] 定时同步任务已停止')
  }
}

// 导出单例
export const externalSyncJob = new ExternalSyncJob()
```

### 在应用启动时启用定时任务

```typescript
// backend/src/app.ts
import { externalSyncJob } from './jobs/externalSync.job'

// ... 其他代码

// 如果启用了外部数据同步
if (config.externalData.enabled) {
  logger.info('External data sync is enabled')
  // externalSyncJob 自动启动
}
```

## 测试工具

### Postman集合

导入以下JSON到Postman：

```json
{
  "info": {
    "name": "Logix External Data API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "同步单个货柜",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": {
          "raw": "http://localhost:3000/api/external/sync/MRKU4896861",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "external", "sync", "MRKU4896861"]
        },
        "body": {
          "mode": "raw",
          "raw": "{\"dataSource\": \"Feituo\"}"
        }
      }
    },
    {
      "name": "批量同步",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "url": {
          "raw": "http://localhost:3000/api/external/sync/batch",
          "protocol": "http",
          "host": ["localhost"],
          "port": "3000",
          "path": ["api", "external", "sync", "batch"]
        },
        "body": {
          "mode": "raw",
          "raw": "{\"containerNumbers\": [\"MRKU4896861\", \"TEMU1234567\"], \"dataSource\": \"Feituo\"}"
        }
      }
    }
  ]
}
```

## 常见问题

### Q: API调用失败返回401错误

A: 检查FEITUO_API_KEY是否正确配置，并确认密钥是否有效。

### Q: 同步后状态事件不显示

A:
1. 确认数据是否成功保存：查看 `container_status_events` 表
2. 刷新浏览器页面
3. 检查前端控制台是否有错误

### Q: 批量同步只成功了部分货柜

A: 批量同步响应中会返回成功和失败的列表，检查 `data.failed` 字段获取失败原因。

### Q: 如何设置定时自动同步？

A: 使用 node-cron 或其他定时任务库，参考上面的定时任务配置示例。

### Q: 支持哪些数据源？

A: 当前支持 Feituo（飞驼），可以通过添加新的适配器扩展其他数据源。

## 下一步

- 阅读完整的[外部数据接入指南](./EXTERNAL_DATA_INTEGRATION_GUIDE.md)
- 了解[FeiTuoAdapter实现](../backend/src/adapters/FeiTuoAdapter.ts)
- 查看[API文档](./API_REFERENCE.md)
