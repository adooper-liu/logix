# 甘特图 API 实战指南

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高

---

## 📋 概述

本文档提供甘特图系统的完整 API 调用示例和最佳实践，涵盖从数据加载到交互操作的的所有场景。

### API 基址

```typescript
// 开发环境
const API_BASE_URL = 'http://localhost:3001/api/v1'

// 生产环境
const API_BASE_URL = 'https://api.logix.com/api/v1
```

---

## 一、核心 API 列表

### 1.1 获取甘特图数据

**端点**: `GET /containers/gantt`

**用途**: 获取甘特图展示所需的货柜数据（包含 gantt_derived 字段）

**请求参数**:

```typescript
interface GanttDataRequest {
  startDate?: string // 开始日期（ISO 8601）
  endDate?: string // 结束日期（ISO 8601）
  destinationPort?: string // 目的港代码（可选）
  logisticsStatus?: string // 物流状态（可选）
  inspectionRequired?: boolean // 是否只需查验柜（可选）
  page?: number // 页码（默认 1）
  limit?: number // 每页数量（默认 100）
}
```

**响应格式**:

```typescript
interface GanttDataResponse {
  success: boolean
  data: {
    containers: Array<{
      id: string
      containerNumber: string
      billOfLadingNumber: string
      destinationPort: string
      logisticsStatus: string

      // 清关信息
      customsBroker?: string
      customsDeclarationTime?: string

      // 提柜信息
      truckingCompany?: string
      actualPickupDate?: string
      plannedPickupDate?: string

      // 卸柜信息
      warehouseCode?: string
      actualUnloadDate?: string
      plannedUnloadDate?: string

      // 还箱信息
      actualReturnDate?: string
      plannedReturnDate?: string

      // 查验信息
      inspectionRequired: boolean

      // 免费期
      lastFreeDate?: string
      lastReturnDate?: string

      // 甘特图 derived 字段
      ganttDerived?: {
        nodes: {
          customs?: { status: 'planned' | 'actual'; plannedDate?: string; actualDate?: string }
          pickup?: { status: 'planned' | 'actual'; plannedDate?: string; actualDate?: string }
          unload?: { status: 'planned' | 'actual'; plannedDate?: string; actualDate?: string }
          return?: { status: 'planned' | 'actual'; plannedDate?: string; actualDate?: string }
        }
        updatedAt: string
        version: 'v1' | 'v2+'
      }

      // 预警信息
      alerts?: Array<{
        rule: string
        level: 'warning' | 'danger'
        message: string
      }>
    }>
    pagination: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
}
```

**调用示例**:

```typescript
import api from '@/services/api'

async function loadGanttData() {
  try {
    const params = {
      startDate: '2026-03-20',
      endDate: '2026-04-20',
      destinationPort: 'USLAX',
      page: 1,
      limit: 100,
    }

    const response = await api.get('/containers/gantt', { params })

    console.log('甘特图数据:', response.data)

    // 处理数据
    const { containers, pagination } = response.data.data

    console.log(`总柜数：${pagination.total}`)
    console.log(`总页数：${pagination.totalPages}`)

    // 显示每个货柜的详细信息
    containers.forEach(container => {
      console.log(`${container.containerNumber}:`)
      console.log(`  目的港：${container.destinationPort}`)
      console.log(`  状态：${container.logisticsStatus}`)

      // 解析 ganttDerived
      if (container.ganttDerived) {
        const nodes = container.ganttDerived.nodes

        if (nodes.customs) {
          console.log(
            `  清关：${nodes.customs.status} - ${nodes.customs.actualDate || nodes.customs.plannedDate}`
          )
        }

        if (nodes.pickup) {
          console.log(
            `  提柜：${nodes.pickup.status} - ${nodes.pickup.actualDate || nodes.pickup.plannedDate}`
          )
        }
      }

      // 显示预警
      if (container.alerts && container.alerts.length > 0) {
        console.log(`  预警：${container.alerts.map(a => a.message).join(', ')}`)
      }
    })

    return response.data
  } catch (error) {
    console.error('加载甘特图数据失败:', error)
    throw error
  }
}
```

---

### 1.2 修改货柜日期

**端点**: `PATCH /containers/:containerNumber/dates`

**用途**: 修改货柜的计划或实际日期（支持拖拽改期）

**请求参数**:

