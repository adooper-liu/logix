/**
 * 请求去重与取消模块
 *
 * 功能:
 * 1. 相同参数的 GET 请求在 pending 时复用
 * 2. 新请求发出时自动取消同一资源的旧请求
 * 3. 防止重复请求浪费网络资源
 */

import { type InternalAxiosRequestConfig, CancelTokenSource } from 'axios'

class RequestDeduplication {
  private pendingRequests = new Map<string, CancelTokenSource>()

  /**
   * 生成请求唯一键
   *
   * @param config - Axios 请求配置
   * @returns 唯一键字符串
   */
  generateKey(config: InternalAxiosRequestConfig): string {
    const { method, url, params, data } = config
    return `${method}:${url}:${JSON.stringify(params || {})}:${JSON.stringify(data || {})}`
  }

  /**
   * 检查并取消重复请求
   *
   * @param config - Axios 请求配置
   */
  cancelDuplicate(config: InternalAxiosRequestConfig): void {
    if ((config.method || 'GET').toUpperCase() !== 'GET') {
      return
    }
    const key = this.generateKey(config)

    if (this.pendingRequests.has(key)) {
      // 取消之前的请求
      const source = this.pendingRequests.get(key)!
      source.cancel(`[RequestDedup] Canceled duplicate request: ${key}`)
      this.pendingRequests.delete(key)
    }
  }

  /**
   * 记录请求
   *
   * @param config - Axios 请求配置
   * @param source - CancelToken 源
   */
  recordRequest(config: InternalAxiosRequestConfig, source: CancelTokenSource): void {
    if ((config.method || 'GET').toUpperCase() !== 'GET') {
      return
    }
    const key = this.generateKey(config)
    this.pendingRequests.set(key, source)
  }

  /**
   * 清除请求记录
   *
   * @param config - Axios 请求配置
   */
  clearRequest(config: InternalAxiosRequestConfig): void {
    if ((config.method || 'GET').toUpperCase() !== 'GET') {
      return
    }
    const key = this.generateKey(config)
    this.pendingRequests.delete(key)
  }

  /**
   * 清除所有请求
   */
  clearAll(): void {
    this.pendingRequests.forEach(source => source.cancel('[RequestDedup] Canceled all requests'))
    this.pendingRequests.clear()
  }

  /**
   * 获取 pending 请求数量
   */
  getPendingCount(): number {
    return this.pendingRequests.size
  }
}

export const requestDeduplication = new RequestDeduplication()
