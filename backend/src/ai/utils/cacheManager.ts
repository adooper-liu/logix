/**
 * 缓存管理器
 * Cache Manager
 * 
 * 缓存查询结果和AI响应，减少重复查询
 */

import { logger } from '../../utils/logger';

/**
 * 缓存项
 */
export interface CacheItem {
  key: string;
  value: any;
  expiresAt: number;
  createdAt: number;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  defaultTTL: number; // 默认过期时间（毫秒）
  maxSize: number; // 最大缓存项数量
  cleanupInterval: number; // 清理间隔（毫秒）
}

/**
 * 默认缓存配置
 */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5分钟
  maxSize: 1000, // 最多缓存1000个项
  cleanupInterval: 10 * 60 * 1000 // 每10分钟清理一次过期项
};

/**
 * 缓存管理器类
 */
export class CacheManager {
  private cache: Map<string, CacheItem>;
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: CacheConfig) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.cache = new Map();
    this.startCleanupTimer();
  }

  /**
   * 生成缓存键
   */
  generateKey(prefix: string, ...args: any[]): string {
    const normalizedArgs = args.map(arg => {
      if (typeof arg === 'object' && arg !== null) {
        return JSON.stringify(arg);
      }
      return arg.toString();
    });
    return `${prefix}:${normalizedArgs.join(':')}`;
  }

  /**
   * 设置缓存
   */
  set(key: string, value: any, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
    const cacheItem: CacheItem = {
      key,
      value,
      expiresAt,
      createdAt: Date.now()
    };

    // 检查缓存大小
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, cacheItem);
    logger.debug(`[CacheManager] Set cache for key: ${key}, expires in ${(expiresAt - Date.now()) / 1000}s`);
  }

  /**
   * 获取缓存
   */
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      logger.debug(`[CacheManager] Cache expired for key: ${key}`);
      return null;
    }

    logger.debug(`[CacheManager] Cache hit for key: ${key}`);
    return item.value;
  }

  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`[CacheManager] Delete cache for key: ${key}`);
    }
    return deleted;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    logger.debug('[CacheManager] Clear all cache');
  }

  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * 驱逐最旧的缓存项
   */
  private evictOldest(): void {
    if (this.cache.size === 0) return;

    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, item] of this.cache.entries()) {
      if (item.createdAt < oldestTime) {
        oldestTime = item.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      logger.debug(`[CacheManager] Evicted oldest cache item: ${oldestKey}`);
    }
  }

  /**
   * 清理过期缓存
   */
  cleanup(): void {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      logger.debug(`[CacheManager] Cleanup: deleted ${deletedCount} expired items`);
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 停止清理定时器
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * 缓存SQL查询结果
   */
  cacheSqlQuery(sql: string, result: any, ttl?: number): void {
    const key = this.generateKey('sql', sql);
    this.set(key, result, ttl);
  }

  /**
   * 获取缓存的SQL查询结果
   */
  getCachedSqlQuery(sql: string): any | null {
    const key = this.generateKey('sql', sql);
    return this.get(key);
  }

  /**
   * 缓存AI聊天响应
   */
  cacheChatResponse(message: string, context: any, response: any, ttl?: number): void {
    const key = this.generateKey('chat', message, context);
    this.set(key, response, ttl);
  }

  /**
   * 获取缓存的AI聊天响应
   */
  getCachedChatResponse(message: string, context: any): any | null {
    const key = this.generateKey('chat', message, context);
    return this.get(key);
  }

  /**
   * 缓存数据库结构
   */
  cacheSchemaDescription(description: string, ttl?: number): void {
    const key = this.generateKey('schema');
    this.set(key, description, ttl);
  }

  /**
   * 获取缓存的数据库结构
   */
  getCachedSchemaDescription(): string | null {
    const key = this.generateKey('schema');
    return this.get(key);
  }

  /**
   * 缓存知识库搜索结果
   */
  cacheKnowledgeSearch(keyword: string, results: any[], ttl?: number): void {
    const key = this.generateKey('knowledge', keyword);
    this.set(key, results, ttl);
  }

  /**
   * 获取缓存的知识库搜索结果
   */
  getCachedKnowledgeSearch(keyword: string): any[] | null {
    const key = this.generateKey('knowledge', keyword);
    return this.get(key);
  }
}

/**
 * 默认缓存管理器实例
 */
export const cacheManager = new CacheManager();