```typescript
interface UpdateDatesRequest {
  customsDeclarationTime?: string // 清关时间
  actualPickupDate?: string // 实际提柜日
  plannedPickupDate?: string // 计划提柜日
  actualUnloadDate?: string // 实际卸柜日
  plannedUnloadDate?: string // 计划卸柜日
  actualReturnDate?: string // 实际还箱日
  plannedReturnDate?: string // 计划还箱日
}
```

**响应格式**:

```typescript
interface UpdateDatesResponse {
  success: boolean
  data: {
    containerNumber: string
    updatedFields: string[]
    ganttDerivedUpdated: boolean
  }
  message?: string
}
```

**调用示例**:

```typescript
async function updateContainerDates() {
  try {
    const containerNumber = 'HMMU6232153'
    const newPickupDate = '2026-03-26'

    const response = await api.patch(`/containers/${containerNumber}/dates`, {
      plannedPickupDate: newPickupDate,
    })

    console.log('日期更新成功:', response.data)

    // 验证 gantt_derived 是否同步更新
    if (response.data.data.ganttDerivedUpdated) {
      console.log('✅ gantt_derived 已自动更新')
    } else {
      console.warn('⚠️ gantt_derived 未更新，可能需要手动重建快照')
    }

    ElMessage.success('日期修改成功')
    return response.data
  } catch (error) {
    console.error('日期更新失败:', error)
    ElMessage.error('日期修改失败：' + (error as any).response?.data?.message)
    throw error
  }
}

// 拖拽改期完整示例
async function handleDragDrop(containerNumber: string, newDate: Date, nodeType: string) {
  const fieldMap = {
    customs: 'plannedPickupDate',
    pickup: 'plannedPickupDate',
    unload: 'plannedUnloadDate',
    return: 'plannedReturnDate',
  }

  const field = fieldMap[nodeType]

  if (!field) {
    ElMessage.warning('不支持的节点类型')
    return
  }

  try {
    await api.patch(`/containers/${containerNumber}/dates`, {
      [field]: newDate.toISOString(),
    })

    ElMessage.success('拖拽改期成功')

    // 重新加载数据
    await loadGanttData()
  } catch (error) {
    ElMessage.error('改期失败：' + (error as any).message)
  }
}
```

---

### 1.3 重建甘特图快照

**端点**: `POST /containers/gantt/rebuild-snapshot`

**用途**: 手动触发 gantt_derived 字段的重建（用于数据不一致时修复）

**请求参数**:

```typescript
interface RebuildSnapshotRequest {
  containerNumbers?: string[] // 指定柜号列表（可选，不传则重建所有）
  force?: boolean // 强制重建（忽略缓存）
}
```

**响应格式**:

```typescript
interface RebuildSnapshotResponse {
  success: boolean
  data: {
    totalContainers: number
    rebuiltCount: number
    failedCount: number
    errors?: Array<{
      containerNumber: string
      error: string
    }>
  }
  message?: string
}
```

**调用示例**:

```typescript
async function rebuildGanttSnapshot() {
  try {
    ElMessageBox.confirm('确定要重建甘特图快照吗？这可能需要几分钟时间。', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await api.post('/containers/gantt/rebuild-snapshot', {
      force: true, // 强制重建
    })

    const { totalContainers, rebuiltCount, failedCount } = response.data.data

    ElMessage.success({
      message: `快照重建完成：总计${totalContainers}个，成功${rebuiltCount}个，失败${failedCount}个`,
      duration: 5000,
    })

    console.log('重建结果:', response.data)

    // 如果有错误，显示详细列表
    if (response.data.data.errors && response.data.data.errors.length > 0) {
      console.error('失败的货柜:')
      response.data.data.errors.forEach(err => {
        console.error(`${err.containerNumber}: ${err.error}`)
      })
    }

    return response.data
  } catch (error) {
    console.error('重建快照失败:', error)
    ElMessage.error('重建快照失败：' + (error as any).message)
    throw error
  }
}

// 只重建特定货柜
async function rebuildSingleContainer(containerNumber: string) {
  try {
    const response = await api.post('/containers/gantt/rebuild-snapshot', {
      containerNumbers: [containerNumber],
      force: true,
    })

    if (response.data.success) {
      ElMessage.success(`${containerNumber} 快照重建成功`)
    }

    return response.data
  } catch (error) {
    console.error(`${containerNumber} 快照重建失败:`, error)
    throw error
  }
}
```

---

### 1.4 获取预警规则

**端点**: `GET /containers/alert-rules`

**用途**: 获取当前生效的预警规则配置

**响应格式**:

