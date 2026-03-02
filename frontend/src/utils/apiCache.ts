import { ref, type Ref } from 'vue'

/**
 * API缓存键类型
 */
export type CacheKey = string

/**
 * 缓存项接口
 */
interface CacheItem<T> {
  data: T
  timestamp: number
  expires: number // 过期时间（毫秒）
}

/**
 * 缓存配置接口
 */
export interface CacheConfig {
  ttl?: number // 缓存时间（毫秒），默认5分钟
  enabled?: boolean // 是否启用缓存，默认true
}

/**
 * 默认缓存配置
 */
const DEFAULT_CONFIG: Required<CacheConfig> = {
  ttl: 5 * 60 * 1000, // 5分钟
  enabled: true
}

/**
 * 内存缓存存储
 */
const memoryCache = new Map<CacheKey, CacheItem<any>>()

/**
 * 持久化缓存前缀
 */
const STORAGE_PREFIX = 'api_cache_'

/**
 * API缓存工具类
 */
export class ApiCache {
  private config: Required<CacheConfig>

  constructor(config: CacheConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param config 可选配置（覆盖实例配置）
   */
  set<T>(key: CacheKey, data: T, config?: CacheConfig): void {
    if (!this.config.enabled && !config?.enabled) return

    const cacheConfig = config ? { ...DEFAULT_CONFIG, ...config } : this.config
    const cacheItem: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      expires: cacheConfig.ttl
    }

    // 内存缓存
    memoryCache.set(key, cacheItem)

    // 持久化缓存（仅存储数据，不存储元数据）
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`
      localStorage.setItem(storageKey, JSON.stringify({
        data,
        expires: Date.now() + cacheConfig.ttl
      }))
    } catch (error) {
      console.warn('LocalStorage缓存写入失败:', error)
    }
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据或null
   */
  get<T>(key: CacheKey): T | null {
    if (!this.config.enabled) return null

    // 先从内存缓存获取
    const memoryItem = memoryCache.get(key)
    if (memoryItem) {
      if (Date.now() - memoryItem.timestamp < memoryItem.expires) {
        return memoryItem.data as T
      } else {
        memoryCache.delete(key) // 过期删除
      }
    }

    // 从持久化缓存获取
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`
      const storageData = localStorage.getItem(storageKey)
      if (storageData) {
        const parsed = JSON.parse(storageData)
        if (Date.now() < parsed.expires) {
          // 回写到内存缓存
          memoryCache.set(key, {
            data: parsed.data,
            timestamp: Date.now(),
            expires: parsed.expires - Date.now()
          })
          return parsed.data as T
        } else {
          localStorage.removeItem(storageKey) // 过期删除
        }
      }
    } catch (error) {
      console.warn('LocalStorage缓存读取失败:', error)
    }

    return null
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: CacheKey): void {
    memoryCache.delete(key)
    try {
      const storageKey = `${STORAGE_PREFIX}${key}`
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.warn('LocalStorage缓存删除失败:', error)
    }
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    memoryCache.clear()
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(STORAGE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('LocalStorage缓存清除失败:', error)
    }
  }

  /**
   * 按前缀清除缓存
   * @param prefix 缓存键前缀
   */
  clearByPrefix(prefix: string): void {
    // 清除内存缓存
    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key)
      }
    }

    // 清除持久化缓存
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(`${STORAGE_PREFIX}${prefix}`)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('LocalStorage缓存清除失败:', error)
    }
  }

  /**
   * 检查缓存是否存在且有效
   * @param key 缓存键
   * @returns 是否有效
   */
  has(key: CacheKey): boolean {
    return this.get(key) !== null
  }

  /**
   * 获取缓存统计信息
   * @returns 统计信息
   */
  getStats(): { memorySize: number; storageSize: number } {
    let storageSize = 0
    try {
      const keys = Object.keys(localStorage)
      storageSize = keys.filter(key => key.startsWith(STORAGE_PREFIX)).length
    } catch (error) {
      console.warn('LocalStorage缓存统计失败:', error)
    }

    return {
      memorySize: memoryCache.size,
      storageSize
    }
  }
}

/**
 * 创建缓存实例
 */
export const createApiCache = (config?: CacheConfig): ApiCache => {
  return new ApiCache(config)
}

/**
 * 默认全局缓存实例
 */
export const globalApiCache = createApiCache({
  ttl: 5 * 60 * 1000 // 5分钟
})

/**
 * 带缓存的API请求封装
 * @param key 缓存键
 * @param fetcher 数据获取函数
 * @param config 缓存配置
 * @returns Promise<T>
 */
export async function fetchWithCache<T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  config?: CacheConfig
): Promise<T> {
  const cache = config ? createApiCache(config) : globalApiCache

  // 尝试从缓存获取
  const cachedData = cache.get<T>(key)
  if (cachedData !== null) {
    console.log(`[API Cache] 命中缓存: ${key}`)
    return cachedData
  }

  // 缓存未命中，发起请求
  console.log(`[API Cache] 缓存未命中: ${key}`)
  const freshData = await fetcher()
  cache.set(key, freshData, config)
  return freshData
}

/**
 * Vue 3 组合式API - useApiCache
 * @param config 缓存配置
 * @returns 缓存工具和方法
 */
export function useApiCache(config?: CacheConfig) {
  const cache = createApiCache(config)
  const cacheKey = ref<string>('')
  const cacheData = ref<any>(null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * 带缓存的数据获取
   */
  const fetchData = async <T>(
    key: string,
    fetcher: () => Promise<T>,
    fetchConfig?: CacheConfig
  ): Promise<T | null> => {
    cacheKey.value = key
    isLoading.value = true
    error.value = null

    try {
      // 尝试从缓存获取
      const cached = cache.get<T>(key)
      if (cached !== null) {
        cacheData.value = cached
        return cached
      }

      // 缓存未命中，发起请求
      const freshData = await fetcher()
      cache.set(key, freshData, fetchConfig)
      cacheData.value = freshData
      return freshData
    } catch (err) {
      error.value = err as Error
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 手动清除缓存
   */
  const clearCache = () => {
    if (cacheKey.value) {
      cache.delete(cacheKey.value)
      cacheData.value = null
    }
  }

  /**
   * 手动刷新数据
   */
  const refreshData = async <T>(
    fetcher: () => Promise<T>,
    fetchConfig?: CacheConfig
  ): Promise<T | null> => {
    if (cacheKey.value) {
      cache.delete(cacheKey.value)
    }
    return await fetchData(cacheKey.value, fetcher, fetchConfig)
  }

  return {
    cache,
    cacheKey,
    cacheData: cacheData as Ref<any>,
    isLoading,
    error,
    fetchData,
    clearCache,
    refreshData
  }
}
