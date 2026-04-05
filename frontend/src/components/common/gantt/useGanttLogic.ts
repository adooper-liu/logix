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
  // Tooltip 尺寸预估（用于边界检测）
  const TOOLTIP_WIDTH = 320
  const TOOLTIP_HEIGHT = 420

  // 交互状态
  const selectedContainer = ref<Container | null>(null)
  const showDetailSidebar = ref(false)
  const showContextMenu = ref(false)
  const contextMenuPosition = ref({ x: 0, y: 0 })
  const showDateEditDialog = ref(false)

  // 路径连线状态
  const showPathLines = ref(false)
  const pathLineContainer = ref<Container | null>(null)

  // 拖拽状态
  const draggingContainer = ref<Container | null>(null)
  const dragOverDate = ref<Date | null>(null)
  const dropIndicatorPosition = ref({ x: 0, y: 0 })
  const dropIndicatorCellRect = ref<{
    left: number
    top: number
    width: number
    height: number
  } | null>(null)
  /** 待确认的拖拽落点数据，在 dragend 后再弹窗，避免首次点击被消费 */
  const pendingDropConfirm = ref<{
    container: Container
    newDate: string
    updateField: string
    fieldLabel: string
    confirmMsg: string
  } | null>(null)

  // 高级筛选
  const advancedFilters = ref({
    shipVoyage: '',
    originPort: '',
    forwarder: '',
  })

  // 状态颜色映射
  const statusColors: Record<string, string> = {
    not_shipped: '#909399', // 灰色
    shipped: '#909399', // 灰色
    in_transit: '#909399', // 灰色
    at_port: '#90caf9', // 更浅的蓝色
    picked_up: '#ffffff', // 白色
    unloaded: '#ffffff', // 白色
    returned_empty: '#ffffff', // 白色
  }

  /**
   * 甘特主/虚/完成态与英文四节点阶段：由 SimpleGanttChartRefactored 内 calculateNodeStatus +
   * getDisplayItems 负责；三级分组用下方 getNodeAndSupplier（中文五节点）。
   * 后端 gantt_derived 仍可供其它页面/报表使用，甘特图不再重复推导。
   */

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
   * 获取容器的警示边框颜色（仅颜色，不覆盖边框样式）
   * 用于与 CSS 中的边框样式（实线/虚线）结合使用
   */
  const getContainerBorderColor = (container: Container): string => {
    const alertLevel = getAlertLevel(container)
    switch (alertLevel) {
      case 'danger':
        return '#f56c6c' // 红色（已逾期）
      case 'warning':
        return '#e6a23c' // 橙色（3天内到期）
      default:
        return '#67c23a' // 绿色（正常状态）
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

      // 确定五节点和对应的供应商
      const nodeSupplierMap = getNodeAndSupplier(container)

      nodeSupplierMap.forEach(({ node, supplier }) => {
        // 初始化层级结构
        if (!result[portCode]) {
          result[portCode] = {}
        }
        if (!result[portCode][node]) {
          result[portCode][node] = {}
        }
        if (!result[portCode][node][supplier]) {
          result[portCode][node][supplier] = []
        }
        result[portCode][node][supplier].push(container)
      })
    })

    return result
  })

  // 获取货柜对应的节点和供应商
  const getNodeAndSupplier = (container: Container): Array<{ node: string; supplier: string }> => {
    const result: Array<{ node: string; supplier: string }> = []

    // 清关节点 - 仅当有清关行或计划提柜日时才显示
    if (container.portOperations && container.portOperations.length > 0) {
      const destPortOp = container.portOperations.find(op => op.portType === 'destination')
      const customsSupplier = destPortOp?.customsBrokerCode || destPortOp?.customsBroker
      // 有清关行或有计划提柜日时才显示清关节点
      const hasPlannedPickup = container.truckingTransports?.[0]?.plannedPickupDate
      if (customsSupplier || hasPlannedPickup) {
        const supplier = customsSupplier || '未指定清关公司'
        result.push({ node: '清关', supplier })
      }
    }

    // 提柜节点 - 拖卡车队（truckingCompanyId 优先，兼容 carrierCompany）
    // 注：truckingType 为 PRE_SHIPMENT/POST_SHIPMENT 非 'pickup'，取第一条拖卡记录
    const firstTrucking = container.truckingTransports?.[0]
    if (firstTrucking) {
      const pickupSupplier = firstTrucking.truckingCompanyId || firstTrucking.carrierCompany
      if (pickupSupplier) {
        result.push({ node: '提柜', supplier: pickupSupplier })
      }
    }

    // 卸柜节点 - 仓库（warehouseId 优先，兼容 actualWarehouse/plannedWarehouse）
    if (container.warehouseOperations && container.warehouseOperations.length > 0) {
      container.warehouseOperations.forEach(operation => {
        const warehouse =
          operation.warehouseId || operation.actualWarehouse || operation.plannedWarehouse
        if (warehouse) {
          result.push({ node: '卸柜', supplier: warehouse })
        }
      })
    }

    // 还箱节点 - 还箱码头（returnTerminalName 优先 → returnTerminalCode → 回退到仓库名称）
    if (container.emptyReturns && container.emptyReturns.length > 0) {
      container.emptyReturns.forEach(emptyReturn => {
        let supplier = emptyReturn.returnTerminalName || emptyReturn.returnTerminalCode
        // 回退到使用仓库名称
        if (!supplier && container.warehouseOperations?.[0]) {
          const warehouseOp = container.warehouseOperations[0]
          supplier =
            warehouseOp.warehouseId || warehouseOp.actualWarehouse || warehouseOp.plannedWarehouse
        }
        if (supplier) {
          result.push({ node: '还箱', supplier })
        }
      })
    }

    // 查验节点 - 清关行（与清关使用相同供应商）
    if (container.inspectionRequired && container.portOperations?.length > 0) {
      const destPortOp = container.portOperations.find(op => op.portType === 'destination')
      const customsSupplier = destPortOp?.customsBrokerCode || destPortOp?.customsBroker
      if (customsSupplier) {
        result.push({ node: '查验', supplier: customsSupplier })
      } else {
        // 没有清关公司时使用默认值
        result.push({ node: '查验', supplier: '未指定清关公司' })
      }
    }

    // 如果没有找到任何节点供应商映射，至少放在一个默认分组
    if (result.length === 0) {
      result.push({
        node: '未分类',
        supplier: '未指定供应商',
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
      // 收集所有相关日期
      const dates: Date[] = []

      // 到港相关日期
      if (container.ataDestPort) dates.push(new Date(container.ataDestPort))
      if (container.etaCorrection) dates.push(new Date(container.etaCorrection))
      if (container.etaDestPort) dates.push(new Date(container.etaDestPort))

      // 港口操作日期
      if (container.portOperations && container.portOperations.length > 0) {
        const destPortOp = container.portOperations.find((op: any) => op.portType === 'destination')
        if (destPortOp?.ataDestPort) dates.push(new Date(destPortOp.ataDestPort))
        if (destPortOp?.etaCorrection) dates.push(new Date(destPortOp.etaCorrection))
        if (destPortOp?.etaDestPort) dates.push(new Date(destPortOp.etaDestPort))
        if (destPortOp?.lastFreeDate) dates.push(new Date(destPortOp.lastFreeDate))
      }

      // 海运日期
      if (container.seaFreight?.eta) dates.push(new Date(container.seaFreight.eta))

      // 运输计划日期（泳道日期）
      if (container.truckingTransports && container.truckingTransports.length > 0) {
        const transport = container.truckingTransports[0]
        if (transport.plannedCustomsDate) dates.push(new Date(transport.plannedCustomsDate))
        if (transport.plannedPickupDate) dates.push(new Date(transport.plannedPickupDate))
        if (transport.plannedDeliveryDate) dates.push(new Date(transport.plannedDeliveryDate))
        if (transport.plannedUnloadDate) dates.push(new Date(transport.plannedUnloadDate))
        if (transport.plannedReturnDate) dates.push(new Date(transport.plannedReturnDate))
      }

      // 直接在货柜上的计划日期
      if (container.plannedCustomsDate) dates.push(new Date(container.plannedCustomsDate))
      if (container.plannedPickupDate) dates.push(new Date(container.plannedPickupDate))
      if (container.plannedDeliveryDate) dates.push(new Date(container.plannedDeliveryDate))
      if (container.plannedUnloadDate) dates.push(new Date(container.plannedUnloadDate))
      if (container.plannedReturnDate) dates.push(new Date(container.plannedReturnDate))

      // 更新最小和最大日期
      dates.forEach(date => {
        if (!minDate || date < minDate) {
          minDate = date
        }
        if (!maxDate || date > maxDate) {
          maxDate = date
        }
      })
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

        // ========== 调试代码：检查候选供应商数据 ==========
        if (response.items && response.items.length > 0) {
          const firstContainer = response.items[0]
          console.log(
            '[useGanttLogic] 第一个货柜 availableTruckingCompanies:',
            firstContainer.availableTruckingCompanies
          )
          console.log(
            '[useGanttLogic] 第一个货柜 availableWarehouses:',
            firstContainer.availableWarehouses
          )
          console.log('[useGanttLogic] 第一个货柜完整字段:', Object.keys(firstContainer))
        }
        // ===================================================

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

  // Tooltip：智能边界检测
  const showTooltip = (container: Container, event: MouseEvent) => {
    // ========== 调试代码：检查 tooltip 数据 ==========
    console.log('[showTooltip] container:', container.containerNumber)
    console.log('[showTooltip] availableTruckingCompanies:', container.availableTruckingCompanies)
    console.log('[showTooltip] availableWarehouses:', container.availableWarehouses)
    // ==================================================

    tooltipContainer.value = container

    // 基础偏移量
    const offsetX = 15
    const offsetY = 15

    // 获取视口尺寸
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // 计算 tooltip 位置
    let x = event.clientX + offsetX
    let y = event.clientY + offsetY

    // 动态计算 tooltip 高度（基础高度 + 候选供应商区域高度）
    let actualTooltipHeight = TOOLTIP_HEIGHT
    const hasCandidateSuppliers =
      (container.availableTruckingCompanies?.length || 0) > 0 ||
      (container.availableWarehouses?.length || 0) > 0
    if (hasCandidateSuppliers) {
      // 基础高度约 400px，候选供应商区域额外高度估算
      const truckingCount = container.availableTruckingCompanies?.length || 0
      const warehouseCount = container.availableWarehouses?.length || 0
      // 每个候选项约 24px 高度，加上标题和边距约 60px
      actualTooltipHeight = 400 + (truckingCount + warehouseCount) * 24 + 60
    }

    // 右侧边界检测：如果 tooltip 会超出右边界，则向左偏移
    if (x + TOOLTIP_WIDTH > viewportWidth - 10) {
      x = event.clientX - TOOLTIP_WIDTH - offsetX
    }

    // 底部边界检测：如果 tooltip 会超出底边界，则向上偏移
    if (y + actualTooltipHeight > viewportHeight - 10) {
      y = event.clientY - actualTooltipHeight - offsetY
    }

    // 左边界检测：确保不超出左边界
    if (x < 10) {
      x = 10
    }

    // 上边界检测：确保不超出上边界
    if (y < 10) {
      y = 10
    }

    tooltipPosition.value = { x, y }
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

  // 切换路径连线显示
  const togglePathLines = () => {
    if (!selectedContainer.value) return
    
    if (showPathLines.value && pathLineContainer.value?.containerNumber === selectedContainer.value.containerNumber) {
      // 如果已经显示且是同一个货柜，则隐藏
      showPathLines.value = false
      pathLineContainer.value = null
    } else {
      // 显示该货柜的路径连线
      showPathLines.value = true
      pathLineContainer.value = selectedContainer.value
    }
  }

  // 计算路径连线坐标
  const calculatedPathLines = computed(() => {
    if (!showPathLines.value || !pathLineContainer.value) return []
    
    const container = pathLineContainer.value
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    
    // TODO: 这里需要根据实际DOM位置计算连线坐标
    // 暂时返回空数组，后续需要实现具体的坐标计算逻辑
    
    return lines
  })

  const openContextMenu = (container: Container, event: MouseEvent) => {
    selectedContainer.value = container
    contextMenuPosition.value = { x: event.clientX, y: event.clientY }
    showContextMenu.value = true
    hideTooltip()
  }

  const handleDragStart = (container: Container, event: DragEvent) => {
    draggingContainer.value = container
    // 拖拽开始时立即隐藏 Tooltip
    hideTooltip()
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', container.containerNumber)
    }
  }

  const handleDragEnd = () => {
    // 取消动画帧
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }

    // 保存 pending 数据
    const pending = pendingDropConfirm.value

    // 统一清理状态
    cleanupDragState()

    // 如果没有待确认的数据，直接返回
    if (!pending) {
      return
    }

    const { container, newDate, updateField, fieldLabel, confirmMsg } = pending

    // 使用双层 RAF 延迟弹窗
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ElMessageBox.confirm(confirmMsg, '确认调整日期', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })
          .then(async () => {
            await executeUpdate(container, updateField, newDate)
          })
          .catch((err: unknown) => {
            if (err !== 'cancel') {
              console.error('[handleDragEnd] Confirm error:', err)
              ElMessage.error('操作失败：' + (err as Error).message)
            }
          })
      })
    })
  }

  /**
   * 执行更新操作（独立出来方便测试）
   */
  const executeUpdate = async (container: Container, updateField: string, newDate: string) => {
    try {
      const updateData: Record<string, string> = { [updateField]: newDate }

      const result = await containerService.updateSchedule(container.containerNumber, updateData)

      if (result.success) {
        ElMessage.success({
          message: '日期调整成功',
          duration: 2000,
        })
        await loadData()
      } else {
        handleUpdateError(result)
      }
    } catch (error: any) {
      handleUpdateException(error)
    }
  }

  /**
   * 处理更新错误（业务错误）
   */
  const handleUpdateError = (result: any) => {
    if (result.errors && result.errors.length > 0) {
      ElMessage.error({
        message: `校验失败：${result.errors.join(', ')}`,
        duration: 5000,
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
   * 处理更新异常（网络错误等）
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

  // ========== 拖拽字段映射 ==========
  /** 节点类型到更新字段的映射 */
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
    dragOverDate.value = null
    dropIndicatorPosition.value = { x: 0, y: 0 }
    dropIndicatorCellRect.value = null
    pendingDropConfirm.value = null
    showContextMenu.value = false
    hideTooltip()
  }

  /** 获取当前节点类型（从 collapsedGroups 推断或默认） */
  const getCurrentDragNodeType = (): string => {
    // 从 filterCondition 推断节点类型
    const condition = filterCondition.value
    if (condition.startsWith('return')) return '还箱'
    if (condition.includes('Pickup') || condition.includes('Planned')) return '提柜'
    if (condition.includes('LastPickup')) return '提柜'
    return '提柜' // 默认
  }

  const handleDrop = (date: Date, nodeName?: string) => {
    if (!draggingContainer.value || !dragOverDate.value) return

    const container = draggingContainer.value
    const newDate = dayjs(dragOverDate.value).format('YYYY-MM-DD')

    // 使用传入的 nodeName 或从当前分组推断
    let targetNode = nodeName

    // 如果没有传入 node，尝试从分组结构中推断
    if (!targetNode) {
      targetNode = inferNodeFromGroupedStructure(container)
    }

    // 如果还是无法确定，使用默认值
    if (!targetNode) {
      console.warn('[handleDrop] Cannot determine node type, using default')
      targetNode = '提柜'
    }

    // 使用节点类型到字段的映射
    const { field, label } = NODE_TO_FIELD_MAP[targetNode] || NODE_TO_FIELD_MAP['提柜']

    const confirmMsg = `确定要将货柜 ${container.containerNumber} 的${label}调整为 ${formatDateShort(dragOverDate.value)} 吗？`
    pendingDropConfirm.value = {
      container,
      newDate,
      updateField: field,
      fieldLabel: label,
      confirmMsg,
    }

    console.log('[handleDrop] Set pending:', {
      container: container.containerNumber,
      node: targetNode,
      field,
      newDate,
    })
  }

  /**
   * 从分组结构中推断容器所在的节点
   */
  const inferNodeFromGroupedStructure = (container: Container): string | null => {
    const grouped = groupedByPortNodeSupplier.value

    for (const [portCode, nodesByNode] of Object.entries(grouped)) {
      for (const [nodeName, suppliersBySupplier] of Object.entries(nodesByNode)) {
        for (const [supplierCode, containers] of Object.entries(suppliersBySupplier)) {
          if (containers.some(c => c.containerNumber === container.containerNumber)) {
            return nodeName
          }
        }
      }
    }

    return null
  }

  const handleDateSave = async (data: any) => {
    try {
      console.log('Save date:', data)

      // 准备更新数据
      const updateData: any = {
        [data.field]: data.value,
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
        filterCondition: ganttFilterStore.filterCondition,
      },
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

  // 拖拽处理：requestAnimationFrame 节流，每帧最多更新一次，兼顾流畅与性能
  let rafId = 0
  let lastEvent: DragEvent | null = null
  const updateDragOverState = (event: DragEvent) => {
    const elementUnderCursor = document.elementFromPoint(
      event.clientX,
      event.clientY
    ) as HTMLElement
    const dateCell =
      elementUnderCursor?.closest('.date-cell') ??
      (event.target as HTMLElement)?.closest('.date-cell')
    if (dateCell) {
      const dateIndexAttr = dateCell.getAttribute('data-date-index')
      let dateIndex = -1
      if (dateIndexAttr !== null) {
        dateIndex = parseInt(dateIndexAttr, 10)
        if (isNaN(dateIndex)) dateIndex = -1
      } else {
        const parent = dateCell.parentElement
        const siblings = parent ? Array.from(parent.children) : []
        dateIndex = siblings.indexOf(dateCell)
      }
      if (dateIndex >= 0 && dateIndex < dateRange.value.length) {
        const newDate = dateRange.value[dateIndex]
        const rect = dateCell.getBoundingClientRect()
        dragOverDate.value = newDate
        dropIndicatorCellRect.value = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        }
        dropIndicatorPosition.value = {
          x: rect.left + rect.width / 2 - 80,
          y: rect.top,
        }
      } else {
        dragOverDate.value = null
        dropIndicatorCellRect.value = null
      }
    } else {
      dragOverDate.value = null
      dropIndicatorCellRect.value = null
    }
  }
  const handleDragOver = (event: DragEvent) => {
    event.preventDefault()
    lastEvent = event
    if (rafId === 0) {
      rafId = requestAnimationFrame(() => {
        if (lastEvent) {
          updateDragOverState(lastEvent)
        }
        rafId = 0
      })
    }
  }

  const handleGlobalDrop = (event: DragEvent) => {
    event.preventDefault()
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    updateDragOverState(event)
    if (dragOverDate.value) {
      handleDrop(dragOverDate.value)
    }
    dragOverDate.value = null
    dropIndicatorCellRect.value = null
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
    groupedByPortNodeSupplier,
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
    // 路径连线
    showPathLines,
    pathLineContainer,
    calculatedPathLines,
    togglePathLines,
    // 拖拽
    draggingContainer,
    dragOverDate,
    dropIndicatorPosition,
    dropIndicatorCellRect,
    // 状态
    statusColors,
    // 预警系统
    alertRules,
    getContainerAlerts,
    hasAlert,
    getAlertLevel,
    getContainerBorderStyle,
    getContainerBorderColor,
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
    getNodeAndSupplier,
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
