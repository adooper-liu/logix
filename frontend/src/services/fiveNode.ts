/**
 * 五节点服务
 * Five Node Service
 */

import { httpClient } from '@/api/httpClient'

export interface FiveNodeData {
  containerNumber: string
  vessel: string
  voyage: string
  eta: Date | string
  ata: Date | string
  fiveNodes: {
    customs: {
      status: string
      plannedDate: Date | string | null
      actualDate: Date | string | null
      estimatedDate: Date | string | null
      latestStatus: string
    }
    trucking: {
      status: string
      plannedDate: Date | string | null
      actualDate: Date | string | null
      estimatedDate: Date | string | null
      latestStatus: string
      pickupTime?: Date | string | null
      deliveryTime?: Date | string | null
    }
    unloading: {
      status: string
      plannedDate: Date | string | null
      actualDate: Date | string | null
      estimatedDate: Date | string | null
      latestStatus: string
      unloadingTime?: Date | string | null
    }
    emptyReturn: {
      status: string
      plannedDate: Date | string | null
      actualDate: Date | string | null
      estimatedDate: Date | string | null
      latestStatus: string
      returnTime?: Date | string | null
    }
    inspection: {
      status: string
      plannedDate: Date | string | null
      actualDate: Date | string | null
      estimatedDate: Date | string | null
      latestStatus: string
      customsClearanceStatus?: string | null
    }
  }
  warnings: Array<{
    type: string
    level: string
    message: string
  }>
  costs: {
    demurrage: number
    detention: number
    inspection: number
    total: number
  }
  statusSummary: string
}

export interface FiveNodeFilters {
  startDate?: string
  endDate?: string
  status?: string
}

class FiveNodeServiceClass {
  /**
   * 获取单个货柜的五节点信息
   */
  async getFiveNodeInfo(containerNumber: string): Promise<{
    success: boolean
    data: FiveNodeData
  }> {
    return httpClient.get(`/five-node/container/${containerNumber}`)
  }

  /**
   * 获取所有货柜的五节点信息（用于列表）
   */
  async getAllFiveNodeInfo(filters?: FiveNodeFilters): Promise<{
    success: boolean
    data: FiveNodeData[]
  }> {
    const params: any = {}
    if (filters?.startDate) params.startDate = filters.startDate
    if (filters?.endDate) params.endDate = filters.endDate
    if (filters?.status) params.status = filters.status

    return httpClient.get('/five-node', { params })
  }
}

export const fiveNodeService = new FiveNodeServiceClass()
