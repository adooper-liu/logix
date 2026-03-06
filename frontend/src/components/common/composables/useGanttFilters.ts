import dayjs from 'dayjs'
import type { ContainerItem } from '../types/ganttChart'
import { getRemainingTime } from './useGanttHelpers'

// 获取按到港分组的货柜子集（使用与Shipments页面相同的逻辑）
export const getArrivalSubset = (
  containers: ContainerItem[],
  groupLabel: string
): ContainerItem[] => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = containers
    .filter(container => {
      // 提取ETA和ATA（直接使用容器级别字段）
      const etaDate = container.etaDestPort
      const ataDate = container.ataDestPort

      // 如果没有ETA和ATA，跳过
      if (!etaDate && !ataDate) return false

      // 货柜当前港口类型
      const currentPortType = container.currentPortType

      // 判断是否已出运但未到港之后状态的货柜
      const isShippedButNotArrived = ['shipped', 'in_transit', 'at_port'].includes(
        container.logisticsStatus?.toLowerCase()
      )

      if (groupLabel === '今日到港') {
        // ATA = today 且当前港口类型不是transit
        if (ataDate && currentPortType !== 'transit') {
          const arrivalDate = new Date(ataDate)
          arrivalDate.setHours(0, 0, 0, 0)
          return arrivalDate.getTime() === today.getTime()
        }
        return false
      }

      if (groupLabel === '今日之前到港未提柜') {
        // ATA < today, 当前港口类型不是transit, 且未提柜/未卸柜/未还箱
        if (ataDate && currentPortType !== 'transit') {
          const logisticsStatus = container.logisticsStatus?.toLowerCase()
          // 排除已提柜、已卸柜、已还箱状态
          if (!['picked_up', 'unloaded', 'returned_empty'].includes(logisticsStatus)) {
            const arrivalDate = new Date(ataDate)
            arrivalDate.setHours(0, 0, 0, 0)
            return arrivalDate.getTime() < today.getTime()
          }
        }
        return false
      }

      if (groupLabel === '今日之前到港已提柜') {
        // ATA < today, 当前港口类型不是transit, 且已提柜/已卸柜/已还箱
        if (ataDate && currentPortType !== 'transit') {
          const logisticsStatus = container.logisticsStatus?.toLowerCase()
          // 包含已提柜、已卸柜、已还箱状态
          if (['picked_up', 'unloaded', 'returned_empty'].includes(logisticsStatus)) {
            const arrivalDate = new Date(ataDate)
            arrivalDate.setHours(0, 0, 0, 0)
            return arrivalDate.getTime() < today.getTime()
          }
        }
        return false
      }

      if (groupLabel === '已逾期到港') {
        // 只统计已出运但未到港之后状态的货柜
        if (!isShippedButNotArrived) return false
        // ETA < today 且 ATA IS NULL
        if (!etaDate || ataDate) return false
        const eta = new Date(etaDate)
        eta.setHours(0, 0, 0, 0)
        return eta.getTime() < today.getTime()
      }

      if (groupLabel === '3日内预计到港') {
        // 只统计已出运但未到港之后状态的货柜
        if (!isShippedButNotArrived) return false
        // ETA in [today, today+3] 且 ATA IS NULL
        if (!etaDate || ataDate) return false
        const eta = new Date(etaDate)
        eta.setHours(0, 0, 0, 0)
        const diffTime = eta.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays >= 0 && diffDays <= 3
      }

      if (groupLabel === '7日内预计到港') {
        // 只统计已出运但未到港之后状态的货柜
        if (!isShippedButNotArrived) return false
        // ETA in (today+3, today+7] 且 ATA IS NULL
        if (!etaDate || ataDate) return false
        const eta = new Date(etaDate)
        eta.setHours(0, 0, 0, 0)
        const diffTime = eta.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays > 3 && diffDays <= 7
      }

      if (groupLabel === '7日后预计到港') {
        // 只统计已出运但未到港之后状态的货柜
        if (!isShippedButNotArrived) return false
        // ETA > today+7 且 ATA IS NULL
        if (!etaDate || ataDate) return false
        const eta = new Date(etaDate)
        eta.setHours(0, 0, 0, 0)
        const diffTime = eta.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays > 7
      }

      return false
    })
    .map(container => {
      // 提取并保存日期用于后续日期匹配
      // 按照用户要求的顺序：ATA、ETA
      const etaDate = container.etaDestPort
      const ataDate = container.ataDestPort

      // 按顺序提取第一个有的日期：ATA > ETA
      let extractedDate: Date | null = null
      if (ataDate) {
        extractedDate = new Date(ataDate)
      } else if (etaDate) {
        extractedDate = new Date(etaDate)
      }

      return {
        ...container,
        extractedDate,
      }
    })

  return result
}

