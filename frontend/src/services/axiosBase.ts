/**
 * Axios 单例（无拦截器）
 * 供 api.ts 挂载拦截器、供 retryInterceptor 重试时复用同一实例，避免循环依赖与错误返回形态。
 */
import axios, { type AxiosInstance } from 'axios'

export const apiClient: AxiosInstance = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})
