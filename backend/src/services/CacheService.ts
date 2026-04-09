import { cachePrefix, redisClient } from '../database/redis';
import { logger } from '../utils/logger';

/**
 * 缓存服务配置
 */
interface CacheOptions {
  ttl: number; // 过期时间（秒）
  prefix: string; // 缓存键前缀
}

/**
 * 缓存服务
 *
 * 提供统一的 Redis 缓存操作接口
 * 基于现有的 redisClient 封装
 *
 * @since 2026-04-01
 * @author 刘志高
 */
export class CacheService {
  /**
   * 获取缓存
   *
   * @param key 缓存键
   * @returns 缓存值，不存在时返回 null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = `${cachePrefix}${key}`;
      const cached = await redisClient.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error('[CacheService] Get cache failed', { key, error });
      return null; // 降级处理
    }
  }

  /**
   * 设置缓存
   *
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（秒），默认 3600 秒（1 小时）
   */
  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      const cacheKey = `${cachePrefix}${key}`;
      await redisClient.setex(cacheKey, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('[CacheService] Set cache failed', { key, error });
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 清除缓存
   *
   * @param pattern 缓存键模式（支持通配符）
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      const cachePattern = `${cachePrefix}${pattern}`;
      const keys = await redisClient.keys(cachePattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      logger.error('[CacheService] Invalidate cache failed', { pattern, error });
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 检查缓存是否存在
   *
   * @param key 缓存键
   * @returns 是否存在
   */
  async exists(key: string): Promise<boolean> {
    try {
      const cacheKey = `${cachePrefix}${key}`;
      const result = await redisClient.exists(cacheKey);
      return result > 0;
    } catch (error) {
      logger.error('[CacheService] Check cache exists failed', { key, error });
      return false;
    }
  }

  /**
   * 获取缓存（带默认值）
   *
   * @param key 缓存键
   * @param defaultValue 默认值
   * @returns 缓存值或默认值
   */
  async getOrDefault<T>(key: string, defaultValue: T): Promise<T> {
    const cached = await this.get<T>(key);
    return cached !== null ? cached : defaultValue;
  }

  /**
   * 设置缓存（带配置）
   *
   * @param key 缓存键
   * @param value 缓存值
   * @param options 缓存配置
   */
  async setWithOptions(key: string, value: any, options: CacheOptions): Promise<void> {
    const fullKey = options.prefix ? `${options.prefix}:${key}` : key;
    await this.set(fullKey, value, options.ttl);
  }

  /**
   * 获取缓存（带配置）
   *
   * @param key 缓存键
   * @param options 缓存配置
   * @returns 缓存值
   */
  async getWithOptions<T>(key: string, options: CacheOptions): Promise<T | null> {
    const fullKey = options.prefix ? `${options.prefix}:${key}` : key;
    return await this.get<T>(fullKey);
  }
}
