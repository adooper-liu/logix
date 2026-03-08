<script setup lang="ts">
import { ref, shallowRef, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { containerService } from '@/services/container'
import type { PaginationParams } from '@/types'
import type { PortOperation, TruckingTransport, EmptyReturn } from '@/types/container'
import { Search, Refresh, View, Edit, Calendar, Download, ArrowDown, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import CountdownCard from '@/components/CountdownCard.vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import { useContainerCountdown } from '@/composables/useContainerCountdown'
import {
  getLogisticsStatusText as getStatusText,
  getLogisticsStatusType,
  SimplifiedStatus
} from '@/utils/logisticsStatusMachine'
import dayjs from 'dayjs'

const router = useRouter()

// 表格数据 - 使用 shallowRef 减少深度响应式开销
const containers = shallowRef<any[]>([])
// 统计数据（从后端API获取，不依赖全量数据）
const statisticsData = ref<{
  statusDistribution: Record<string, number>
  arrivalDistribution: Record<string, number>
  pickupDistribution: Record<string, number>
  lastPickupDistribution: Record<string, number>
  returnDistribution: Record<string, number>
} | null>(null)
const loading = ref(false)
const searchKeyword = ref('')

// 时间筛选（Dashboard风格的日期范围选择器）
// 顶部时间窗口默认为本年（出运日期口径）
const shipmentDateRange = ref<[Date, Date]>([
  dayjs().startOf('year').toDate(),
  dayjs().endOf('day').toDate()
])



// 分页参数
const pagination = ref<PaginationParams>({
  page: 1,
  pageSize: 10,
  total: 0
})

// 过滤条件（type 为卡片标题，用于展示）
const activeFilter = ref<{
  type: '' | '按状态' | '按到港' | '按提柜计划' | '按最晚提柜' | '按最晚还箱'
  days: string
}>({ type: '', days: '' })

// 表格排序（前端排序：当前页/当前数据集）
const tableSort = ref<{ prop: string; order: 'ascending' | 'descending' | null }>({ prop: '', order: null })

// 表格密度（存 localStorage）
const STORAGE_KEY_TABLE_SIZE = 'shipments-table-size'
const tableSize = ref<'default' | 'large' | 'small'>('default')
try {
  const s = localStorage.getItem(STORAGE_KEY_TABLE_SIZE)
  if (s === 'large' || s === 'small') tableSize.value = s
} catch (_) {}
watch(tableSize, (v) => { try { localStorage.setItem(STORAGE_KEY_TABLE_SIZE, v) } catch (_) {} })

// 列显隐（默认全部显示；存 localStorage 仅用于“保存”后下次恢复）
const STORAGE_KEY_COLUMNS = 'shipments-table-column-visible'
const columnLabels: Record<string, string> = {
  containerNumber: '集装箱号',
  actualShipDate: '出运日期',
  orderNumber: '备货单号',
  billOfLadingNumber: '提单号',
  containerTypeCode: '柜型',
  logisticsStatus: '物流状态',
  inspectionRequired: '查验',
  isUnboxing: '开箱',
  destinationPort: '目的港',
  location: '当前位置',
  etaDestPort: '预计到港',
  etaCorrection: '修正ETA',
  ataDestPort: '实际到港',
  customsStatus: '清关状态',
  plannedPickupDate: '计划提柜日',
  lastFreeDate: '最晚提柜日',
  lastReturnDate: '最晚还箱日',
  returnTime: '实际还箱日',
  cargoDescription: '货物描述',
  lastUpdated: '最后更新',
  actions: '操作'
}
// 默认显示全部列（与 columnLabels 保持一致）
const defaultColumnVisible: Record<string, boolean> = Object.fromEntries(
  Object.keys(columnLabels).map((k) => [k, true])
)
// 默认始终显示全部列，不读取 localStorage，保证每次进入页面都是全部字段
const columnVisible = ref<Record<string, boolean>>({ ...defaultColumnVisible })
const columnSettingOpen = ref(false)
const saveColumnVisible = () => {
  try {
    localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(columnVisible.value))
    columnSettingOpen.value = false
    ElMessage.success('列设置已保存')
  } catch (_) {
    ElMessage.error('保存失败')
  }
}
const resetColumnVisible = () => {
  columnVisible.value = { ...defaultColumnVisible }
}

// 列显隐与 checkbox-group 双向绑定（勾选 = 显示的列）
const columnVisibleKeys = computed({
  get: () => Object.keys(columnLabels).filter(k => columnVisible.value[k] !== false),
  set: (keys: string[]) => {
    Object.keys(columnLabels).forEach(k => { columnVisible.value[k] = keys.includes(k) })
  }
})

// 清关状态映射
const customsStatusMap: Record<string, { text: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }> = {
  'NOT_STARTED': { text: '未开始', type: 'info' },
  'IN_PROGRESS': { text: '进行中', type: 'warning' },
  'COMPLETED': { text: '已完成', type: 'success' },
  'FAILED': { text: '失败', type: 'danger' }
}

// 使用倒计时composable（传入统计数据，不再依赖allContainers）
const {
  countdownByArrival,
  countdownByPickup,
  countdownByLastPickup,
  countdownByReturn,
  countdownByStatus,
  startTimer,
  stopTimer
} = useContainerCountdown(statisticsData)

// 获取集装箱列表
const loadContainers = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      search: searchKeyword.value
    }

    // 使用Dashboard风格的日期筛选
    if (shipmentDateRange.value) {
      params.startDate = dayjs(shipmentDateRange.value[0]).format('YYYY-MM-DD')
      params.endDate = dayjs(shipmentDateRange.value[1]).format('YYYY-MM-DD')
    }

    // 只加载当前页数据（用于表格显示）
    const response = await containerService.getContainers(params)

    containers.value = response.items ?? []
    pagination.value.total = response.pagination?.total ?? 0
    if (response.dateFilterFallback) {
      ElMessage.info('所选日期范围内无出运记录，已显示全部货柜')
    }
  } catch (error) {
    console.error('Failed to load containers:', error)
    ElMessage.error('获取集装箱列表失败')
  } finally {
    loading.value = false
  }
}

