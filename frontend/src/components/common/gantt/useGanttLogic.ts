import { containerService } from '@/services/container'
import type { Container } from '@/types/container'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * 甘特图核心逻辑抽离
 * Gantt Chart Core Logic Composable
 */
export function useGanttLogic() {
  const route = useRoute()
  const router = useRouter()

  // 数据状态
  const containers = ref<Container[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 过滤条件
  const filterCondition = ref('')
  const filterLabel = ref('')

  // 日期范围
  const rangeType = ref(7)
  const displayRange = ref<[Date, Date]>([new Date(), new Date()])
  const dateRange = ref<Date[]>([])
  const customDateRange = ref<[Date, Date] | null>(null)

  // 展开/折叠状态
  const collapsedGroups = ref<Set<string>>(new Set())

  // Tooltip
  const tooltipVisible = ref(false)
  const tooltipPosition = ref({ x: 0, y: 0 })
  const tooltipContainer = ref<Container | null>(null)

  // 交互状态
  const selectedContainer = ref<Container | null>(null)
  const showDetailSidebar = ref(false)
  const showContextMenu = ref(false)
  const contextMenuPosition = ref({ x: 0, y: 0 })
  const showDateEditDialog = ref(false)

  // 拖拽状态
  const draggingContainer = ref<Container | null>(null)
  const dragOverDate = ref<Date | null>(null)
  const dropIndicatorPosition = ref({ x: 0, y: 0 })

  // 状态筛选
  const showFilterDrawer = ref(false)
  const selectedStatuses = ref<string[]>([])
  const logisticsStatusOptions = [
    { label: '未出运', value: 'not_shipped', color: '#909399' },
    { label: '已出运', value: 'shipped', color: '#409EFF' },
    { label: '在途', value: 'in_transit', color: '#67C23A' },
    { label: '已到港', value: 'at_port', color: '#E6A23C' },
    { label: '已提柜', value: 'picked_up', color: '#F56C6C' },
    { label: '已卸柜', value: 'unloaded', color: '#909399' },
    { label: '已还箱', value: 'returned_empty', color: '#C0C4CC' },
  ]

  // 高级筛选
  const advancedFilters = ref({
    shipVoyage: '',
    originPort: '',
    forwarder: '',
  })

  // 状态颜色映射
  const statusColors: Record<string, string> = {
    not_shipped: '#909399',
    shipped: '#409eff',
    in_transit: '#409eff',
    at_port: '#e6a23c',
    picked_up: '#67c23a',
    unloaded: '#67c23a',
    returned_empty: '#67c23a',
  }

  // ========== 智能预警系统 ==========

  /**
   * 预警规则接口
   */
  interface AlertRule {
    id: string
    name: string
    condition: (container: Container) => boolean
    level: 'info' | 'warning' | 'danger'
    message: string
  }

  /**
   * 预警规则定义
   */
  const alertRules: AlertRule[] = [
    {
      id: 'approaching_deadline',
      name: '即将超期',
      condition: container => {
        const lastFreeDate = getLastFreeDateFromContainer(container)
        if (!lastFreeDate) return false
        const daysUntilDeadline = dayjs(lastFreeDate).diff(dayjs(), 'day')
        return daysUntilDeadline >= 0 && daysUntilDeadline <= 3
      },
      level: 'warning',
      message: '距离最晚提柜不足 3 天',
    },
    {
      id: 'overdue_pickup',
      name: '逾期未提',
      condition: container => {
        const lastFreeDate = getLastFreeDateFromContainer(container)
        if (!lastFreeDate) return false
        return (
          dayjs().isAfter(dayjs(lastFreeDate)) &&
          container.logisticsStatus?.toLowerCase() !== 'picked_up' &&
          container.logisticsStatus?.toLowerCase() !== 'unloaded' &&
          container.logisticsStatus?.toLowerCase() !== 'returned_empty'
        )
      },
      level: 'danger',
      message: '已超过最晚提柜日期',
    },
  ]

  /**
   * 辅助方法：获取货柜的最晚提柜日期
   */
  const getLastFreeDateFromContainer = (container: Container): Date | null => {
    // 优先从 portOperations 获取
    if (container.portOperations && container.portOperations.length > 0) {
      const destPortOp = container.portOperations.find((op: any) => op.portType === 'destination')
      if (destPortOp?.lastFreeDate) {
        // ========== 调试代码 ==========
        console.log('[useGanttLogic] 找到 lastFreeDate:', {
          containerNumber: container.containerNumber,
          portType: destPortOp.portType,
          lastFreeDate: destPortOp.lastFreeDate,
        })
        // ============================
        return destPortOp.lastFreeDate
      }
    }
    return null
  }

  /**
   * 获取容器的所有预警信息
   */
  const getContainerAlerts = (container: Container): AlertRule[] => {
    const alerts = alertRules.filter(rule => rule.condition(container))

    // ========== 调试代码 ==========
    if (alerts.length > 0) {
      console.log('[Alert] 货柜有预警:', {
        containerNumber: container.containerNumber,
        logisticsStatus: container.logisticsStatus,
        alerts: alerts.map(a => ({ name: a.name, level: a.level, message: a.message })),
      })
    }
    // ============================

    return alerts
  }

  /**
   * 判断容器是否有预警
   */
  const hasAlert = (container: Container): boolean => {
    return getContainerAlerts(container).length > 0
  }

  /**
   * 获取容器的最高预警级别
   */
  const getAlertLevel = (container: Container): 'info' | 'warning' | 'danger' | null => {
    const alerts = getContainerAlerts(container)
    if (alerts.length === 0) return null

    // 返回最高级别的预警
    if (alerts.some(a => a.level === 'danger')) return 'danger'
    if (alerts.some(a => a.level === 'warning')) return 'warning'
    return 'info'
  }

  /**
   * 获取容器的警示边框样式
   */
  const getContainerBorderStyle = (container: Container): string => {
    const alertLevel = getAlertLevel(container)
    switch (alertLevel) {
      case 'danger':
        return '3px solid #f56c6c'
      case 'warning':
        return '2px solid #e6a23c'
      default:
        return 'none'
    }
  }

  /**
   * 判断容器是否为关键日期（3 天内到期）
   */
  const isCriticalDate = (container: Container): boolean => {
    const alertLevel = getAlertLevel(container)
    return alertLevel === 'warning' || alertLevel === 'danger'
  }

  // 过滤后的货柜
  const filteredContainers = computed(() => {
    let result = [...containers.value]

    // 状态筛选
    if (selectedStatuses.value.length > 0) {
      result = result.filter(c =>
        selectedStatuses.value.includes(c.logisticsStatus?.toLowerCase() || '')
      )
    }

    // 高级筛选
    if (advancedFilters.value.shipVoyage) {
      const shipVoyage = advancedFilters.value.shipVoyage.toLowerCase()
      result = result.filter(c => c.seaFreight?.voyageNumber?.toLowerCase().includes(shipVoyage))
    }

    if (advancedFilters.value.originPort) {
      const originPort = advancedFilters.value.originPort.toLowerCase()
      result = result.filter(c => c.seaFreight?.portOfLoading?.toLowerCase().includes(originPort))
    }

    if (advancedFilters.value.forwarder) {
      const forwarder = advancedFilters.value.forwarder.toLowerCase()
      result = result.filter(c =>
        c.seaFreight?.freightForwarderId?.toLowerCase().includes(forwarder)
      )
    }

    return result
  })

  // 按目的港分组
  const groupedByPort = computed(() => {
    const groups: Record<string, Container[]> = {}
    filteredContainers.value.forEach(container => {
      const portCode = container.destinationPort || '未指定'
      if (!groups[portCode]) {
        groups[portCode] = []
      }
      groups[portCode].push(container)
    })
    return groups
  })

  // 计算日期范围
  const calculateDateRange = (days: number): [Date, Date] => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - Math.floor(days / 2))

    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + Math.floor(days / 2))

    return [startDate, endDate]
  }

  // 生成日期列表
  const generateDateRange = (start: Date, end: Date): Date[] => {
    const dates: Date[] = []
    const current = new Date(start)

    while (current <= end) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  // 获取货柜日期
  const getContainerDate = (container: Container): Date | null => {
    if (container.ataDestPort) return new Date(container.ataDestPort)
    if (container.etaCorrection) return new Date(container.etaCorrection)
    if (container.etaDestPort) return new Date(container.etaDestPort)

    if (container.portOperations && container.portOperations.length > 0) {
      const destPortOp = container.portOperations.find((op: any) => op.portType === 'destination')
      if (destPortOp?.ataDestPort) return new Date(destPortOp.ataDestPort)
      if (destPortOp?.etaCorrection) return new Date(destPortOp.etaCorrection)
      if (destPortOp?.etaDestPort) return new Date(destPortOp.etaDestPort)
    }

    if (container.seaFreight?.eta) return new Date(container.seaFreight.eta)
    return null
  }

  // 加载数据
  const loadData = async () => {
    loading.value = true
    error.value = null
    try {
      const condition = route.query.filterCondition as string
      const startDate = route.query.startDate as string
      const endDate = route.query.endDate as string
      const label = route.query.filterLabel as string

      filterCondition.value = condition
      filterLabel.value = label

      console.log(
        '[useGanttLogic] 加载数据，filterCondition:',
        condition,
        'startDate:',
        startDate,
        'endDate:',
        endDate
      )

      let response: any
      if (condition) {
        console.log('[useGanttLogic] 调用 getContainersByFilterCondition')
        response = await containerService.getContainersByFilterCondition(
          condition,
          startDate,
          endDate
        )
        console.log('[useGanttLogic] API 返回数据:', response)
      } else {
        console.log('[useGanttLogic] 调用 getContainers')
        response = await containerService.getContainers({
          page: 1,
          pageSize: 500,
          search: '',
          startDate,
          endDate,
        })
      }

      console.log('[useGanttLogic] 设置 containers，数量:', response.items?.length || 0)
      containers.value = response.items ?? []

      // 计算显示范围
      if (startDate && endDate) {
        displayRange.value = [new Date(startDate), new Date(endDate)]
        const daysDiff = dayjs(endDate).diff(dayjs(startDate), 'day') + 1
        if (daysDiff > 30) {
          rangeType.value = 30
        } else if (daysDiff > 15) {
          rangeType.value = 15
        } else {
          rangeType.value = 7
        }
      } else {
        displayRange.value = calculateDateRange(rangeType.value)
      }

      dateRange.value = generateDateRange(displayRange.value[0], displayRange.value[1])
    } catch (err: any) {
      error.value = err.message || '加载数据失败'
      ElMessage.error(error.value || '加载数据失败')
    } finally {
      loading.value = false
    }
  }

  // 切换分组折叠
  const toggleGroupCollapse = (groupKey: string) => {
    if (collapsedGroups.value.has(groupKey)) {
      collapsedGroups.value.delete(groupKey)
    } else {
      collapsedGroups.value.add(groupKey)
    }
  }

  const isGroupCollapsed = (groupKey: string): boolean => {
    return collapsedGroups.value.has(groupKey)
  }

  // Tooltip
  const showTooltip = (container: Container, event: MouseEvent) => {
    tooltipContainer.value = container
    tooltipPosition.value = {
      x: event.clientX + 10,
      y: event.clientY + 10,
    }
    tooltipVisible.value = true
  }

  const hideTooltip = () => {
    tooltipVisible.value = false
  }

  // 日期格式化
  const formatDate = (date?: string | Date): string => {
    if (!date) return '-'
    return dayjs(date).format('YYYY-MM-DD')
  }

  const formatDateShort = (date: Date): string => {
    return dayjs(date).format('MM-DD')
  }

  const getWeekday = (date: Date): string => {
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    return `周${weekdays[date.getDay()]}`
  }

  const isWeekend = (date: Date): boolean => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const compareDate = new Date(date)
    compareDate.setHours(0, 0, 0, 0)
    return today.getTime() === compareDate.getTime()
  }

  // 事件处理
  const handleDotClick = (container: Container) => {
    selectedContainer.value = container
    showDetailSidebar.value = true
    hideTooltip()
  }

  const handleViewDetail = () => {
    showDetailSidebar.value = true
  }

  const handleEditDate = () => {
    showDateEditDialog.value = true
  }

  const handleCopyContainerNumber = () => {
    if (selectedContainer.value?.containerNumber) {
      navigator.clipboard.writeText(selectedContainer.value.containerNumber)
      ElMessage.success('柜号已复制')
    }
  }

  const handleDelete = () => {
    ElMessage.info('删除功能暂未开放')
  }

  const openContextMenu = (container: Container, event: MouseEvent) => {
    selectedContainer.value = container
    contextMenuPosition.value = { x: event.clientX, y: event.clientY }
    showContextMenu.value = true
    hideTooltip()
  }

  const handleDragStart = (container: Container, event: DragEvent) => {
    draggingContainer.value = container
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', container.containerNumber)
    }
  }

  const handleDragEnd = () => {
    draggingContainer.value = null
    dragOverDate.value = null
  }

  const handleDrop = (date: Date) => {
    if (!draggingContainer.value || !dragOverDate.value) return

    const newDate = dayjs(dragOverDate.value).format('YYYY-MM-DD HH:mm:ss')
    ElMessageBox.confirm(
      `确定要将货柜 ${draggingContainer.value.containerNumber} 移动到 ${formatDateShort(dragOverDate.value)} 吗？`,
      '确认调整日期',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
      .then(() => {
        console.log('Move container to date:', newDate)
        ElMessage.success('日期调整成功')
        loadData()
      })
      .catch(() => {
        ElMessage.info('已取消操作')
      })
  }

  const handleDateSave = async (data: any) => {
    try {
      console.log('Save date:', data)
      ElMessage.success('日期保存成功')
      showDateEditDialog.value = false
      loadData()
    } catch (err: any) {
      console.error('保存日期失败:', err)
      ElMessage.error('保存日期失败')
    }
  }

  // 日期范围切换
  const onRangeChange = () => {
    if (rangeType.value === 9999) {
      if (!customDateRange.value) {
        const today = new Date()
        const weekAgo = new Date()
        weekAgo.setDate(today.getDate() - 7)
        customDateRange.value = [weekAgo, today]
      }
    } else {
      displayRange.value = calculateDateRange(rangeType.value)
      dateRange.value = generateDateRange(displayRange.value[0], displayRange.value[1])
    }
  }

  const onCustomDateChange = (value: [Date, Date] | null) => {
    if (value) {
      displayRange.value = [value[0], value[1]]
      dateRange.value = generateDateRange(displayRange.value[0], displayRange.value[1])
    }
  }

  // 筛选应用
  const applyAllFilters = () => {
    showFilterDrawer.value = false
    let filterCount = selectedStatuses.value.length
    if (advancedFilters.value.shipVoyage) filterCount++
    if (advancedFilters.value.originPort) filterCount++
    if (advancedFilters.value.forwarder) filterCount++
    ElMessage.success(`已应用 ${filterCount} 个筛选条件`)
  }

  const resetAllFilters = () => {
    selectedStatuses.value = []
    advancedFilters.value = {
      shipVoyage: '',
      originPort: '',
      forwarder: '',
    }
    showFilterDrawer.value = false
    ElMessage.info('已重置所有筛选条件')
  }

  const goBack = () => {
    router.push('/shipments')
  }

  const exportData = () => {
    const data = filteredContainers.value.map(c => ({
      集装箱号: c.containerNumber,
      备货单号: c.orderNumber,
      提单号: c.billOfLadingNumber,
      目的港: c.destinationPort,
      物流状态: c.logisticsStatus,
      预计到港: formatDate(c.etaDestPort),
      实际到港: formatDate(c.ataDestPort),
      计划提柜: formatDate(c.truckingTransports?.[0]?.plannedPickupDate),
      最晚提柜: formatDate(c.portOperations?.[0]?.lastFreeDate),
    }))

    const headers = [
      '集装箱号',
      '备货单号',
      '提单号',
      '目的港',
      '物流状态',
      '预计到港',
      '实际到港',
      '计划提柜',
      '最晚提柜',
    ]
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(',')),
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `甘特图数据_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    link.click()

    ElMessage.success('数据导出成功')
  }

  // 拖拽处理
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    const target = event.target as HTMLElement
    const dateCell = target.closest('.date-cell')
    if (dateCell) {
      const cellIndex = Array.from(dateCell.parentElement?.children || []).indexOf(dateCell)
      const containerGroups = document.querySelectorAll('.port-group')
      let dateIndex = 0
      containerGroups.forEach(group => {
        const cells = group.querySelectorAll('.date-cell')
        cells.forEach((cell, idx) => {
          if (cell === dateCell) {
            dateIndex = idx
          }
        })
      })

      if (dateIndex >= 0 && dateIndex < dateRange.value.length) {
        dragOverDate.value = dateRange.value[dateIndex]
        const rect = dateCell.getBoundingClientRect()
        dropIndicatorPosition.value = {
          x: rect.left + rect.width / 2 - 80,
          y: rect.top,
        }
      }
    }
  }

  const handleGlobalDrop = (event: DragEvent) => {
    event.preventDefault()
    if (dragOverDate.value) {
      handleDrop(dragOverDate.value)
    }
    dragOverDate.value = null
  }

  // 生命周期
  onMounted(() => {
    loadData()
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('drop', handleGlobalDrop)
  })

  onUnmounted(() => {
    document.removeEventListener('dragover', handleDragOver)
    document.removeEventListener('drop', handleGlobalDrop)
  })

  return {
    // 数据
    containers,
    loading,
    error,
    filteredContainers,
    groupedByPort,
    // 过滤
    filterLabel,
    selectedStatuses,
    advancedFilters,
    logisticsStatusOptions,
    showFilterDrawer,
    // 日期
    rangeType,
    displayRange,
    dateRange,
    customDateRange,
    // 折叠
    collapsedGroups,
    // Tooltip
    tooltipVisible,
    tooltipPosition,
    tooltipContainer,
    // 交互
    selectedContainer,
    showDetailSidebar,
    showContextMenu,
    contextMenuPosition,
    showDateEditDialog,
    // 拖拽
    draggingContainer,
    dragOverDate,
    dropIndicatorPosition,
    // 状态
    statusColors,
    // 预警系统
    alertRules,
    getContainerAlerts,
    hasAlert,
    getAlertLevel,
    getContainerBorderStyle,
    isCriticalDate,
    // 方法
    loadData,
    toggleGroupCollapse,
    isGroupCollapsed,
    showTooltip,
    hideTooltip,
    formatDate,
    formatDateShort,
    getWeekday,
    isWeekend,
    isToday,
    getContainerDate,
    handleDotClick,
    handleViewDetail,
    handleEditDate,
    handleCopyContainerNumber,
    handleDelete,
    openContextMenu,
    handleDragStart,
    handleDragEnd,
    handleDrop,
    handleDateSave,
    onRangeChange,
    onCustomDateChange,
    applyAllFilters,
    resetAllFilters,
    goBack,
    exportData,
    handleDragOver,
    handleGlobalDrop,
  }
}
