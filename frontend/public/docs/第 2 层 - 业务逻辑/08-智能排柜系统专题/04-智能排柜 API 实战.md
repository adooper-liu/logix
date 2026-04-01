# 智能排柜 API 实战指南

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高

---

## 📋 概述

本文档提供智能排柜系统的完整 API 调用示例和最佳实践，涵盖从基础查询到高级优化的所有场景。

### API 基址

```typescript
// 开发环境
const API_BASE_URL = 'http://localhost:3001/api/v1'

// 生产环境
const API_BASE_URL = 'https://api.logix.com/api/v1
```

---

## 一、核心 API 列表

### 1.1 批量排产 API

**端点**: `POST /scheduling/batch`

**用途**: 对多个货柜进行智能排产（分配仓库、车队、计算日期）

**请求参数**:

```typescript
interface BatchScheduleRequest {
  containerNumbers: string[];        // 柜号列表
  startDate: string;                 // 开始日期（ISO 8601）
  endDate: string;                   // 结束日期（ISO 8601）
  countryCode?: string;              // 国家代码（可选）
  warehouseCode?: string;            // 指定仓库（可选，用于手工指定模式）
  truckingCompanyId?: string;        // 指定车队（可选）
  designatedMode?: boolean;          // 是否手工指定模式（默认 false）
}
```

**响应格式**:

```typescript
interface BatchScheduleResponse {
  success: boolean;
  data: {
    scheduledContainers: Array<{
      containerNumber: string;
      warehouseCode: string;
      truckingCompanyId: string;
      plannedPickupDate: string;
      plannedUnloadDate: string;
      plannedReturnDate: string;
      unloadMode: 'Live load' | 'Drop off';
      status: 'scheduled' | 'failed';
      errorMessage?: string;
    }>;
    summary: {
      totalContainers: number;
      scheduledCount: number;
      failedCount: number;
      estimatedTotalCost: number;
    };
  };
}
```

**调用示例**:

```typescript
import api from '@/services/api'

async function batchSchedule() {
  try {
    const response = await api.post('/scheduling/batch', {
      containerNumbers: ['HMMU6232153', 'HMMU6232154', 'HMMU6232155'],
      startDate: '2026-03-20',
      endDate: '2026-04-20',
      countryCode: 'US'
    })

    console.log('排产结果:', response.data)
    
    // 处理成功
    if (response.data.success) {
      const { scheduledContainers, summary } = response.data.data
      
      console.log(`总柜数：${summary.totalContainers}`)
      console.log(`成功：${summary.scheduledCount}`)
      console.log(`失败：${summary.failedCount}`)
      console.log(`预估总成本：$${summary.estimatedTotalCost}`)
      
      // 显示每个货柜的详细结果
      scheduledContainers.forEach(container => {
        console.log(`${container.containerNumber}:`)
        console.log(`  仓库：${container.warehouseCode}`)
        console.log(`  车队：${container.truckingCompanyId}`)
        console.log(`  提柜日：${container.plannedPickupDate}`)
        console.log(`  卸柜日：${container.plannedUnloadDate}`)
        console.log(`  还箱日：${container.plannedReturnDate}`)
        console.log(`  模式：${container.unloadMode}`)
      })
    }
  } catch (error) {
    console.error('排产失败:', error)
    throw error
  }
}
```

**错误处理**:

```typescript
try {
  const response = await api.post('/scheduling/batch', { ... })
} catch (error) {
  if (error.response) {
    // 后端返回错误（4xx, 5xx）
    const { status, data } = error.response
    
    switch (status) {
      case 400:
        console.error('请求参数错误:', data.message)
        break
      case 404:
        console.error('货柜不存在:', data.message)
        break
      case 500:
        console.error('服务器内部错误:', data.message)
        break
      default:
        console.error('未知错误:', data.message)
    }
  } else if (error.request) {
    // 网络错误
    console.error('网络请求失败，请检查网络连接')
  } else {
    console.error('请求配置错误:', error.message)
  }
}
```

---

### 1.2 单柜模拟排产 API

**端点**: `POST /scheduling/simulate`

**用途**: 对单个货柜进行模拟排产（不扣减档期），用于预览和对比

**请求参数**:

```typescript
interface SimulateScheduleRequest {
  containerNumber: string;         // 柜号
  startDate: string;               // 开始日期
  endDate: string;                 // 结束日期
  warehouseCode?: string;          // 指定仓库（可选）
  truckingCompanyId?: string;      // 指定车队（可选）
  unloadMode?: 'Live load' | 'Drop off'  // 指定模式（可选）
}
```

**响应格式**:

