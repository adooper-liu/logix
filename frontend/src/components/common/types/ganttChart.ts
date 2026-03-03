export interface LaneConfig {
  name: string
  dateField: string
  color: string
}

export interface ContainerItem {
  containerNumber: string
  [key: string]: any
}

export interface TimeGroup {
  label: string
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