// 获取按计划提柜分组的货柜子集
export const getPickupSubset = (
  containers: ContainerItem[],
  groupLabel: string
): ContainerItem[] => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = containers
    .filter(container => {
      // 获取拖卡运输记录
      let firstTrucking: any = null
      if (container.truckingTransports && container.truckingTransports.length > 0) {
        firstTrucking = container.truckingTransports[0]
      }

      // 到达目的港判断（用于按计划提柜的各分组）
      const ataDate = container.ataDestPort
      const currentPortType = container.currentPortType
      const arrivedAtDestination = ataDate && currentPortType !== 'transit'

      if (groupLabel === '逾期未提柜') {
        // 计划提柜逾期（未提柜），仅统计已到目的港的货柜
        if (!arrivedAtDestination) return false
        if (!firstTrucking?.plannedPickupDate) return false
        if (firstTrucking.pickupDate) return false
        const plannedPickupDate = new Date(firstTrucking.plannedPickupDate)
        const time = getRemainingTime(plannedPickupDate)
        return time?.isExpired === true
      } else if (groupLabel === '待安排提柜') {
        // 已到港且无拖卡运输记录
        const ataDate = container.ataDestPort
        const currentPortType = container.currentPortType
        const arrivedAtDestination = ataDate && currentPortType !== 'transit'
        if (!arrivedAtDestination) return false
        return !firstTrucking
      } else if (groupLabel === '今日计划提柜') {
        // 今日计划提柜（未提柜）
        // 仅统计已到目的港的货柜
        if (!arrivedAtDestination) return false
        if (!firstTrucking?.plannedPickupDate) return false
        if (firstTrucking.pickupDate) return false
        const plannedPickupDate = new Date(firstTrucking.plannedPickupDate)
        plannedPickupDate.setHours(0, 0, 0, 0)
        return plannedPickupDate.getTime() === today.getTime()
      } else if (groupLabel === '3天内计划提柜') {
        // 3天内预计提柜（未提柜）
        // 仅统计已到目的港的货柜
        if (!arrivedAtDestination) return false
        if (!firstTrucking?.plannedPickupDate) return false
        if (firstTrucking.pickupDate) return false
        const plannedPickupDate = new Date(firstTrucking.plannedPickupDate)
        const time = getRemainingTime(plannedPickupDate)
        if (!time || time.isExpired) return false
        return time.days <= 3
      } else if (groupLabel === '7天内计划提柜') {
        // 7天内预计提柜（未提柜）
        // 仅统计已到目的港的货柜
        if (!arrivedAtDestination) return false
        if (!firstTrucking?.plannedPickupDate) return false
        if (firstTrucking.pickupDate) return false
        const plannedPickupDate = new Date(firstTrucking.plannedPickupDate)
        const time = getRemainingTime(plannedPickupDate)
        if (!time || time.isExpired) return false
        return time.days > 3 && time.days <= 7
      }

      return false
    })
    .map(container => {
      // 提取并保存日期用于后续日期匹配
      let firstTrucking: any = null
      if (container.truckingTransports && container.truckingTransports.length > 0) {
        firstTrucking = container.truckingTransports[0]
      }

      let extractedDate: Date | null = null
      if (firstTrucking?.plannedPickupDate) {
        extractedDate = new Date(firstTrucking.plannedPickupDate)
      }

      return {
        ...container,
        extractedDate,
      }
    })

  return result
}