```typescript
interface SimulateScheduleResponse {
  success: boolean;
  data: {
    containerNumber: string;
    warehouseCode: string;
    truckingCompanyId: string;
    plannedPickupDate: string;
    plannedUnloadDate: string;
    plannedReturnDate: string;
    unloadMode: 'Live load' | 'Drop off';
    costBreakdown: {
      demurrageCost: number;
      detentionCost: number;
      storageCost: number;
      transportationCost: number;
      yardStorageCost: number;
      handlingCost: number;
      totalCost: number;
    };
    alternatives: Array<{
      warehouseCode: string;
      truckingCompanyId: string;
      plannedPickupDate: string;
      unloadMode: string;
      totalCost: number;
    }>;
  };
}
```

**调用示例**:

```typescript
async function simulateSingleContainer() {
  try {
    const response = await api.post('/scheduling/simulate', {
      containerNumber: 'HMMU6232153',
      startDate: '2026-03-20',
      endDate: '2026-04-20',
      unloadMode: 'Live load'
    })

    const result = response.data.data
    
    console.log('模拟排产结果:')
    console.log(`柜号：${result.containerNumber}`)
    console.log(`仓库：${result.warehouseCode}`)
    console.log(`车队：${result.truckingCompanyId}`)
    console.log(`提柜日：${result.plannedPickupDate}`)
    console.log(`卸柜日：${result.plannedUnloadDate}`)
    console.log(`还箱日：${result.plannedReturnDate}`)
    console.log(`模式：${result.unloadMode}`)
    console.log(`总成本：$${result.costBreakdown.totalCost}`)
    console.log(`费用明细:`, result.costBreakdown)
    
    // 显示备选方案
    if (result.alternatives && result.alternatives.length > 0) {
      console.log('\n备选方案:')
      result.alternatives.forEach((alt, index) => {
        console.log(`${index + 1}. 仓库=${alt.warehouseCode}, ` +
          `车队=${alt.truckingCompanyId}, ` +
          `提柜日=${alt.plannedPickupDate}, ` +
          `成本=$${alt.totalCost}`)
      })
    }
  } catch (error) {
    console.error('模拟排产失败:', error)
    throw error
  }
}
```

---

### 1.3 成本优化建议 API

**端点**: `POST /scheduling/optimize-cost`

**用途**: 对已排产的货柜进行成本优化，提供最优卸柜日期建议

**请求参数**:

```typescript
interface OptimizeRequest {
  containerNumber: string;         // 柜号
  basePickupDate: string;          // 基础提柜日
  lastFreeDate?: string;           // 免费期截止日（可选）
  warehouseCode: string;           // 仓库代码
  truckingCompanyId: string;       // 车队 ID
}
```

**响应格式**:

```typescript
interface OptimizationResult {
  originalCost: number;            // 原始成本
  optimizedCost: number;           // 优化后成本
  savings: number;                 // 节省金额
  savingsPercent: number;          // 节省百分比
  suggestedPickupDate: string;     // 建议提柜日
  suggestedStrategy: 'Direct' | 'Drop off' | 'Expedited';
  alternatives: Array<{
    pickupDate: string;
    strategy: 'Direct' | 'Drop off' | 'Expedited';
    totalCost: number;
  }>;
}
```

**调用示例**:

```typescript
import { costOptimizerService } from '@/services/costOptimizer.service'

async function getOptimizationSuggestion() {
  try {
    const result = await costOptimizerService.suggestOptimalUnloadDate({
      containerNumber: 'HMMU6232153',
      basePickupDate: '2026-03-25',
      lastFreeDate: '2026-03-30',
      warehouseCode: 'WH001',
      truckingCompanyId: 'TRUCK001'
    })

    console.log('成本优化建议:')
    console.log(`原始成本：$${result.originalCost}`)
    console.log(`优化后成本：$${result.optimizedCost}`)
    console.log(`节省金额：$${result.savings}`)
    console.log(`节省比例：${result.savingsPercent}%`)
    console.log(`建议提柜日：${result.suggestedPickupDate}`)
    console.log(`建议策略：${result.suggestedStrategy}`)

    // 显示备选方案
    if (result.alternatives && result.alternatives.length > 0) {
      console.log('\n前 3 个最优方案:')
      result.alternatives.forEach((alt, index) => {
        console.log(`${index + 1}. ${alt.strategy} - ` +
          `${alt.pickupDate} - $${alt.totalCost}`)
      })
    }
  } catch (error) {
    console.error('获取优化建议失败:', error)
    throw error
  }
}
```

---

### 1.4 批量成本优化 API

**端点**: `POST /scheduling/batch-optimize`

