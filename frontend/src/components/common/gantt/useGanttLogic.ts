import { containerService } from '@/services/container'
import { useGanttFilterStore } from '@/store/ganttFilters'
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
  const ganttFilterStore = useGanttFilterStore()

  // 数据状态
  const containers = ref<Container[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // 过滤条件
  const filterCondition = ref('')
  const filterLabel = ref('')

  // 日期范围
  const rangeType = ref(0) // 默认使用动态范围
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

  // ========== 甘特图节点类型 ==========
  /**
   * 甘特图节点类型
   */
  type GanttNodeType = 'customs' | 'pickup' | 'unload' | 'return'

  /**
   * 节点任务类型：主任务/虚线任务
   */
  type TaskType = 'main' | 'dashed'

  /**
   * 获取货柜当前处于哪个阶段
   * 阶段1: 清关阶段（主任务：清关）
   * 阶段2: 提柜阶段（主任务：提柜）
   * 阶段3: 卸柜阶段（主任务：卸柜）
   * 阶段4: 还箱阶段（主任务：还箱）
   * 阶段5: 流程结束（无主任务）
   */
  const getContainerStage = (container: Container): number => {
    // 还箱完成（流程结束）
    const emptyReturn = container.emptyReturns?.[0]
    if (emptyReturn?.returnTime) return 5

    // 卸柜完成（还箱为主任务）
    const warehouseOp = container.warehouseOperations?.[0]
    if (warehouseOp?.unloadDate) return 4

    // 提柜完成（卸柜为主任务）
    const trucking = container.truckingTransports?.[0]
    if (trucking?.deliveryDate) return 3

    // 清关完成（提柜为主任务）
    const portOp = container.portOperations?.find(op => op.portType === 'destination')
    if (portOp?.actualCustomsDate) return 2

    // 默认：清关为主任务
    return 1
  }

  /**
   * 获取货柜在指定节点的任务类型
   * @param container 货柜
   * @param nodeType 节点类型
   */
  const getNodeTaskType = (container: Container, nodeType: GanttNodeType): TaskType | null => {
    const stage = getContainerStage(container)

    // 阶段5：流程结束，无任务
    if (stage === 5) return null

    // 节点顺序：清关 → 提柜 → 卸柜 → 还箱
    const nodeOrder: GanttNodeType[] = ['customs', 'pickup', 'unload', 'return']
    const nodeIndex = nodeOrder.indexOf(nodeType)

    // 节点序号大于等于阶段序号，表示已完成，任务销毁
    if (nodeIndex >= stage) return null

    // 节点序号等于阶段序号-1，表示当前主任务
    if (nodeIndex === stage - 1) return 'main'

    // 节点序号小于阶段序号-1，表示虚线任务
    return 'dashed'
  }

  /**
   * 获取指定节点的日期
   * 优先级：实际日期 > 计划日期
   */
  const getNodeDate = (container: Container, nodeType: GanttNodeType): Date | null => {
    const portOp = container.portOperations?.find(op => op.portType === 'destination')
    const trucking = container.truckingTransports?.[0]
    const warehouseOp = container.warehouseOperations?.[0]
    const emptyReturn = container.emptyReturns?.[0]

    switch (nodeType) {
      case 'customs':
        // 清关：actualCustomsDate > plannedCustomsDate > etaDestPort
        if (portOp?.actualCustomsDate) return new Date(portOp.actualCustomsDate)
        if (portOp?.plannedCustomsDate) return new Date(portOp.plannedCustomsDate)
        if (portOp?.ataDestPort) return new Date(portOp.ataDestPort)
        if (portOp?.etaDestPort) return new Date(portOp.etaDestPort)
        return container.ataDestPort ? new Date(container.ataDestPort) : (container.etaDestPort ? new Date(container.etaDestPort) : null)

      case 'pickup':
        // 提柜：deliveryDate > plannedDeliveryDate > pickupDate > plannedPickupDate
        if (trucking?.deliveryDate) return new Date(trucking.deliveryDate)
        if (trucking?.plannedDeliveryDate) return new Date(trucking.plannedDeliveryDate)
        if (trucking?.pickupDate) return new Date(trucking.pickupDate)
        if (trucking?.plannedPickupDate) return new Date(trucking.plannedPickupDate)
        return null

      case 'unload':
        // 卸柜：unloadDate > plannedUnloadDate
        if (warehouseOp?.unloadDate) return new Date(warehouseOp.unloadDate)
        if (warehouseOp?.plannedUnloadDate) return new Date(warehouseOp.plannedUnloadDate)
        return null

      case 'return':
        // 还箱：returnTime > plannedReturnDate
        if (emptyReturn?.returnTime) return new Date(emptyReturn.returnTime)
        if (emptyReturn?.lastReturnDate) return new Date(emptyReturn.lastReturnDate)
        return null
    }
  }

  /**
   * 获取指定节点的分组键（用于甘特图分组显示）
   */
  const getNodeGroupKey = (container: Container, nodeType: GanttNodeType): string => {
    const portOp = container.portOperations?.find(op => op.portType === 'destination')
    const trucking = container.truckingTransports?.[0]
    const warehouseOp = container.warehouseOperations?.[0]
    const supplierNames = container.supplierNames

    switch (nodeType) {
      case 'customs':
        // 优先使用字典表解析的名称，其次使用代码
        return supplierNames?.customsBrokerName 
          || portOp?.customsBrokerCode 
          || portOp?.customsBroker 
          || '未指定清关'
      case 'pickup':
        return supplierNames?.truckingCompanyName
          || trucking?.truckingCompanyId 
          || trucking?.carrierCompany 
          || '未指定车队'
      case 'unload':
      case 'return':
        return supplierNames?.warehouseName
          || warehouseOp?.warehouseId 
          || warehouseOp?.actualWarehouse 
          || '未指定仓库'
    }
  }

  /**
   * 判断节点是否已完成（用于显示✓标记）
   */
  const isNodeCompleted = (container: Container, nodeType: GanttNodeType): boolean => {
    const portOp = container.portOperations?.find(op => op.portType === 'destination')
    const trucking = container.truckingTransports?.[0]
    const warehouseOp = container.warehouseOperations?.[0]
    const emptyReturn = container.emptyReturns?.[0]

    switch (nodeType) {
      case 'customs':
        return !!portOp?.actualCustomsDate
      case 'pickup':
        return !!trucking?.deliveryDate
      case 'unload':
        return !!warehouseOp?.unloadDate
      case 'return':
        return !!emptyReturn?.returnTime
    }
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

  // 三级分组：目的港 -> 五节点 -> 供应商
  const groupedByPortNodeSupplier = computed(() => {
    const result: Record<string, Record<string, Record<string, Container[]>>> = {}

    filteredContainers.value.forEach(container => {
      const portCode = container.destinationPort || '未指定'

      // 初始化目的港层级
      if (!result[portCode]) {
        result[portCode] = {
          '清关': {},
          '提柜': {},
          '卸柜': {},
          '还箱': {},
          '查验': {}
        }
      }

      // 确定五节点和对应的供应商
      const nodeSupplierMap = getNodeAndSupplier(container)

      nodeSupplierMap.forEach(({ node, supplier }) => {
        if (!result[portCode][node][supplier]) {
          result[portCode][node][supplier] = []
        }
        result[portCode][node][supplier].push(container)
      })
    })

    return result
  })

  // 获取货柜对应的节点和供应商
  const getNodeAndSupplier = (container: Container): Array<{ node: string, supplier: string }> => {
    const result: Array<{ node: string, supplier: string }> = []

    // 清关节点 - 清关行
    if (container.portOperations && container.portOperations.length > 0) {
      const destPortOp = container.portOperations.find(op => op.portType === 'destination')
      if (destPortOp?.customsBroker) {
        result.push({
          node: '清关',
          supplier: destPortOp.customsBroker
        })
      }
    }

    // 提柜节点 - 拖卡车队
    if (container.truckingTransports && container.truckingTransports.length > 0) {
      container.truckingTransports.forEach(transport => {
        if (transport.carrierCompany && transport.truckingType === 'pickup') {
          result.push({
            node: '提柜',
            supplier: transport.carrierCompany
          })
        }
      })
    }

    // 卸柜节点 - 仓库
    if (container.warehouseOperations && container.warehouseOperations.length > 0) {
      container.warehouseOperations.forEach(operation => {
        if (operation.actualWarehouse || operation.plannedWarehouse) {
          const warehouse = operation.actualWarehouse || operation.plannedWarehouse || '未指定仓库'
          result.push({
            node: '卸柜',
            supplier: warehouse
          })
        }
      })
    }

    // 还箱节点 - 车队/终端
    if (container.emptyReturns && container.emptyReturns.length > 0) {
      container.emptyReturns.forEach(emptyReturn => {
        if (emptyReturn.returnTerminalName) {
          result.push({
            node: '还箱',
            supplier: emptyReturn.returnTerminalName
          })
        }
      })
    }

    // 查验节点 - 清关行（与清关使用相同供应商）
    if (container.inspectionRequired && container.portOperations && container.portOperations.length > 0) {
      const destPortOp = container.portOperations.find(op => op.portType === 'destination')
      if (destPortOp?.customsBroker) {
        result.push({
          node: '查验',
          supplier: destPortOp.customsBroker
        })
      }
    }

    // 如果没有找到任何节点供应商映射，至少放在一个默认分组
    if (result.length === 0) {
      result.push({
        node: '未分类',
        supplier: '未指定供应商'
      })
    }

    return result
  }

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

  // 根据数据计算动态日期范围
  const calculateDynamicDateRange = (containers: Container[]): [Date, Date] => {
    if (containers.length === 0) {
      return calculateDateRange(7) // 默认7天
    }

    let minDate: Date | null = null
    let maxDate: Date | null = null

    containers.forEach(container => {
      const containerDate = getContainerDate(container)
      if (containerDate) {
        if (!minDate || containerDate < minDate) {
          minDate = containerDate
        }
        if (!maxDate || containerDate > maxDate) {
          maxDate = containerDate
        }
      }
    })

    if (!minDate || !maxDate) {
      return calculateDateRange(7) // 默认7天
    }

    // 扩展日期范围，前后各加2天，确保有足够的空间
    const startDate = new Date(minDate)
    startDate.setDate(startDate.getDate() - 2)
    startDate.setHours(0, 0, 0, 0)

    const endDate = new Date(maxDate)
    endDate.setDate(endDate.getDate() + 2)
    endDate.setHours(0, 0, 0, 0)

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
      // 优先从 Pinia Store 读取，如果没有则从 URL 读取
      let condition: string
      let startDate: string
      let endDate: string
      let label: string

      if (ganttFilterStore.filterCondition) {
        condition = ganttFilterStore.filterCondition
        startDate = ganttFilterStore.startDate
        endDate = ganttFilterStore.endDate
        label = ganttFilterStore.filterLabel
      } else {
        condition = route.query.filterCondition as string
        startDate = route.query.startDate as string
        endDate = route.query.endDate as string
        label = route.query.filterLabel as string
      }

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
      try {
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
      } catch (err: any) {
        console.error('[useGanttLogic] API 调用失败:', err)
        // 如果 API 调用失败，使用空数组
        containers.value = []
      }

      // 计算显示范围
      if (startDate && endDate) {
        // 从Shipments跳转过来时，使用动态日期范围
        displayRange.value = calculateDynamicDateRange(containers.value)
        // 默认选择动态日期标签
        rangeType.value = 0
      } else {
        // 使用动态日期范围
        displayRange.value = calculateDynamicDateRange(containers.value)
        // 默认选择动态日期标签
        rangeType.value = 0
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
    // 互斥逻辑：港口级别每次只允许一个展开
    if (groupKey.endsWith('-port')) {
      if (collapsedGroups.value.has(groupKey)) {
        // 折叠状态 → 展开：先折叠所有其他港口
        collapsedGroups.value.forEach((_, key) => {
          if (key.endsWith('-port')) {
            collapsedGroups.value.add(key)
          }
        })
        collapsedGroups.value.delete(groupKey)
      } else {
        // 展开状态 → 折叠
        collapsedGroups.value.add(groupKey)
      }
    } else {
      // 非港口级别（节点、供应商）正常切换
      if (collapsedGroups.value.has(groupKey)) {
        collapsedGroups.value.delete(groupKey)
      } else {
        collapsedGroups.value.add(groupKey)
      }
    }
  }

  const isGroupCollapsed = (groupKey: string): boolean => {
    return collapsedGroups.value.has(groupKey)
  }

  // 全部展开
  const expandAllGroups = () => {
    collapsedGroups.value.clear()
  }

  // 全部折叠
  const collapseAllGroups = (groupedData: Record<string, any>) => {
    // 折叠所有一级港口
    Object.keys(groupedData).forEach(port => {
      collapsedGroups.value.add(`${port}-port`)
    })
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

  // 获取状态颜色
  const getStatusColor = (status?: string): string => {
    if (!status) return '#909399' // 默认灰色
    return statusColors[status.toLowerCase()] || '#909399'
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

  const handleDrop = async (date: Date) => {
    if (!draggingContainer.value || !dragOverDate.value) return

    const container = draggingContainer.value
    const newDate = dayjs(dragOverDate.value).format('YYYY-MM-DD')

    // 根据当前维度确定更新哪个日期字段
    const condition = filterCondition.value
    let updateField = ''
    let fieldLabel = ''

    // 维度映射到日期字段
    if (condition.startsWith('arrived') || condition === 'arrivalToday' || condition === 'expectedArrival') {
      // 按到港维度 -> 更新计划提柜日
      updateField = 'plannedPickupDate'
      fieldLabel = '计划提柜日'
    } else if (condition === 'overduePlanned' || condition === 'todayPlanned' || 
               condition === 'plannedWithin3Days' || condition === 'plannedWithin7Days' || condition === 'pendingArrangement') {
      // 按计划提柜维度 -> 更新计划提柜日
      updateField = 'plannedPickupDate'
      fieldLabel = '计划提柜日'
    } else if (condition === 'overdue' || condition.includes('Within')) {
      // 按ETA维度 -> 更新ETA（暂不支持，跳转到详情页）
      ElMessage.warning('ETA维度暂不支持拖拽调整，请使用详情页编辑')
      draggingContainer.value = null
      dragOverDate.value = null
      return
    } else if (condition.startsWith('expired') || condition === 'urgent' || 
               condition === 'warning' || condition === 'normal' || condition === 'noLastFreeDate') {
      // 按最晚提柜维度 -> 更新计划提柜日
      updateField = 'plannedPickupDate'
      fieldLabel = '计划提柜日'
    } else if (condition.startsWith('return')) {
      // 按最晚还箱维度 -> 更新计划还箱日
      updateField = 'plannedReturnDate'
      fieldLabel = '计划还箱日'
    } else {
      // 默认 -> 更新计划提柜日
      updateField = 'plannedPickupDate'
      fieldLabel = '计划提柜日'
    }

    try {
      await ElMessageBox.confirm(
        `确定要将货柜 ${container.containerNumber} 的${fieldLabel}调整为 ${formatDateShort(dragOverDate.value)} 吗？`,
        '确认调整日期',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )

      // 调用API更新计划日期
      const updateData: any = { [updateField]: newDate }
      const result = await containerService.updateSchedule(container.containerNumber, updateData)

      if (result.success) {
        ElMessage.success('日期调整成功')
        await loadData()
      } else {
        // 后端返回校验错误
        if (result.errors && result.errors.length > 0) {
          ElMessage.error(`校验失败: ${result.errors.join(', ')}`)
        } else {
          ElMessage.error(result.message || '更新失败')
        }
      }
    } catch (error: any) {
      if (error !== 'cancel') {
        ElMessage.error(error.message || '操作失败')
      }
    } finally {
      draggingContainer.value = null
      dragOverDate.value = null
    }
  }

  const handleDateSave = async (data: any) => {
    try {
      console.log('Save date:', data)

      // 准备更新数据
      const updateData: any = {
        [data.field]: data.value
      }

      // 调用API更新货柜日期
      await containerService.updateContainer(data.containerNumber, updateData)

      ElMessage.success('日期保存成功')
      showDateEditDialog.value = false
      loadData()
    } catch (err: any) {
      console.error('保存日期失败:', err)
      ElMessage.error('保存日期失败: ' + (err.response?.data?.message || err.message))
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
    } else if (rangeType.value === 0) {
      // 动态范围模式
      displayRange.value = calculateDynamicDateRange(containers.value)
      dateRange.value = generateDateRange(displayRange.value[0], displayRange.value[1])
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

  // 应用所有过滤器
  const applyAllFilters = () => {
    loadData()
  }

  // 重置所有过滤器
  const resetAllFilters = () => {
    advancedFilters.value = {
      shipVoyage: '',
      originPort: '',
      forwarder: '',
    }
    loadData()
  }

  const goBack = () => {
    // 使用 Pinia Store 中的状态返回
    router.push({
      path: '/shipments',
      query: {
        startDate: ganttFilterStore.startDate,
        endDate: ganttFilterStore.endDate,
        filterCondition: ganttFilterStore.filterCondition
      }
    })
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
    // 从 URL 同步参数到 Store
    if (route.query.startDate || route.query.endDate || route.query.filterCondition) {
      ganttFilterStore.initFromQuery(route.query)
    }

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
    advancedFilters,
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
    expandAllGroups,
    collapseAllGroups,
    showTooltip,
    hideTooltip,
    formatDate,
    formatDateShort,
    getWeekday,
    isWeekend,
    isToday,
    getContainerDate,
    getStatusColor,
    getContainerStage,
    getNodeTaskType,
    getNodeDate,
    getNodeGroupKey,
    isNodeCompleted,
    calculateDynamicDateRange,
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