// 获取统计数据（后端聚合），与顶部日期范围一致
const loadStatistics = async () => {
  try {
    let startDate: string | undefined
    let endDate: string | undefined
    if (shipmentDateRange.value && shipmentDateRange.value.length === 2) {
      startDate = dayjs(shipmentDateRange.value[0]).format('YYYY-MM-DD')
      endDate = dayjs(shipmentDateRange.value[1]).format('YYYY-MM-DD')
    }
    const response = await containerService.getStatisticsDetailed(startDate, endDate)
    if (response.success && response.data) {
      statisticsData.value = response.data
      if (response.dateFilterFallback) {
        ElMessage.info('所选日期范围内无出运记录，统计已显示全部货柜')
      }
    }
  } catch (error) {
    console.error('Failed to load statistics:', error)
    ElMessage.error('获取统计数据失败')
  }
}

// 根据过滤条件从数据库加载货柜（使用后端过滤）
// 与顶部日期范围联动：表格同时受「日期范围 + 卡片条件」约束
const loadContainersByFilter = async () => {
  const filterCondition = activeFilter.value.days
  if (!filterCondition || !filterCondition.trim()) {
    loadContainers()
    return
  }

  loading.value = true
  try {
    let startDate: string | undefined
    let endDate: string | undefined
    if (shipmentDateRange.value && shipmentDateRange.value.length === 2) {
      startDate = dayjs(shipmentDateRange.value[0]).format('YYYY-MM-DD')
      endDate = dayjs(shipmentDateRange.value[1]).format('YYYY-MM-DD')
    }

    // 使用后端API根据统计条件获取货柜列表
    const response = await containerService.getContainersByFilterCondition(
      filterCondition,
      startDate,
      endDate
    )

    if (response.success && response.items) {
      containers.value = response.items
      pagination.value.total = response.count
    } else {
      containers.value = []
      pagination.value.total = 0
      console.warn('⚠️ [Shipments] 后端返回空数据')
    }
  } catch (error) {
    console.error('❌ [Shipments] loadContainersByFilter 失败:', error)
    ElMessage.error('获取集装箱列表失败')
  } finally {
    loading.value = false
  }
}



// 搜索处理
const handleSearch = () => {
  pagination.value.page = 1
  loadContainers()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  activeFilter.value = { type: '', days: '' }
  pagination.value.page = 1
  loadContainers()
}

// 处理Dashboard风格的日期范围筛选
const handleShipmentDateChange = async (value: [Date, Date] | null) => {
  if (value) {
    shipmentDateRange.value = value
    pagination.value.page = 1
    await Promise.all([
      loadStatistics(),
      loadContainers()
    ])
  }
}

// 重新加载统计数据（从后端获取）
const reloadStatistics = async () => {
  await loadStatistics()
}

