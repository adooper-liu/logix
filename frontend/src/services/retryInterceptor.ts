/**
 * 请求重试拦截器
 *
 * 功能:
 * 1. GET 请求失败自动重试(最多2次)
 * 2. 指数退避延迟(1s, 2s, 4s...)
 * 3. 仅对网络相关错误重试(408, 429, 500, 502, 503, 504)
 */

import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { logger } from '../utils/logger'
import { apiClient } from './axiosBase'

export interface RetryConfig {
  maxRetries: number
  retryDelay: number // 毫秒
  retryableMethods: string[] // 可重试的 HTTP 方法
  retryableStatuses: number[] // 可重试的状态码
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 2,
  retryDelay: 1000, // 1秒
  retryableMethods: ['GET'], // 仅 GET 可重试
  retryableStatuses: [408, 429, 500, 502, 503, 504], // 网络相关错误
}

/**
 * 判断是否应该重试
 */
function shouldRetry(
  error: AxiosError,
  config: InternalAxiosRequestConfig & { retryCount?: number }
): boolean {
  const retryConfig = (config as any).retryConfig || DEFAULT_RETRY_CONFIG

  // 检查重试次数
  const retryCount = config.retryCount || 0
  if (retryCount >= retryConfig.maxRetries) {
    return false
  }

  // 检查 HTTP 方法
  if (!retryConfig.retryableMethods.includes(config.method?.toUpperCase() || '')) {
    return false
  }

  // 如果是取消请求,不重试
  if (axios.isCancel(error)) {
    return false
  }

  // 检查状态码
  if (error.response && !retryConfig.retryableStatuses.includes(error.response.status)) {
    return false
  }

  return true
}

/**
 * 计算重试延迟(指数退避)
 */
function getRetryDelay(retryCount: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, retryCount) // 1s, 2s, 4s...
}

/**
 * 重试拦截器
 *
 * @param error - Axios 错误对象
 * @returns Promise<any>
 */
export async function retryInterceptor(error: AxiosError): Promise<any> {
  const config = error.config as InternalAxiosRequestConfig & { retryCount?: number }

  if (!config || !shouldRetry(error, config)) {
    return Promise.reject(error)
  }

  const retryConfig = (config as any).retryConfig || DEFAULT_RETRY_CONFIG
  const retryCount = config.retryCount || 0
  const delay = getRetryDelay(retryCount, retryConfig.retryDelay)

  logger.info(
    `[Retry] Retrying request (${retryCount + 1}/${retryConfig.maxRetries}) after ${delay}ms`,
    {
      method: config.method,
      url: config.url,
    }
  )

  // 等待延迟
  await new Promise(resolve => setTimeout(resolve, delay))

  // 增加重试计数
  config.retryCount = retryCount + 1

  // 复用带拦截器的实例，保证与首次请求一致返回 response.data、并重新走鉴权/去重等逻辑
  return apiClient.request(config)
}
