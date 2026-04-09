# Phase 2 前端请求治理方案

## 文档信息

- **版本**: v1.0
- **创建时间**: 2026-04-09
- **作者**: 刘志高
- **类型**: 实施方案
- **状态**: 待执行

---

## 一、现状分析

### 1.1 当前实现

**文件**: `frontend/src/services/api.ts`

**已有功能**:

- ✅ Axios 实例创建 (timeout: 10s)
- ✅ 请求拦截器 (Token + X-Country-Code)
- ✅ 响应拦截器 (401跳转登录,错误提示)
- ✅ 通用 API 方法封装 (get/post/put/patch/delete)

**缺失功能**:

- ❌ 无重试机制
- ❌ 无请求取消(过时请求)
- ❌ 无并发控制
- ❌ 无数据缓存(SWR/React Query)
- ❌ 无请求去重
- ❌ timeout 固定 10s,未区分接口类型

---

## 二、治理目标

### 2.1 核心目标

1. **统一重试策略** - GET 请求失败自动重试(最多2次)
2. **取消过时请求** - 新请求发出时自动取消同一资源的旧请求
3. **并发阀门** - 限制同一域名最大并发请求数(默认10)
4. **分级超时** - 根据接口类型设置不同 timeout
5. **请求去重** - 相同参数的 GET 请求在 pending 时复用

### 2.2 技术选型

**方案 A: 纯 Axios 增强** (推荐,投入小)

- 优点: 无需引入新依赖,兼容现有代码
- 缺点: 功能相对基础
- 适用: Phase 2 快速落地

**方案 B: 引入 SWR/Vue Query** (长期目标)

- 优点: 完整的数据获取解决方案,内置缓存/重试/去重
- 缺点: 需要改造所有组件,工作量大
- 适用: Phase 3 全面升级

**决策**: Phase 2 采用**方案 A**,Phase 3 评估是否升级到方案 B

---

## 三、实施方案

### 3.1 增强 Axios 拦截器

#### 3.1.1 请求去重与取消

```typescript
// frontend/src/services/requestDeduplication.ts

import axios, { CancelTokenSource } from 'axios'

class RequestDeduplication {
  private pendingRequests = new Map<string, CancelTokenSource>()

  /**
   * 生成请求唯一键
   */
  generateKey(config: any): string {
    const { method, url, params, data } = config
    return `${method}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(data || {})}`
  }

  /**
   * 检查并取消重复请求
   */
  cancelDuplicate(config: any): void {
    const key = this.generateKey(config)

    if (this.pendingRequests.has(key)) {
      // 取消之前的请求
      const source = this.pendingRequests.get(key)!
      source.cancel('Request canceled due to duplicate')
      this.pendingRequests.delete(key)
    }
  }

  /**
   * 记录请求
   */
  recordRequest(config: any, source: CancelTokenSource): void {
    const key = this.generateKey(config)
    this.pendingRequests.set(key, source)
  }

  /**
   * 清除请求记录
   */
  clearRequest(config: any): void {
    const key = this.generateKey(config)
    this.pendingRequests.delete(key)
  }

  /**
   * 清除所有请求
   */
  clearAll(): void {
    this.pendingRequests.forEach(source => source.cancel('Request canceled'))
    this.pendingRequests.clear()
  }
}

export const requestDeduplication = new RequestDeduplication()
```

#### 3.1.2 重试机制