// 处理倒计时卡片点击过滤（days 即后端 filterCondition，透传）
const handleCountdownFilter = (type: string, days: string) => {
  activeFilter.value = { type: type as any, days }
  pagination.value.page = 1
  loadContainersByFilter()
}

// 重置过滤器
const resetFilter = () => {
  activeFilter.value = { type: '', days: '' }
  pagination.value.page = 1
  loadContainers()
}

// 查看详情（兼容 containerNumber / container_number，并对柜号做 URL 编码）
const viewDetails = (container: any) => {
  const id = container?.containerNumber ?? container?.container_number
  if (!id) {
    ElMessage.warning('无法获取集装箱号')
    return
  }
  router.push(`/shipments/${encodeURIComponent(String(id))}`)
}

// 编辑集装箱
const editContainer = (container: any) => {
  ElMessage.info(`编辑集装箱 ${container.containerNumber}`)
}

// 分页改变
const handlePageChange = (page: number) => {
  pagination.value.page = page
  if (activeFilter.value.type && activeFilter.value.days) {
    // 有过滤条件时数据已全部加载，仅前端分页
  } else {
    loadContainers()
  }
}

// 页面大小改变
const handlePageSizeChange = (pageSize: number) => {
  pagination.value.pageSize = pageSize
  pagination.value.page = 1
  if (activeFilter.value.type && activeFilter.value.days) {
    // 有过滤条件时数据已全部加载，仅前端分页
  } else {
    loadContainers()
  }
}

// 格式化日期
const formatDate = (date: string | Date): string => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatShipmentDate = (date: string | Date): string => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 根据港口类型动态显示物流状态
const getLogisticsStatusText = (container: any): string => {
  const status = container.logisticsStatus
  const currentPortType = container.currentPortType || container.latestPortOperation?.portType

  // 使用统一状态机获取状态文本
  return getStatusText(status, currentPortType)
}

// 获取状态类型（用于 Tag 组件）
const getStatusType = (status: string): string => {
  return getLogisticsStatusType(status)
}

// 获取过滤条件标签
const getFilterLabel = (days: string): string => {
  const labels: Record<string, string> = {
    'all': '全部',
    'overdue': '已逾期未到港',
    'transit': '已到中转港',
    'today': '今日到港',
    'arrivedBeforeTodayNotPickedUp': '今日之前到港未提柜',
    'arrivedBeforeTodayPickedUp': '今日之前到港已提柜',
    'arrivedBeforeTodayNoATA': '今日之前到港，但无ATA',
    'other': '其他记录',
    '0': '已超时',
    '0-3': '3天内',
    '4-7': '7天内',
    '7+': '7天以上',
    '8+': '还箱日倒计时>7天',
    'overduePickup': '逾期未提柜',
    'todayPlanned': '今日计划提柜',
    'pending': '待安排提柜',
    'no-last-free-date': '最晚提柜日为空',
    'no-last-return-date': '最后还箱日为空',
    '1-3': '1-3天'
  }
  return labels[days] || days
}

// 计算倒计时时间
const getRemainingTime = (targetDate: string | Date | null | undefined) => {
  if (!targetDate) return null
  const target = new Date(targetDate)
  const now = new Date()
  const diff = target.getTime() - now.getTime()

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  return { days, hours, minutes, seconds, isExpired: false }
}

// 获取修正ETA（从港口操作记录中获取）
const getEtaCorrection = (container: any): string | Date | null => {
  const portOps = container.portOperations as PortOperation[] | undefined
  if (!portOps) return null

  const destPortOp = portOps.find(po => po.portType === 'destination')
  return destPortOp?.etaCorrection || null
}

// 状态判断函数：是否已出运但未到港之后的状态
const isShippedButNotArrived = (status: string) => {
  const statusIndex = [
    SimplifiedStatus.NOT_SHIPPED,
    SimplifiedStatus.SHIPPED,
    SimplifiedStatus.IN_TRANSIT,
    SimplifiedStatus.AT_PORT,
    SimplifiedStatus.PICKED_UP,
    SimplifiedStatus.UNLOADED,
    SimplifiedStatus.RETURNED_EMPTY
  ].indexOf(status as SimplifiedStatus)

  // 已出运（SHIPPED、IN_TRANSIT、AT_PORT）
  const isShipped = statusIndex >= 1 && statusIndex <= 3
  return isShipped
}

