# 货柜服务 API 实战指南

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高

---

## 📋 概述

ContainerService 是前端与后端货柜数据交互的核心桥梁，提供完整的 CRUD、筛选查询、统计分析和业务操作功能。

### 核心价值

1. **统一接口**: 封装所有货柜相关 API 调用
2. **自动认证**: Token 自动附加到请求头
3. **国家筛选**: 全局 X-Country-Code header 注入
4. **缓存管理**: Cache-Control 防止浏览器缓存
5. **类型安全**: 完整的 TypeScript 类型定义

---

## 一、ContainerService 完整实现

### 1.1 类结构与构造

```typescript
// frontend/src/services/container.ts

import { useAppStore } from '@/store/app'
import type {
  Container,
  ContainerFilters,
  ContainerResponse,
  ContainerStats,
} from '@/types/container'
import { cacheManager } from '@/utils/cacheManager'
import { camelToSnake } from '@/utils/camelToSnake'
import axios, { AxiosInstance } from 'axios'

class ContainerService {
  private api: AxiosInstance

  constructor() {
    // 创建 Axios 实例
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
      timeout: 120000, // 2 分钟超时
    })

    // ⭐ 注册请求拦截器 ⭐
    this.api.interceptors.request.use(
      config => this.handleRequest(config),
      error => Promise.reject(error)
    )

    // 注册响应拦截器
    this.api.interceptors.response.use(
      response => this.handleResponse(response),
      error => this.handleError(error)
    )
  }

  /**
   * 请求拦截器处理
   */
  private handleRequest(config: any): any {
    // 1. Token 认证
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 2. ⭐ 全局国家筛选 ⭐
    const appStore = useAppStore()
    if (appStore.scopedCountryCode) {
      config.headers['X-Country-Code'] = appStore.scopedCountryCode
    }

    // 3. ⭐ 避免浏览器缓存（GET 请求）⭐
    if (String(config.method || 'get').toLowerCase() === 'get') {
      config.headers['Cache-Control'] = 'no-cache'
      config.headers['Pragma'] = 'no-cache'
    }

    return config
  }

  /**
   * 响应拦截器处理
   */
  private handleResponse(response: any): any {
    // 可以在这里做统一的错误处理、日志记录等
    return response
  }

  /**
   * 错误处理
   */
  private handleError(error: any): never {
    console.error('[ContainerService] API Error:', error)

    // 401 未授权 → 跳转登录
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }

    throw error
  }
}

// 导出单例
export const containerService = new ContainerService()
```

---

### 1.2 CRUD 基础方法

#### 获取货柜列表（分页）

```typescript
/**
 * 获取货柜列表（分页）
 * @param filters - 筛选条件
 * @returns 货柜列表和分页信息
 */
async getContainers(filters: ContainerFilters): Promise<ContainerListResponse> {
  try {
    // 转换 camelCase 为 snake_case
    const snakeFilters = camelToSnake(filters)

    const response = await this.api.get('/containers', { params: snakeFilters })

    return {
      success: true,
      items: response.data.items || [],
      pagination: {
        page: response.data.page || 1,
        pageSize: response.data.pageSize || 20,
        total: response.data.total || 0
      }
    }
  } catch (error: any) {
    console.error('[ContainerService] getContainers error:', error)
    return {
      success: false,
      error: error.message,
      items: [],
      pagination: { page: 1, pageSize: 20, total: 0 }
    }
  }
}
```

---

#### 获取单个货柜详情

```typescript
/**
 * 获取单个货柜详情
 * @param containerNumber - 集装箱号
 * @returns 货柜详情（包含关联数据）
 */
async getContainerById(containerNumber: string): Promise<ContainerDetailResponse> {
  try {
    const response = await this.api.get(`/containers/${encodeURIComponent(containerNumber)}`)

    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    console.error('[ContainerService] getContainerById error:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}
```

---

#### 创建货柜

