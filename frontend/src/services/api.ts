import { useAppStore } from '@/store/app'
import axios, {
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { ElMessage } from 'element-plus'
import { apiClient } from './axiosBase'
import { concurrencyControl } from './concurrencyControl'
import { performanceMonitor } from './performanceMonitor'
import { requestDeduplication } from './requestDeduplication'
import { retryInterceptor, type RetryConfig } from './retryInterceptor'
import { getTimeoutByUrl } from './timeoutConfig'

// 扩展 AxiosRequestConfig 类型
declare module 'axios' {
  interface AxiosRequestConfig {
    retryConfig?: RetryConfig
    retryCount?: number
    _manualTimeout?: boolean
  }
}

// 请求拦截器（仅对通过 `@/services/api` 发起的请求生效）
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 0. 性能监控 - 记录请求开始
    if (config.url) {
      const requestId = performanceMonitor.startRequest(
        config.url,
        config.method?.toUpperCase() || 'GET'
      )
      // 将 requestId 挂载到 config 上,供响应拦截器使用
      ;(config as any)._performanceRequestId = requestId
    }

    // 1. Token + 国家代码
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const appStore = useAppStore()
    if (appStore.scopedCountryCode) {
      config.headers['X-Country-Code'] = appStore.scopedCountryCode
    }

    // 2. 动态超时（实例默认 timeout=10000 时仍按 URL 自动分级；仅显式传 timeout 时跳过）
    if (!(config as AxiosRequestConfig)._manualTimeout && config.url) {
      config.timeout = getTimeoutByUrl(config.url)
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

// 并发控制适配器(在请求发送前拦截)
const originalAdapter = apiClient.defaults.adapter
apiClient.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
  // 使用并发控制包装请求
  return concurrencyControl.enqueue(config, () => {
    // 使用原始 adapter 发送请求
    if (typeof originalAdapter === 'function') {
      return originalAdapter(config)
    }
    // 如果没有原始 adapter,使用默认的 axios adapter
    return axios.getAdapter(axios.defaults.adapter!)(config)
  })
}

// 响应拦截器
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 清除请求记录
    if (response.config) {
      requestDeduplication.clearRequest(response.config as InternalAxiosRequestConfig)
    }

    // 性能监控 - 记录请求结束
    const config = response.config as any
    if (config._performanceRequestId) {
      performanceMonitor.endRequest(config._performanceRequestId, response.status)
    }

    return response.data
  },
  async error => {
    // 清除请求记录
    if (error.config) {
      requestDeduplication.clearRequest(error.config as InternalAxiosRequestConfig)
    }

    // 性能监控 - 记录请求失败
    const config = error.config as any
    if (config && config._performanceRequestId) {
      performanceMonitor.endRequest(
        config._performanceRequestId,
        error.response?.status,
        error.message
      )
    }

    // 重试逻辑
    try {
      return await retryInterceptor(error)
    } catch (retryError: any) {
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
    return apiClient.get(url, {
      ...config,
      _manualTimeout: config?.timeout !== undefined,
      retryConfig: {
        maxRetries: 2,
        retryDelay: 1000,
        retryableMethods: ['GET'],
        retryableStatuses: [408, 429, 500, 502, 503, 504],
      },
    })
  },

  post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.post(url, data, {
      ...config,
      _manualTimeout: config?.timeout !== undefined,
    })
  },

  put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.put(url, data, {
      ...config,
      _manualTimeout: config?.timeout !== undefined,
    })
  },

  patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.patch(url, data, {
      ...config,
      _manualTimeout: config?.timeout !== undefined,
    })
  },

  delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return apiClient.delete(url, {
      ...config,
      _manualTimeout: config?.timeout !== undefined,
    })
  },
}

// 导出工具函数
export { concurrencyControl } from './concurrencyControl'
export { performanceMonitor } from './performanceMonitor'
export { requestDeduplication } from './requestDeduplication'
export { TIMEOUT_CONFIG } from './timeoutConfig'

export default apiClient