// 状态判断函数：是否未提柜及之后状态没有任一发生
const isNotPickedUp = (status: string) => {
  const statusIndex = [
    SimplifiedStatus.NOT_SHIPPED,
    SimplifiedStatus.SHIPPED,
    SimplifiedStatus.IN_TRANSIT,
    SimplifiedStatus.AT_PORT,
    SimplifiedStatus.PICKED_UP,
    SimplifiedStatus.UNLOADED,
    SimplifiedStatus.RETURNED_EMPTY
  ].indexOf(status as SimplifiedStatus)

  // 未提柜及之后状态（NOT_SHIPPED、SHIPPED、IN_TRANSIT、AT_PORT）
  return statusIndex >= 0 && statusIndex <= 3
}

// 前端分页计算属性（用于过滤后的数据）
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

// 取可排序列的原始值（日期列用时间戳，便于比较）
const getSortValue = (row: any, prop: string): number | string => {
  const val = prop === 'actualShipDate' ? (row.actualShipDate || row.createdAt) : row[prop]
  if (val == null || val === '') return ''
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) return new Date(val).getTime()
  if (val instanceof Date) return val.getTime()
  return String(val)
}

// 快捷筛选（表格上方）
const quickStatusFilter = ref<string[]>([])

// 根据过滤条件筛选货柜，应用表格排序与快捷筛选
const filteredContainers = computed(() => {
  let list = paginatedContainers.value
  if (quickStatusFilter.value.length > 0) {
    const set = new Set(quickStatusFilter.value)
    list = list.filter((row: any) => set.has(row.logisticsStatus))
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
    const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))
    return asc ? cmp : -cmp
  })
})

const handleSortChange = ({ prop, order }: { prop: string; order: string | null }) => {
  tableSort.value = { prop: prop || '', order: (order as 'ascending' | 'descending') || null }
}

// 导出：将当前数据转为 CSV 并下载
const exportToCsv = (rows: any[], filename: string) => {
  const headers = ['集装箱号', '出运日期', '备货单号', '提单号', '柜型', '物流状态', '查验', '开箱', '目的港', '当前位置', '预计到港', '实际到港', '清关状态', '计划提柜日', '最晚提柜日', '最晚还箱日', '实际还箱日', '货物描述', '最后更新']
  const escape = (v: any) => {
    const s = v == null ? '' : String(v)
    return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const line = (row: any) => [
    row.containerNumber,
    formatShipmentDate(row.actualShipDate || row.createdAt),
    row.orderNumber,
    row.billOfLadingNumber,
    row.containerTypeCode,
    getLogisticsStatusText(row),
    row.inspectionRequired ? '是' : '否',
    row.isUnboxing ? '是' : '否',
    row.destinationPort,
    row.location,
    row.etaDestPort ? formatDate(row.etaDestPort) : '',
    row.ataDestPort ? formatDate(row.ataDestPort) : '',
    row.customsStatus ? customsStatusMap[row.customsStatus]?.text ?? row.customsStatus : '',
    row.plannedPickupDate ? formatDate(row.plannedPickupDate) : '',
    row.lastFreeDate ? formatDate(row.lastFreeDate) : '',
    row.lastReturnDate ? formatDate(row.lastReturnDate) : '',
    row.returnTime ? formatDate(row.returnTime) : '',
    row.cargoDescription ?? '',
    row.lastUpdated ? formatDate(row.lastUpdated) : ''
  ].map(escape).join(',')
  const csv = '\uFEFF' + headers.map(escape).join(',') + '\n' + rows.map(line).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const handleExportCurrentPage = () => {
  const list = filteredContainers.value
  if (list.length === 0) {
    ElMessage.warning('当前页无数据可导出')
    return
  }
  exportToCsv(list, `货柜列表-当前页-${dayjs().format('YYYY-MM-DD-HHmm')}.csv`)
  ElMessage.success('已导出当前页')
}

const handleExportAll = () => {
  if (!activeFilter.value.type) {
    ElMessage.info('「导出全部」仅在已使用统计卡片筛选时可用，当前已导出当前页')
    handleExportCurrentPage()
    return
  }
  const list = containers.value
  if (list.length === 0) {
    ElMessage.warning('当前条件下无数据可导出')
    return
  }
  exportToCsv(list, `货柜列表-${activeFilter.value.type}-${dayjs().format('YYYY-MM-DD-HHmm')}.csv`)
  ElMessage.success(`已导出全部 ${list.length} 条`)
}

// 多选与批量导出
const tableRef = ref<InstanceType<typeof import('element-plus').ElTable>>()
const selectedRows = ref<any[]>([])
const handleSelectionChange = (rows: any[]) => { selectedRows.value = rows }
const handleBatchExport = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先勾选要导出的行')
    return
  }
  exportToCsv(selectedRows.value, `货柜列表-已选${selectedRows.value.length}条-${dayjs().format('YYYY-MM-DD-HHmm')}.csv`)
  ElMessage.success(`已导出 ${selectedRows.value.length} 条`)
}