```typescript
// frontend/src/services/retryInterceptor.ts

import type { AxiosError, InternalAxiosRequestConfig } from 'axios'

interface RetryConfig {
  maxRetries: number
  retryDelay: number // 毫秒
  retryableMethods: string[] // 可重试的 HTTP 方法
  retryableStatuses: number[] // 可重试的状态码
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  retryDelay: 1000, // 1秒
  retryableMethods: ['GET'], // 仅 GET 可重试
  retryableStatuses: [408, 429, 500, 502, 503, 504], // 网络相关错误
}

/**
 * 判断是否应该重试
 */
function shouldRetry(
  error: AxiosError,
  config: InternalAxiosRequestConfig & { retryCount?: number }
): boolean {
  const retryConfig = (config as any).retryConfig || DEFAULT_RETRY_CONFIG

  // 检查重试次数
  const retryCount = config.retryCount || 0
  if (retryCount >= retryConfig.maxRetries) {
    return false
  }

  // 检查 HTTP 方法
  if (!retryConfig.retryableMethods.includes(config.method?.toUpperCase() || '')) {
    return false
  }

  // 检查状态码
  if (error.response && !retryConfig.retryableStatuses.includes(error.response.status)) {
    return false
  }

  return true
}

/**
 * 计算重试延迟(指数退避)
 */
function getRetryDelay(retryCount: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, retryCount) // 1s, 2s, 4s...
}

/**
 * 重试拦截器
 */
export async function retryInterceptor(error: AxiosError): Promise<any> {
  const config = error.config as InternalAxiosRequestConfig & { retryCount?: number }

  if (!config || !shouldRetry(error, config)) {
    return Promise.reject(error)
  }

  const retryConfig = (config as any).retryConfig || DEFAULT_RETRY_CONFIG
  const retryCount = config.retryCount || 0
  const delay = getRetryDelay(retryCount, retryConfig.retryDelay)

  console.log(
    `[Retry] Retrying request (${retryCount + 1}/${retryConfig.maxRetries}) after ${delay}ms`
  )

  // 等待延迟
  await new Promise(resolve => setTimeout(resolve, delay))

  // 增加重试计数
  config.retryCount = retryCount + 1

  // 重新发起请求
  return axios(config)
}
```

#### 3.1.3 并发控制

```typescript
// frontend/src/services/concurrencyControl.ts

import type { InternalAxiosRequestConfig } from 'axios'

class ConcurrencyControl {
  private activeRequests = 0
  private readonly maxConcurrent: number
  private readonly queue: Array<{
    config: InternalAxiosRequestConfig
    resolve: (value: any) => void
    reject: (reason?: any) => void
  }> = []

  constructor(maxConcurrent: number = 10) {
    this.maxConcurrent = maxConcurrent
  }

  /**
   * 添加请求到队列
   */
  async enqueue<T>(config: InternalAxiosRequestConfig): Promise<T> {
    if (this.activeRequests < this.maxConcurrent) {
      // 直接执行
      this.activeRequests++
      try {
        return await this.executeRequest<T>(config)
      } finally {
        this.activeRequests--
        this.processQueue()
      }
    } else {
      // 加入队列等待
      return new Promise((resolve, reject) => {
        this.queue.push({ config, resolve, reject })
      })
    }
  }

  /**
   * 处理队列中的下一个请求
   */
  private processQueue(): void {
    if (this.queue.length === 0 || this.activeRequests >= this.maxConcurrent) {
      return
    }

    const { config, resolve, reject } = this.queue.shift()!
    this.activeRequests++

    this.executeRequest(config)
      .then(resolve)
      .catch(reject)
      .finally(() => {
        this.activeRequests--
        this.processQueue()
      })
  }

  /**
   * 执行请求(由外部调用)
   */
  private async executeRequest<T>(config: InternalAxiosRequestConfig): Promise<T> {
    // 这里需要与 axios 集成,实际实现在拦截器中
    throw new Error('Not implemented')
  }
}

export const concurrencyControl = new ConcurrencyControl(10)
```

### 3.2 分级超时配置

```typescript
// frontend/src/services/timeoutConfig.ts

export interface TimeoutConfig {
  default: number
  fast: number // 字典/配置查询
  normal: number // 列表查询
  slow: number // 统计/导出
  upload: number // 文件上传
}

export const TIMEOUT_CONFIG: TimeoutConfig = {
  default: 10000, // 10秒
  fast: 5000, // 5秒
  normal: 15000, // 15秒
  slow: 30000, // 30秒
  upload: 60000, // 60秒
}

/**
 * 根据 URL 路径推断超时配置
 */
export function getTimeoutByUrl(url: string): number {
  // 统计接口
  if (url.includes('/statistics')) {
    return TIMEOUT_CONFIG.slow
  }

  // 导入/导出
  if (url.includes('/import') || url.includes('/export')) {
    return TIMEOUT_CONFIG.upload
  }

  // 字典/配置
  if (url.includes('/dict')) {
    return TIMEOUT_CONFIG.fast
  }

  // 默认
  return TIMEOUT_CONFIG.normal
}
```

### 3.3 集成到 api.ts

