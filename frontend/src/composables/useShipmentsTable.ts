import { ref, computed, watch } from 'vue'
import type { PaginationParams } from '@/types'
import type { ContainerListItem } from '@/types/container'
import { useLogisticsStatus } from './useLogisticsStatus'

/**
 * 货柜表格相关的组合式函数
 * Shipments table related composable function
 */
export function useShipmentsTable() {
  // 使用物流状态 composable
  const { SimplifiedStatus, filterContainersByStatus } = useLogisticsStatus()

  // 表格数据 - 使用 shallowRef 减少深度响应式开销
  const containers = ref<ContainerListItem[]>([])
  const loading = ref(false)
  const searchKeyword = ref('')

  // 分页参数
  const pagination = ref<PaginationParams>({
    page: 1,
    pageSize: 10,
    total: 0,
  })

  // 过滤条件
  const activeFilter = ref<{
    type: '' | '按状态' | '按到港' | '按提柜计划' | '按最晚提柜' | '按最晚还箱'
    days: string
  }>({ type: '', days: '' })

  // 表格排序
  const tableSort = ref<{ prop: string; order: 'ascending' | 'descending' | null }>({
    prop: '',
    order: null,
  })

  // 表格密度
  const STORAGE_KEY_TABLE_SIZE = 'shipments-table-size'
  const tableSize = ref<'default' | 'large' | 'small'>('default')
  try {
    const s = localStorage.getItem(STORAGE_KEY_TABLE_SIZE)
    if (s === 'large' || s === 'small') tableSize.value = s
  } catch (_) {}
  watch(tableSize, v => {
    try {
      localStorage.setItem(STORAGE_KEY_TABLE_SIZE, v)
    } catch (_) {}
  })

  // 列显隐
  const STORAGE_KEY_COLUMNS = 'shipments-table-column-visible'
  const STORAGE_KEY_COLUMN_ORDER = 'shipments-table-column-order'
  const columnLabels: Record<string, string> = {
    containerNumber: 'container.containerNumber',
    billOfLadingNumber: '提单号/MBL',
    destinationPort: '目的港',
    location: '当前位置',
    containerTypeCode: '柜型',
    logisticsStatus: 'container.logisticsStatus',
    fiveNodeStatus: '五节点状态',
    alerts: '预警',
    inspectionRequired: '查验/开箱',
    totalCost: '总费用',
    actualShipDate: '出运日期',
    etaDestPort: '到港日期',
    lastFreeDate: '提柜日期',
    lastReturnDate: '还箱日期',
    cargoDescription: 'container.cargoDescription',
    lastUpdated: '最后更新',
    actions: 'common.actions',
  }

  // 默认列顺序
  const defaultColumnOrder: string[] = Object.keys(columnLabels)

  // 默认显示全部列
  const defaultColumnVisible: Record<string, boolean> = Object.fromEntries(
    Object.keys(columnLabels).map(k => [k, true])
  )

  // 列顺序
  const columnOrder = ref<string[]>([...defaultColumnOrder])

  // 列设置弹窗
  const columnSettingOpen = ref(false)
  const draggedColumnKey = ref<string | null>(null)

  // 默认始终显示全部列
  const columnVisible = ref<Record<string, boolean>>({ ...defaultColumnVisible })

  // 保存列设置
  const saveColumnVisible = () => {
    try {
      localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(columnVisible.value))
      localStorage.setItem(STORAGE_KEY_COLUMN_ORDER, JSON.stringify(columnOrder.value))
      columnSettingOpen.value = false
    } catch (_) {}
  }

  // 重置列设置
  const resetColumnVisible = () => {
    columnVisible.value = { ...defaultColumnVisible }
    columnOrder.value = [...defaultColumnOrder]
    try {
      localStorage.removeItem(STORAGE_KEY_COLUMNS)
      localStorage.removeItem(STORAGE_KEY_COLUMN_ORDER)
    } catch (_) {}
  }

  // 拖动相关方法
  const handleDragStart = (e: DragEvent, columnKey: string) => {
    draggedColumnKey.value = columnKey
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move'
      setTimeout(() => {
        ;(e.target as HTMLElement)?.classList.add('dragging')
      }, 0)
    }
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
  }

  const handleDragEnd = (e: DragEvent) => {
    draggedColumnKey.value = null
    ;(e.target as HTMLElement)?.classList.remove('dragging')
  }

  const handleDrop = (e: DragEvent, targetKey: string) => {
    e.preventDefault()
    const sourceKey = draggedColumnKey.value
    if (!sourceKey || sourceKey === targetKey) return

    const sourceIndex = columnOrder.value.indexOf(sourceKey)
    const targetIndex = columnOrder.value.indexOf(targetKey)

    const newOrder = [...columnOrder.value]
    newOrder.splice(sourceIndex, 1)
    newOrder.splice(targetIndex, 0, sourceKey)
    columnOrder.value = newOrder

    draggedColumnKey.value = null
  }

  // 根据列顺序过滤并排序
  const sortedVisibleColumnKeys = computed(() => {
    return columnOrder.value.filter(k => columnVisible.value[k] !== false)
  })

  // 快捷筛选
  const quickStatusFilter = ref<string[]>([])
  // 预警筛选
  const alertFilter = ref<boolean | null>(null)

  // 前端分页计算属性
  const paginatedContainers = computed(() => {
    // 没有过滤条件时，使用后端分页数据
    if (!activeFilter.value.type || !activeFilter.value.days) {
      return containers.value
    }

    // 有过滤条件时，在前端进行分页
    const start = (pagination.value.page - 1) * pagination.value.pageSize
    const end = start + pagination.value.pageSize
    return containers.value.slice(start, end)
  })

  // 取可排序列的原始值
  const getSortValue = (row: ContainerListItem, prop: string): number | string => {
    const val =
      prop === 'actualShipDate'
        ? row.actualShipDate || row.createdAt
        : (row as Record<string, unknown>)[prop]
    if (val == null || val === '') return ''
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      const m = val.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m) return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      return new Date(val).getTime()
    }
    if (val instanceof Date) return val.getTime()
    return String(val)
  }

  // 根据过滤条件筛选货柜，应用表格排序与快捷筛选
  const filteredContainers = computed(() => {
    let list = paginatedContainers.value
    if (quickStatusFilter.value.length > 0) {
      list = filterContainersByStatus(list, quickStatusFilter.value)
    }
    // 应用预警筛选
    if (alertFilter.value === true) {
      list = list.filter(row => (row.alertCount || 0) > 0)
    }
    const { prop, order } = tableSort.value
    if (!prop || !order) return list
    const asc = order === 'ascending'
    return [...list].sort((a, b) => {
      const va = getSortValue(a, prop)
      const vb = getSortValue(b, prop)
      if (va === vb) return 0
      if (va === '' || va === null) return asc ? 1 : -1
      if (vb === '' || vb === null) return asc ? -1 : 1
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb))
      return asc ? cmp : -cmp
    })
  })

  // 排序变化处理
  const handleSortChange = ({ prop, order }: { prop: string; order: string | null }) => {
    tableSort.value = { prop: prop || '', order: (order as 'ascending' | 'descending') || null }
  }

  // 分页改变
  const handlePageChange = (page: number) => {
    pagination.value.page = page
  }

  // 页面大小改变
  const handlePageSizeChange = (pageSize: number) => {
    pagination.value.pageSize = pageSize
    pagination.value.page = 1
  }

  // 搜索处理
  const handleSearch = () => {
    pagination.value.page = 1
  }

  // 重置搜索
  const resetSearch = () => {
    searchKeyword.value = ''
    activeFilter.value = { type: '', days: '' }
    pagination.value.page = 1
  }

  // 处理倒计时卡片点击过滤
  const handleCountdownFilter = (type: string, days: string) => {
    activeFilter.value = { type: type as any, days }
    pagination.value.page = 1
  }

  // 重置过滤器
  const resetFilter = () => {
    activeFilter.value = { type: '', days: '' }
    pagination.value.page = 1
  }

  return {
    // 表格数据
    containers,
    loading,
    searchKeyword,
    pagination,
    activeFilter,
    tableSort,
    tableSize,
    columnOrder,
    columnVisible,
    columnSettingOpen,
    quickStatusFilter,
    alertFilter,
    
    // 计算属性
    sortedVisibleColumnKeys,
    paginatedContainers,
    filteredContainers,
    
    // 方法
    saveColumnVisible,
    resetColumnVisible,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    handleDrop,
    handleSortChange,
    handlePageChange,
    handlePageSizeChange,
    handleSearch,
    resetSearch,
    handleCountdownFilter,
    resetFilter,
    
    // 常量
    columnLabels,
    SimplifiedStatus
  }
}