// 跳转甘特图：与统计卡片一致，带出运日期、卡片筛选条件、选中柜号
const goGanttChart = () => {
  const ids = selectedRows.value.length ? selectedRows.value.map((r: any) => r.containerNumber).filter(Boolean) : []
  const query: Record<string, string> = {}
  if (shipmentDateRange.value?.length === 2) {
    query.startDate = dayjs(shipmentDateRange.value[0]).format('YYYY-MM-DD')
    query.endDate = dayjs(shipmentDateRange.value[1]).format('YYYY-MM-DD')
  }
  if (activeFilter.value.type && activeFilter.value.days) {
    query.filterCondition = activeFilter.value.days
  }
  if (ids.length) query.containers = ids.join(',')
  router.push({ path: '/shipments/gantt-chart', query })
}

onMounted(() => {
  // 检查是否从Dashboard跳转过来，带有时间参数
  const route = router.currentRoute.value
  if (route.query.startDate && route.query.endDate && route.query.timeDimension) {
    // 从Dashboard传来的时间范围，应用到Dashboard风格的日期选择器
    shipmentDateRange.value = [
      new Date(route.query.startDate as string),
      new Date(route.query.endDate as string)
    ]
  }

  // 并行加载统计数据和表格数据
  Promise.all([
    loadStatistics(),
    loadContainers()
  ]).then(() => {
    startTimer()
  })
})

onUnmounted(() => {
  stopTimer()
})
</script>

