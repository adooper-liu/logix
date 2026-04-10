import { containerService } from '@/services/container'
import {
  costOptimizationService,
  type OptimizeContainerResponse,
} from '@/services/costOptimization'
import type { Container } from '@/types/container'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ref, type Ref } from 'vue'
import { buildOptimalSolutionUpdateData, type OptimalStrategy } from './costOptimizationApplyUtils'
import { mergeReturnDateIntoUpdateData } from './ganttReturnDateMergeUtils'

/** API 与视图统一用 YYYY-MM-DD 字符串 */
function toApiDateString(v: string | Date | null | undefined): string | null {
  if (v == null || v === '') return null
  if (typeof v === 'string') return v
  if (v instanceof Date) return v.toISOString().split('T')[0]
  return null
}

const ENABLE_COST_OPT_DEBUG = false

function debugCostOptimization(...args: unknown[]): void {
  if (ENABLE_COST_OPT_DEBUG) {
    console.log(...args)
  }
}

export type GanttOptimizationResultView = OptimizeContainerResponse & {
  containerNumber: string
  currentPickupDate: string
  currentStrategy: string
}

export interface UseGanttCostOptimizationOptions {
  containers: Ref<Container[]>
  loadData: () => Promise<void>
  executeQuickUpdate: (container: Container, updateData: Record<string, string>) => Promise<void>
}

