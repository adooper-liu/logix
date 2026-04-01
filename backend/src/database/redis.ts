/**
 * Redis 初始化
 * Redis Initialization
 */

import Redis from 'ioredis';
import { redisConfig } from '../config/database.config';
import { logger } from '../utils/logger';

export const redisClient = new Redis({
  host: redisConfig.host,
  port: redisConfig.port,
  password: redisConfig.password,
  db: redisConfig.db,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// 缓存前缀
export const cachePrefix = 'logix:';

// Redis 事件监听
redisClient.on('connect', () => {
  logger.info('✅ Redis connected successfully', {
    host: redisConfig.host,
    port: redisConfig.port
  });
});

redisClient.on('ready', () => {
  logger.info('✅ Redis ready to use');
});

redisClient.on('error', (error) => {
  logger.error('❌ Redis connection failed', { error: error.message });
});

redisClient.on('close', () => {
  logger.warn('⚠️  Redis connection closed');
});

redisClient.on('reconnecting', () => {
  logger.info('🔄 Redis reconnecting...');
});

/**
 * 设置缓存
 */
export const setCache = async (key: string, value: any, ttl: number = 3600): Promise<void> => {
  const cacheKey = `${cachePrefix}${key}`;
  await redisClient.setex(cacheKey, ttl, JSON.stringify(value));
};

/**
 * 获取缓存
 */
export const getCache = async <T>(key: string): Promise<T | null> => {
  const cacheKey = `${cachePrefix}${key}`;
  const cached = await redisClient.get(cacheKey);

  if (!cached) {
    return null;
  }

  try {
    return JSON.parse(cached) as T;
  } catch (error) {
    logger.error('Failed to parse cached data', { key, error });
    return null;
  }
};

/**
 * 删除缓存
 */
export const deleteCache = async (key: string): Promise<void> => {
  const cacheKey = `${cachePrefix}${key}`;
  await redisClient.del(cacheKey);
};

/**
 * 删除匹配模式的缓存
 */
export const deleteCachePattern = async (pattern: string): Promise<void> => {
  const cachePattern = `${cachePrefix}${pattern}`;
  const keys = await redisClient.keys(cachePattern);

  if (keys.length > 0) {
    await redisClient.del(...keys);
  }
};

/**
 * 关闭 Redis 连接
 */
export const closeRedis = async (): Promise<void> => {
  await redisClient.quit();
  logger.info('✅ Redis connection closed');
};
