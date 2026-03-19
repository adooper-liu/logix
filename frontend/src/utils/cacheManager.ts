/**
 * 缓存管理器
 * Cache Manager
 * 用于管理缓存的创建、获取和清除
 */

import { withCache } from './cache';

// 缓存键前缀
const CACHE_PREFIX = 'logix_cache_';

// 缓存分组
const CACHE_GROUPS = {
  CONTAINERS: 'containers',
  STATISTICS: 'statistics',
  COUNTRIES: 'countries',
  SCHEDULING: 'scheduling'
};

/**
 * 生成带前缀的缓存键
 */
export function generateCacheKey(group: string, key: string): string {
  return `${CACHE_PREFIX}${group}:${key}`;
}

/**
 * 清除指定分组的所有缓存
 */
export function clearCacheByGroup(group: string): void {
  try {
    const keysToRemove: string[] = [];
    
    // 遍历localStorage，找出指定分组的缓存
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${CACHE_PREFIX}${group}:`)) {
        keysToRemove.push(key);
      }
    }
    
    // 清除找到的缓存
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log(`[CacheManager] Cleared cache for group: ${group}`);
  } catch (error) {
    console.warn('[CacheManager] Failed to clear cache:', error);
  }
}

/**
 * 清除所有缓存
 */
export function clearAllCache(): void {
  try {
    const keysToRemove: string[] = [];
    
    // 遍历localStorage，找出所有logix缓存
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    // 清除找到的缓存
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('[CacheManager] Cleared all cache');
  } catch (error) {
    console.warn('[CacheManager] Failed to clear all cache:', error);
  }
}

/**
 * 创建带分组的缓存函数
 */
export function createCachedFunction<T extends (...args: any[]) => Promise<any>>(
  group: string,
  fn: T,
  keyGenerator: (...args: Parameters<T>) => string,
  ttl: number
): T {
  return withCache(
    fn,
    (...args) => generateCacheKey(group, keyGenerator(...args)),
    ttl
  );
}

/**
 * 缓存管理器实例
 */
export const cacheManager = {
  // 清除容器相关缓存
  clearContainersCache: () => clearCacheByGroup(CACHE_GROUPS.CONTAINERS),
  
  // 清除统计相关缓存
  clearStatisticsCache: () => clearCacheByGroup(CACHE_GROUPS.STATISTICS),
  
  // 清除国家相关缓存
  clearCountriesCache: () => clearCacheByGroup(CACHE_GROUPS.COUNTRIES),
  
  // 清除排产相关缓存
  clearSchedulingCache: () => clearCacheByGroup(CACHE_GROUPS.SCHEDULING),
  
  // 清除所有缓存
  clearAll: clearAllCache,
  
  // 创建缓存函数
  createCachedFunction
};

export default cacheManager;