```typescript
interface AlertRulesResponse {
  success: boolean
  data: Array<{
    name: string
    code: string
    level: 'warning' | 'danger'
    description: string
    enabled: boolean
    config?: {
      overdueDays?: number // 超期天数阈值
      urgentDays?: number // 紧急天数阈值
    }
  }>
}
```

**调用示例**:

```typescript
async function loadAlertRules() {
  try {
    const response = await api.get('/containers/alert-rules')
    const rules = response.data.data

    console.log('预警规则列表:')
    rules.forEach(rule => {
      console.log(`${rule.name} (${rule.code}):`)
      console.log(`  级别：${rule.level}`)
      console.log(`  描述：${rule.description}`)
      console.log(`  启用：${rule.enabled ? '是' : '否'}`)

      if (rule.config) {
        console.log(`  配置：超期=${rule.config.overdueDays}天，紧急=${rule.config.urgentDays}天`)
      }
    })

    return rules
  } catch (error) {
    console.error('加载预警规则失败:', error)
    throw error
  }
}
```

---

### 1.5 导出甘特图数据

**端点**: `POST /containers/gantt/export`

**用途**: 导出甘特图数据为 Excel 文件

**请求参数**:

```typescript
interface ExportRequest {
  containerNumbers?: string[] // 指定柜号（不传则导出全部）
  startDate?: string // 开始日期
  endDate?: string // 结束日期
  includeFields?: string[] // 包含的字段
  format?: 'excel' | 'csv' // 导出格式（默认 excel）
}
```

**响应格式**: Binary (Excel file)

**调用示例**:

```typescript
async function exportGanttData() {
  try {
    const response = await api.post(
      '/containers/gantt/export',
      {
        startDate: '2026-03-20',
        endDate: '2026-04-20',
        includeFields: [
          'containerNumber',
          'destinationPort',
          'logisticsStatus',
          'plannedPickupDate',
          'actualPickupDate',
          'plannedUnloadDate',
          'actualUnloadDate',
          'plannedReturnDate',
          'actualReturnDate',
          'lastFreeDate',
        ],
        format: 'excel',
      },
      {
        responseType: 'blob', // 重要：指定响应类型为 blob
      }
    )

    // 创建下载链接
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `甘特图数据_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`
    link.click()

    window.URL.revokeObjectURL(url)

    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败：' + (error as any).message)
    throw error
  }
}
```

---

## 二、高级用法

### 2.1 批量操作

```typescript
/**
 * 批量修改多个货柜的日期
 */
async function batchUpdateDates(
  updates: Array<{
    containerNumber: string
    field: string
    date: string
  }>
) {
  try {
    // 分组并发执行（每次最多 10 个）
    const BATCH_SIZE = 10
    const results = []

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = updates.slice(i, i + BATCH_SIZE)

      const promises = batch.map(update =>
        api.patch(`/containers/${update.containerNumber}/dates`, {
          [update.field]: update.date,
        })
      )

      const batchResults = await Promise.allSettled(promises)

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push({
            success: true,
            containerNumber: batch[index].containerNumber,
          })
        } else {
          results.push({
            success: false,
            containerNumber: batch[index].containerNumber,
            error: (result.reason as Error).message,
          })
        }
      })

      console.log(`第${Math.floor(i / BATCH_SIZE) + 1}批完成`)
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    console.log(`批量更新完成：成功${successCount}个，失败${failCount}个`)

    return results
  } catch (error) {
    console.error('批量更新失败:', error)
    throw error
  }
}

// 使用示例
const updates = [
  { containerNumber: 'HMMU6232153', field: 'plannedPickupDate', date: '2026-03-26' },
  { containerNumber: 'HMMU6232154', field: 'plannedUnloadDate', date: '2026-03-27' },
  // ... 更多更新
]

batchUpdateDates(updates)
  .then(results => console.log('结果:', results))
  .catch(error => console.error('失败:', error))
```

---

### 2.2 错误重试机制

```typescript
import axios from 'axios'

/**
 * 带重试的 API 调用
 */
async function callWithRetry<T>(
  apiCall: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall()
    } catch (error) {
      lastError = error as Error

      // 如果是 4xx 错误，不重试
      if (axios.isAxiosError(error) && error.response?.status && error.response.status < 500) {
        throw error
      }

      // 最后一次尝试失败
      if (attempt === maxRetries) {
        break
      }

      // 等待后重试（指数退避）
      const waitTime = delay * Math.pow(2, attempt - 1)
      console.warn(`第${attempt}次失败，${waitTime}ms 后重试...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  throw lastError!
}

