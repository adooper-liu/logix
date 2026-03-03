import dayjs from 'dayjs'
import type { RemainingTime } from '../types/ganttChart'

// 计算倒计时时间
export const getRemainingTime = (targetDate: string | Date | null | undefined): RemainingTime | null => {
  if (!targetDate) return null
  const target = new Date(targetDate)
  const now = new Date()
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, isExpired: false }
}

// 格式化日期显示
export const formatDateLabel = (date: Date): string => {
  return dayjs(date).format('MM-DD')
}

// 格式化日期用于tooltip
export const formatFullDate = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 从容器中提取日期字段
export const extractDateFromContainer = (container: any, dateField: string): Date | null => {
  // 直接字段
  if (container[dateField]) {
    return new Date(container[dateField])
  }

  // 从portOperations中提取
  if (container.portOperations && container.portOperations.length > 0) {
    const destPortOp = container.portOperations.find((op: any) => op.portType === 'destination')
    if (destPortOp && destPortOp[dateField]) {
      return new Date(destPortOp[dateField])
    }
  }

  // 从truckingTransports中提取计划提柜
  if (dateField === 'plannedPickupDate' && container.truckingTransports && container.truckingTransports.length > 0) {
    const trucking = container.truckingTransports[0]
    if (trucking.plannedPickupDate) {
      return new Date(trucking.plannedPickupDate)
    }
  }

  // 从emptyReturns中提取最晚还箱
  if (dateField === 'lastReturnDate' && container.emptyReturns && container.emptyReturns.length > 0) {
    const emptyReturn = container.emptyReturns[0]
    if (emptyReturn.lastReturnDate) {
      return new Date(emptyReturn.lastReturnDate)
    }
  }

  return null
}
