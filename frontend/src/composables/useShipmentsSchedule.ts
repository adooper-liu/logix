import { ref, h } from 'vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { containerService } from '@/services/container'
import { useAppStore } from '@/store/app'

/**
 * 货柜排产相关的组合式函数
 * Shipments scheduling related composable function
 */
export function useShipmentsSchedule() {
  const appStore = useAppStore()
  
  // 批量排产加载状态
  const batchScheduleLoading = ref(false)
  const scheduleDialogVisible = ref(false)
  
  // 免费日更新加载状态
  const demurrageWriteBackLoading = ref(false)

  /**
   * 执行直接排产
   * @param shipmentDateRange 出运日期范围
   */
  const executeDirectSchedule = async (shipmentDateRange: [Date, Date]) => {
    scheduleDialogVisible.value = false
    
    // 操作指引对话框
    const confirmed = await ElMessageBox.confirm(
      h('div', { style: 'text-align: left; line-height: 1.8;' }, [
        h('p', { style: 'margin-bottom: 12px; font-weight: bold;' }, '智能排产流程：'),
        h('ol', { style: 'padding-left: 20px; margin: 0;' }, [
          h('li', '查询所有"待排产"状态的货柜（schedule_status = initial）'),
          h('li', '按清关可放行日排序（先到先得）'),
          h('li', '为每个货柜匹配滞港费标准，计算最晚提柜日'),
          h('li', '根据目的港选择候选仓库和车队'),
          h('li', '计算计划提柜日、计划卸柜日、最晚还箱日'),
          h('li', '更新货柜的排产状态和计划日期')
        ]),
        h('p', { style: 'margin-top: 12px; color: #909399; font-size: 13px;' },
          '提示：处理"待排产"(initial)和"已排产"(issued)状态，"已派工"(dispatched)的货柜不可重复处理'
        )
      ]),
      '一键排产',
      {
        confirmButtonText: '开始排产',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: true
      }
    ).catch(() => false)

    if (!confirmed) return

    batchScheduleLoading.value = true
    try {
      const result = await containerService.batchSchedule({
        country: appStore.scopedCountryCode?.trim() || undefined,
        startDate: shipmentDateRange?.[0] ? dayjs(shipmentDateRange[0]).format('YYYY-MM-DD') : undefined,
        endDate: shipmentDateRange?.[1] ? dayjs(shipmentDateRange[1]).format('YYYY-MM-DD') : undefined
      })

      if (result.success) {
        ElMessage.success(`排产完成：成功 ${result.successCount}/${result.total} 个`)
        return true
      } else {
        ElMessage.error(result.results?.[0]?.message || '排产失败')
        return false
      }
    } catch (error: any) {
      ElMessage.error(error.message || '排产失败')
      return false
    } finally {
      batchScheduleLoading.value = false
    }
  }

  /**
   * 执行免费日更新
   */
  const handleDemurrageWriteBack = async () => {
    const confirmed = await ElMessageBox.confirm(
      h('div', { style: 'text-align: left; line-height: 2;' }, [
        h('p', { style: 'margin-bottom: 16px; font-weight: bold; font-size: 15px;' }, '免费日计算逻辑'),
        h('div', { style: 'background: #f5f7fa; padding: 12px; border-radius: 4px; margin-bottom: 16px;' }, [
          h('p', { style: 'font-weight: bold; margin-bottom: 8px;' }, '① 最晚提柜日 (last_free_date)'),
          h('p', { style: 'margin: 0; color: #606266;' }, '计算公式：基准日 + (免费天数 - 1)天'),
          h('p', { style: 'margin: 8px 0 0 0; color: #909399; font-size: 13px;' }, '基准日优先级：修正ETA → ETA → ATA → 实际卸船日'),
          h('p', { style: 'margin: 8px 0 0 0; color: #409eff; font-size: 13px;' }, '举例：ETA=2026-02-16，免费天数=7天（来自滞港费标准表）→ last_free_date=2026-02-22')
        ]),
        h('div', { style: 'background: #f5f7fa; padding: 12px; border-radius: 4px;' }, [
          h('p', { style: 'font-weight: bold; margin-bottom: 8px;' }, '② 最晚还箱日 (last_return_date)'),
          h('p', { style: 'margin: 0; color: #606266;' }, '计算公式：(实际提柜日 或 last_free_date) + 免费用箱天数'),
          h('p', { style: 'margin: 8px 0 0 0; color: #909399; font-size: 13px;' }, '免费天数来自滞箱费标准表'),
          h('p', { style: 'margin: 8px 0 0 0; color: #409eff; font-size: 13px;' }, '举例：last_free_date=2026-02-22，免费用箱天数=7天 → last_return_date=2026-03-01')
        ]),
        h('p', { style: 'margin-top: 16px; color: #909399; font-size: 13px;' },
          '注：定时任务每24小时自动执行一次'
        )
      ]),
      '免费日更新',
      {
        confirmButtonText: '开始更新',
        cancelButtonText: '取消',
        type: 'info',
        dangerouslyUseHTMLString: true
      }
    ).catch(() => false)

    if (!confirmed) return

    demurrageWriteBackLoading.value = true
    try {
      const result = await containerService.batchWriteBackDemurrageDates({
        limitLastFree: 500,
        limitLastReturn: 500
      })

      if (result.success) {
        const payload = (result as any).data || result
        const lastFreeWritten = Number(payload.lastFreeWritten ?? 0)
        const lastFreeProcessed = Number(payload.lastFreeProcessed ?? 0)
        const lastReturnWritten = Number(payload.lastReturnWritten ?? 0)
        const lastReturnProcessed = Number(payload.lastReturnProcessed ?? 0)
        ElMessage.success(
          `计算完成：最晚提柜日 ${lastFreeWritten}/${lastFreeProcessed}，最晚还箱日 ${lastReturnWritten}/${lastReturnProcessed}`
        )
        return true
      } else {
        ElMessage.error('计算失败')
        return false
      }
    } catch (error: any) {
      ElMessage.error(error.message || '计算失败')
      return false
    } finally {
      demurrageWriteBackLoading.value = false
    }
  }

  return {
    batchScheduleLoading,
    scheduleDialogVisible,
    demurrageWriteBackLoading,
    executeDirectSchedule,
    handleDemurrageWriteBack
  }
}
