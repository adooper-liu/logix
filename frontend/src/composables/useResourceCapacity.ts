/**
 * 资源档期管理 Composable
 * 
 * 负责处理仓库和车队的档期检查，包括：
 * - 获取仓库档期状态和占用率
 * - 获取车队档期状态和占用率
 * - 批量预加载档期数据
 * - 缓存管理（避免重复请求）
 * 
 * @module composables/useResourceCapacity
 */

import { reactive, ref } from 'vue'
import api from '@/services/api'

export interface CapacityData {
  /** 档期状态 */
  status: string
  /** 占用率（百分比） */
  occupancyRate: number
  /** 基础容量 */
  baseCapacity?: number
  /** 已占用容量 */
  occupied?: number
}

export interface UseResourceCapacityOptions {
  /** 错误回调 */
  onError?: (error: Error) => void
  /** 日志回调 */
  onLog?: (message: string) => void
}

export function useResourceCapacity(options: UseResourceCapacityOptions = {}) {
  const { onError, onLog } = options
  
  /** 档期缓存 Map<cacheKey, CapacityData> */
  const capacityCache = reactive(new Map<string, CapacityData>())
  /** 是否正在加载 */
  const loading = ref(false)

  /**
   * 生成缓存键
   */
  function getCacheKey(type: 'warehouse' | 'trucking', id: string, date: string): string {
    return `${type}:${id}:${date}`
  }

  /**
   * 从缓存或 API 获取档期数据
   */
  async function fetchCapacity(
    type: 'warehouse' | 'trucking',
    id: string,
    date: string
  ): Promise<CapacityData> {
    const cacheKey = getCacheKey(type, id, date)

    // 检查缓存
    if (capacityCache.has(cacheKey)) {
      return capacityCache.get(cacheKey)!
    }

    loading.value = true
    try {
      // 调用后端 API 获取真实档期数据
      const response = await api.get('/scheduling/resources/capacity/range', {
        params: {
          resourceType: type,
          ...(type === 'warehouse' ? { warehouseCode: id } : { truckingCompanyId: id }),
          start: date,
          end: date,
        },
      })

      if (response.data.success && response.data.data.length > 0) {
        const capacityData = response.data.data[0]
        const occupancyRate =
          capacityData.baseCapacity > 0
            ? (capacityData.occupied / capacityData.baseCapacity) * 100
            : 0

        let status = '正常'
        if (occupancyRate >= 95) status = '超负荷'
        else if (occupancyRate >= 80) status = '紧张'

        const result: CapacityData = {
          status,
          occupancyRate,
          baseCapacity: capacityData.baseCapacity,
          occupied: capacityData.occupied,
        }

        capacityCache.set(cacheKey, result)
        return result
      }
    } catch (error) {
      console.error(`获取${type === 'warehouse' ? '仓库' : '车队'}档期失败:`, error)
      onError?.(error as Error)
    } finally {
      loading.value = false
    }

    // 降级：返回默认值
    const defaultData: CapacityData = { status: '正常', occupancyRate: 0 }
    capacityCache.set(cacheKey, defaultData)
    return defaultData
  }

  /**
   * 获取仓库档期
   */
  async function getWarehouseCapacity(
    warehouseCode: string,
    date: string
  ): Promise<CapacityData> {
    return await fetchCapacity('warehouse', warehouseCode, date)
  }

  /**
   * 获取车队档期
   */
  async function getTruckingCapacity(
    truckingCompanyId: string,
    date: string
  ): Promise<CapacityData> {
    return await fetchCapacity('trucking', truckingCompanyId, date)
  }

  /**
   * 获取仓库档期状态文本
   */
  async function getWarehouseCapacityText(
    warehouseCode: string,
    date: string
  ): Promise<string> {
    const data = await getWarehouseCapacity(warehouseCode, date)
    return data.status
  }

  /**
   * 获取车队档期状态文本
   */
  async function getTruckingCapacityText(
    truckingCompanyId: string,
    date: string
  ): Promise<string> {
    const data = await getTruckingCapacity(truckingCompanyId, date)
    return data.status
  }

  /**
   * 获取仓库档期状态类型（用于 UI 样式）
   */
  function getWarehouseCapacityStatus(status: string): string {
    if (status === '已过期' || status === '超负荷') return 'danger'
    if (status === '紧张') return 'warning'
    return 'success'
  }

  /**
   * 获取车队档期状态类型（用于 UI 样式）
   */
  function getTruckingCapacityStatus(status: string): string {
    if (status === '已过期' || status === '超负荷') return 'danger'
    if (status === '紧张') return 'warning'
    return 'success'
  }

  /**
   * 批量预加载档期数据
   * 
   * @param requests 预加载请求列表
   * @param options 并发配置
   */
  async function preloadCapacity(
    requests: Array<{
      type: 'warehouse' | 'trucking'
      id: string
      date: string
    }>,
    options: { maxConcurrent?: number } = {}
  ) {
    const { maxConcurrent = 10 } = options
    
    if (requests.length === 0) {
      onLog?.('[预加载] 没有需要加载的数据')
      return
    }

    const truckingRequests = requests.filter(r => r.type === 'trucking')
    const warehouseRequests = requests.filter(r => r.type === 'warehouse')

    onLog?.(
      `[预加载] 需要加载 ${truckingRequests.length} 个车队，${warehouseRequests.length} 个仓库`
    )

    // 批量并发请求 (限制并发数)
    const processChunk = async (
      chunk: Array<{ type: 'warehouse' | 'trucking'; id: string; date: string }>
    ) => {
      const promises = chunk.map(async req => {
        try {
          if (req.type === 'warehouse') {
            await getWarehouseCapacity(req.id, req.date)
          } else {
            await getTruckingCapacity(req.id, req.date)
          }
        } catch (error) {
          console.warn(`[预加载] ${req.type}:${req.id}:${req.date} 失败:`, error)
        }
      })
      await Promise.all(promises)
    }

    // 处理车队请求
    const truckingChunks = truckingRequests.reduce((acc, req, i) => {
      if (i % maxConcurrent === 0) acc.push([])
      acc[acc.length - 1].push(req)
      return acc
    }, [] as typeof truckingRequests[])

    for (const chunk of truckingChunks) {
      await processChunk(chunk)
    }

    // 处理仓库请求
    const warehouseChunks = warehouseRequests.reduce((acc, req, i) => {
      if (i % maxConcurrent === 0) acc.push([])
      acc[acc.length - 1].push(req)
      return acc
    }, [] as typeof warehouseRequests[])

    for (const chunk of warehouseChunks) {
      await processChunk(chunk)
    }

    onLog?.('[预加载] 完成')
  }

  /**
   * 清空缓存
   */
  function clearCache() {
    capacityCache.clear()
    onLog?.('[缓存] 已清空')
  }

  /**
   * 从行数据中提取并预加载档期
   * 
   * @param results 排产结果数组
   */
  async function preloadFromResults(results: any[]) {
    const requests = results.flatMap(row => {
      const reqs: Array<{ type: 'warehouse' | 'trucking'; id: string; date: string }> = []

      if (row.plannedData) {
        // 车队
        const truckingId = row.plannedData.truckingCompanyId || row.plannedData.truckingCompany
        const pickupDate = row.plannedData.plannedPickupDate
        if (truckingId && pickupDate) {
          reqs.push({
            type: 'trucking',
            id: truckingId,
            date: pickupDate,
          })
        }

        // 仓库
        const warehouseCode = row.plannedData.warehouseId || row.plannedData.warehouseCode
        const unloadDate = row.plannedData.plannedUnloadDate
        if (warehouseCode && unloadDate) {
          reqs.push({
            type: 'warehouse',
            id: warehouseCode,
            date: unloadDate,
          })
        }
      }

      return reqs
    })

    await preloadCapacity(requests)
  }

  return {
    /** 档期缓存 */
    capacityCache,
    /** 是否正在加载 */
    loading,
    /** 获取仓库档期 */
    getWarehouseCapacity,
    /** 获取车队档期 */
    getTruckingCapacity,
    /** 获取仓库档期文本 */
    getWarehouseCapacityText,
    /** 获取车队档期文本 */
    getTruckingCapacityText,
    /** 获取仓库档期状态类型 */
    getWarehouseCapacityStatus,
    /** 获取车队档期状态类型 */
    getTruckingCapacityStatus,
    /** 批量预加载档期 */
    preloadCapacity,
    /** 从结果数据预加载 */
    preloadFromResults,
    /** 清空缓存 */
    clearCache,
  }
}
