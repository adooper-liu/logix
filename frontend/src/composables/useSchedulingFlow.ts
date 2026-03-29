/**
 * 排产流程管理 Composable
 *
 * 负责处理批量排产的核心逻辑，包括：
 * - 批量排产（支持分批确认）
 * - 预览排产
 * - 确认保存排产结果
 *
 * @module composables/useSchedulingFlow
 */

import { containerService } from '@/services/container'
import type { ScheduleResult } from '@/services/ai'
import { ref } from 'vue'

export interface UseSchedulingFlowOptions {
  /** 日志回调 */
  onLog: (message: string, type: 'info' | 'success' | 'error' | 'warning') => void
  /** 进度回调 */
  onProgress?: (progress: number) => void
  /** 成功回调 */
  onSuccess?: (result: any) => void
  /** 错误回调 */
  onError?: (error: Error) => void
}

export interface ScheduleParams {
  /** 国家 */
  country?: string
  /** 目的港代码 */
  portCode?: string
  /** 开始日期 */
  startDate?: string
  /** 结束日期 */
  endDate?: string
  /** 是否预览 (不保存) */
  dryRun?: boolean
  /** ETA 顺延天数 */
  etaBufferDays?: number
}

export function useSchedulingFlow(options: UseSchedulingFlowOptions) {
  const { onLog, onProgress, onSuccess, onError } = options
  const scheduling = ref(false)

  /**
   * 批量排产（支持分批确认）
   *
   * @param params 排产参数
   * @returns 排产结果
   */
  const handleBatchSchedule = async (params: ScheduleParams) => {
    scheduling.value = true
    const allResults: any[] = []
    let totalSuccess = 0
    let totalFailed = 0

    try {
      onLog('开始排产...', 'info')

      // 调用批量排产接口
      const result = await containerService.batchSchedule({
        country: params.country,
        portCode: params.portCode,
        startDate: params.startDate,
        endDate: params.endDate,
        dryRun: params.dryRun ?? false,
        etaBufferDays: params.etaBufferDays,
      })

      if (!result.success) {
        throw new Error('排产失败')
      }

      // 处理结果
      result.results.forEach((r: any) => {
        allResults.push(r)
        if (r.success) {
          totalSuccess++
        } else {
          totalFailed++
        }
      })

      onLog(
        `排产结束：成功 ${totalSuccess}/${totalSuccess + totalFailed}`,
        totalFailed > 0 ? 'warning' : 'success'
      )

      onSuccess?.(result)

      return {
        success: true,
        results: allResults as ScheduleResult['results'],
        totalSuccess,
        totalFailed,
        hasMore: result.hasMore,
      }
    } catch (error: any) {
      const errorMessage = error.message || '排产异常'
      onLog(errorMessage, 'error')
      onError?.(error as Error)

      return {
        success: false,
        error: errorMessage,
      }
    } finally {
      scheduling.value = false
    }
  }

  /**
   * 预览排产（dryRun=true）
   *
   * @param params 排产参数
   * @returns 预览结果
   */
  const handlePreviewSchedule = async (params: ScheduleParams) => {
    return await handleBatchSchedule({
      ...params,
      dryRun: true,
    })
  }

  /**
   * 确认保存排产结果
   *
   * @param containerNumbers 货柜号列表
   * @param previewResults 预览结果数据
   * @returns 保存结果
   */
  const handleConfirmSave = async (containerNumbers: string[], previewResults: any[]) => {
    try {
      onLog(`正在保存 ${containerNumbers.length} 个货柜的排产结果...`, 'info')

      const result = await containerService.confirmSchedule({
        containerNumbers,
        previewResults,
      })

      if (result.success) {
        onLog(`成功保存 ${result.savedCount} 个货柜`, 'success')

        return {
          success: true,
          savedCount: result.savedCount,
        }
      } else {
        onLog('保存失败', 'error')
        return {
          success: false,
          error: '保存失败',
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || '保存失败'
      onLog(errorMessage, 'error')
      onError?.(error as Error)

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  return {
    /** 是否正在排产 */
    scheduling,
    /** 批量排产 */
    handleBatchSchedule,
    /** 预览排产 */
    handlePreviewSchedule,
    /** 确认保存 */
    handleConfirmSave,
  }
}
