/**
 * 请求性能监控模块
 *
 * 功能:
 * 1. 统计每个请求的耗时
 * 2. 记录慢请求(超过阈值)
 * 3. 提供性能统计数据
 * 4. 支持性能告警
 */

import { logger } from '../utils/logger'

export interface RequestMetrics {
  requestId: number
  url: string
  method: string
  startTime: number
  endTime?: number
  duration?: number
  status?: number
  error?: string
}

export interface PerformanceStats {
  totalRequests: number
  avgDuration: number
  maxDuration: number
  minDuration: number
  slowRequests: number // 超过阈值的请求数
  errorRequests: number
}

class RequestPerformanceMonitor {
  private metrics: RequestMetrics[] = []
  private readonly slowThreshold: number // 慢请求阈值(毫秒)
  private readonly maxMetricsCount: number // 最大保留的记录数

  constructor(slowThreshold: number = 5000, maxMetricsCount: number = 1000) {
    this.slowThreshold = slowThreshold
    this.maxMetricsCount = maxMetricsCount
  }

  /**
   * 记录请求开始
   */
  startRequest(url: string, method: string): number {
    const requestId = Date.now() + Math.random()
    const metric: RequestMetrics = {
      requestId,
      url,
      method,
      startTime: Date.now(),
    }

    this.metrics.push(metric)

    // 限制记录数量,避免内存泄漏
    if (this.metrics.length > this.maxMetricsCount) {
      this.metrics.shift()
    }

    return requestId
  }

  /**
   * 记录请求结束
   */
  endRequest(requestId: number, status?: number, error?: string): void {
    const metric = this.metrics.find(m => m.requestId === requestId)

    if (!metric) {
      logger.warn(`[PerformanceMonitor] Metric not found for requestId: ${requestId}`)
      return
    }

    metric.endTime = Date.now()
    metric.duration = metric.endTime - metric.startTime
    metric.status = status
    if (error) {
      metric.error = error
    }

    // 检查是否为慢请求
    if (metric.duration && metric.duration > this.slowThreshold) {
      logger.warn(
        `[PerformanceMonitor] Slow request detected: ${metric.method} ${metric.url} took ${metric.duration}ms`
      )
    }

    // 检查是否出错
    if (error || (status && status >= 400)) {
      logger.error(`[PerformanceMonitor] Request failed: ${metric.method} ${metric.url}`, {
        status,
        duration: metric.duration,
        error,
      })
    }
  }

  /**
   * 获取性能统计
   */
  getStats(): PerformanceStats {
    const completedMetrics = this.metrics.filter(m => m.duration !== undefined)

    if (completedMetrics.length === 0) {
      return {
        totalRequests: 0,
        avgDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        slowRequests: 0,
        errorRequests: 0,
      }
    }

    const durations = completedMetrics.map(m => m.duration!)
    const totalDuration = durations.reduce((sum, d) => sum + d, 0)

    return {
      totalRequests: completedMetrics.length,
      avgDuration: Math.round(totalDuration / completedMetrics.length),
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      slowRequests: completedMetrics.filter(m => m.duration! > this.slowThreshold).length,
      errorRequests: completedMetrics.filter(m => m.error || (m.status && m.status >= 400)).length,
    }
  }

  /**
   * 获取最近的慢请求
   */
  getSlowRequests(limit: number = 10): RequestMetrics[] {
    return this.metrics
      .filter(m => m.duration && m.duration > this.slowThreshold)
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, limit)
  }

  /**
   * 获取最近的错误请求
   */
  getErrorRequests(limit: number = 10): RequestMetrics[] {
    return this.metrics.filter(m => m.error || (m.status && m.status >= 400)).slice(-limit)
  }

  /**
   * 清空统计数据
   */
  clear(): void {
    this.metrics = []
    logger.info('[PerformanceMonitor] Metrics cleared')
  }

  /**
   * 导出统计数据(用于上报)
   */
  exportMetrics(): RequestMetrics[] {
    return [...this.metrics]
  }
}

// 导出单例实例
export const performanceMonitor = new RequestPerformanceMonitor(5000, 1000)
