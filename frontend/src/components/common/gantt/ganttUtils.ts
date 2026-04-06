/**
 * 甘特图工具函数
 * Gantt Chart Utility Functions
 */

import dayjs from 'dayjs'

/**
 * 根据日期和供应商获取货柜列表
 * @param date 目标日期
 * @param containers 货柜列表
 * @param nodeName 节点名称（清关/提柜/卸柜/还箱）
 * @param isReturnedEmpty 判断是否已还箱的函数
 * @param getNodePlannedDate 获取节点计划日期的函数
 * @returns 符合条件的货柜列表
 */
export function getContainersByDateAndSupplier(
  date: Date,
  containers: any[],
  nodeName: string,
  isReturnedEmpty: (container: any) => boolean,
  getNodePlannedDate: (container: any, nodeName: string) => Date | null
): any[] {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  
  return containers.filter(container => {
    // 排除已还箱的货柜
    if (isReturnedEmpty(container)) return false

    const plannedDate = getNodePlannedDate(container, nodeName)
    if (!plannedDate || dayjs(plannedDate).format('YYYY-MM-DD') !== dateStr) {
      return false
    }

    // 只要有计划日期就显示（不限制任务类型）
    return true
  })
}

/**
 * 根据日期和港口获取货柜列表
 * @param date 目标日期
 * @param port 港口代码
 * @param containers 所有货柜列表
 * @param isReturnedEmpty 判断是否已还箱的函数
 * @param getNodePlannedDate 获取节点计划日期的函数
 * @returns 符合条件的货柜列表
 */
export function getContainersByDateAndPort(
  date: Date,
  port: string,
  containers: any[],
  isReturnedEmpty: (container: any) => boolean,
  getNodePlannedDate: (container: any, nodeName: string) => Date | null
): any[] {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  
  return containers.filter(container => {
    // 排除已还箱的货柜
    if (isReturnedEmpty(container)) return false
    
    // 检查是否属于该港口
    if (container.destinationPort !== port) return false

    // 获取清关日的计划日期（目的港汇总行显示清关节点）
    const plannedDate = getNodePlannedDate(container, '清关')
    if (!plannedDate || dayjs(plannedDate).format('YYYY-MM-DD') !== dateStr) {
      return false
    }

    return true
  })
}

/**
 * 根据日期和港口获取未分类货柜列表
 * @param date 目标日期
 * @param port 港口代码
 * @param containers 所有货柜列表
 * @param isReturnedEmpty 判断是否已还箱的函数
 * @param getNodePlannedDate 获取节点计划日期的函数
 * @param groupedByPortNodeSupplier 分组数据
 * @returns 符合条件的未分类货柜列表
 */
export function getUnclassifiedContainersByDateAndPort(
  date: Date,
  port: string,
  containers: any[],
  isReturnedEmpty: (container: any) => boolean,
  getNodePlannedDate: (container: any, nodeName: string) => Date | null,
  groupedByPortNodeSupplier: Record<string, Record<string, Record<string, any[]>>>
): any[] {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  
  return containers.filter(container => {
    // 排除已还箱的货柜
    if (isReturnedEmpty(container)) return false
    
    // 检查是否属于该港口
    if (container.destinationPort !== port) return false

    // 检查是否已分配到任何节点-供应商组合
    const nodesByPort = groupedByPortNodeSupplier[port]
    if (nodesByPort) {
      for (const suppliersByNode of Object.values(nodesByPort)) {
        for (const supplierContainers of Object.values(suppliersByNode)) {
          if (supplierContainers.some(c => c.containerNumber === container.containerNumber)) {
            return false // 已分配，不属于未分类
          }
        }
      }
    }

    // 获取清关日的计划日期
    const plannedDate = getNodePlannedDate(container, '清关')
    if (!plannedDate || dayjs(plannedDate).format('YYYY-MM-DD') !== dateStr) {
      return false
    }

    return true
  })
}
