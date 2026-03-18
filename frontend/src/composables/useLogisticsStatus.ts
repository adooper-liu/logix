import type { ContainerListItem } from '@/types/container'
import { SimplifiedStatus, getLogisticsStatusText, getLogisticsStatusType } from '@/utils/logisticsStatusMachine'

/**
 * 物流状态相关的组合式函数
 * Logistics status related composable function
 */
export function useLogisticsStatus() {
  /**
   * 获取物流状态文本
   * Get logistics status text
   * @param container 货柜对象
   * @returns 状态文本
   */
  const getLogisticsStatusTextForContainer = (container: ContainerListItem): string => {
    const status = container.logisticsStatus
    const currentPortType = container.currentPortType || container.latestPortOperation?.portType
    return getLogisticsStatusText(status, currentPortType)
  }

  /**
   * 获取状态类型（用于 Tag 组件）
   * Get status type (for Tag component)
   * @param status 状态值
   * @returns 状态类型
   */
  const getStatusTypeForContainer = (status: string): string => {
    return getLogisticsStatusType(status)
  }

  /**
   * 状态判断函数：是否已出运但未到港之后的状态
   * @param status 状态值
   * @returns 是否已出运
   */
  const isShippedButNotArrived = (status: string) => {
    const statusIndex = [
      SimplifiedStatus.NOT_SHIPPED,
      SimplifiedStatus.SHIPPED,
      SimplifiedStatus.IN_TRANSIT,
      SimplifiedStatus.AT_PORT,
      SimplifiedStatus.PICKED_UP,
      SimplifiedStatus.UNLOADED,
      SimplifiedStatus.RETURNED_EMPTY,
    ].indexOf(status as SimplifiedStatus)

    // 已出运（SHIPPED、IN_TRANSIT、AT_PORT）
    const isShipped = statusIndex >= 1 && statusIndex <= 3
    return isShipped
  }

  /**
   * 状态判断函数：是否未提柜及之后状态没有任一发生
   * @param status 状态值
   * @returns 是否未提柜
   */
  const isNotPickedUp = (status: string) => {
    const statusIndex = [
      SimplifiedStatus.NOT_SHIPPED,
      SimplifiedStatus.SHIPPED,
      SimplifiedStatus.IN_TRANSIT,
      SimplifiedStatus.AT_PORT,
      SimplifiedStatus.PICKED_UP,
      SimplifiedStatus.UNLOADED,
      SimplifiedStatus.RETURNED_EMPTY,
    ].indexOf(status as SimplifiedStatus)

    // 未提柜及之后状态（NOT_SHIPPED、SHIPPED、IN_TRANSIT、AT_PORT）
    return statusIndex >= 0 && statusIndex <= 3
  }

  /**
   * 过滤货柜列表，支持特殊状态值
   * @param containers 货柜列表
   * @param statusFilters 状态筛选条件
   * @returns 过滤后的货柜列表
   */
  const filterContainersByStatus = (containers: ContainerListItem[], statusFilters: string[]) => {
    if (statusFilters.length === 0) return containers

    const set = new Set(statusFilters)
    return containers.filter((row) => {
      // 处理特殊状态值
      if (set.has('arrived_at_transit')) {
        return row.logisticsStatus === SimplifiedStatus.AT_PORT && 
               (row.currentPortType === 'transit' || row.latestPortOperation?.portType === 'transit')
      }
      if (set.has('arrived_at_destination')) {
        return row.logisticsStatus === SimplifiedStatus.AT_PORT && 
               (row.currentPortType === 'destination' || row.latestPortOperation?.portType === 'destination')
      }
      // 处理普通状态值
      return set.has(row.logisticsStatus)
    })
  }

  return {
    getLogisticsStatusText: getLogisticsStatusTextForContainer,
    getStatusType: getStatusTypeForContainer,
    isShippedButNotArrived,
    isNotPickedUp,
    filterContainersByStatus,
    SimplifiedStatus
  }
}
