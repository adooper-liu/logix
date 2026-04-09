/**
 * 并发控制模块
 *
 * 功能:
 * 1. 限制同一域名最大并发请求数(默认10)
 * 2. 超出限制的请求进入队列等待
 * 3. 请求完成后自动处理队列中的下一个请求
 * 4. 支持动态调整并发上限
 */

import type { InternalAxiosRequestConfig } from 'axios'
import { logger } from '../utils/logger'
import { apiClient } from './axiosBase'

interface QueuedRequest {
  config: InternalAxiosRequestConfig
  resolve: (value: any) => void
  reject: (reason?: any) => void
  timestamp: number
}

class ConcurrencyControl {
  private activeRequests = 0
  private maxConcurrent: number
  private readonly queue: QueuedRequest[] = []
  private readonly domainActiveRequests = new Map<string, number>()

  constructor(maxConcurrent: number = 10) {
    this.maxConcurrent = maxConcurrent
  }

  /**
   * 提取请求的域名
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin)
      return urlObj.hostname
    } catch {
      // 相对路径,使用默认域名
      return window.location.hostname || 'default'
    }
  }

  /**
   * 获取域名的当前活跃请求数
   */
  private getDomainActiveCount(domain: string): number {
    return this.domainActiveRequests.get(domain) || 0
  }

  /**
   * 增加域名的活跃请求计数
   */
  private incrementDomainCount(domain: string): void {
    const count = this.getDomainActiveCount(domain)
    this.domainActiveRequests.set(domain, count + 1)
  }

  /**
   * 减少域名的活跃请求计数
   */
  private decrementDomainCount(domain: string): void {
    const count = this.getDomainActiveCount(domain)
    if (count > 0) {
      this.domainActiveRequests.set(domain, count - 1)
    }
  }

  /**
   * 检查是否可以执行请求
   */
  private canExecute(domain: string): boolean {
    // 全局并发限制
    if (this.activeRequests >= this.maxConcurrent) {
      return false
    }

    // 单域名并发限制(每个域名最多5个并发)
    const domainLimit = Math.max(5, Math.floor(this.maxConcurrent / 2))
    if (this.getDomainActiveCount(domain) >= domainLimit) {
      return false
    }

    return true
  }

  /**
   * 添加请求到队列或直接执行
   */
  async enqueue<T>(config: InternalAxiosRequestConfig, executor: () => Promise<T>): Promise<T> {
    const domain = this.extractDomain(config.url || '')

    // 如果可以执行,直接执行
    if (this.canExecute(domain)) {
      return this.executeWithTracking<T>(domain, executor)
    }

    // 否则加入队列等待
    logger.debug(
      `[ConcurrencyControl] Request queued for ${domain} (active: ${this.activeRequests}, queue: ${this.queue.length})`
    )

    return new Promise((resolve, reject) => {
      this.queue.push({
        config,
        resolve,
        reject,
        timestamp: Date.now(),
      })
    })
  }

  /**
   * 执行请求并跟踪状态
   */
  private async executeWithTracking<T>(domain: string, executor: () => Promise<T>): Promise<T> {
    this.activeRequests++
    this.incrementDomainCount(domain)

    try {
      const result = await executor()
      return result
    } finally {
      this.activeRequests--
      this.decrementDomainCount(domain)

      // 处理队列中的下一个请求
      this.processQueue()
    }
  }

  /**
   * 处理队列中的下一个请求
   */
  private processQueue(): void {
    if (this.queue.length === 0) {
      return
    }

    // 找到可以执行的请求
    for (let i = 0; i < this.queue.length; i++) {
      const queued = this.queue[i]
      const domain = this.extractDomain(queued.config.url || '')

      if (this.canExecute(domain)) {
        // 从队列中移除
        this.queue.splice(i, 1)

        // 计算等待时间
        const waitTime = Date.now() - queued.timestamp
        logger.info(
          `[ConcurrencyControl] Processing queued request for ${domain} (waited: ${waitTime}ms)`
        )

        // 执行请求(使用 apiClient 避免循环依赖)
        this.executeWithTracking(domain, () => apiClient.request(queued.config))
          .then(queued.resolve)
          .catch(queued.reject)

        return
      }
    }
  }

  /**
   * 设置最大并发数
   */
  setMaxConcurrent(max: number): void {
    if (max < 1) {
      throw new Error('Max concurrent must be at least 1')
    }
    this.maxConcurrent = max
    logger.info(`[ConcurrencyControl] Max concurrent updated to ${max}`)

    // 尝试处理队列
    this.processQueue()
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    activeRequests: number
    queuedRequests: number
    maxConcurrent: number
    domainStats: Map<string, number>
  } {
    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      domainStats: new Map(this.domainActiveRequests),
    }
  }

  /**
   * 清空队列(取消所有等待的请求)
   */
  clearQueue(): void {
    this.queue.forEach(queued => {
      queued.reject(new Error('[ConcurrencyControl] Request canceled due to queue cleared'))
    })
    this.queue.length = 0
    logger.warn('[ConcurrencyControl] Queue cleared')
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * 获取活跃请求数
   */
  getActiveRequests(): number {
    return this.activeRequests
  }
}

// 导出单例实例
export const concurrencyControl = new ConcurrencyControl(10)
