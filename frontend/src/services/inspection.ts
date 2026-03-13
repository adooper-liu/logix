import type { AxiosRequestConfig } from 'axios'
import { request } from './request'

export interface InspectionRecord {
  id?: number
  containerNumber: string
  inspectionNoticeDate?: string
  inspectionPlannedDate?: string
  inspectionDate?: string
  inspectionType?: string
  inspectionSkus?: string[]
  customsQuestion?: string
  customsRequirement?: string
  customsDeadline?: string
  preShipmentRiskAssessment?: string
  responseMeasures?: string
  customsFinalDecision?: string
  latestStatus?: string
  customsClearanceStatus?: string
  demurrageFee?: number
  responsibilityDetermination?: string
  remarks?: string
  updatedBy?: string
  dataSource?: string
  events?: InspectionEvent[]
}

export interface InspectionEvent {
  id?: number
  inspectionRecordId?: number
  eventDate: string
  eventStatus: string
}

class InspectionService {
  // 获取货柜的查验记录
  async getInspectionRecord(containerNumber: string) {
    const config: AxiosRequestConfig = {
      url: `/api/v1/inspection/container/${containerNumber}`,
      method: 'GET',
    }
    return request<InspectionRecord>(config)
  }

  // 创建或更新查验记录
  async createOrUpdateInspectionRecord(record: InspectionRecord) {
    const config: AxiosRequestConfig = {
      url: '/api/v1/inspection/record',
      method: 'POST',
      data: record,
    }
    return request<InspectionRecord>(config)
  }

  // 添加查验事件
  async addInspectionEvent(inspectionRecordId: number, event: {
    eventDate: string
    eventStatus: string
  }) {
    const config: AxiosRequestConfig = {
      url: '/api/v1/inspection/event',
      method: 'POST',
      data: {
        inspectionRecordId,
        eventDate: event.eventDate,
        eventStatus: event.eventStatus,
      },
    }
    return request<InspectionEvent>(config)
  }

  // 删除查验事件
  async deleteInspectionEvent(eventId: number) {
    const config: AxiosRequestConfig = {
      url: `/api/v1/inspection/event/${eventId}`,
      method: 'DELETE',
    }
    return request(config)
  }

  // 获取查验记录列表（用于报表）
  async getInspectionRecords(filters?: {
    startDate?: string
    endDate?: string
    customsClearanceStatus?: string
  }) {
    const config: AxiosRequestConfig = {
      url: '/api/v1/inspection/records',
      method: 'GET',
      params: filters,
    }
    return request<InspectionRecord[]>(config)
  }
}

export const inspectionService = new InspectionService()
