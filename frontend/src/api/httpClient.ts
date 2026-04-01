/**
 * HTTP客户端 - 集成缓存功能
 */
import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'
import { fetchWithCache, globalApiCache } from '@/utils/apiCache'
import type { CacheConfig } from '@/utils/apiCache'
import { useAppStore } from '@/store/app'

/**
 * API配置接口
 */
export interface ApiConfig extends AxiosRequestConfig {
  useCache?: boolean // 是否使用缓存
  cacheKey?: string // 缓存键
  cacheConfig?: CacheConfig // 缓存配置
}

/**
 * HTTP响应接口
 */
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
  timestamp: number
}

/**
 * HTTP客户端类
 */
export class HttpClient {
  private instance: AxiosInstance
  private baseURL: string
  private timeout: number

  constructor(config: { baseURL?: string; timeout?: number } = {}) {
    this.baseURL = config.baseURL || 'http://localhost:3001/api'
    this.timeout = config.timeout || 30000

    this.instance = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  /**
   * 设置拦截器
   */
  private setupInterceptors() {
    // 请求拦截器
    this.instance.interceptors.request.use(
      config => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        const appStore = useAppStore()
        if (appStore.scopedCountryCode) {
          config.headers['X-Country-Code'] = appStore.scopedCountryCode
        }
        ;(config as any).metadata = { startTime: Date.now() }
        return config
      },
      error => {
        console.error('请求错误:', error)
        return Promise.reject(error)
      }
    )

    // 响应拦截器
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        const { config } = response
        const endTime = Date.now()
        const duration = endTime - ((config as any).metadata?.startTime || endTime)

        console.log(`[HTTP] ${config.method?.toUpperCase()} ${config.url} - ${duration}ms`)

        // 统一响应格式处理
        const apiResponse = response.data as ApiResponse

        if (apiResponse.code === 200 || response.status === 200) {
          return response.data
        } else {
          ElMessage.error(apiResponse.message || '请求失败')
          return Promise.reject(new Error(apiResponse.message || '请求失败'))
        }
      },
      error => {
        console.error('响应错误:', error)

        if (error.response) {
          const { status, data } = error.response

          switch (status) {
            case 401:
              ElMessage.error('未授权，请重新登录')
              localStorage.removeItem('token')
              window.location.href = '/login'
              break
            case 403:
              ElMessage.error('无权限访问')
              break
            case 404:
              ElMessage.error('请求的资源不存在')
              break
            case 500:
              ElMessage.error('服务器错误')
              break
            default:
              ElMessage.error(data.message || '请求失败')
          }
        } else if (error.request) {
          ElMessage.error('网络错误，请检查网络连接')
        } else {
          ElMessage.error('请求配置错误')
        }

        return Promise.reject(error)
      }
    )
  }

  /**
   * GET请求
   */
  async get<T = any>(url: string, config?: ApiConfig): Promise<T> {
    const { useCache, cacheKey, cacheConfig, ...axiosConfig } = config || {}

    if (useCache) {
      const key = cacheKey || `GET:${url}:${JSON.stringify(axiosConfig.params)}`
      return fetchWithCache(
        key,
        () => this.instance.get(url, axiosConfig).then(res => res.data as T),
        cacheConfig
      )
    }

    const response = await this.instance.get<ApiResponse<T>>(url, axiosConfig)
    return response.data as T
  }

  /**
   * POST请求
   */
  async post<T = any>(url: string, data?: any, config?: ApiConfig): Promise<T> {
    const { useCache, cacheKey, cacheConfig, ...axiosConfig } = config || {}

    if (useCache) {
      const key = cacheKey || `POST:${url}:${JSON.stringify(data)}`
      return fetchWithCache(
        key,
        () => this.instance.post(url, data, axiosConfig).then(res => res.data as T),
        cacheConfig
      )
    }

    const response = await this.instance.post<ApiResponse<T>>(url, data, axiosConfig)
    return response.data as T
  }

  /**
   * PUT请求
   */
  async put<T = any>(url: string, data?: any, config?: ApiConfig): Promise<T> {
    const response = await this.instance.put<ApiResponse<T>>(url, data, config)
    return response.data as T
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(url: string, config?: ApiConfig): Promise<T> {
    const response = await this.instance.delete<ApiResponse<T>>(url, config)
    return response.data as T
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(url: string, data?: any, config?: ApiConfig): Promise<T> {
    const response = await this.instance.patch<ApiResponse<T>>(url, data, config)
    return response.data as T
  }

  /**
   * 批量请求
   */
  async all<T = any>(requests: Array<Promise<T>>): Promise<T[]> {
    return Promise.all(requests)
  }

  /**
   * 清除指定前缀的缓存
   */
  clearCache(prefix: string): void {
    globalApiCache.clearByPrefix(prefix)
  }

  /**
   * 清除所有缓存
   */
  clearAllCache(): void {
    globalApiCache.clear()
  }
}

/**
 * 创建HTTP客户端实例
 */
export const httpClient = new HttpClient({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 30000,
})

/**
 * 导出实例
 */
export default httpClient