// 使用示例：重建快照（可能因网络波动失败）
async function robustRebuildSnapshot(containerNumbers: string[]) {
  return callWithRetry(
    () =>
      api.post('/containers/gantt/rebuild-snapshot', {
        containerNumbers,
        force: true,
      }),
    3, // 最多重试 3 次
    2000 // 初始延迟 2 秒
  )
}
```

---

### 2.3 实时数据同步

```typescript
import { io, Socket } from 'socket.io-client'

class GanttDataService {
  private socket: Socket | null = null
  private listeners: Map<string, Set<(data: any) => void>> = new Map()

  /**
   * 连接 WebSocket（实时同步）
   */
  connect() {
    this.socket = io('http://localhost:3001', {
      transports: ['websocket'],
    })

    this.socket.on('gantt-update', data => {
      console.log('收到甘特图更新:', data)

      // 通知所有监听器
      const containerListeners = this.listeners.get(data.containerNumber)
      if (containerListeners) {
        containerListeners.forEach(fn => fn(data))
      }
    })
  }

  /**
   * 监听特定货柜的更新
   */
  onContainerUpdate(containerNumber: string, callback: (data: any) => void) {
    if (!this.listeners.has(containerNumber)) {
      this.listeners.set(containerNumber, new Set())
    }
    this.listeners.get(containerNumber)!.add(callback)

    // 返回取消监听函数
    return () => {
      this.listeners.get(containerNumber)?.delete(callback)
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.socket?.disconnect()
    this.listeners.clear()
  }
}

// 使用示例
const ganttService = new GanttDataService()

// 连接 WebSocket
ganttService.connect()

// 监听货柜更新
const unsubscribe = ganttService.onContainerUpdate('HMMU6232153', data => {
  console.log(`${data.containerNumber} 更新了:`)
  console.log(`  字段：${data.field}`)
  console.log(`  旧值：${data.oldValue}`)
  console.log(`  新值：${data.newValue}`)

  // 更新 UI
  // ...
})

// 组件卸载时取消监听
onUnmounted(() => {
  unsubscribe()
})
```

---

## 三、最佳实践

### 3.1 性能优化

```typescript
/**
 * ✅ 好的做法：分页加载 + 缓存
 */
const containerCache = new Map<string, any>()

async function getGanttDataWithCache(key: string, fetcher: () => Promise<any>) {
  // 尝试从缓存读取
  if (containerCache.has(key)) {
    console.log('[Cache Hit] 从缓存读取')
    return containerCache.get(key)
  }

  // 缓存未命中，调用 API
  console.log('[Cache Miss] 调用 API 查询')
  const data = await fetcher()

  // 写入缓存（TTL=5 分钟）
  setTimeout(
    () => {
      containerCache.delete(key)
    },
    5 * 60 * 1000
  )

  containerCache.set(key, data)
  return data
}

// 使用示例
const data = await getGanttDataWithCache('USLAX_2026-03-20_2026-04-20', () =>
  api.get('/containers/gantt', {
    params: {
      destinationPort: 'USLAX',
      startDate: '2026-03-20',
      endDate: '2026-04-20',
    },
  })
)
```

---

### 3.2 数据验证

```typescript
import { z } from 'zod'

// 定义 Schema
const GanttContainerSchema = z.object({
  id: z.string().uuid(),
  containerNumber: z.string().min(1),
  destinationPort: z.string().min(1),
  ganttDerived: z
    .object({
      nodes: z.object({
        customs: z
          .object({
            status: z.enum(['planned', 'actual']),
            plannedDate: z.string().optional(),
            actualDate: z.string().optional(),
          })
          .optional(),
        // ... 其他节点
      }),
      updatedAt: z.string(),
      version: z.enum(['v1', 'v2+']),
    })
    .optional(),
})

/**
 * 验证 API 返回数据
 */
function validateGanttData(data: any) {
  try {
    const result = GanttContainerSchema.array().parse(data.containers)
    console.log('数据验证通过')
    return result
  } catch (error) {
    console.error('数据验证失败:', error)
    throw new Error('API 返回数据格式不正确')
  }
}

// 使用示例
const response = await api.get('/containers/gantt', { params })
const validatedData = validateGanttData(response.data.data)
```

---

## 📚 相关文档

- **01-甘特图系统架构完整指南** - 系统整体架构
- **03-甘特图前端组件使用指南** - Vue 组件使用
- **04-Java vs TypeScript 实现对比** - 演进历史

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高
