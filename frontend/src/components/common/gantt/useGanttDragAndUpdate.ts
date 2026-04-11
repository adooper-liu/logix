import { containerService } from '@/services/container'
import type { Container } from '@/types/container'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ref, type Ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  mergeReturnDateIntoUpdateData,
  mergeReturnDateWhenPickupOnlyForward,
} from './ganttReturnDateMergeUtils'

/**
 * 甘特图拖拽与更新逻辑抽离
 * Gantt Chart Drag and Update Logic Composable
 *
 * @param options - 配置选项
 * @returns 拖拽相关的状态和方法
 *
 * @example
 * ```ts
 * const {
 *   handleDragStart,
 *   handleDragEnd,
 *   handleDrop,
 * } = useGanttDragAndUpdate({
 *   containers,
 *   loadData,
 *   executeQuickUpdate,
 * })
 * ```
 */

interface UseGanttDragAndUpdateOptions {
  containers: Ref<Container[]>
  loadData: () => Promise<void>
  executeQuickUpdate?: (container: Container, updateData: Record<string, string>) => Promise<void>
  hideTooltip?: () => void
  showContextMenu?: Ref<boolean>
  groupedByPortNodeSupplier?: Ref<Record<string, Record<string, Record<string, Container[]>>>>
}

export function useGanttDragAndUpdate(options: UseGanttDragAndUpdateOptions) {
  const {
    loadData,
    executeQuickUpdate,
    hideTooltip = () => {},
    showContextMenu,
    groupedByPortNodeSupplier,
  } = options

  const router = useRouter()

  // 拖拽状态
  const draggingContainer = ref<Container | null>(null)
  const draggingNodeName = ref<string | null>(null)
  const dragOverDate = ref<Date | null>(null)
  const dropIndicatorPosition = ref({ x: 0, y: 0 })
  const dropIndicatorCellRect = ref<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)
  const pendingDropConfirm = ref<{
    container: Container
    newDate: string
    updateField: string
    fieldLabel: string
    confirmMsg: string
    extraUpdateData?: Record<string, string> | null
    unloadMode?: string
    isDropOffMode?: boolean
    unloadForwardNeedsPickupConfirm?: boolean
  } | null>(null)

  // ========== 拖拽字段映射 ==========
  const NODE_TO_FIELD_MAP: Record<string, { field: string; label: string }> = {
    清关: { field: 'plannedCustomsDate', label: '计划清关日' },
    查验: { field: 'plannedCustomsDate', label: '计划查验日' },
    提柜: { field: 'plannedPickupDate', label: '计划提柜日' },
    卸柜: { field: 'plannedUnloadDate', label: '计划卸柜日' },
    还箱: { field: 'plannedReturnDate', label: '计划还箱日' },
    未分类: { field: 'plannedPickupDate', label: '计划提柜日' },
  }

  /** 统一清理拖拽状态 */
  const cleanupDragState = () => {
    draggingContainer.value = null
    draggingNodeName.value = null
    dragOverDate.value = null
    dropIndicatorPosition.value = { x: 0, y: 0 }
    dropIndicatorCellRect.value = null
    pendingDropConfirm.value = null
    if (showContextMenu) {
      showContextMenu.value = false
    }
    hideTooltip()
  }

  /**
   * 处理拖拽开始事件
   * @param container - 被拖拽的货柜
   * @param event - 拖拽事件对象
   * @param nodeName - 节点名称（清关/提柜/卸柜/还箱）
   */
  const handleDragStart = (container: Container, event: DragEvent, nodeName?: string) => {
    draggingContainer.value = container
    draggingNodeName.value = nodeName ?? null
    hideTooltip()
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', container.containerNumber)
      if (nodeName) {
        event.dataTransfer.setData('application/x-logix-node', nodeName)
      }
    }
  }

  /**
   * 处理拖拽结束事件，显示确认对话框
   * 根据卸柜模式和拖拽方向决定是否需要同步其他节点
   */
  const handleDragEnd = async () => {
    const pending = pendingDropConfirm.value
    cleanupDragState()

    if (!pending) {
      return
    }

    const {
      container,
      newDate,
      updateField,
      confirmMsg,
      extraUpdateData,
      isDropOffMode,
      unloadForwardNeedsPickupConfirm,
      unloadMode,
    } = pending

    if (unloadForwardNeedsPickupConfirm) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ElMessageBox.confirm('检测到往前移动，后续节点是否同步前移？', '确认同步调整', {
            confirmButtonText: '同步调整',
            cancelButtonText: '仅调整当前节点',
            type: 'warning',
          })
            .then(async () => {
              const merged: Record<string, string> = { ...(extraUpdateData || {}) }
              if (updateField === 'plannedPickupDate') {
                merged['plannedDeliveryDate'] = newDate
                merged['plannedUnloadDate'] = newDate
              }
              await executeUpdateWithData(container, merged)
            })
            .catch(async (err: unknown) => {
              if (err !== 'cancel') {
                console.error('[handleDragEnd] Confirm error:', err)
                ElMessage.error('操作失败：' + (err as Error).message)
              } else {
                await executeUpdateWithData(
                  container,
                  extraUpdateData || { [updateField]: newDate }
                )
              }
            })
        })
      })
      return
    }

    let finalUpdateData: Record<string, string> = { [updateField]: newDate }
    let needAdditionalConfirm = false

    if (isDropOffMode && updateField === 'plannedPickupDate' && !extraUpdateData) {
      const trucking = container.truckingTransports?.[0]
      const currentDate = trucking?.plannedPickupDate
        ? dayjs(trucking.plannedPickupDate).format('YYYY-MM-DD')
        : null
      const isForwardDrag = currentDate && new Date(newDate) < new Date(currentDate)

      if (isForwardDrag) {
        needAdditionalConfirm = true
      }
    }

    if (needAdditionalConfirm) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ElMessageBox.confirm(`检测到往前移动，后续节点是否同步前移？`, '确认同步调整', {
            confirmButtonText: '同步调整',
            cancelButtonText: '仅调整提柜日',
            type: 'warning',
          })
            .then(async () => {
              finalUpdateData['plannedDeliveryDate'] = newDate
              finalUpdateData['plannedUnloadDate'] = newDate
              mergeReturnDateIntoUpdateData(container, finalUpdateData, unloadMode)
              await executeUpdateWithData(container, finalUpdateData)
            })
            .catch(async (err: unknown) => {
              if (err !== 'cancel') {
                console.error('[handleDragEnd] Confirm error:', err)
                ElMessage.error('操作失败：' + (err as Error).message)
              } else {
                console.log('[handleDragEnd] 用户选择仅调整提柜日')
                await executeUpdateWithData(container, finalUpdateData)
              }
            })
        })
      })
    } else {
      if (extraUpdateData) {
        finalUpdateData = extraUpdateData
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ElMessageBox({
            title: '确认调整日期',
            message: confirmMsg,
            showCancelButton: true,
            confirmButtonText: '智能优化',
            cancelButtonText: '快速更新',
            distinguishCancelAndClose: true,
            type: 'warning',
            beforeClose: async (action, instance, done) => {
              console.log('[handleDragEnd] 用户操作:', action)

              if (action === 'confirm') {
                console.log('[handleDragEnd] 用户选择智能优化')
                instance.confirmButtonLoading = true
                instance.confirmButtonText = '计算中...'

                try {
                  if (executeQuickUpdate) {
                    await executeQuickUpdate(container, finalUpdateData)
                  } else {
                    await executeUpdateWithData(container, finalUpdateData)
                  }
                } finally {
                  instance.confirmButtonLoading = false
                  instance.confirmButtonText = '智能优化'
                  done()
                }
              } else if (action === 'cancel') {
                console.log('[handleDragEnd] 用户选择快速更新')
                if (executeQuickUpdate) {
                  await executeQuickUpdate(container, finalUpdateData)
                } else {
                  await executeUpdateWithData(container, finalUpdateData)
                }
                done()
              } else {
                console.log('[handleDragEnd] 用户关闭对话框')
                done()
              }
            },
          })
        })
      })
    }
  }

  /**
   * 执行数据更新操作（支持多个字段同步更新）
   * @param container - 目标货柜
   * @param updateData - 更新数据键值对
   * @throws 网络错误或业务校验错误
   */
  const executeUpdateWithData = async (
    container: Container,
    updateData: Record<string, string>
  ) => {
    try {
      console.log('[executeUpdateWithData] ========== 开始更新 ==========')
      console.log('[executeUpdateWithData] 货柜号:', container.containerNumber)
      console.log('[executeUpdateWithData] 原始更新数据:', JSON.stringify(updateData))

      const trucking0 = container.truckingTransports?.[0]
      const warehouse0 = container.warehouseOperations?.[0]
      const um = trucking0?.unloadModePlan || warehouse0?.unloadModePlan

      if (updateData.plannedUnloadDate) {
        console.log('[executeUpdateWithData] 检测到卸柜日更新，重算还箱日')
        mergeReturnDateIntoUpdateData(container, updateData, um)
      } else {
        console.log('[executeUpdateWithData] 卸柜日未更新，跳过还箱日重算')
      }

      console.log('[executeUpdateWithData] 最终更新数据:', JSON.stringify(updateData))
      console.log(
        '[executeUpdateWithData] 当前提柜日:',
        container.truckingTransports?.[0]?.plannedPickupDate
      )
      console.log(
        '[executeUpdateWithData] 当前送柜日:',
        container.truckingTransports?.[0]?.plannedDeliveryDate
      )
      console.log(
        '[executeUpdateWithData] 当前卸柜日:',
        container.warehouseOperations?.[0]?.plannedUnloadDate
      )
      console.log(
        '[executeUpdateWithData] 当前还箱日:',
        container.emptyReturns?.[0]?.plannedReturnDate
      )

      const result = await containerService.updateSchedule(container.containerNumber, updateData)

      if (result.success) {
        ElMessage.success({
          message: '日期调整成功',
          duration: 2000,
        })
        await loadData()
      } else {
        console.error('[executeUpdateWithData] 更新失败:', result)
        handleUpdateError(result)
      }
    } catch (error: any) {
      console.error('[executeUpdateWithData] 异常:', error)
      console.error('[executeUpdateWithData] 响应数据:', error.response?.data)
      handleUpdateException(error)
    }
  }

  /**
   * 处理后端返回的业务错误
   * @param result - 后端响应结果
   */
  const handleUpdateError = (result: any) => {
    console.error('[handleUpdateError] 后端返回错误:', result)

    if (result.errors && result.errors.length > 0) {
      const errorMsg = result.errors.join('\n')
      ElMessage.error({
        message: `校验失败：\n${errorMsg}`,
        duration: 8000,
        dangerouslyUseHTMLString: false,
      })
    } else if (result.code === 'PERMISSION_DENIED') {
      ElMessage.error({
        message: '您没有权限修改此货柜，请联系管理员',
        duration: 3000,
      })
    } else if (result.code === 'DATA_CONFLICT') {
      ElMessage.warning({
        message: '数据已被其他人修改，请刷新后重试',
        duration: 3000,
      })
      ElMessageBox.confirm('是否立即刷新？', '提示', {
        confirmButtonText: '刷新',
        cancelButtonText: '取消',
      }).then(() => {
        loadData()
      })
    } else {
      ElMessage.error({
        message: result.message || '更新失败',
        duration: 3000,
      })
    }
  }

  /**
   * 处理网络异常（401/500/403 等）
   * @param error - 异常对象
   */
  const handleUpdateException = (error: any) => {
    console.error('[executeUpdate] Update failed:', error)

    if (error.response?.status === 401) {
      ElMessage.error('登录已过期，请重新登录')
      router.push('/login')
    } else if (error.response?.status === 500) {
      ElMessage.error('服务器错误，请稍后重试')
    } else if (error.response?.status === 403) {
      ElMessage.error('无权访问此资源')
    } else {
      ElMessage.error({
        message: `网络错误：${error.message}`,
        duration: 5000,
      })
    }
  }

  const inferNodeFromGroupedStructure = (container: Container): string | null => {
    if (!groupedByPortNodeSupplier?.value) {
      return null
    }

    const grouped = groupedByPortNodeSupplier.value

    for (const [, nodesByNode] of Object.entries(grouped)) {
      for (const [nodeName, suppliersBySupplier] of Object.entries(nodesByNode)) {
        for (const [, containers] of Object.entries(suppliersBySupplier)) {
          if (containers.some(c => c.containerNumber === container.containerNumber)) {
            return nodeName
          }
        }
      }
    }

    return null
  }

  /**
   * 前向检查：验证目标日期是否满足前置节点约束
   * @param container - 目标货柜
   * @param currentField - 当前更新的字段
   * @param targetDate - 目标日期（YYYY-MM-DD）
   * @returns 检查结果，包含是否通过、错误消息和源日期
   */
  const performForwardCheck = (
    container: Container,
    currentField: string,
    targetDate: string
  ): { passed: boolean; errorMessage?: string; sourceDate?: string } => {
    const trucking = container.truckingTransports?.[0]
    const warehouse = container.warehouseOperations?.[0]
    const portOp = container.portOperations?.find(op => op.portType === 'destination')

    let sourceDate: string | null = null
    switch (currentField) {
      case 'plannedCustomsDate':
        sourceDate = portOp?.plannedCustomsDate
          ? dayjs(portOp.plannedCustomsDate).format('YYYY-MM-DD')
          : null
        break
      case 'plannedPickupDate':
        sourceDate = trucking?.plannedPickupDate
          ? dayjs(trucking.plannedPickupDate).format('YYYY-MM-DD')
          : null
        break
      case 'plannedDeliveryDate':
        sourceDate = trucking?.plannedDeliveryDate
          ? dayjs(trucking.plannedDeliveryDate).format('YYYY-MM-DD')
          : null
        break
      case 'plannedUnloadDate':
        sourceDate = warehouse?.plannedUnloadDate
          ? dayjs(warehouse.plannedUnloadDate).format('YYYY-MM-DD')
          : null
        break
      case 'plannedReturnDate':
        const empty = container.emptyReturns?.[0]
        sourceDate = empty?.plannedReturnDate
          ? dayjs(empty.plannedReturnDate).format('YYYY-MM-DD')
          : null
        break
    }

    interface FieldConstraint {
      field: string
      label: string
      getValue: () => string | null
    }

    const constraints: FieldConstraint[] = []

    if (currentField === 'plannedPickupDate') {
      constraints.push({
        field: 'plannedCustomsDate',
        label: '计划清关日',
        getValue: () =>
          portOp?.plannedCustomsDate ? dayjs(portOp.plannedCustomsDate).format('YYYY-MM-DD') : null,
      })
    } else if (currentField === 'plannedDeliveryDate') {
      constraints.push({
        field: 'plannedPickupDate',
        label: '计划提柜日',
        getValue: () =>
          trucking?.plannedPickupDate
            ? dayjs(trucking.plannedPickupDate).format('YYYY-MM-DD')
            : null,
      })
    } else if (currentField === 'plannedUnloadDate') {
      constraints.push({
        field: 'plannedDeliveryDate',
        label: '计划送柜日',
        getValue: () =>
          trucking?.plannedDeliveryDate
            ? dayjs(trucking.plannedDeliveryDate).format('YYYY-MM-DD')
            : null,
      })
    } else if (currentField === 'plannedReturnDate') {
      constraints.push({
        field: 'plannedUnloadDate',
        label: '计划卸柜日',
        getValue: () =>
          warehouse?.plannedUnloadDate
            ? dayjs(warehouse.plannedUnloadDate).format('YYYY-MM-DD')
            : null,
      })
    }

    for (const constraint of constraints) {
      const prevDate = constraint.getValue()
      if (prevDate && dayjs(targetDate).isBefore(dayjs(prevDate), 'day')) {
        return {
          passed: false,
          errorMessage: `前节点[${constraint.label}]日期为${prevDate}，目标日期不能早于该日期。请手动调整前节点或选择≥${prevDate}的日期`,
          sourceDate: sourceDate || undefined,
        }
      }
    }

    return {
      passed: true,
      sourceDate: sourceDate || undefined,
    }
  }

  /**
   * 后向同步决策：根据拖拽方向和卸柜模式决定后续节点是否同步
   * @param container - 目标货柜
   * @param currentField - 当前更新的字段
   * @param targetDate - 目标日期（YYYY-MM-DD）
   * @param isDropOffMode - 是否为 Drop off 模式
   * @param sourceDate - 源日期（用于判断拖拽方向）
   * @returns 自动同步的字段列表和是否需要用户确认
   */
  const performBackwardSyncDecision = (
    container: Container,
    currentField: string,
    targetDate: string,
    isDropOffMode: boolean,
    sourceDate?: string
  ): { autoSyncFields: string[]; needsUserConfirm: boolean } => {
    const trucking = container.truckingTransports?.[0]

    if (!sourceDate) {
      return { autoSyncFields: [], needsUserConfirm: false }
    }

    const isForwardDrag = dayjs(targetDate).isBefore(dayjs(sourceDate), 'day')
    const isBackwardDrag = dayjs(targetDate).isAfter(dayjs(sourceDate), 'day')

    if (!isDropOffMode) {
      if (currentField === 'plannedPickupDate' || currentField === 'plannedUnloadDate') {
        return {
          autoSyncFields: ['plannedPickupDate', 'plannedDeliveryDate', 'plannedUnloadDate'].filter(
            f => f !== currentField
          ),
          needsUserConfirm: false,
        }
      }
    }

    if (isDropOffMode) {
      if (currentField === 'plannedPickupDate') {
        if (isBackwardDrag) {
          const deliveryDate = trucking?.plannedDeliveryDate
            ? dayjs(trucking.plannedDeliveryDate).format('YYYY-MM-DD')
            : null

          if (!deliveryDate || dayjs(targetDate).isAfter(dayjs(deliveryDate), 'day')) {
            return {
              autoSyncFields: ['plannedDeliveryDate', 'plannedUnloadDate'],
              needsUserConfirm: false,
            }
          }
        } else if (isForwardDrag) {
          return {
            autoSyncFields: [],
            needsUserConfirm: true,
          }
        }
      }

      if (currentField === 'plannedDeliveryDate') {
        return {
          autoSyncFields: ['plannedUnloadDate'],
          needsUserConfirm: false,
        }
      }

      if (currentField === 'plannedUnloadDate') {
        const autoSyncFields = ['plannedDeliveryDate']

        const pickupStr = trucking?.plannedPickupDate
          ? dayjs(trucking.plannedPickupDate).format('YYYY-MM-DD')
          : null

        if (isForwardDrag && pickupStr && dayjs(targetDate).isBefore(dayjs(pickupStr), 'day')) {
          return {
            autoSyncFields,
            needsUserConfirm: true,
          }
        }

        return {
          autoSyncFields,
          needsUserConfirm: false,
        }
      }

      if (currentField === 'plannedReturnDate') {
        return {
          autoSyncFields: [],
          needsUserConfirm: false,
        }
      }
    }

    return { autoSyncFields: [], needsUserConfirm: false }
  }

  /**
   * 处理放置事件，准备更新数据并显示确认对话框
   * @param _date - 放置的目标日期（实际使用 dragOverDate）
   * @param nodeName - 节点名称（可选，优先使用 draggingNodeName）
   */
  const handleDrop = (_date: Date, nodeName?: string) => {
    if (!draggingContainer.value || !dragOverDate.value) return

    const container = draggingContainer.value
    const newDate = dayjs(dragOverDate.value).format('YYYY-MM-DD')

    let targetNode = nodeName ?? draggingNodeName.value ?? undefined

    if (!targetNode) {
      targetNode = inferNodeFromGroupedStructure(container) ?? undefined
    }

    if (!targetNode) {
      console.warn('[handleDrop] Cannot determine node type, using default')
      targetNode = '提柜'
    }

    const { field, label } = NODE_TO_FIELD_MAP[targetNode] || NODE_TO_FIELD_MAP['提柜']

    const trucking = container.truckingTransports?.[0]
    const warehouse = container.warehouseOperations?.[0]
    const unloadMode = trucking?.unloadModePlan || warehouse?.unloadModePlan
    const isDropOffMode = unloadMode === 'Drop off'

    const forwardCheckResult = performForwardCheck(container, field, newDate)
    if (!forwardCheckResult.passed) {
      ElMessage.error({
        message: forwardCheckResult.errorMessage,
        duration: 5000,
      })
      cleanupDragState()
      return
    }

    const updateData: Record<string, string> = { [field]: newDate }
    let unloadForwardNeedsPickupConfirm = false

    const syncDecision = performBackwardSyncDecision(
      container,
      field,
      newDate,
      isDropOffMode,
      forwardCheckResult.sourceDate
    )

    if (syncDecision.autoSyncFields.length > 0) {
      syncDecision.autoSyncFields.forEach(syncField => {
        updateData[syncField] = newDate
      })
    }

    if (syncDecision.needsUserConfirm) {
      unloadForwardNeedsPickupConfirm = true
    }

    if (updateData.plannedUnloadDate) {
      console.log('[handleDrop] 检测到卸柜日更新，开始重算还箱日:', {
        oldUnload: container.warehouseOperations?.[0]?.plannedUnloadDate,
        newUnload: updateData.plannedUnloadDate,
        unloadMode,
      })
      mergeReturnDateIntoUpdateData(container, updateData, unloadMode)
      console.log('[handleDrop] 还箱日重算结果:', updateData.plannedReturnDate)
    }

    mergeReturnDateWhenPickupOnlyForward(container, updateData, unloadMode)

    let confirmMsg = `确定要将货柜 ${container.containerNumber} 的${label}调整为 ${formatDateShort(dragOverDate.value)} 吗？`

    if (
      updateData['plannedDeliveryDate'] &&
      updateData['plannedUnloadDate'] &&
      field === 'plannedPickupDate'
    ) {
      confirmMsg += `\n\n将同时调整送柜日和卸柜日为 ${formatDateShort(dragOverDate.value)}`
    }
    if (field === 'plannedUnloadDate' && !isDropOffMode) {
      confirmMsg += `\n\n将同步计划提柜日、送柜日、卸柜日为 ${formatDateShort(dragOverDate.value)}`
    }
    if (field === 'plannedUnloadDate' && isDropOffMode) {
      confirmMsg += `\n\n将同步计划送柜日、卸柜日为 ${formatDateShort(dragOverDate.value)}`
    }
    if (updateData.plannedReturnDate) {
      confirmMsg += `\n\n将同步计划还箱日为 ${formatDateShort(dayjs(updateData.plannedReturnDate).toDate())}`
    }

    pendingDropConfirm.value = {
      container,
      newDate,
      updateField: field,
      fieldLabel: label,
      confirmMsg,
      extraUpdateData: Object.keys(updateData).length > 1 ? updateData : null,
      unloadMode: unloadMode,
      isDropOffMode,
      unloadForwardNeedsPickupConfirm,
    }

    console.log('[handleDrop] Set pending:', {
      container: container.containerNumber,
      node: targetNode,
      field,
      newDate,
      unloadMode,
      isDropOffMode,
      extraFields: Object.keys(updateData).filter(k => k !== field),
    })
  }

  const formatDateShort = (date: Date): string => {
    return dayjs(date).format('MM-DD')
  }

  return {
    draggingContainer,
    draggingNodeName,
    dragOverDate,
    dropIndicatorPosition,
    dropIndicatorCellRect,
    pendingDropConfirm,
    NODE_TO_FIELD_MAP,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    cleanupDragState,
    executeUpdateWithData,
  }
}