**用途**: 批量对多个货柜进行成本优化

**请求参数**:

```typescript
interface BatchOptimizeRequest {
  containerNumbers: string[];      // 柜号列表
  basePickupDate: string;          // 基础提柜日
  lastFreeDate?: string;           // 免费期截止日（可选）
}
```

**响应格式**:

```typescript
interface BatchOptimizeResponse {
  success: boolean;
  data: {
    results: Array<{
      containerNumber: string;
      originalCost: number;
      optimizedCost: number;
      savings: number;
      savingsPercent: number;
      suggestedPickupDate: string;
      suggestedStrategy: string;
      status: 'success' | 'failed';
      errorMessage?: string;
    }>;
    summary: {
      totalContainers: number;
      optimizedCount: number;
      failedCount: number;
      totalSavings: number;
      averageSavingsPercent: number;
    };
  };
}
```

**调用示例**:

```typescript
async function batchOptimizeCost() {
  try {
    const response = await api.post('/scheduling/batch-optimize', {
      containerNumbers: ['HMMU6232153', 'HMMU6232154', 'HMMU6232155'],
      basePickupDate: '2026-03-25',
      lastFreeDate: '2026-03-30'
    })

    const { results, summary } = response.data.data

    console.log('批量优化结果:')
    console.log(`总柜数：${summary.totalContainers}`)
    console.log(`成功优化：${summary.optimizedCount}`)
    console.log(`失败：${summary.failedCount}`)
    console.log(`总节省金额：$${summary.totalSavings}`)
    console.log(`平均节省比例：${summary.averageSavingsPercent}%`)

    // 显示每个货柜的优化结果
    results.forEach(result => {
      if (result.status === 'success') {
        console.log(`\n${result.containerNumber}:`)
        console.log(`  原始成本：$${result.originalCost}`)
        console.log(`  优化后：$${result.optimizedCost}`)
        console.log(`  节省：$${result.savings} (${result.savingsPercent}%)`)
        console.log(`  建议提柜日：${result.suggestedPickupDate}`)
        console.log(`  建议策略：${result.suggestedStrategy}`)
      } else {
        console.error(`${result.containerNumber}: 失败 - ${result.errorMessage}`)
      }
    })
  } catch (error) {
    console.error('批量优化失败:', error)
    throw error
  }
}
```

---

### 1.5 仓库能力查询 API

**端点**: `GET /scheduling/warehouse-capacity`

**用途**: 查询仓库在特定日期的剩余产能

**请求参数**:

```typescript
interface WarehouseCapacityQuery {
  warehouseCode: string;           // 仓库代码
  startDate: string;               // 开始日期
  endDate: string;                 // 结束日期
}
```

**响应格式**:

```typescript
interface WarehouseCapacityResponse {
  success: boolean;
  data: Array<{
    date: string;
    totalCapacity: number;
    usedCapacity: number;
    remainingCapacity: number;
    isRestDay: boolean;
    utilizationPercent: number;
  }>;
}
```

**调用示例**:

```typescript
async function checkWarehouseCapacity() {
  try {
    const params = {
      warehouseCode: 'WH001',
      startDate: '2026-03-20',
      endDate: '2026-04-20'
    }

    const response = await api.get('/scheduling/warehouse-capacity', { params })
    const capacities = response.data.data

    console.log('仓库产能使用情况:')
    capacities.forEach(day => {
      const status = day.isRestDay ? '休息日' : 
                     day.remainingCapacity === 0 ? '已满' :
                     day.utilizationPercent >= 90 ? '紧张' : '充足'
      
      console.log(`${day.date}: ` +
        `总容量=${day.totalCapacity}, ` +
        `已用=${day.usedCapacity}, ` +
        `剩余=${day.remainingCapacity}, ` +
        `利用率=${day.utilizationPercent}%, ` +
        `状态：${status}`)
    })
  } catch (error) {
    console.error('查询产能失败:', error)
    throw error
  }
}
```

---

### 1.6 车队能力查询 API

**端点**: `GET /scheduling/trucking-capacity`

**用途**: 查询车队的送柜和还箱能力

**请求参数**:

```typescript
interface TruckingCapacityQuery {
  truckingCompanyId: string;       // 车队 ID
  portCode: string;                // 港口代码
  warehouseCode: string;           // 仓库代码
  startDate: string;               // 开始日期
  endDate: string;                 // 结束日期
}
```

**响应格式**:

```typescript
interface TruckingCapacityResponse {
  success: boolean;
  data: {
    deliveryCapacity: Array<{
      date: string;
      totalCapacity: number;
      usedCapacity: number;
      remainingCapacity: number;
    }>;
    returnCapacity: Array<{
      date: string;
      totalCapacity: number;
      usedCapacity: number;
      remainingCapacity: number;
    }>;
  };
}
```

