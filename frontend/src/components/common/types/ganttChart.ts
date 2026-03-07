export interface LaneConfig {
  name: string
  subtitle?: string
  dateField: string
  color: string
  dimensions?: any[]
}

export interface ContainerItem {
  containerNumber: string
  [key: string]: any
}

export interface TimeGroup {
  label: string
  /** 与 statistics-detailed 接口的 distribution key 一致，用于用统计 API 驱动行数量 */
  key?: string
  startDate: Date
  endDate: Date
  count: number
  color: string
}

export interface RemainingTime {
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
}
