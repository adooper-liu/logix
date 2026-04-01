/**
 * 数据变更日志服务
 * Audit Log Service
 */

import axios from 'axios'
import type { AxiosInstance } from 'axios'
import { useAppStore } from '@/store/app'

export interface DataChangeLog {
  id: number
  sourceType: string
  entityType: string
  entityId: string | null
  action: string
  changedFields: Record<string, { old?: unknown; new?: unknown }> | null
  batchId: string | null
  operatorId: string | null
  operatorIp: string | null
  remark: string | null
  createdAt: string
}

export interface AuditChangesResponse {
  success: boolean
  data: DataChangeLog[]
  message?: string
}

class AuditService {
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
   * 按货柜号查询变更日志
   */
  async getChangesByContainer(containerNumber: string, limit = 50): Promise<AuditChangesResponse> {
    const response = await this.api.get<AuditChangesResponse>(
      `/audit/changes/container/${encodeURIComponent(containerNumber)}`,
      { params: { limit } }
    )
    return response.data
  }
}

export const auditService = new AuditService()
