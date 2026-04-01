/**
 * 简单的内存缓存工具
 * Simple in-memory cache utility
 */

interface CacheItem {
  data: any
  timestamp: number
  expiry: number
}

class Cache {
  private cache: Map<string, CacheItem> = new Map()

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param expiry 过期时间（毫秒）
   */
  set(key: string, data: any, expiry: number = 60000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry,
    })
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据，如果过期或不存在则返回 null
   */
  get(key: string): any | null {
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > item.expiry) {
      this.cache.delete(key)
      return null
    }

    return item.data
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  delete(key: string): void {
    this.cache.delete(key)
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 生成缓存键
   * @param prefix 前缀
   * @param params 参数
   * @returns 缓存键
   */
  generateKey(prefix: string, params: any): string {
    const paramsStr = JSON.stringify(params)
    return `${prefix}:${paramsStr}`
  }
}

// 导出单例
export const cache = new Cache()

/**
 * 带缓存的异步函数包装器
 * @param fn 异步函数
 * @param key 缓存键或生成缓存键的函数
 * @param expiry 过期时间（毫秒）
 * @returns 包装后的函数
 */
export function withCache<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  key: string | ((...args: Parameters<T>) => string),
  expiry: number = 60000
): T {
  return ((...args: Parameters<T>) => {
    const cacheKey = typeof key === 'function' ? key(...args) : key
    const cachedData = cache.get(cacheKey)

    if (cachedData) {
      return Promise.resolve(cachedData)
    }

    return fn(...args).then(data => {
      cache.set(cacheKey, data, expiry)
      return data
    })
  }) as T
}