export function useGanttCostOptimization(options: UseGanttCostOptimizationOptions) {
  const { containers, loadData, executeQuickUpdate } = options

  const showOptimizationPanel = ref(false)
  const optimizationResult = ref<GanttOptimizationResultView | null>(null)

  let optimizationDebounceTimer: ReturnType<typeof setTimeout> | null = null

  interface OptimizationCache {
    data: OptimizeContainerResponse
    timestamp: number
  }
  const CACHE_TTL = 5 * 60 * 1000 // 5分钟
  const optimizationCache = new Map<string, OptimizationCache>()

  /**
   * ✅ 执行智能优化：先计算最优方案，显示优化面板
   */
  const executeSmartOptimize = async (container: Container, updateData: Record<string, string>) => {
    try {
      debugCostOptimization('[executeSmartOptimize] 开始智能优化...')

      const trucking = container.truckingTransports?.[0]
      const warehouse = container.warehouseOperations?.[0]

      if (!trucking || !warehouse) {
        console.warn('[executeSmartOptimize] 缺少提柜或卸柜信息，降级为快速更新')
        await executeQuickUpdate(container, updateData)
        return
      }

      const truckingCompanyId = trucking.truckingCompanyId
      const warehouseCode = warehouse.warehouseId

      const basePickupDate =
        toApiDateString(updateData.plannedPickupDate) ||
        toApiDateString(trucking.plannedPickupDate)

      if (!basePickupDate || !truckingCompanyId || !warehouseCode) {
        console.warn('[executeSmartOptimize] 缺少必要参数，降级为快速更新', {
          basePickupDate,
          truckingCompanyId,
          warehouseCode,
        })
        await executeQuickUpdate(container, updateData)
        return
      }

      debugCostOptimization('[executeSmartOptimize] 调用优化 API:', {
        containerNumber: container.containerNumber,
        warehouseCode,
        truckingCompanyId,
        basePickupDate,
      })

      const result = await costOptimizationService.optimizeContainer(container.containerNumber, {
        warehouseCode,
        truckingCompanyId,
        basePickupDate,
      })

      console.log('[executeSmartOptimize] API 原始返回:', result)

      type OptimizeApiShape = { success: boolean; data: OptimizeContainerResponse }
      const raw = result as OptimizeApiShape & Partial<OptimizeContainerResponse>
      let optimizationData: OptimizeContainerResponse | null = null
      if (raw.success && raw.data) {
        optimizationData = raw.data
      } else if (raw.containerNumber != null && raw.suggestedPickupDate != null) {
        optimizationData = raw as OptimizeContainerResponse
      }

      if (optimizationData) {
        console.log('[executeSmartOptimize] API 返回成功，准备显示面板')
        console.log('[executeSmartOptimize] optimizationData:', optimizationData)

        optimizationResult.value = {
          ...optimizationData,
          containerNumber: container.containerNumber,
          currentPickupDate: basePickupDate,
          currentStrategy: trucking.unloadModePlan || 'Direct',
        }

        console.log('[executeSmartOptimize] optimizationResult.value:', optimizationResult.value)
        console.log('[executeSmartOptimize] 设置 showOptimizationPanel = true')

        showOptimizationPanel.value = true

        console.log(
          '[executeSmartOptimize] showOptimizationPanel.value:',
          showOptimizationPanel.value
        )
        debugCostOptimization(
          '[executeSmartOptimize] 显示优化面板（savings:',
          optimizationData.savings,
          ')'
        )
      } else {
        console.warn('[executeSmartOptimize] 优化 API 返回失败，降级为快速更新')
        console.warn('[executeSmartOptimize] result:', result)
        await executeQuickUpdate(container, updateData)
      }
    } catch (error: any) {
      console.error('[executeSmartOptimize] 优化失败，降级为快速更新:', error)
      ElMessage.warning('成本优化计算失败，将执行快速更新')
      await executeQuickUpdate(container, updateData)
    }
  }

  const getCacheKey = (
    containerNumber: string,
    warehouseCode: string,
    truckingCompanyId: string,
    basePickupDate: string
  ): string => {
    return `${containerNumber}_${warehouseCode}_${truckingCompanyId}_${basePickupDate}`
  }

  const getCachedResult = (key: string): OptimizeContainerResponse | null => {
    const cached = optimizationCache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      debugCostOptimization('[CostOptimization] 使用缓存结果')
      return cached.data
    }
    if (cached) {
      optimizationCache.delete(key)
    }
    return null
  }

  const setCachedResult = (key: string, data: OptimizeContainerResponse): void => {
    optimizationCache.set(key, {
      data,
      timestamp: Date.now(),
    })
    debugCostOptimization('[CostOptimization] 缓存结果已设置')
  }

  const triggerCostOptimization = async (
    container: Container,
    updateData: Record<string, string>
  ) => {
    try {
      debugCostOptimization('[triggerCostOptimization] 开始成本优化...')

      const trucking = container.truckingTransports?.[0]
      const warehouse = container.warehouseOperations?.[0]

      if (!trucking || !warehouse) {
        console.warn('[triggerCostOptimization] 缺少提柜或卸柜信息，跳过优化')
        return
      }

      const truckingCompanyId = trucking.truckingCompanyId
      const warehouseCode = warehouse.warehouseId

      const basePickupDate =
        toApiDateString(updateData.plannedPickupDate) ||
        toApiDateString(trucking.plannedPickupDate)

      if (!basePickupDate || !truckingCompanyId || !warehouseCode) {
        console.warn('[triggerCostOptimization] 缺少必要参数，跳过优化', {
          basePickupDate,
          truckingCompanyId,
          warehouseCode,
        })
        return
      }

      const cacheKey = getCacheKey(
        container.containerNumber,
        warehouseCode,
        truckingCompanyId,
        basePickupDate
      )

      const cachedResult = getCachedResult(cacheKey)
      if (cachedResult) {
        debugCostOptimization('[triggerCostOptimization] 命中缓存，直接使用')
        if (cachedResult.savings > 0) {
          optimizationResult.value = {
            ...cachedResult,
            containerNumber: container.containerNumber,
            currentPickupDate: basePickupDate,
            currentStrategy: trucking.unloadModePlan || 'Direct',
          }
          showOptimizationPanel.value = true
        }
        return
      }

      debugCostOptimization('[triggerCostOptimization] 调用优化 API:', {
        containerNumber: container.containerNumber,
        warehouseCode,
        truckingCompanyId,
        basePickupDate,
      })

      const result = await costOptimizationService.optimizeContainer(container.containerNumber, {
        warehouseCode,
        truckingCompanyId,
        basePickupDate,
      })

      if (result.success && result.data) {
        debugCostOptimization('[triggerCostOptimization] 优化结果:', result.data)

        setCachedResult(cacheKey, result.data)

        if (result.data.savings > 0) {
          optimizationResult.value = {
            ...result.data,
            containerNumber: container.containerNumber,
            currentPickupDate: basePickupDate,
            currentStrategy: trucking.unloadModePlan || 'Direct',
          }
          showOptimizationPanel.value = true
        } else {
          debugCostOptimization('[triggerCostOptimization] 无节省空间，不显示面板')
        }
      }
    } catch (error: any) {
      console.error('[triggerCostOptimization] 优化失败:', error)
    }
  }

  const debouncedTriggerCostOptimization = (
    container: Container,
    updateData: Record<string, string>
  ) => {
    if (optimizationDebounceTimer) {
      clearTimeout(optimizationDebounceTimer)
      debugCostOptimization('[CostOptimization] 清除之前的防抖定时器')
    }

    optimizationDebounceTimer = setTimeout(() => {
      debugCostOptimization('[CostOptimization] 防抖延迟结束，执行优化')
      triggerCostOptimization(container, updateData)
      optimizationDebounceTimer = null
    }, 500)

    debugCostOptimization('[CostOptimization] 设置 500ms 防抖定时器')
  }

  const closeOptimizationPanel = () => {
    showOptimizationPanel.value = false
    optimizationResult.value = null
  }

  const applyOptimalSolution = async () => {
    if (!optimizationResult.value) {
      ElMessage.warning('没有可应用的优化方案')
      return
    }

    try {
      debugCostOptimization('[applyOptimalSolution] 开始应用最优方案...')
      debugCostOptimization('[applyOptimalSolution] 优化结果:', optimizationResult.value)

      const { containerNumber, suggestedPickupDate, suggestedStrategy, currentPickupDate } =
        optimizationResult.value

      const targetContainer = containers.value.find(c => c.containerNumber === containerNumber)
      if (!targetContainer) {
        ElMessage.error('未找到目标货柜，无法应用最优方案')
        return
      }

      await ElMessageBox.confirm(
        `确定要应用最优方案吗？\n\n` +
          `当前提柜日: ${currentPickupDate}\n` +
          `建议提柜日: ${suggestedPickupDate}\n` +
          `建议策略: ${suggestedStrategy}\n\n` +
          `系统将自动更新日期并重新计算还箱日。`,
        '应用最优方案',
        {
          confirmButtonText: '确定应用',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )

      debugCostOptimization('[applyOptimalSolution] 用户确认，开始更新...')

      const { updateData, effectiveUnloadMode } = buildOptimalSolutionUpdateData(
        targetContainer,
        suggestedPickupDate,
        suggestedStrategy as OptimalStrategy
      )
      mergeReturnDateIntoUpdateData(targetContainer, updateData, effectiveUnloadMode)

      debugCostOptimization('[applyOptimalSolution] 更新数据:', updateData)

      const result = await containerService.updateSchedule(containerNumber, updateData)

      if (result.success) {
        ElMessage.success({
          message: `✅ 最优方案已应用！提柜日已更新为 ${suggestedPickupDate}`,
          duration: 3000,
        })

        await loadData()

        closeOptimizationPanel()

        debugCostOptimization('[applyOptimalSolution] 应用成功，数据已刷新')
      } else {
        console.error('[applyOptimalSolution] 更新失败:', result)
        ElMessage.error({
          message: result.message || '应用失败，请重试',
          duration: 3000,
        })
      }
    } catch (error: any) {
      if (error !== 'cancel') {
        console.error('[applyOptimalSolution] 应用失败:', error)
        ElMessage.error({
          message: `应用失败：${error.message || '未知错误'}`,
          duration: 5000,
        })
      } else {
        debugCostOptimization('[applyOptimalSolution] 用户取消应用')
      }
    }
  }

  const disposeCostOptimization = () => {
    if (optimizationDebounceTimer) {
      clearTimeout(optimizationDebounceTimer)
      optimizationDebounceTimer = null
      console.log('[CostOptimization] 清理防抖定时器')
    }
    optimizationCache.clear()
    console.log('[CostOptimization] 清理缓存')
  }

  return {
    showOptimizationPanel,
    optimizationResult,
    executeSmartOptimize,
    debouncedTriggerCostOptimization,
    closeOptimizationPanel,
    applyOptimalSolution,
    disposeCostOptimization,
  }
}
