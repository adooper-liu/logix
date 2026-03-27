/**
 * 智能排产成本优化组合式函数
 * Intelligent Scheduling Cost Optimization Composable
 *
 * 提供统一的成本优化逻辑，避免重复代码
 *遵循 SKILL 原则：Single Source of Truth（单一事实来源）
 */

import { costOptimizerService, type Alternative } from '@/services/costOptimizer.service'
import type { ScheduleResult } from '@/types/scheduling'
import { ref } from 'vue'

/**
 * 优化请求参数
 */
interface OptimizeParams {
  containerNumbers: string[] // 柜号列表（单柜时为 [containerNumber]）
  warehouseCode: string // 仓库编码
  truckingCompanyId: string // 车队 ID
  basePickupDate: string // 基础提柜日
}

/**
 * 优化结果
 */
interface OptimizeResult {
  optimizedCount: number
  totalSavings: number
  alternatives: Alternative[]
}

/**
 * 从排产结果中提取优化参数
 *遵循 SKILL 原则：从权威数据源（plannedData）获取
 *
 * @param scheduleResults 排产结果（支持单个或多个）
 * @returns 优化参数，失败时返回 null
 */
export function extractOptimizeParams(
  scheduleResults: ScheduleResult[] | ScheduleResult
): OptimizeParams | null {
  const results = Array.isArray(scheduleResults) ? scheduleResults : [scheduleResults]

  if (!results || results.length === 0) {
    console.error('[extractOptimizeParams] No schedule results provided')
    return null
  }

  // 过滤成功的排产结果
  const successfulResults = results.filter(r => r.success && r.plannedData)
  if (successfulResults.length === 0) {
    console.error('[extractOptimizeParams] No successful schedule results')
    return null
  }

  // 提取柜号列表
  const containerNumbers = successfulResults.map(r => r.containerNumber)

  // ✅ 关键修复：plannedData.warehouseId 存储的就是 warehouseCode（见后端代码第 674 行）
  // 优先级：plannedData.warehouseId > plannedData.warehouseCode > 其他备用字段
  const firstPlannedData = successfulResults[0].plannedData!
  const warehouseCode =
    firstPlannedData.warehouseId || // ✅ 首选：warehouseId（实际是 warehouseCode）
    firstPlannedData.warehouseCode || // 备选：warehouseCode 字段
    firstPlannedData.warehouseName?.split(' ')[0] || // 降级：从名称提取
    ''

  // 车队 ID 提取
  const truckingCompanyId =
    firstPlannedData.truckingCompanyId || // ✅ 首选
    firstPlannedData.truckingCompany || // 备选
    ''

  // 基础提柜日提取
  const basePickupDate =
    firstPlannedData.plannedPickupDate || // ✅ 首选
    ''

  // 验证必要参数
  if (!warehouseCode) {
    console.error('[extractOptimizeParams] Missing warehouseCode')
    return null
  }
  if (!truckingCompanyId) {
    console.error('[extractOptimizeParams] Missing truckingCompanyId')
    return null
  }
  if (!basePickupDate) {
    console.error('[extractOptimizeParams] Missing basePickupDate')
    return null
  }

  return {
    containerNumbers,
    warehouseCode,
    truckingCompanyId,
    basePickupDate,
  }
}

/**
 * 智能成本优化 Hook
 *
 * @param autoExtractParams 是否自动从排产结果提取参数（默认 true）
 * @returns 优化相关的方法和状态
 */
export function useCostOptimization(autoExtractParams = true) {
  // 加载状态
  const optimizing = ref(false)
  const optimizationResult = ref<OptimizeResult | null>(null)

  /**
   * 执行成本优化
   *
   * @param paramsOrResults 优化参数或排产结果
   * @returns 优化结果
   */
  async function executeOptimization(
    paramsOrResults: OptimizeParams | ScheduleResult[] | ScheduleResult
  ): Promise<OptimizeResult> {
    optimizing.value = true
    optimizationResult.value = null

    try {
      // 自动提取参数或直接使用传入的参数
      let params: OptimizeParams
      if (
        autoExtractParams ||
        Array.isArray(paramsOrResults) ||
        !('containerNumbers' in paramsOrResults)
      ) {
        const extracted = extractOptimizeParams(paramsOrResults as any)
        if (!extracted) {
          throw new Error('无法提取优化参数：请确认排产结果包含完整的仓库、车队和日期信息')
        }
        params = extracted
      } else {
        params = paramsOrResults as OptimizeParams
      }

      console.log('[useCostOptimization] Request params:', params)

      // 调用后端优化 API
      const result = await costOptimizerService.suggestOptimalUnloadDate({
        containers: params.containerNumbers,
        warehouseCode: params.warehouseCode,
        truckingCompanyId: params.truckingCompanyId,
        basePickupDate: params.basePickupDate,
        // ✅ 不再传递 lastFreeDate：后端应该自行从 DemurrageService 查询
      })

      console.log('[useCostOptimization] Optimization result:', result)

      // 包装结果
      optimizationResult.value = {
        optimizedCount: result.alternatives.length,
        totalSavings: result.savings,
        alternatives: result.alternatives,
      }

      return optimizationResult.value
    } catch (error: any) {
      console.error('[useCostOptimization] Optimization failed:', error)
      throw error
    } finally {
      optimizing.value = false
    }
  }

  /**
   * 重置优化状态
   */
  function reset() {
    optimizing.value = false
    optimizationResult.value = null
  }

  return {
    // 状态
    optimizing,
    optimizationResult,

    // 方法
    executeOptimization,
    reset,

    // 工具函数
    extractOptimizeParams,
  }
}

/**
 * 类型导出
 */
export type { OptimizeParams, OptimizeResult }
