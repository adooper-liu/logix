/**
 * 物流路径服务
 * Logistics Path Service
 *
 * 调用主服务代理的 /logistics-path/* 接口（主服务转发至 logistics-path-system 微服务）
 */

import { useAppStore } from '@/store/app'
import type { AxiosInstance } from 'axios'
import axios from 'axios'

/** 地理位置 */
export interface Location {
  id?: string
  name: string
  code: string
  type?: string
  country?: string
}

/** 状态节点 */
export interface StatusNode {
  id: string
  status: string
  description: string
  timestamp: string
  location?: Location | null
  nodeStatus: string
  isAlert: boolean
  rawData?: Record<string, unknown>
}

/** 运输模式 */
export type TransportMode = 'STANDARD' | 'SEA_RAIL' | 'FEEDER'

/** 物流状态路径 */
export interface StatusPath {
  id: string
  containerNumber: string
  nodes: StatusNode[]
  overallStatus: string
  transportMode?: TransportMode // 运输模式（新增）
  eta?: string | null
  startedAt?: string | null
  completedAt?: string | null
  createdAt?: string
  updatedAt?: string
  lastFreeDate?: string | null
  isOverdue?: boolean
  isMock?: boolean
}

class LogisticsPathService {
  private api: AxiosInstance

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1',
      timeout: 15000,
    })

    this.api.interceptors.request.use(
      config => {
        const token = localStorage.getItem('token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        const appStore = useAppStore()
        if (appStore.scopedCountryCode) {
          config.headers['X-Country-Code'] = appStore.scopedCountryCode
        }
        return config
      },
      error => Promise.reject(error)
    )
  }

  /**
   * 根据集装箱号获取物流路径
   * 数据来源：主库 ext_container_status_events（微服务接主库）或 Mock
   */
  async getPathByContainer(
    containerNumber: string
  ): Promise<{ success: boolean; data?: StatusPath; message?: string }> {
    const res = await this.api.get<{
      success: boolean
      data?: StatusPath
      message?: string
    }>(`/logistics-path/container/${encodeURIComponent(containerNumber)}`)
    return res.data
  }

  /**
   * 验证物流路径
   */
  async validatePath(pathId: string): Promise<{
    success: boolean
    data?: { isValid: boolean; errors: string[]; warnings: string[] }
    message?: string
  }> {
    const res = await this.api.post<{
      success: boolean
      data?: { isValid: boolean; errors: string[]; warnings: string[] }
      message?: string
    }>(`/logistics-path/validate/${encodeURIComponent(pathId)}`)
    return res.data
  }
}

export const logisticsPathService = new LogisticsPathService()