**调用示例**:

```typescript
async function checkTruckingCapacity() {
  try {
    const params = {
      truckingCompanyId: 'TRUCK001',
      portCode: 'USLAX',
      warehouseCode: 'WH001',
      startDate: '2026-03-20',
      endDate: '2026-04-20'
    }

    const response = await api.get('/scheduling/trucking-capacity', { params })
    const data = response.data.data

    console.log('车队送柜能力:')
    data.deliveryCapacity.forEach(day => {
      console.log(`${day.date}: 剩余=${day.remainingCapacity}/${day.totalCapacity}`)
    })

    console.log('\n车队还箱能力:')
    data.returnCapacity.forEach(day => {
      console.log(`${day.date}: 剩余=${day.remainingCapacity}/${day.totalCapacity}`)
    })
  } catch (error) {
    console.error('查询车队能力失败:', error)
    throw error
  }
}
```

---

## 二、高级用法

### 2.1 组合使用：排产 + 优化

```typescript
/**
 * 完整流程：先排产，再优化成本
 */
async function scheduleAndOptimize(containerNumbers: string[]) {
  try {
    // Step 1: 批量排产
    console.log('Step 1: 执行批量排产...')
    const scheduleResponse = await api.post('/scheduling/batch', {
      containerNumbers,
      startDate: dayjs().format('YYYY-MM-DD'),
      endDate: dayjs().add(30, 'day').format('YYYY-MM-DD'),
      countryCode: 'US'
    })

    const scheduledContainers = scheduleResponse.data.data.scheduledContainers
    console.log(`排产完成：${scheduledContainers.length}个货柜`)

    // Step 2: 提取需要优化的货柜（免费期内的）
    const containersToOptimize = scheduledContainers
      .filter(c => c.status === 'scheduled')
      .map(c => c.containerNumber)

    // Step 3: 批量成本优化
    console.log('\nStep 2: 执行成本优化...')
    const optimizeResponse = await api.post('/scheduling/batch-optimize', {
      containerNumbers: containersToOptimize,
      basePickupDate: dayjs().add(5, 'day').format('YYYY-MM-DD'),
      lastFreeDate: dayjs().add(15, 'day').format('YYYY-MM-DD')
    })

    const optimizationResults = optimizeResponse.data.data.results
    const summary = optimizeResponse.data.data.summary

    console.log('\n===== 最终结果 =====')
    console.log(`总柜数：${summary.totalContainers}`)
    console.log(`优化成功：${summary.optimizedCount}`)
    console.log(`总节省金额：$${summary.totalSavings}`)
    console.log(`平均节省比例：${summary.averageSavingsPercent}%`)

    // Step 4: 生成报告
    const report = {
      timestamp: new Date().toISOString(),
      containers: containerNumbers,
      scheduling: scheduleResponse.data.data,
      optimization: optimizeResponse.data.data,
      totalSavings: summary.totalSavings
    }

    console.log('\n详细报告:', JSON.stringify(report, null, 2))

    return report
  } catch (error) {
    console.error('流程执行失败:', error)
    throw error
  }
}

// 使用示例
scheduleAndOptimize(['HMMU6232153', 'HMMU6232154', 'HMMU6232155'])
  .then(report => console.log('执行成功'))
  .catch(error => console.error('执行失败:', error))
```

---

### 2.2 错误重试机制

```typescript
import axios from 'axios'

/**
 * 带重试的 API 调用
 * @param apiCall API 调用函数
 * @param maxRetries 最大重试次数
 * @param delay 重试延迟（毫秒）
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

      // 等待后重试
      console.warn(`第${attempt}次失败，${delay}ms 后重试...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError!
}

// 使用示例
async function robustBatchSchedule() {
  return callWithRetry(
    () => api.post('/scheduling/batch', {
      containerNumbers: ['HMMU6232153'],
      startDate: '2026-03-20',
      endDate: '2026-04-20'
    }),
    3,  // 最多重试 3 次
    2000 // 每次间隔 2 秒
  )
}
```

---

### 2.3 并发控制

```typescript
import PQueue from 'p-queue'

/**
 * 并发控制的批量排产
 * 避免同时发送太多请求导致服务器压力过大
 */