```typescript
// frontend/src/services/api.ts (增强版)

import { useAppStore } from '@/store/app'
import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  CancelTokenSource,
} from 'axios'
import { ElMessage } from 'element-plus'
import { requestDeduplication } from './requestDeduplication'
import { retryInterceptor } from './retryInterceptor'
import { getTimeoutByUrl } from './timeoutConfig'

// 创建axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
apiClient.interceptors.request.use(
  config => {
    // 1. Token + 国家代码
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const appStore = useAppStore()
    if (appStore.scopedCountryCode) {
      config.headers['X-Country-Code'] = appStore.scopedCountryCode
    }

    // 2. 动态超时
    if (!config.timeout) {
      config.timeout = getTimeoutByUrl(config.url || '')
    }

    // 3. 取消重复请求
    requestDeduplication.cancelDuplicate(config)
    const source = axios.CancelToken.source()
    config.cancelToken = source.token
    requestDeduplication.recordRequest(config, source)

    return config
  },
  error => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 清除请求记录
    if (response.config) {
      requestDeduplication.clearRequest(response.config)
    }
    return response.data
  },
  async error => {
    // 清除请求记录
    if (error.config) {
      requestDeduplication.clearRequest(error.config)
    }

    // 重试逻辑
    try {
      return await retryInterceptor(error)
    } catch (retryError) {
      // 重试失败,处理错误
      if (axios.isCancel(retryError)) {
        // 请求被取消,不显示错误
        return Promise.reject(retryError)
      }

      if (retryError.response?.status === 401) {
        localStorage.removeItem('token')
        window.location.href = '/login'
      } else {
        ElMessage.error(retryError.response?.data?.message || '请求失败')
      }
      return Promise.reject(retryError)
    }
  }
)

// 通用 API 请求方法
export const api = {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.get(url, { ...config, retryConfig: { maxRetries: 2 } })
  },

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.post(url, data, config)
  },

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.put(url, data, config)
  },

  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.patch(url, data, config)
  },

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.delete(url, config)
  },
}

export default apiClient
```

---

## 四、实施计划

### Phase 2.1: 基础增强 (1-2天)

- [ ] 创建 `requestDeduplication.ts`
- [ ] 创建 `retryInterceptor.ts`
- [ ] 创建 `timeoutConfig.ts`
- [ ] 更新 `api.ts` 集成上述模块
- [ ] 编写单元测试

### Phase 2.2: 并发控制 (1天)

- [ ] 创建 `concurrencyControl.ts`
- [ ] 集成到请求拦截器
- [ ] 测试并发限制效果

### Phase 2.3: 监控与日志 (1天)

- [ ] 添加请求性能监控(耗时统计)
- [ ] 添加重试/取消日志
- [ ] 集成到前端监控系统

### Phase 2.4: 文档与培训 (0.5天)

- [ ] 编写前端请求治理规范文档
- [ ] 团队培训

---

## 五、验收标准

### 5.1 功能验收

- [ ] GET 请求失败自动重试(最多2次)
- [ ] 相同参数的 GET 请求在 pending 时复用
- [ ] 新请求发出时取消同一资源的旧请求
- [ ] 并发请求数不超过 10
- [ ] 不同接口类型使用不同的 timeout

### 5.2 性能验收

- [ ] 重试延迟符合指数退避(1s, 2s)
- [ ] 请求取消后不再占用网络资源
- [ ] 并发控制不影响正常请求响应时间

### 5.3 代码质量

- [ ] 所有新增代码有单元测试
- [ ] 符合 ESLint 规范
- [ ] TypeScript 类型完整

---

## 六、风险评估

| 风险             | 概率 | 影响 | 缓解措施                  |
| ---------------- | ---- | ---- | ------------------------- |
| 重试导致雪崩     | 低   | 高   | 仅 GET 可重试,指数退避    |
| 请求取消影响业务 | 中   | 中   | 白名单机制,关键请求不取消 |
| 并发控制过严     | 低   | 中   | 可配置化,按需调整         |
| 兼容性問題       | 低   | 低   | 充分测试,灰度发布         |

---

## 七、相关文档

- [API 性能配额规范](./04-API性能配额规范.md)
- [Phase 1 完成总结](./06-性能优化Phase1完成总结.md)

---

**文档结束**