```typescript
/**
 * 创建货柜
 * @param container - 货柜数据
 * @returns 创建的货柜
 */
async createContainer(container: Partial<Container>): Promise<ContainerResponse> {
  try {
    const response = await this.api.post('/containers', container)

    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    console.error('[ContainerService] createContainer error:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}
```

---

#### 更新货柜

```typescript
/**
 * 更新货柜
 * @param containerNumber - 集装箱号
 * @param data - 更新数据
 * @returns 更新后的货柜
 */
async updateContainer(
  containerNumber: string,
  data: Partial<Container>
): Promise<ContainerResponse> {
  try {
    const response = await this.api.patch(
      `/containers/${encodeURIComponent(containerNumber)}`,
      data
    )

    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    console.error('[ContainerService] updateContainer error:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}
```

---

#### 删除货柜

```typescript
/**
 * 删除货柜
 * @param containerNumber - 集装箱号
 * @returns 是否成功
 */
async deleteContainer(containerNumber: string): Promise<BaseResponse> {
  try {
    await this.api.delete(`/containers/${encodeURIComponent(containerNumber)}`)

    return {
      success: true
    }
  } catch (error: any) {
    console.error('[ContainerService] deleteContainer error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

---

### 1.3 统计分析方法

#### 获取基础统计

```typescript
/**
 * 获取货柜统计
 * @returns 统计数据
 */