<template>
  <div class="shipments-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>集装箱管理</h2>
      <p>管理所有的集装箱信息和状态跟踪</p>
    </div>

    <!-- 搜索和操作栏 -->
    <el-card class="search-card">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索集装箱号、备货单号、提单号..."
          :prefix-icon="Search"
          style="width: 300px; margin-right: 15px;"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          搜索
        </el-button>
        <el-button @click="resetSearch">
          <el-icon><Refresh /></el-icon>
          重置
        </el-button>

        <!-- 共用的日期范围选择器 -->
        <DateRangePicker v-model="shipmentDateRange" @update:modelValue="handleShipmentDateChange" />

        <!-- 甘特图按钮 -->
        <el-button type="success" @click="goGanttChart()">
          <el-icon><Calendar /></el-icon>
          甘特图
        </el-button>

        <!-- 显示当前过滤器 -->
        <el-tag v-if="activeFilter.type" type="warning" closable @close="resetFilter">
          {{ activeFilter.type }}: {{ getFilterLabel(activeFilter.days) }}
        </el-tag>

        <div class="spacer"></div>
        <el-dropdown trigger="click" @command="(cmd: string) => cmd === 'page' ? handleExportCurrentPage() : handleExportAll()">
          <el-button type="primary" plain>
            <el-icon><Download /></el-icon>
            导出
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="page">导出当前页</el-dropdown-item>
              <el-dropdown-item command="all">导出全部（当前条件）</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button @click="loadContainers">
          <el-icon><Refresh /></el-icon>
          刷新列表
        </el-button>
        <el-button type="success" @click="reloadStatistics">
          <el-icon><Refresh /></el-icon>
          刷新统计
        </el-button>
      </div>
    </el-card>

    <!-- 倒计时可视化卡片 -->
    <el-card class="countdown-cards">
      <div class="countdown-grid">
        <CountdownCard
          title="按状态"
          label="物流状态分布"
          subtitle="（全部货柜）"
          :data="countdownByStatus"
          tree-layout="column"
          @filter="handleCountdownFilter"
          description="<strong>统计范围：</strong>全部货柜（出运日在页面所选日期范围内）<br/><strong>分类依据：</strong>物流状态机（logistics_status），在途细分：未到港 / 已到中转港；已到港仅计已到目的港<br/><strong>业务用途：</strong>监控货柜在全流程中的实时分布；点击标签可筛选对应列表，统计与列表同源"
        />
        <CountdownCard
          title="按到港"
          label="到港时间分布"
          subtitle="（全部货柜）"
          :data="countdownByArrival"
          :tree-layout="true"
          @filter="handleCountdownFilter"
          description="<strong>统计范围：</strong>已出运至已还箱的全部货柜（shipped / in_transit / at_port / picked_up / unloaded / returned_empty）<br/><strong>分组结构：</strong><br/>① 已到目的港：目的港有 ATA，子项按今日到港 / 之前未提柜 / 之前已提柜<br/>② 已到中转港：有中转港到港记录且目的港无 ATA，子项按目的港 ETA 细分<br/>③ 预计到港：目的港无 ATA，按目的港 ETA 与今天比较（已逾期、3 天内、7 天内、7 天后、其他）<br/><strong>业务用途：</strong>监控海运段到港进度，区分中转港与目的港，预警逾期；统计与点击列表同源"
        />
        <CountdownCard
          title="按提柜计划"
          label="计划提柜分布"
          :data="countdownByPickup"
          @filter="handleCountdownFilter"
          description="<strong>统计范围：</strong>已到目的港且未还箱、未 WMS、未提柜（与按最晚提柜目标集一致）<br/><strong>分类依据：</strong>计划提柜日（拖车/提柜计划）<br/><strong>业务用途：</strong>监控按计划提柜进度与逾期；统计与点击列表同源"
        />
        <CountdownCard
          title="按最晚提柜"
          label="最晚提柜倒计时"
          :data="countdownByLastPickup"
          @filter="handleCountdownFilter"
          description="<strong>统计范围：</strong>已到目的港且未还箱、未 WMS、未提柜（与按提柜计划目标集一致）<br/><strong>分类依据：</strong>最晚提柜日（last_free_date，免费期）与今天比较<br/><strong>业务用途：</strong>预警超免费期风险；统计与点击列表同源"
        />
        <CountdownCard
          title="按最晚还箱"
          label="最晚还箱倒计时"
          :data="countdownByReturn"
          @filter="handleCountdownFilter"
          description="<strong>统计范围：</strong>已有实际提柜或拖车记录且未还箱<br/><strong>分类依据：</strong>最后还箱日与今天比较<br/><strong>业务用途：</strong>监控还箱时效与逾期；统计与点击列表同源"
        />
      </div>
    </el-card>

    <!-- 集装箱表格 -->
    <el-card class="table-card">
      <div class="table-toolbar">
        <el-radio-group v-model="tableSize" size="small">
          <el-radio-button value="small">紧凑</el-radio-button>
          <el-radio-button value="default">默认</el-radio-button>
          <el-radio-button value="large">宽松</el-radio-button>
        </el-radio-group>
        <span class="toolbar-label">物流状态：</span>
        <el-select
          v-model="quickStatusFilter"
          multiple
          collapse-tags
          collapse-tags-tooltip
          placeholder="全部"
          clearable
          size="small"
          style="width: 220px; margin-right: 12px;"
        >
          <el-option label="未出运" :value="SimplifiedStatus.NOT_SHIPPED" />
          <el-option label="已出运" :value="SimplifiedStatus.SHIPPED" />
          <el-option label="在途" :value="SimplifiedStatus.IN_TRANSIT" />
          <el-option label="已到目的港" :value="SimplifiedStatus.AT_PORT" />
          <el-option label="已提柜" :value="SimplifiedStatus.PICKED_UP" />
          <el-option label="已卸柜" :value="SimplifiedStatus.UNLOADED" />
          <el-option label="已还箱" :value="SimplifiedStatus.RETURNED_EMPTY" />
        </el-select>
        <el-button type="default" plain @click="columnSettingOpen = true">
          <el-icon><Setting /></el-icon>
          列设置
        </el-button>
        <el-button type="success" plain :disabled="selectedRows.length === 0" @click="handleBatchExport">
          <el-icon><Download /></el-icon>
          批量导出
        </el-button>
      </div>
      <el-table
        ref="tableRef"
        :data="filteredContainers"
        :size="tableSize"
        :default-sort="{ prop: tableSort.prop || undefined, order: tableSort.order || undefined }"
        v-loading="loading"
        stripe
        style="width: 100%"
        @sort-change="handleSortChange"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="45" fixed="left" />
        <el-table-column type="expand" width="45" fixed="left">
          <template #default="{ row }">
            <div class="table-expand-detail">
              <div class="expand-row">
                <span class="expand-label">目的港</span><span>{{ row.destinationPort || '-' }}</span>
                <span class="expand-label">预计到港</span><span>{{ row.etaDestPort ? formatDate(row.etaDestPort) : '-' }}</span>
                <span class="expand-label">实际到港</span><span>{{ row.ataDestPort ? formatDate(row.ataDestPort) : '-' }}</span>
              </div>
              <div class="expand-row">
                <span class="expand-label">计划提柜日</span><span>{{ row.plannedPickupDate ? formatDate(row.plannedPickupDate) : '-' }}</span>
                <span class="expand-label">最晚提柜日</span><span>{{ row.lastFreeDate ? formatDate(row.lastFreeDate) : '-' }}</span>
                <span class="expand-label">最晚还箱日</span><span>{{ row.lastReturnDate ? formatDate(row.lastReturnDate) : '-' }}</span>
                <span class="expand-label">实际还箱日</span><span>{{ row.returnTime ? formatDate(row.returnTime) : '-' }}</span>
              </div>
              <div v-if="row.cargoDescription" class="expand-row">
                <span class="expand-label">货物描述</span><span>{{ row.cargoDescription }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <div class="table-empty">
            <el-empty description="暂无数据">
              <template v-if="activeFilter.type">
                <span class="empty-hint">当前筛选条件下没有货柜记录，可尝试调整日期范围或清除筛选。</span>
              </template>
              <template v-else>
                <span class="empty-hint">在所选日期范围内暂无出运记录。</span>
              </template>
            </el-empty>
          </div>
        </template>
        <template v-if="columnVisible.containerNumber">
          <el-table-column prop="containerNumber" label="集装箱号" width="140" fixed />
        </template>
        <template v-if="columnVisible.actualShipDate">
          <el-table-column prop="actualShipDate" label="出运日期" width="120" sortable="custom">
          <template #default="{ row }">
            {{ formatShipmentDate(row.actualShipDate || row.createdAt) }}
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.orderNumber">
          <el-table-column prop="orderNumber" label="备货单号" width="140" />
        </template>
        <template v-if="columnVisible.billOfLadingNumber">
          <el-table-column prop="billOfLadingNumber" label="提单号" width="140" />
        </template>
        <template v-if="columnVisible.containerTypeCode">
          <el-table-column prop="containerTypeCode" label="柜型" width="80">
          <template #default="{ row }">
            <el-tag size="small">{{ row.containerTypeCode || '-' }}</el-tag>
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.logisticsStatus">
          <el-table-column prop="logisticsStatus" label="物流状态" width="120">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.logisticsStatus)" size="small">
              {{ getLogisticsStatusText(row) || '-' }}
            </el-tag>
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.inspectionRequired">
          <el-table-column prop="inspectionRequired" label="查验" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.inspectionRequired ? 'warning' : 'info'" size="small">
              {{ row.inspectionRequired ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.isUnboxing">
          <el-table-column prop="isUnboxing" label="开箱" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isUnboxing ? 'warning' : 'info'" size="small">
              {{ row.isUnboxing ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.destinationPort">
          <el-table-column prop="destinationPort" label="目的港" width="100" />
        </template>
        <template v-if="columnVisible.location">
          <el-table-column prop="location" label="当前位置" width="100" />
        </template>
        <template v-if="columnVisible.etaDestPort">
          <el-table-column prop="etaDestPort" label="预计到港" width="110" sortable="custom">
          <template #default="{ row }">
            {{ row.etaDestPort ? formatDate(row.etaDestPort) : '-' }}
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.etaCorrection">
          <el-table-column label="修正ETA" width="110">
          <template #default="{ row }">
            <template v-if="row.etaCorrection ?? getEtaCorrection(row)">
              <el-tag type="success" size="small">
                {{ formatDate((row.etaCorrection ?? getEtaCorrection(row)) as string | Date) }}
              </el-tag>
            </template>
            <span v-else>-</span>
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.ataDestPort">
          <el-table-column prop="ataDestPort" label="实际到港" width="110" sortable="custom">
          <template #default="{ row }">
            {{ row.ataDestPort ? formatDate(row.ataDestPort) : '-' }}
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.customsStatus">
          <el-table-column prop="customsStatus" label="清关状态" width="100">
          <template #default="{ row }">
            <el-tag :type="customsStatusMap[row.customsStatus]?.type || 'info'" size="small" v-if="row.customsStatus">
              {{ customsStatusMap[row.customsStatus]?.text || row.customsStatus }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.plannedPickupDate">
          <el-table-column prop="plannedPickupDate" label="计划提柜日" width="110" sortable="custom">
          <template #default="{ row }">
            {{ row.plannedPickupDate ? formatDate(row.plannedPickupDate) : '-' }}
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.lastFreeDate">
          <el-table-column prop="lastFreeDate" label="最晚提柜日" width="110" sortable="custom">
          <template #default="{ row }">
            {{ row.lastFreeDate ? formatDate(row.lastFreeDate) : '-' }}
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.lastReturnDate">
          <el-table-column prop="lastReturnDate" label="最晚还箱日" width="110" sortable="custom">
          <template #default="{ row }">
            {{ row.lastReturnDate ? formatDate(row.lastReturnDate) : '-' }}
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.returnTime">
          <el-table-column prop="returnTime" label="实际还箱日" width="110" sortable="custom">
          <template #default="{ row }">
            {{ row.returnTime ? formatDate(row.returnTime) : '-' }}
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.cargoDescription">
          <el-table-column prop="cargoDescription" label="货物描述" min-width="150" show-overflow-tooltip />
        </template>
        <template v-if="columnVisible.lastUpdated">
          <el-table-column prop="lastUpdated" label="最后更新" width="160" sortable="custom">
          <template #default="{ row }">
            {{ row.lastUpdated ? formatDate(row.lastUpdated) : '-' }}
          </template>
        </el-table-column>
        </template>
        <template v-if="columnVisible.actions">
          <el-table-column label="操作" width="100" fixed="right" align="center">
          <template #default="{ row }">
            <el-button size="small" type="primary" circle @click="viewDetails(row)" title="查看">
              <el-icon><View /></el-icon>
            </el-button>
            <el-button size="small" circle @click="editContainer(row)" title="编辑">
              <el-icon><Edit /></el-icon>
            </el-button>
          </template>
        </el-table-column>
        </template>
      </el-table>

      <!-- 列设置抽屉 -->
      <el-drawer v-model="columnSettingOpen" title="列显示设置" size="320px">
        <div class="column-setting-body">
          <p class="column-setting-hint">勾选需要在表格中显示的列</p>
          <el-checkbox-group v-model="columnVisibleKeys">
            <div v-for="key in Object.keys(columnLabels)" :key="key" class="column-setting-item">
              <el-checkbox :value="key" :label="key">
                {{ columnLabels[key] }}
              </el-checkbox>
            </div>
          </el-checkbox-group>
        </div>
        <template #footer>
          <el-button @click="resetColumnVisible">恢复默认</el-button>
          <el-button type="primary" @click="saveColumnVisible">保存</el-button>
        </template>
      </el-drawer>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total || 0"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.shipments-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;

  h2 {
    font-size: 24px;
    color: $text-primary;
    margin-bottom: 10px;
  }

  p {
    color: $text-secondary;
    font-size: 14px;
  }
}

.search-card {
  margin-bottom: 20px;

  .search-bar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;

    .spacer {
      flex: 1;
    }
  }
}

.table-card {
  .table-toolbar {
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;

    .toolbar-label {
      font-size: 13px;
      color: var(--el-text-color-regular);
      margin-left: 8px;
    }
  }

  .table-empty {
    padding: 24px 0;

    .empty-hint {
      display: block;
      margin-top: 8px;
      font-size: 13px;
      color: var(--el-text-color-secondary);
    }
  }

  .pagination-container {
    margin-top: 20px;
    display: flex;
    justify-content: flex-end;
  }
}

.column-setting-body {
  padding: 0 8px;

  .column-setting-hint {
    color: var(--el-text-color-secondary);
    font-size: 13px;
    margin-bottom: 16px;
  }

  .column-setting-item {
    margin-bottom: 10px;
  }
}

.table-expand-detail {
  padding: 12px 16px;
  background: var(--el-fill-color-light);

  .expand-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
    margin-bottom: 8px;
    font-size: 13px;

    &:last-child {
      margin-bottom: 0;
    }

    .expand-label {
      color: var(--el-text-color-secondary);
      min-width: 80px;
    }
  }
}

@media (max-width: 768px) {
  .search-bar {
    flex-direction: column;
    align-items: stretch !important;

    .el-input {
      width: 100% !important;
      margin-right: 0 !important;
    }

    .spacer {
      display: none;
    }
  }

  .countdown-grid {
    grid-template-columns: 1fr !important;
    gap: 8px !important;
  }
}


/* 最小标签布局：卡片网格 */
.countdown-cards {
  margin-bottom: 8px;

  :deep(.el-card__body) {
    padding: 8px 10px;
  }

  /* 五组卡片：按到港占 35%，其余四列等分 65%；中屏/小屏等分 */
  .countdown-grid {
    display: grid;
    grid-template-columns: 1fr 35% 1fr 1fr 1fr;
    gap: 8px;
    align-items: start;
  }

  .countdown-grid > * {
    min-width: 0;
  }
}

@media (max-width: 1279px) {
  .countdown-cards .countdown-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 959px) {
  .countdown-cards .countdown-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>