// 获取按最晚提柜分组的货柜子集
export const getLastPickupSubset = (
  containers: ContainerItem[],
  groupLabel: string
): ContainerItem[] => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = containers
    .filter(container => {
      // 已到目的港且未提柜
      const ataDate = container.ataDestPort
      const currentPortType = container.currentPortType
      const arrivedAtDestination = ataDate && currentPortType !== 'transit'

      if (!arrivedAtDestination) return false

      // 获取目的港操作记录
      let destPortOp: any = null
      if (container.portOperations && container.portOperations.length > 0) {
        destPortOp = container.portOperations.find((op: any) => op.portType === 'destination')
      }

      // 业务逻辑：
      // 情况1：无计划日期 + 无实际提柜 → ✅ 纳入统计
      // 情况2：有计划日期 + 无实际提柜 → ✅ 纳入统计
      // 情况3：有计划日期 + 有实际提柜 → ❌ 不纳入统计

      const hasPlannedPickupDate = destPortOp?.plannedPickupDate ? true : false
      let hasActualPickupDate = false

      // 检查是否有实际提柜日期（从拖卡运输记录中获取）
      if (container.truckingTransports && container.truckingTransports.length > 0) {
        const firstTrucking = container.truckingTransports[0]
        if (firstTrucking.pickupTime) {
          hasActualPickupDate = true
        }
      }

      // 情况3：有计划日期 + 有实际提柜 → 不纳入统计
      if (hasPlannedPickupDate && hasActualPickupDate) {
        return false
      }

      // 情况1和情况2：需要 lastFreeDate 才能纳入统计（除了"缺最后免费日"分组）
      if (!destPortOp?.lastFreeDate) {
        return groupLabel === '缺最后免费日'
      }

      const time = getRemainingTime(destPortOp.lastFreeDate)

      if (groupLabel === '已逾期') {
        return time?.isExpired === true
      } else if (groupLabel === '紧急') {
        return !time?.isExpired && time?.days !== undefined && time.days <= 3
      } else if (groupLabel === '警告') {
        return !time?.isExpired && time?.days !== undefined && time.days > 3 && time.days <= 7
      } else if (groupLabel === '正常') {
        return !time?.isExpired && time?.days !== undefined && time.days > 7
      }

      return false
    })
    .map(container => {
      // 获取目的港操作记录
      let destPortOp: any = null
      if (container.portOperations && container.portOperations.length > 0) {
        destPortOp = container.portOperations.find((op: any) => op.portType === 'destination')
      }

      let extractedDate: Date | null = null
      if (destPortOp?.lastFreeDate) {
        extractedDate = new Date(destPortOp.lastFreeDate)
      }

      return {
        ...container,
        extractedDate,
      }
    })

  return result
}

// 获取按最晚还箱分组的货柜子集
export const getReturnSubset = (
  containers: ContainerItem[],
  groupLabel: string
): ContainerItem[] => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = containers
    .filter(container => {
      const logisticsStatus = container.logisticsStatus?.toLowerCase()

      // 排除已还箱状态
      if (logisticsStatus === 'returned_empty') return false

      // 获取拖卡运输记录
      let firstTrucking: any = null
      if (container.truckingTransports && container.truckingTransports.length > 0) {
        firstTrucking = container.truckingTransports[0]
      }

      // 已提柜或有拖卡运输记录
      const hasTrucking = !!firstTrucking
      const isPickedUp = logisticsStatus === 'picked_up' || logisticsStatus === 'unloaded'

      if (!hasTrucking && !isPickedUp) return false

      // 获取还空箱记录
      let emptyReturn: any = null
      if (container.emptyReturns && container.emptyReturns.length > 0) {
        emptyReturn = container.emptyReturns[0]
      }

      // 如果已还箱，则不参与统计
      if (emptyReturn?.returnTime) return false

      if (!emptyReturn?.lastReturnDate) {
        return groupLabel === '缺最后还箱日'
      }

      const time = getRemainingTime(emptyReturn.lastReturnDate)

      if (groupLabel === '已逾期') {
        return time?.isExpired === true
      } else if (groupLabel === '紧急') {
        return !time?.isExpired && time?.days !== undefined && time.days <= 3
      } else if (groupLabel === '警告') {
        return !time?.isExpired && time?.days !== undefined && time.days > 3 && time.days <= 7
      } else if (groupLabel === '正常') {
        return !time?.isExpired && time?.days !== undefined && time.days > 7
      }

      return false
    })
    .map(container => {
      // 获取还空箱记录
      let emptyReturn: any = null
      if (container.emptyReturns && container.emptyReturns.length > 0) {
        emptyReturn = container.emptyReturns[0]
      }

      let extractedDate: Date | null = null
      if (emptyReturn?.lastReturnDate) {
        extractedDate = new Date(emptyReturn.lastReturnDate)
      }

      return {
        ...container,
        extractedDate,
      }
    })

  return result
}

// 获取时间组对应的货柜子集
export const getGroupContainersSubset = (
  containers: ContainerItem[],
  laneName: string,
  groupLabel: string
): ContainerItem[] => {
  // 根据不同泳道使用不同的筛选逻辑
  if (laneName === '按到港') {
    return getArrivalSubset(containers, groupLabel)
  } else if (laneName === '按计划提柜') {
    return getPickupSubset(containers, groupLabel)
  } else if (laneName === '按最晚提柜') {
    return getLastPickupSubset(containers, groupLabel)
  } else if (laneName === '按最晚还箱') {
    return getReturnSubset(containers, groupLabel)
  }

  return []
}

// 获取时间组在指定日期的货柜
export const getGroupContainers = (groupSubset: ContainerItem[], date: Date): ContainerItem[] => {
  // 所有货柜都显示在实际提取的日期上
  const targetDate = dayjs(date)
  return groupSubset.filter(item => {
    if (!item.extractedDate) return false
    return dayjs(item.extractedDate).isSame(targetDate, 'day')
  })
}
