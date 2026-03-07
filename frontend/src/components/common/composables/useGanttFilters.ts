import dayjs from 'dayjs'
import type { ContainerItem } from '../types/ganttChart'
import { getRemainingTime } from './useGanttHelpers'

/** 是否已到中转港（与后端 excludeContainersArrivedAtTransit 一致：存在 transit 且 ata/gate_in/transit_arrival 有值） */
function hasArrivedAtTransit(container: ContainerItem): boolean {
  const ops = container.portOperations as Array<{ portType?: string; ataDestPort?: unknown; gateInTime?: unknown; transitArrivalDate?: unknown }> | undefined
  if (!ops?.length) return false
  return ops.some(
    po =>
      po.portType === 'transit' &&
      (po.ataDestPort != null || po.gateInTime != null || po.transitArrivalDate != null)
  )
}

// 获取按到港分组的货柜子集（与后端 ArrivalStatistics / EtaStatistics 口径一致）
export const getArrivalSubset = (
  containers: ContainerItem[],
  groupLabel: string
): ContainerItem[] => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = containers
    .filter(container => {
      const etaDate = container.etaDestPort
      const ataDate = container.ataDestPort
      const currentPortType = container.currentPortType

      // 其他记录：目的港无 ETA 且无 ATA（与后端 otherRecords 一致）
      if (groupLabel === '其他记录') {
        return !etaDate && !ataDate
      }
      if (!etaDate && !ataDate) return false

      // 预计到港仅 shipped/in_transit，且排除已到中转港（与后端 EtaStatistics 一致）
      const isEtaTargetStatus = ['shipped', 'in_transit'].includes(
        container.logisticsStatus?.toLowerCase() || ''
      )

      if (groupLabel === '今日到港') {
        if (ataDate && currentPortType !== 'transit') {
          const arrivalDate = new Date(ataDate)
          arrivalDate.setHours(0, 0, 0, 0)
          return arrivalDate.getTime() === today.getTime()
        }
        return false
      }

      if (groupLabel === '今日之前到港未提柜') {
        if (ataDate && currentPortType !== 'transit') {
          const logisticsStatus = container.logisticsStatus?.toLowerCase()
          if (!['picked_up', 'unloaded', 'returned_empty'].includes(logisticsStatus || '')) {
            const arrivalDate = new Date(ataDate)
            arrivalDate.setHours(0, 0, 0, 0)
            return arrivalDate.getTime() < today.getTime()
          }
        }
        return false
      }

      if (groupLabel === '今日之前到港已提柜') {
        if (ataDate && currentPortType !== 'transit') {
          const logisticsStatus = container.logisticsStatus?.toLowerCase()
          if (['picked_up', 'unloaded', 'returned_empty'].includes(logisticsStatus || '')) {
            const arrivalDate = new Date(ataDate)
            arrivalDate.setHours(0, 0, 0, 0)
            return arrivalDate.getTime() < today.getTime()
          }
        }
        return false
      }

      // 预计到港子项：仅 shipped/in_transit，且排除已到中转港
      if (
        groupLabel === '已逾期到港' ||
        groupLabel === '3日内预计到港' ||
        groupLabel === '7日内预计到港' ||
        groupLabel === '7日后预计到港'
      ) {
        if (!isEtaTargetStatus || hasArrivedAtTransit(container)) return false
        if (!etaDate || ataDate) return false
        const eta = new Date(etaDate)
        eta.setHours(0, 0, 0, 0)
        const diffTime = eta.getTime() - today.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        if (groupLabel === '已逾期到港') return diffDays < 0
        if (groupLabel === '3日内预计到港') return diffDays >= 0 && diffDays <= 3
        if (groupLabel === '7日内预计到港') return diffDays > 3 && diffDays <= 7
        if (groupLabel === '7日后预计到港') return diffDays > 7
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

// 获取按提柜计划分组的货柜子集
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

      // 到达目的港判断（用于按提柜计划的各分组）
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
        // 与后端 PENDING_ARRANGEMENT 一致：已到目的港、未实际提柜，且（无拖卡 or 有拖卡但无计划日）
        if (!arrivedAtDestination) return false
        if (firstTrucking?.pickupDate) return false
        return !firstTrucking || !firstTrucking.plannedPickupDate
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
        // 与后端一致：(today, threeDaysLater] 即剩余 1～3 天（不含今日，今日属「今日计划提柜」）
        if (!arrivedAtDestination) return false
        if (!firstTrucking?.plannedPickupDate) return false
        if (firstTrucking.pickupDate) return false
        const plannedPickupDate = new Date(firstTrucking.plannedPickupDate)
        const time = getRemainingTime(plannedPickupDate)
        if (!time || time.isExpired) return false
        return time.days >= 1 && time.days <= 3
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

// 从货柜上取最晚提柜日：列表接口只返回扁平 lastFreeDate，详情接口有 portOperations
function getLastFreeDateFromContainer(container: ContainerItem): Date | null {
  if (container.lastFreeDate) return new Date(container.lastFreeDate)
  const portOps = container.portOperations as Array<{ portType?: string; lastFreeDate?: unknown }> | undefined
  if (portOps?.length) {
    const dest = portOps.find(op => op.portType === 'destination')
    if (dest?.lastFreeDate) return new Date(dest.lastFreeDate as string | Date)
  }
  return null
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

      const lastFreeDate = getLastFreeDateFromContainer(container)

      // 获取目的港操作记录（用于 plannedPickupDate；列表无 portOperations 时仅用 lastFreeDate）
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

      // 检查是否有实际提柜日期（从拖卡运输记录中获取，字段可能为 pickupDate 或 pickupTime）
      if (container.truckingTransports && container.truckingTransports.length > 0) {
        const firstTrucking = container.truckingTransports[0] as any
        if (firstTrucking.pickupTime || firstTrucking.pickupDate) {
          hasActualPickupDate = true
        }
      }

      // 情况3：有计划日期 + 有实际提柜 → 不纳入统计
      if (hasPlannedPickupDate && hasActualPickupDate) {
        return false
      }

      // 情况1和情况2：需要 lastFreeDate 才能纳入统计（除了"最晚提柜日为空"分组）
      if (!lastFreeDate) {
        return groupLabel === '最晚提柜日为空'
      }

      const time = getRemainingTime(lastFreeDate)

      if (groupLabel === '已逾期') {
        return time?.isExpired === true
      } else if (groupLabel === '紧急') {
        // 与后端一致：today <= last_free_date < threeDaysLater，即剩余 0～2 天（不含第 3 天）
        return !time?.isExpired && time?.days !== undefined && time.days < 3
      } else if (groupLabel === '警告') {
        // 与后端一致：threeDaysLater <= last_free_date < sevenDaysLater，即剩余 3～7 天
        return !time?.isExpired && time?.days !== undefined && time.days >= 3 && time.days <= 7
      } else if (groupLabel === '正常') {
        return !time?.isExpired && time?.days !== undefined && time.days > 7
      }

      return false
    })
    .map(container => {
      const lastFreeDate = getLastFreeDateFromContainer(container)
      return {
        ...container,
        extractedDate: lastFreeDate,
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

      // 与后端 LastReturnStatistics 一致：目标集仅 picked_up / unloaded
      if (logisticsStatus !== 'picked_up' && logisticsStatus !== 'unloaded') return false

      // 获取拖卡运输记录（仅用于取还空箱等，目标集已由状态限定）
      let firstTrucking: any = null
      if (container.truckingTransports && container.truckingTransports.length > 0) {
        firstTrucking = container.truckingTransports[0]
      }

      // 获取还空箱记录
      let emptyReturn: any = null
      if (container.emptyReturns && container.emptyReturns.length > 0) {
        emptyReturn = container.emptyReturns[0]
      }

      // 如果已还箱，则不参与统计
      if (emptyReturn?.returnTime) return false

      if (!emptyReturn?.lastReturnDate) {
        return groupLabel === '最后还箱日为空'
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
  } else if (laneName === '按提柜计划') {
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
