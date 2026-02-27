import { computed, Ref, ref } from 'vue'
import type { PortOperation, TruckingTransport, EmptyReturn } from '@/types/container'
import { SimplifiedStatus } from '@/utils/logisticsStatusMachine'

interface CountdownData {
  count: number
  urgent: number
  expired: number
  filterItems?: { label: string; count: number; color: string; days: string }[]
}

// 倒计时计算逻辑
export function useContainerCountdown(containers: Ref<any[]>) {
  const currentTime = ref(new Date())
  let timer: number | null = null

  // 计算倒计时时间
  const getRemainingTime = (targetDate: string | Date | null | undefined) => {
    if (!targetDate) return null
    const target = new Date(targetDate)
    const now = currentTime.value
    const diff = target.getTime() - now.getTime()

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    return { days, hours, minutes, seconds, isExpired: false }
  }

  // 计算按到港倒计时的货柜数量
  const countdownByArrival = computed((): CountdownData => {
    if (!containers.value.length) return { count: 0, urgent: 0, expired: 0, filterItems: [] }
    let count = 0
    let urgent = 0
    let expired = 0

    // 今日累计到港
    let todayArrived = 0
    // 已到达中转港
    let arrivedTransit = 0
    // 已逾期未到港（倒计时<0，且没有已到港及后续状态）
    let overdueNotArrived = 0
    // 分类统计
    let within3Days = 0  // <=3天内预计到港
    let within7Days = 0  // 3<天数<=7天预计到港
    let over7Days = 0      // >7天预计到港
    // 其他记录（符合状态条件但不属于上述任何分类）
    let otherRecords = 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 状态判断函数：是否已出运但未到港之后的状态
    const isShippedButNotArrived = (status: string) => {
      const statusIndex = [
        SimplifiedStatus.NOT_SHIPPED,
        SimplifiedStatus.SHIPPED,
        SimplifiedStatus.IN_TRANSIT,
        SimplifiedStatus.AT_PORT,
        SimplifiedStatus.PICKED_UP,
        SimplifiedStatus.UNLOADED,
        SimplifiedStatus.RETURNED_EMPTY
      ].indexOf(status as SimplifiedStatus)

      // 已出运（SHIPPED、IN_TRANSIT、AT_PORT）
      const isShipped = statusIndex >= 1 && statusIndex <= 3
      return isShipped
    }

    containers.value.forEach((c: any) => {
      // 获取物流状态
      const logisticsStatus = c.logisticsStatus

      // 只统计已出运但未到港之后状态的货柜
      if (!isShippedButNotArrived(logisticsStatus)) {
        return
      }

      // 获取港口操作信息
      const portOps = c.portOperations as PortOperation[] | undefined

      // 查找目的港操作记录
      const destPortOp = portOps?.find(po => po.portType === 'destination')

      // 获取修正后的 ETA（优先使用 etaCorrection）和 ATA
      const etaDate = destPortOp?.etaCorrection || c.etaDestPort || destPortOp?.etaDestPort
      const ataDate = destPortOp?.ataDestPort || c.ataDestPort

      // 统计到达中转港（当前港口类型为 transit 且有 ataDestPort）
      // 注意：后端API返回时，当 currentPortType === 'transit'，ataDestPort 字段实际存储的是 transitArrivalDate
      const isArrivedTransit = c.currentPortType === 'transit' && c.ataDestPort
      if (isArrivedTransit) {
        arrivedTransit++
      }

      // 统计今日实际到港（只要有 ATA 且状态是 AT_PORT 就统计）
      if (ataDate && logisticsStatus === SimplifiedStatus.AT_PORT) {
        const arrivalDate = new Date(ataDate)
        arrivalDate.setHours(0, 0, 0, 0)
        if (arrivalDate.getTime() === today.getTime()) {
          todayArrived++
        }
      }

      // 统计预计到港（只有未实际到港的才统计）
      // 已到中转港的货柜不计入预计到港和其他记录
      if (isArrivedTransit) {
        // 已到中转港，不进行后续统计
        return
      }

      if (etaDate && !ataDate) {
        const time = getRemainingTime(etaDate)
        if (time && !time.isExpired) {
          count++
          if (time.days <= 3) {
            within3Days++
            urgent++
          } else if (time.days <= 7) {
            within7Days++
          } else {
            over7Days++
          }
        } else if (time?.isExpired) {
          // 倒计时<0：统计到已逾期未到港
          overdueNotArrived++
          expired++
        } else {
          // 无ETA时间 → 其他记录
          otherRecords++
        }
      } else {
        // 无ETA数据 → 其他记录
        otherRecords++
      }
    })

    const filterItems = [
      { label: '已逾期未到港', count: overdueNotArrived, color: '#f56c6c', days: 'overdue' },
      { label: '到达中转港', count: arrivedTransit, color: '#909399', days: 'transit' },
      { label: '今日累计到港', count: todayArrived, color: '#67c23a', days: 'today' },
      { label: '3天内预计到港', count: within3Days, color: '#e6a23c', days: '0-3' },
      { label: '7天内预计到港', count: within7Days, color: '#409eff', days: '4-7' },
      { label: '>7天预计到港', count: over7Days, color: '#67c23a', days: '7+' },
      { label: '其他记录', count: otherRecords, color: '#909399', days: 'other' }
    ]

    return { count, urgent, expired, filterItems }
  })

  // 计算按提柜倒计时的货柜数量
  const countdownByPickup = computed((): CountdownData => {
    if (!containers.value.length) return { count: 0, urgent: 0, expired: 0, filterItems: [] }
    let count = 0
    let urgent = 0
    let expired = 0

    // 今日计划提柜
    let todayPlanned = 0
    // 今日实际提柜
    let todayActual = 0
    // 3天内预计提柜（不包括今日）
    let within3Days = 0
    // 7天内预计提柜（不包括<=3天）
    let within7Days = 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    containers.value.forEach((c: any) => {
      // 获取港口操作信息
      const portOps = c.portOperations as PortOperation[] | undefined
      const singlePortOp = c.portOperation || c.latestPortOperation as PortOperation | undefined
      const portOp = portOps?.find(po => po.portType === 'destination') || singlePortOp

      // 获取拖卡运输信息
      const trucking = c.truckingTransports as TruckingTransport[] | undefined
      const singleTrucking = c.truckingTransport as TruckingTransport | undefined
      const firstTrucking = trucking?.[0] || singleTrucking

      if (portOp?.ataDestPort && !firstTrucking?.pickupDate) {
        // 检查是否今日计划提柜
        if (firstTrucking?.plannedPickupDate) {
          const plannedDate = new Date(firstTrucking.plannedPickupDate)
          plannedDate.setHours(0, 0, 0, 0)
          if (plannedDate.getTime() === today.getTime()) {
            todayPlanned++
            count++
          }
        }

        // 检查是否今日实际提柜
        if (firstTrucking?.pickupDate) {
          const pickupDate = new Date(firstTrucking.pickupDate)
          pickupDate.setHours(0, 0, 0, 0)
          if (pickupDate.getTime() === today.getTime()) {
            todayActual++
          }
        }

        // 检查最后免费日期（用于3天/7天内预计）
        if (portOp?.lastFreeDate) {
          const time = getRemainingTime(portOp.lastFreeDate)
          if (time && !time.isExpired) {
            // 排除已统计的今日计划
            const plannedDateObj = firstTrucking?.plannedPickupDate ? new Date(firstTrucking.plannedPickupDate) : null
            const isTodayPlanned = plannedDateObj && plannedDateObj.setHours(0, 0, 0, 0) === today.getTime()

            if (!isTodayPlanned) {
              count++
              if (time.days <= 3) {
                within3Days++
                urgent++
              } else if (time.days <= 7) {
                within7Days++
              }
            }
          } else if (time?.isExpired) {
            expired++
          }
        }
      }
    })

    const filterItems = [
      { label: '今日计划提柜', count: todayPlanned, color: '#f56c6c', days: '0' },
      { label: '今日实际提柜', count: todayActual, color: '#67c23a', days: '0-actual' },
      { label: '3天内预计提柜', count: within3Days, color: '#e6a23c', days: '0-3' },
      { label: '7天内预计提柜', count: within7Days, color: '#409eff', days: '4-7' }
    ]

    return { count, urgent, expired, filterItems }
  })

  // 计算按最晚提柜倒计时的货柜数量
  const countdownByLastPickup = computed((): CountdownData => {
    if (!containers.value.length) return { count: 0, urgent: 0, expired: 0, filterItems: [] }
    let count = 0
    let urgent = 0
    let expired = 0

    // 倒计时<=0天
    let expiredCount = 0
    // 倒计时<=3天（不包括<=0天）
    let urgentCount = 0
    // 倒计时<=7天（不包括<=3天）
    let warningCount = 0

    containers.value.forEach((c: any) => {
      // 获取港口操作信息
      const portOps = c.portOperations as PortOperation[] | undefined
      const singlePortOp = c.portOperation || c.latestPortOperation as PortOperation | undefined
      const portOp = portOps?.find(po => po.portType === 'destination') || singlePortOp

      // 获取拖卡运输信息
      const trucking = c.truckingTransports as TruckingTransport[] | undefined
      const singleTrucking = c.truckingTransport as TruckingTransport | undefined
      const firstTrucking = trucking?.[0] || singleTrucking

      if (portOp?.lastFreeDate && !firstTrucking?.pickupDate) {
        const time = getRemainingTime(portOp.lastFreeDate)
        if (time) {
          if (time.isExpired) {
            expiredCount++
            expired++
          } else {
            count++
            if (time.days <= 3) {
              urgentCount++
              urgent++
            } else if (time.days <= 7) {
              warningCount++
            }
          }
        }
      }
    })

    const filterItems = [
      { label: '已超时(≤0天)', count: expiredCount, color: '#f56c6c', days: '0' },
      { label: '即将超时(≤3天)', count: urgentCount, color: '#e6a23c', days: '1-3' },
      { label: '预警(≤7天)', count: warningCount, color: '#409eff', days: '4-7' }
    ]

    return { count, urgent, expired, filterItems }
  })

  // 计算按最晚还箱倒计时的货柜数量
  const countdownByReturn = computed((): CountdownData => {
    if (!containers.value.length) return { count: 0, urgent: 0, expired: 0, filterItems: [] }
    let count = 0
    let urgent = 0
    let expired = 0

    // 倒计时<=0天
    let expiredCount = 0
    // 倒计时<=3天（不包括<=0天）
    let urgentCount = 0
    // 倒计时<=7天（不包括<=3天）
    let warningCount = 0

    containers.value.forEach((c: any) => {
      // 获取还空箱信息
      const emptyReturns = c.emptyReturns as EmptyReturn[] | undefined
      const singleEmptyReturn = c.emptyReturn as EmptyReturn | undefined
      const emptyReturn = emptyReturns?.[0] || singleEmptyReturn

      if (emptyReturn?.lastReturnDate && !emptyReturn.returnTime) {
        const time = getRemainingTime(emptyReturn.lastReturnDate)
        if (time) {
          if (time.isExpired) {
            expiredCount++
            expired++
          } else {
            count++
            if (time.days <= 3) {
              urgentCount++
              urgent++
            } else if (time.days <= 7) {
              warningCount++
            }
          }
        }
      }
    })

    const filterItems = [
      { label: '已超时(≤0天)', count: expiredCount, color: '#f56c6c', days: '0' },
      { label: '即将超时(≤3天)', count: urgentCount, color: '#e6a23c', days: '1-3' },
      { label: '预警(≤7天)', count: warningCount, color: '#409eff', days: '4-7' }
    ]

    return { count, urgent, expired, filterItems }
  })

  // 计算按物流状态分类的货柜数量
  const countdownByStatus = computed((): CountdownData => {
    if (!containers.value.length) return { count: 0, urgent: 0, expired: 0, filterItems: [] }

    // 按状态分类统计
    const statusCount = {
      [SimplifiedStatus.NOT_SHIPPED]: 0,
      [SimplifiedStatus.SHIPPED]: 0,
      [SimplifiedStatus.IN_TRANSIT]: 0,
      [SimplifiedStatus.AT_PORT]: 0,
      [SimplifiedStatus.PICKED_UP]: 0,
      [SimplifiedStatus.UNLOADED]: 0,
      [SimplifiedStatus.RETURNED_EMPTY]: 0
    }

    containers.value.forEach((c: any) => {
      const logisticsStatus = c.logisticsStatus as SimplifiedStatus
      if (statusCount[logisticsStatus] !== undefined) {
        statusCount[logisticsStatus]++
      }
    })

    const filterItems = [
      { label: '未出运', count: statusCount[SimplifiedStatus.NOT_SHIPPED], color: '#909399', days: SimplifiedStatus.NOT_SHIPPED },
      { label: '已出运', count: statusCount[SimplifiedStatus.SHIPPED], color: '#409eff', days: SimplifiedStatus.SHIPPED },
      { label: '在途', count: statusCount[SimplifiedStatus.IN_TRANSIT], color: '#e6a23c', days: SimplifiedStatus.IN_TRANSIT },
      { label: '已到港', count: statusCount[SimplifiedStatus.AT_PORT], color: '#67c23a', days: SimplifiedStatus.AT_PORT },
      { label: '已提柜', count: statusCount[SimplifiedStatus.PICKED_UP], color: '#f39c12', days: SimplifiedStatus.PICKED_UP },
      { label: '已卸柜', count: statusCount[SimplifiedStatus.UNLOADED], color: '#3498db', days: SimplifiedStatus.UNLOADED },
      { label: '已还箱', count: statusCount[SimplifiedStatus.RETURNED_EMPTY], color: '#95a5a6', days: SimplifiedStatus.RETURNED_EMPTY }
    ]

    return {
      count: containers.value.length,
      urgent: 0,
      expired: 0,
      filterItems
    }
  })

  // 启动定时器
  const startTimer = () => {
    timer = window.setInterval(() => {
      currentTime.value = new Date()
    }, 1000)
  }

  // 停止定时器
  const stopTimer = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return {
    countdownByArrival,
    countdownByPickup,
    countdownByLastPickup,
    countdownByReturn,
    countdownByStatus,
    startTimer,
    stopTimer
  }
}
