/**
 * 基于 Redis 的分布式互斥锁
 * 
 * 用于防止调度器任务重叠执行
 * 支持自动过期(防止死锁)
 */

import { redisClient } from '../database/redis';
import { logger } from '../utils/logger';

export class DistributedLock {
  /**
   * 尝试获取锁
   * 
   * @param lockKey - 锁的键名
   * @param ttlSeconds - 锁的过期时间(秒),默认1800秒(30分钟)
   * @returns 是否成功获取锁
   */
  static async acquire(lockKey: string, ttlSeconds: number = 1800): Promise<boolean> {
    try {
      // SET key value EX seconds NX (原子操作)
      const result = await redisClient.set(lockKey, '1', 'EX', ttlSeconds, 'NX');
      
      if (result === 'OK') {
        logger.debug(`[DistributedLock] Lock acquired: ${lockKey}, TTL=${ttlSeconds}s`);
        return true;
      }
      
      logger.info(`[DistributedLock] Lock already held: ${lockKey}`);
      return false;
    } catch (error) {
      logger.error(`[DistributedLock] Failed to acquire lock: ${lockKey}`, error);
      // 降级: Redis 失败时允许执行(避免单点故障)
      return true;
    }
  }

  /**
   * 释放锁
   * 
   * @param lockKey - 锁的键名
   */
  static async release(lockKey: string): Promise<void> {
    try {
      await redisClient.del(lockKey);
      logger.debug(`[DistributedLock] Lock released: ${lockKey}`);
    } catch (error) {
      logger.error(`[DistributedLock] Failed to release lock: ${lockKey}`, error);
    }
  }

  /**
   * 检查锁是否被持有
   * 
   * @param lockKey - 锁的键名
   * @returns 是否被持有
   */
  static async isLocked(lockKey: string): Promise<boolean> {
    try {
      const exists = await redisClient.exists(lockKey);
      return exists > 0;
    } catch (error) {
      logger.error(`[DistributedLock] Failed to check lock: ${lockKey}`, error);
      return false;
    }
  }

  /**
   * 带锁执行函数
   * 
   * @param lockKey - 锁的键名
   * @param taskFn - 要执行的任务函数
   * @param ttlSeconds - 锁的过期时间(秒)
   * @param skipIfLocked - 如果锁已被持有是否跳过执行(默认true)
   * @returns 任务执行结果,如果跳过则返回 null
   */
  static async executeWithLock<T>(
    lockKey: string,
    taskFn: () => Promise<T>,
    ttlSeconds: number = 1800,
    skipIfLocked: boolean = true
  ): Promise<T | null> {
    const acquired = await this.acquire(lockKey, ttlSeconds);
    
    if (!acquired) {
      if (skipIfLocked) {
        logger.info(`[DistributedLock] Task skipped (lock held): ${lockKey}`);
        return null;
      } else {
        // 等待锁释放(最多等待ttlSeconds)
        logger.warn(`[DistributedLock] Waiting for lock: ${lockKey}`);
        await this.waitForLock(lockKey, ttlSeconds);
      }
    }
    
    try {
      const result = await taskFn();
      return result;
    } finally {
      await this.release(lockKey);
    }
  }

  /**
   * 等待锁释放
   * 
   * @param lockKey - 锁的键名
   * @param maxWaitSeconds - 最大等待时间(秒)
   * @param pollIntervalMs - 轮询间隔(毫秒)
   */
  private static async waitForLock(
    lockKey: string,
    maxWaitSeconds: number = 1800,
    pollIntervalMs: number = 1000
  ): Promise<void> {
    const startTime = Date.now();
    const maxWaitMs = maxWaitSeconds * 1000;
    
    while (Date.now() - startTime < maxWaitMs) {
      const locked = await this.isLocked(lockKey);
      if (!locked) {
        logger.info(`[DistributedLock] Lock released, proceeding: ${lockKey}`);
        return;
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
    }
    
    throw new Error(`[DistributedLock] Timeout waiting for lock: ${lockKey}`);
  }
}

/**
 * 生成调度器锁键
 * 
 * @param schedulerName - 调度器名称
 * @param date - 日期(可选,用于按天隔离)
 * @returns 锁键
 */
export function generateSchedulerLockKey(schedulerName: string, date?: Date): string {
  const dateStr = date ? date.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
  return `scheduler:lock:${schedulerName}:${dateStr}`;
}
