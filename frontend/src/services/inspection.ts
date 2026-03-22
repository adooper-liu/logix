import type { AxiosRequestConfig } from 'axios'
import { api } from './api'

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
    return api.get<InspectionRecord>(`/inspection/container/${containerNumber}`)
  }

  // 创建或更新查验记录
  async createOrUpdateInspectionRecord(record: InspectionRecord) {
    return api.post<InspectionRecord>('/inspection/record', record)
  }

  // 添加查验事件
  async addInspectionEvent(inspectionRecordId: number, event: {
    eventDate: string
    eventStatus: string
  }) {
    return api.post<InspectionEvent>('/inspection/event', {
      inspectionRecordId,
      eventDate: event.eventDate,
      eventStatus: event.eventStatus,
    })
  }

  // 删除查验事件
  async deleteInspectionEvent(eventId: number) {
    return api.delete(`/inspection/event/${eventId}`)
  }

  // 获取查验记录列表（用于报表）
  async getInspectionRecords(filters?: {
    startDate?: string
    endDate?: string
    customsClearanceStatus?: string
  }) {
    return api.get<InspectionRecord[]>('/inspection/records', { params: filters })
  }
}

export const inspectionService = new InspectionService()