async getStatistics(): Promise<ContainerStatsResponse> {
  try {
    const response = await this.api.get('/containers/statistics')

    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    console.error('[ContainerService] getStatistics error:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}
```

---

#### 获取详细统计

```typescript
/**
 * 获取详细统计（支持日期范围）
 * @param params - 统计参数
 * @returns 详细统计数据
 */
async getStatisticsDetailed(params: StatisticsParams): Promise<ContainerStatsResponse> {
  try {
    const snakeParams = camelToSnake(params)
    const response = await this.api.get('/containers/statistics-detailed', {
      params: snakeParams
    })

    return {
      success: true,
      data: response.data
    }
  } catch (error: any) {
    console.error('[ContainerService] getStatisticsDetailed error:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}
```

---

### 1.4 业务操作方法

#### 按筛选条件获取货柜

```typescript
/**
 * 按筛选条件获取货柜
 * @param condition - 筛选条件代码
 * @returns 货柜列表
 */
async getContainersByFilterCondition(condition: string): Promise<ContainerListResponse> {
  try {
    const response = await this.api.get('/containers/by-filter', {
      params: { condition }
    })

    return {
      success: true,
      items: response.data.items || [],
      pagination: {
        page: 1,
        pageSize: response.data.items?.length || 0,
        total: response.data.total || 0
      }
    }
  } catch (error: any) {
    console.error('[ContainerService] getContainersByFilterCondition error:', error)
    return {
      success: false,
      error: error.message,
      items: [],
      pagination: { page: 1, pageSize: 0, total: 0 }
    }
  }
}
```

---

#### 写回滞港费日期

```typescript
/**
 * 写回滞港费日期（单个货柜）
 * @param containerNumber - 集装箱号
 * @returns 是否成功
 */
async writeBackDemurrageDatesForContainer(containerNumber: string): Promise<BaseResponse> {
  try {
    await this.api.post(`/containers/${encodeURIComponent(containerNumber)}/write-back-demurrage-dates`)

    return {
      success: true
    }
  } catch (error: any) {
    console.error('[ContainerService] writeBackDemurrageDatesForContainer error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}
```

---

#### 批量写回滞港费日期

```typescript
/**
 * 批量写回滞港费日期
 * @param params - 参数（日期范围、国家等）
 * @returns 执行结果
 */
async batchWriteBackDemurrageDates(params: BatchDemurrageParams): Promise<BatchOperationResponse> {
  try {
    const snakeParams = camelToSnake(params)
    const response = await this.api.post('/containers/batch-write-back-demurrage-dates', snakeParams)

    return {
      success: true,
      data: {
        processed: response.data.processed,
        succeeded: response.data.succeeded,
        failed: response.data.failed
      }
    }
  } catch (error: any) {
    console.error('[ContainerService] batchWriteBackDemurrageDates error:', error)
    return {
      success: false,
      error: error.message,
      data: { processed: 0, succeeded: 0, failed: 0 }
    }
  }
}
```

---

## 二、Composables 使用模式

### 2.1 useContainerDetail（货柜详情）

```typescript
// frontend/src/composables/useContainerDetail.ts

import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { containerService } from '@/services/container'
import type { Container } from '@/types/container'

export function useContainerDetail() {
  const route = useRoute()
  const router = useRouter()

  // ========== 计算属性 ==========

  /**
   * 从路由参数获取货柜号
   */
  const containerNumber = computed(() => {
    const p = route.params.containerNumber as string
    return p ? decodeURIComponent(p) : ''
  })

  // ========== 状态 ==========

  const containerData = ref<Container | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // ========== 方法 ==========

  /**
   * 加载货柜数据
   */
  async function loadContainerData() {
    if (!containerNumber.value) {
      error.value = '货柜号为空'
      return
    }

    loading.value = true
    error.value = null

    try {
      const result = await containerService.getContainerById(containerNumber.value)

      if (result.success && result.data) {
        containerData.value = result.data
      } else {
        error.value = result.error || '加载失败'
      }
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  /**
   * 刷新数据
   */
  async function refresh() {
    await loadContainerData()
  }

  /**
   * 返回列表页
   */
  function goBack() {
    router.back()
  }

  // ========== 返回 ==========

  return {
    // State
    containerNumber,
    containerData,
    loading,
    error,

    // Actions
    loadContainerData,
    refresh,
    goBack,
  }
}
```

---

**使用示例**:

```vue
<!-- frontend/src/views/containers/ContainerDetail.vue -->

<script setup lang="ts">
import { useContainerDetail } from '@/composables/useContainerDetail'
import { onMounted } from 'vue'

const { containerNumber, containerData, loading, error, loadContainerData, goBack } =
  useContainerDetail()

onMounted(async () => {
  await loadContainerData()
})
</script>

<template>
  <div>
    <h1>货柜详情：{{ containerNumber }}</h1>

    <el-button @click="goBack">返回</el-button>

    <div v-if="loading">加载中...</div>
    <div v-else-if="error">错误：{{ error }}</div>
    <div v-else-if="containerData">
      <!-- 显示货柜详情 -->
      <p>柜型：{{ containerData.containerTypeCode }}</p>
      <p>状态：{{ containerData.logisticsStatus }}</p>
      <!-- ... -->
    </div>
  </div>
</template>
```

---

### 2.2 useContainerCountdown（倒计时）

```typescript
// frontend/src/composables/useContainerCountdown.ts

import type { Ref } from 'vue'
import type { Container } from '@/types/container'

interface CountdownInfo {
  status: 'normal' | 'urgent' | 'expired' | 'no_data'
  daysLeft: number | null
  hoursLeft: number | null
  isOverdue: boolean
}

export function useContainerCountdown() {
  /**
   * 计算倒计时信息
   * @param container - 货柜对象
   * @returns 倒计时信息
   */
  function getCountdownInfo(container: Container): CountdownInfo {
    // 获取最晚提柜日
    const lastFreeDate = container.portOperations?.[0]?.lastFreeDate

    if (!lastFreeDate) {
      return {
        status: 'no_data',
        daysLeft: null,
        hoursLeft: null,
        isOverdue: false,
      }
    }

    const now = new Date()
    const deadline = new Date(lastFreeDate)
    const diffMs = deadline.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffDays < 0) {
      // 已超期
      return {
        status: 'expired',
        daysLeft: diffDays,
        hoursLeft: diffHours,
        isOverdue: true,
      }
    } else if (diffDays <= 2) {
      // 紧急（2 天内）
      return {
        status: 'urgent',
        daysLeft: diffDays,
        hoursLeft: diffHours,
        isOverdue: false,
      }
    } else {
      // 正常
      return {
        status: 'normal',
        daysLeft: diffDays,
        hoursLeft: diffHours,
        isOverdue: false,
      }
    }
  }

  /**
   * 格式化倒计时显示
   */
  function formatCountdown(info: CountdownInfo): string {
    if (info.status === 'no_data') return '--'
    if (info.daysLeft === null) return '--'

    if (info.isOverdue) {
      return `超期 ${Math.abs(info.daysLeft)} 天`
    } else if (info.status === 'urgent') {
      return `剩余 ${info.daysLeft} 天 ${info.hoursLeft !== null ? info.hoursLeft % 24 : ''}小时`
    } else {
      return `${info.daysLeft} 天`
    }
  }

  return {
    getCountdownInfo,
    formatCountdown,
  }
}
```

---

**使用示例**:

```vue
<!-- frontend/src/components/dashboard/LastPickupCountdownCard.vue -->

<script setup lang="ts">
import { useContainerCountdown } from '@/composables/useContainerCountdown'
import type { Container } from '@/types/container'

const props = defineProps<{
  container: Container
}>()

const { getCountdownInfo, formatCountdown } = useContainerCountdown()

const countdownInfo = getCountdownInfo(props.container)
const displayText = formatCountdown(countdownInfo)
</script>

<template>
  <div class="countdown-card" :class="`status-${countdownInfo.status}`">
    <div class="label">最晚提柜</div>
    <div class="value">{{ displayText }}</div>
  </div>
</template>

<style scoped>
.countdown-card {
  padding: 12px;
  border-radius: 4px;
}

.status-normal {
  background-color: #f0f9ff;
  color: #409eff;
}

.status-urgent {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.status-expired {
  background-color: #fef0f0;
  color: #f56c6c;
}
</style>
```

---

## 三、常见问题排查

### 3.1 问题 1: API 请求失败 401

**现象**: 所有请求都返回 401 Unauthorized

**排查步骤**:

```javascript
// Step 1: 检查 Token
console.log('Token:', localStorage.getItem('token'))

// Step 2: 检查请求头
// Network 面板查看 Authorization header 是否存在

// Step 3: 检查拦截器
// 在 handleRequest 中添加 console.log
```

**解决方案**:

- ✅ 重新登录获取新 Token
- ✅ 清除本地存储重新登录
- ✅ 检查后端 JWT 配置

---

### 3.2 问题 2: 请求被缓存

**现象**: 数据已更新，但前端仍显示旧数据

**排查步骤**:

```javascript
// Step 1: 检查请求头
// Network 面板查看 Cache-Control 和 Pragma

// Step 2: 强制刷新
window.location.reload(true)
```

**解决方案**:

- ✅ 已在拦截器中设置 `Cache-Control: no-cache`
- ✅ 如仍有问题，在 URL 后加时间戳参数
- ✅ 清除浏览器缓存

---

### 3.3 问题 3: 国家筛选不生效

**现象**: 切换国家后，数据没有变化

**排查步骤**:

```javascript
// Step 1: 检查 app Store
const appStore = useAppStore()
console.log('scopedCountryCode:', appStore.scopedCountryCode)

// Step 2: 检查请求头
// Network 面板查看 X-Country-Code

// Step 3: 检查后端日志
tail -f backend.log | grep "X-Country-Code"
```

**解决方案**:

- ✅ 参考 02-Pinia 状态管理完整指南
- ✅ 验证后端 middleware 配置
- ✅ 清除 localStorage 重新设置

---

## 📚 相关文档

- **01-货柜数据结构完整指南** - 数据库表结构与类型定义
- **02-Pinia 状态管理完整指南** - app Store 与 ganttFilters Store
- **04-甘特派生快照机制详解** - GanttDerived 构建算法
- **05-货柜数据流与状态同步** - 后端 ContainerStatusService

---

**版本**: v1.0  
**创建时间**: 2026-03-31  
**最后更新**: 2026-03-31  
**作者**: 刘志高
