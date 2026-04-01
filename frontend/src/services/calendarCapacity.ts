/**
 * 日历能力服务
 * Calendar Capacity Service
 */

import api from './api'

export interface CapacityDay {
  id: string
  date: string
  type: 'weekday' | 'weekend' | 'holiday' | 'manual'
  baseCapacity: number
  finalCapacity: number
  occupied: number
  remaining: number
  multiplier: number
  isManual?: boolean
  manualValue?: number
  manualReason?: string
  holidayName?: string
}

export interface ManualSetting {
  id: string
  date: string
  capacity: number
  reason: string
  createdAt: string
  updatedAt: string
}

export interface BatchSetRequest {
  startDate: string
  endDate: string
  capacity: number
  applyDays: string[]
  reason: string
}

export const calendarCapacityService = {
  /**
   * 获取日期范围内的能力数据
   */
  async getCapacityRange(startDate: string, endDate: string) {
    return api.get(`/capacity/range?start=${startDate}&end=${endDate}`)
  },

  /**
   * 设置手动能力
   */
  async setManualCapacity(date: string, capacity: number, reason?: string) {
    return api.post('/capacity/manual', {
      date,
      capacity,
      reason,
    })
  },

  /**
   * 批量设置手动能力
   */
  async batchSetManualCapacity(params: BatchSetRequest) {
    return api.post('/capacity/manual/batch', params)
  },

  /**
   * 恢复日历规则
   */
  async resetToCalendarRule(date: string) {
    return api.delete(`/capacity/manual/${date}`)
  },

  /**
   * 获取手动设置列表
   */
  async getManualSettingsList(page: number = 1, pageSize: number = 20) {
    return api.get('/capacity/manual/list', {
      params: { page, pageSize },
    })
  },

  /**
   * 更新手动设置
   */
  async updateManualSetting(date: string, capacity: number, reason: string) {
    return api.put(`/capacity/manual/${date}`, {
      capacity,
      reason,
    })
  },

  /**
   * 删除手动设置
   */
  async deleteManualSetting(date: string) {
    return api.delete(`/capacity/manual/${date}`)
  },
}