async function concurrentBatchSchedule(containerNumbers: string[], concurrency = 5) {
  const queue = new PQueue({ concurrency })
  const results = []

  // 将货柜分组（每组 10 个）
  const groups = []
  for (let i = 0; i < containerNumbers.length; i += 10) {
    groups.push(containerNumbers.slice(i, i + 10))
  }

  // 并发执行
  for (const group of groups) {
    const promise = queue.add(async () => {
      try {
        const response = await api.post('/scheduling/batch', {
          containerNumbers: group,
          startDate: '2026-03-20',
          endDate: '2026-04-20'
        })
        return { success: true, data: response.data }
      } catch (error) {
        return { success: false, error: (error as Error).message }
      }
    })
    results.push(promise)
  }

  // 等待所有任务完成
  const settled = await Promise.allSettled(results)
  
  // 统计结果
  const successful = settled.filter(r => r.status === 'fulfilled' && r.value.success).length
  const failed = settled.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length

  console.log(`执行完成：成功${successful}组，失败${failed}组`)

  return settled
}

// 使用示例
const allContainers = Array.from({ length: 100 }, (_, i) => `HMMU6232${String(i).padStart(3, '0')}`)
concurrentBatchSchedule(allContainers, 3)  // 最多同时 3 个请求
  .then(results => console.log('全部完成'))
  .catch(error => console.error('执行失败:', error))
```

---

## 三、最佳实践

### 3.1 性能优化

```typescript
/**
 * ✅ 好的做法：批量查询
 */
async function goodPractice() {
  // 一次性查询多个货柜
  const response = await api.post('/scheduling/batch', {
    containerNumbers: ['HMMU6232153', 'HMMU6232154', 'HMMU6232155'],
    startDate: '2026-03-20',
    endDate: '2026-04-20'
  })
  return response.data
}

/**
 * ❌ 坏的做法：循环单个查询
 */
async function badPractice() {
  const containerNumbers = ['HMMU6232153', 'HMMU6232154', 'HMMU6232155']
  const results = []

  // 产生 N 次 HTTP 请求
  for (const containerNumber of containerNumbers) {
    const response = await api.post('/scheduling/simulate', {
      containerNumber,
      startDate: '2026-03-20',
      endDate: '2026-04-20'
    })
    results.push(response.data)
  }

  return results
}
```

---

### 3.2 缓存策略

```typescript
import NodeCache from 'node-cache'

// 创建缓存（TTL=5 分钟）
const cache = new NodeCache({ stdTTL: 300 })

/**
 * 带缓存的能力查询
 */
async function getCachedWarehouseCapacity(warehouseCode: string, startDate: string, endDate: string) {
  const cacheKey = `capacity:${warehouseCode}:${startDate}:${endDate}`
  
  // 尝试从缓存读取
  const cached = cache.get(cacheKey)
  if (cached) {
    console.log('[Cache Hit] 从缓存读取')
    return cached
  }

  // 缓存未命中，调用 API
  console.log('[Cache Miss] 调用 API 查询')
  const response = await api.get('/scheduling/warehouse-capacity', {
    params: { warehouseCode, startDate, endDate }
  })

  // 写入缓存
  cache.set(cacheKey, response.data)

  return response.data
}
```

---

### 3.3 日志记录

```typescript
import logger from '@/utils/logger'

/**
 * 完整的日志记录
 */
async function scheduleWithLogging(containerNumbers: string[]) {
  const startTime = Date.now()
  logger.info(`[排产] 开始执行，柜数=${containerNumbers.length}`)

  try {
    // Step 1: 验证参数
    logger.debug(`[排产] 验证参数...`)
    if (!containerNumbers || containerNumbers.length === 0) {
      throw new Error('柜号列表不能为空')
    }

    // Step 2: 调用 API
    logger.debug(`[排产] 调用批量排产 API...`)
    const response = await api.post('/scheduling/batch', {
      containerNumbers,
      startDate: dayjs().format('YYYY-MM-DD'),
      endDate: dayjs().add(30, 'day').format('YYYY-MM-DD')
    })

    // Step 3: 处理结果
    const { scheduledCount, failedCount } = response.data.data.summary
    logger.info(`[排产] 完成，成功=${scheduledCount}, 失败=${failedCount}`)

    // Step 4: 记录性能指标
    const duration = Date.now() - startTime
    logger.metric('scheduling_duration', duration)
    logger.metric('scheduling_success_rate', scheduledCount / containerNumbers.length)

    return response.data
  } catch (error) {
    logger.error(`[排产] 失败:`, error)
    throw error
  }
}
```

---

## 📚 相关文档

- **01-智能排柜系统架构完整指南** - 系统整体架构
- **02-智能排柜成本优化完整指南** - 成本计算和优化算法
- **03-日历配置与产能管理指南** - 能力配置和档期管理
- **05-前端组件使用指南** - Vue 组件使用

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高
