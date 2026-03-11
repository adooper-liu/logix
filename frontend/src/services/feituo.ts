/**
 * 飞驼数据同步服务
 * Feituo Data Sync Service
 *
 * 对接后端 /api/v1/external 接口
 */

import axios from 'axios'
import { useAppStore } from '@/store/app'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'

function createClient() {
  const api = axios.create({
    baseURL,
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' }
  })
  api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    const appStore = useAppStore()
    if (appStore.scopedCountryCode) {
      config.headers['X-Country-Code'] = appStore.scopedCountryCode
    }
    return config
  })
  return api
}

const api = createClient()

export interface SyncResult {
  success: boolean
  message: string
  data?: {
    containerNumber: string
    eventCount: number
    events: unknown[]
  }
}

export interface BatchSyncResult {
  success: boolean
  message: string
  data?: {
    success: string[]
    failed: { containerNumber: string; error: string }[]
  }
}

export const feituoService = {
  /**
   * 同步单个货柜的飞驼数据
   */
  async syncContainer(containerNumber: string, dataSource = 'Feituo'): Promise<SyncResult> {
    const res = await api.post<SyncResult>(`/external/sync/${encodeURIComponent(containerNumber)}`, {
      dataSource
    })
    return res.data
  },

  /**
   * 批量同步货柜飞驼数据
   */
  async syncBatch(
    containerNumbers: string[],
    dataSource = 'Feituo'
  ): Promise<BatchSyncResult> {
    const res = await api.post<BatchSyncResult>('/external/sync/batch', {
      containerNumbers,
      dataSource
    })
    return res.data
  },

  /**
   * 飞驼 Excel 导入（表一或表二格式）
   * 传 headers + rows 为 unknown[][] 时按分组存储，避免同名字段错位
   */
  async importFeituoExcel(
    tableType: 1 | 2,
    rows: Record<string, unknown>[] | unknown[][],
    fileName?: string,
    headers?: string[]
  ): Promise<{ success: boolean; message: string; data?: { success: number; failed: number; errors: { row: number; error: string }[] } }> {
    const res = await api.post('/import/feituo-excel', { tableType, rows, headers, fileName })
    return res.data
  },

  /**
   * 获取货柜状态事件列表
   */
  async getContainerEvents(
    containerNumber: string,
    limit = 50
  ): Promise<{ success: boolean; data?: unknown[]; total?: number }> {
    const res = await api.get(`/external/events/${encodeURIComponent(containerNumber)}`, {
      params: { limit }
    })
    return res.data
  },

  /**
   * 获取外部数据统计（验证页用）
   */
  async getStats(): Promise<{
    success: boolean
    data?: {
      totalEvents: number
      dataSourceStats: { dataSource: string; count: string }[]
      estimatedStats: { isEstimated: boolean; count: string }[]
      recentContainers: { containerNumber: string; lastUpdate: string }[]
    }
  }> {
    const res = await api.get('/external/stats')
    return res.data
  },

  /**
   * 获取已有外部数据的货柜列表（验证页用）
   */
  async getContainersWithExternalData(params?: {
    dataSource?: string
    page?: number
    pageSize?: number
  }): Promise<{
    success: boolean
    data?: {
      items: {
        containerNumber: string
        dataSources: string[]
        eventCount: string
        firstEventAt: string
        lastEventAt: string
      }[]
      total: number
      page: number
      pageSize: number
    }
  }> {
    const res = await api.get('/external/containers', { params })
    return res.data
  }
}
