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
    let arrivedBeforeToday = 0 // 今日之前到达目的港
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

      // 统计今日累计到港目的港（只要有目的港的ATA且是今天到达，不论当前状态如何）
      // 排除中转港场景：只有当 currentPortType !== 'transit' 时，ataDestPort 才是目的港到达时间
      if (ataDate && c.currentPortType !== 'transit') {
        const arrivalDate = new Date(ataDate)
        arrivalDate.setHours(0, 0, 0, 0)
        if (arrivalDate.getTime() === today.getTime()) {
          todayArrived++
        } else if (arrivalDate.getTime() < today.getTime()) {
          // 今日之前到达目的港
          arrivedBeforeToday++
        }
      }

      // 统计到达中转港数量
      if (isArrivedTransit) {
        arrivedTransit++
      }

      // 已到目的港的货柜不计入后续统计（预计到港、逾期等）
      if (ataDate && c.currentPortType !== 'transit') {
        // 已到目的港，不进行后续统计
        return
      }

      // 已到中转港的货柜不计入后续统计
      if (isArrivedTransit) {
        // 已到中转港，不进行后续统计
        return
      }

      // 获取物流状态
      const logisticsStatus = c.logisticsStatus

      // 只统计已出运但未到港之后状态的货柜（用于预计到港统计）
      if (!isShippedButNotArrived(logisticsStatus)) {
        return
      }

      if (etaDate) {
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
      { label: '今日到港', count: todayArrived, color: '#67c23a', days: 'today' },
      { label: '今日之前到港', count: arrivedBeforeToday, color: '#909399', days: 'arrived-before-today' },
      { label: '3天内预计到港', count: within3Days, color: '#e6a23c', days: '0-3' },
      { label: '7天内预计到港', count: within7Days, color: '#409eff', days: '4-7' },
      { label: '>7天预计到港', count: over7Days, color: '#67c23a', days: '7+' },
      { label: '其他记录', count: otherRecords, color: '#c0c4cc', days: 'other' }
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
    // 计划提柜逾期
    let overduePlanned = 0
    // 待安排提柜（已到港但无拖卡运输记录）
    let pendingArrangement = 0

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 状态判断函数：是否未提柜及之后状态没有任一发生
    const isNotPickedUp = (status: string) => {
      const statusIndex = [
        SimplifiedStatus.NOT_SHIPPED,
        SimplifiedStatus.SHIPPED,
        SimplifiedStatus.IN_TRANSIT,
        SimplifiedStatus.AT_PORT,
        SimplifiedStatus.PICKED_UP,
        SimplifiedStatus.UNLOADED,
        SimplifiedStatus.RETURNED_EMPTY
      ].indexOf(status as SimplifiedStatus)

      // 未提柜及之后状态（NOT_SHIPPED、SHIPPED、IN_TRANSIT、AT_PORT）
      return statusIndex >= 0 && statusIndex <= 3
    }

    // 判断是否已到目的港
    const isArrivedAtDestination = (c: any) => {
      const portOps = c.portOperations as PortOperation[] | undefined
      const destPortOp = portOps?.find(po => po.portType === 'destination')
      const ataDate = destPortOp?.ataDestPort || c.ataDestPort
      return ataDate && c.currentPortType !== 'transit'
    }

    containers.value.forEach((c: any) => {
      // 统计范围：已到港且未提柜及之后状态没有任一发生
      const arrivedAtDestination = isArrivedAtDestination(c)
      const notPickedUp = isNotPickedUp(c.logisticsStatus)

      // 如果没有到港或已经提柜，则不参与统计
      if (!arrivedAtDestination || !notPickedUp) {
        return
      }

      // 获取拖卡运输信息
      const trucking = c.truckingTransports as TruckingTransport[] | undefined
      const singleTrucking = c.truckingTransport as TruckingTransport | undefined
      const firstTrucking = trucking?.[0] || singleTrucking

      if (!firstTrucking) {
        // 待安排提柜（已到港但无拖卡运输记录）
        pendingArrangement++
        count++
        return
      }

      const plannedPickupDate = firstTrucking.plannedPickupDate
      const pickupDate = firstTrucking.pickupDate

      // 统计今日实际提柜（只要有pickupDate且是今天，不论是否有plannedPickupDate）
      if (pickupDate) {
        const pickupDateObj = new Date(pickupDate)
        pickupDateObj.setHours(0, 0, 0, 0)
        if (pickupDateObj.getTime() === today.getTime()) {
          todayActual++
        }
        // 已提柜的货柜不再统计其他分类
        return
      }

      // 未提柜的货柜，统计计划提柜相关分类
      if (plannedPickupDate) {
        const plannedDate = new Date(plannedPickupDate)
        plannedDate.setHours(0, 0, 0, 0)
        const time = getRemainingTime(plannedPickupDate)

        if (plannedDate.getTime() === today.getTime()) {
          // 今日计划提柜
          todayPlanned++
          count++
          urgent++
        } else if (time && time.isExpired) {
          // 计划提柜逾期
          overduePlanned++
          expired++
        } else if (time && !time.isExpired) {
          // 未逾期，按天数分类
          if (time.days <= 3) {
            within3Days++
            count++
            if (time.days >= 1) { // 1-3天算紧急
              urgent++
            }
          } else if (time.days <= 7) {
            within7Days++
            count++
          }
        }
      }
    })

    const filterItems = [
      { label: '计划提柜逾期', count: overduePlanned, color: '#f56c6c', days: 'overdue' },
      { label: '今日计划提柜', count: todayPlanned, color: '#e6a23c', days: 'today-planned' },
      { label: '今日实际提柜', count: todayActual, color: '#67c23a', days: 'today-actual' },
      { label: '待安排提柜', count: pendingArrangement, color: '#909399', days: 'pending' },
      { label: '3天内预计提柜', count: within3Days, color: '#409eff', days: '0-3' },
      { label: '7天内预计提柜', count: within7Days, color: '#67c23a', days: '4-7' }
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
