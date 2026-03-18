<script setup lang="ts">
import CountdownCard from '@/components/CountdownCard.vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import { useContainerCountdown } from '@/composables/useContainerCountdown'
import { useLogisticsStatus } from '@/composables/useLogisticsStatus'
import { useShipmentsTable } from '@/composables/useShipmentsTable'
import { useShipmentsExport } from '@/composables/useShipmentsExport'
import { useShipmentsSchedule } from '@/composables/useShipmentsSchedule'
import { containerService } from '@/services/container'
import { useAppStore } from '@/store/app'
import { useGanttFilterStore } from '@/store/ganttFilters'
import type { PortOperation } from '@/types/container'
import {
    ArrowDown,
    ArrowRight,
    Calendar,
    Download,
    Edit,
    Refresh,
    Search,
    Setting,
    View,
    Warning,
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()
const ganttFilterStore = useGanttFilterStore()
const { t } = useI18n()

// 使用物流状态 composable
const { 
  getLogisticsStatusText, 
  getStatusType
} = useLogisticsStatus()

// 使用表格相关 composable
const { 
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
  sortedVisibleColumnKeys,
  paginatedContainers,
  filteredContainers,
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
  columnLabels,
  SimplifiedStatus
} = useShipmentsTable()

// 使用导出相关 composable
const { 
  handleExportCurrentPage,
  handleExportAll,
  handleBatchExport,
  formatDate,
  formatShipmentDate,
  customsStatusMap
} = useShipmentsExport()

// 使用排产相关 composable
const { 
  batchScheduleLoading,
  scheduleDialogVisible,
  demurrageWriteBackLoading,
  executeDirectSchedule,
  handleDemurrageWriteBack
} = useShipmentsSchedule()

// 组件卸载标记，防止卸载后响应式更新
const isUnmounted = ref(false)

// 统计数据（从后端API获取，不依赖全量数据）
const statisticsData = ref<{
  statusDistribution: Record<string, number>
  arrivalDistribution: Record<string, number>
  pickupDistribution: Record<string, number>
  lastPickupDistribution: Record<string, number>
  returnDistribution: Record<string, number>
} | null>(null)

// 时间筛选（Dashboard风格的日期范围选择器）
// 顶部时间窗口默认为本年（出运日期口径）
const shipmentDateRange = ref<[Date, Date]>([
  dayjs().startOf('year').toDate(),
  dayjs().endOf('day').toDate(),
])

// 多选与批量导出
const tableRef = ref<InstanceType<typeof import('element-plus').ElTable>>()
const selectedRows = ref<any[]>([])
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// 使用倒计时composable（传入统计数据，不再依赖allContainers）
const {
  countdownByArrival,
  countdownByPickup,
  countdownByLastPickup,
  countdownByReturn,
  countdownByStatus,
  startTimer,
  stopTimer,
} = useContainerCountdown(statisticsData)

// 从URL参数初始化过滤条件
const initFiltersFromUrl = () => {
  const route = useRoute()
  const filterCondition = route.query.filterCondition as string
  const startDate = route.query.startDate as string
  const endDate = route.query.endDate as string
  
  if (startDate && endDate) {
    shipmentDateRange.value = [
      dayjs(startDate).toDate(),
      dayjs(endDate).toDate()
    ]
  }
  
  if (filterCondition) {
    activeFilter.value.days = filterCondition
    // 根据过滤条件设置类型
    if (filterCondition.includes('status')) {
      activeFilter.value.type = '按状态'
    } else if (filterCondition.includes('arrival')) {
      activeFilter.value.type = '按到港'
    } else if (filterCondition.includes('pickup')) {
      activeFilter.value.type = '按提柜计划'
    } else if (filterCondition.includes('last_pickup')) {
      activeFilter.value.type = '按最晚提柜'
    } else if (filterCondition.includes('return')) {
      activeFilter.value.type = '按最晚还箱'
    }
  }
}

// 获取集装箱列表
const loadContainers = async () => {
  if (isUnmounted.value) return

  loading.value = true
  try {
    const params: any = {
      page: pagination.value.page,
      pageSize: pagination.value.pageSize,
      search: searchKeyword.value,
    }

    // 使用Dashboard风格的日期筛选
    if (shipmentDateRange.value) {
      params.startDate = dayjs(shipmentDateRange.value[0]).format('YYYY-MM-DD')
      params.endDate = dayjs(shipmentDateRange.value[1]).format('YYYY-MM-DD')
    }

    // 只加载当前页数据（用于表格显示）
    const response = await containerService.getContainersWithCache(params)

    if (!isUnmounted.value) {
      containers.value = response.items ?? []
      pagination.value.total = response.pagination?.total ?? 0
      if (response.dateFilterFallback) {
        ElMessage.info('所选日期范围内无出运记录，已显示全部货柜')
      }
    }
  } catch (error) {
    console.error('Failed to load containers:', error)
    ElMessage.error('获取集装箱列表失败')
  } finally {
    if (!isUnmounted.value) {
      loading.value = false
    }
  }
}

// 获取统计数据（后端聚合），与顶部日期范围一致
const loadStatistics = async () => {
  if (isUnmounted.value) return

  try {
    let startDate: string | undefined
    let endDate: string | undefined
    if (shipmentDateRange.value && shipmentDateRange.value.length === 2) {
      startDate = dayjs(shipmentDateRange.value[0]).format('YYYY-MM-DD')
      endDate = dayjs(shipmentDateRange.value[1]).format('YYYY-MM-DD')
    }
    const response = await containerService.getStatisticsDetailedWithCache(startDate, endDate)
    if (response.success && response.data && !isUnmounted.value) {
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
  if (isUnmounted.value) return

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
      endDate,
      pagination.value.page,
      pagination.value.pageSize
    )

    if (response.success && response.items && !isUnmounted.value) {
      containers.value = response.items
      pagination.value.total = response.pagination?.total ?? response.count ?? 0
    } else if (!isUnmounted.value) {
      containers.value = []
      pagination.value.total = 0
      console.warn('⚠️ [Shipments] 后端返回空数据')
    }
  } catch (error) {
    console.error('❌ [Shipments] loadContainersByFilter 失败:', error)
    ElMessage.error('获取集装箱列表失败')
  } finally {
    if (!isUnmounted.value) {
      loading.value = false
    }
  }
}

// 处理Dashboard风格的日期范围筛选
const handleShipmentDateChange = async (value: [Date, Date] | null) => {
  if (value) {
    shipmentDateRange.value = value
    pagination.value.page = 1
    await Promise.all([loadStatistics(), loadContainers()])
  }
}

// 重新加载统计数据（从后端获取）
const reloadStatistics = async () => {
  await loadStatistics()
}

// 同时刷新列表和统计数据
const reloadAllData = async () => {
  await Promise.all([loadContainers(), loadStatistics()])
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

// 跳转到甘特图
const goToGantt = () => {
  const filterCondition = activeFilter.value.days
  const filterLabel = getFilterLabel(filterCondition)
  const startDate = dayjs(shipmentDateRange.value[0]).format('YYYY-MM-DD')
  const endDate = dayjs(shipmentDateRange.value[1]).format('YYYY-MM-DD')

  router.push({
    path: '/gantt-chart',
    query: {
      filterCondition,
      startDate,
      endDate,
      filterLabel
    }
  })
}

// 获取过滤条件标签
const getFilterLabel = (days: string): string => {
  const labels: Record<string, string> = {
    all: '全部',
    overdue: '已逾期未到港',
    transit: '已到中转港',
    today: '今日到港',
    arrivedBeforeTodayNotPickedUp: '今日之前到港未提柜',
    arrivedBeforeTodayPickedUp: '今日之前到港已提柜',
    arrivedBeforeTodayNoATA: '今日之前到港，但无ATA',
    other: '其他记录',
    '0': '已超时',
    '0-3': '3天内',
    '4-7': '7天内',
    '7+': '7天以上',
    '8+': '还箱日倒计时>7天',
    overduePickup: '逾期未提柜',
    todayPlanned: '今日计划提柜',
    pending: '待安排提柜',
    'no-last-free-date': '最晚提柜日为空',
    'no-last-return-date': '最后还箱日为空',
    '1-3': '1-3天',
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

// 一键排产（智能排柜）
const handleBatchSchedule = () => {
  scheduleDialogVisible.value = true
}

// 执行直接排产（包装函数）
const handleExecuteDirectSchedule = async () => {
  const success = await executeDirectSchedule(shipmentDateRange.value)
  if (success) {
    await loadContainers()
  }
}

// 执行免费日更新（包装函数）
const handleDemurrageWriteBackWrapper = async () => {
  const success = await handleDemurrageWriteBack()
  if (success) {
    await loadContainers()
  }
}

// 跳转到排产页面
const goToSchedulingPage = () => {
  scheduleDialogVisible.value = false
  const startDate = dayjs(shipmentDateRange.value[0]).format('YYYY-MM-DD')
  const endDate = dayjs(shipmentDateRange.value[1]).format('YYYY-MM-DD')
  const filterCondition = activeFilter.value.days
  const filterLabel = getFilterLabel(filterCondition)
  
  router.push({
    path: '/scheduling',
    query: {
      startDate,
      endDate,
      filterCondition,
      filterLabel
    }
  })
}

// 辅助函数：根据筛选条件确定时间维度
const getTimeDimensionFromFilter = (filterCondition: string): 'arrival' | 'pickup' | 'lastPickup' | 'return' => {
  if (!filterCondition) return 'arrival'
  if (filterCondition.includes('arrival')) return 'arrival'
  if (filterCondition.includes('pickup') && !filterCondition.includes('last')) return 'pickup'
  if (filterCondition.includes('last_pickup')) return 'lastPickup'
  if (filterCondition.includes('return')) return 'return'
  return 'arrival'
}

// 跳转甘特图：与统计卡片一致，带出运日期、卡片筛选条件、选中柜号
const goGanttChart = () => {
  const ids = selectedRows.value.length
    ? selectedRows.value.map((r: any) => r.containerNumber).filter(Boolean)
    : []
  
  const startDate = dayjs(shipmentDateRange.value[0]).format('YYYY-MM-DD')
  const endDate = dayjs(shipmentDateRange.value[1]).format('YYYY-MM-DD')
  const filterCondition = activeFilter.value.days
  const filterLabel = getFilterLabel(filterCondition)
  
  // 1. 保存到全局 Store（自动持久化到 localStorage）
  ganttFilterStore.setFilters({
    startDate: startDate,
    endDate: endDate,
    filterCondition: filterCondition || '',
    filterLabel: filterLabel || '',
    selectedContainers: ids,
    timeDimension: getTimeDimensionFromFilter(filterCondition)
  })
  
  // 2. 构建 query 参数（用于 URL 显示和分享）
  const query: Record<string, string> = {
    startDate,
    endDate
  }
  if (filterCondition) {
    query.filterCondition = filterCondition
    query.filterLabel = filterLabel
  }
  if (ids.length) query.containers = ids.join(',')
  
  // 3. 在同窗口打开甘特图（使用 router.push）
  router.push({ path: '/gantt-chart', query })
}

onMounted(() => {
  // 从 localStorage 加载列顺序
  try {
    const savedOrder = localStorage.getItem('shipments-table-column-order')
    if (savedOrder) {
      const parsed = JSON.parse(savedOrder)
      // 验证保存的顺序是否包含所有列
      if (Array.isArray(parsed) && parsed.length === Object.keys(columnLabels).length) {
        columnOrder.value = parsed
      }
    }
  } catch (_) {}

  // 从URL参数初始化过滤条件（包括从甘特图返回的情况）
  initFiltersFromUrl()

  // 检查是否从Dashboard跳转过来，带有时间参数
  const route = router.currentRoute.value
  if (route.query.startDate && route.query.endDate && route.query.timeDimension) {
    // 从Dashboard传来的时间范围，应用到Dashboard风格的日期选择器
    shipmentDateRange.value = [
      new Date(route.query.startDate as string),
      new Date(route.query.endDate as string),
    ]
  }

  // 并行加载统计数据和表格数据
  const loadData = async () => {
    await loadStatistics()
    if (activeFilter.value.days) {
      await loadContainersByFilter()
    } else {
      await loadContainers()
    }
  }

  loadData().then(() => {
    startTimer()
  })
})

onUnmounted(() => {
  isUnmounted.value = true
  stopTimer()
})
</script>

<script lang="ts">
export default {
  name: 'Shipments'
}
</script>

<style scoped>
/* 确保弹窗显示在正确位置 */
:global(.el-message.bottom-message) {
  position: fixed !important;
  bottom: 320px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  z-index: 9999 !important;
  margin: 0 !important;
  width: auto !important;
  max-width: 90% !important;
  top: auto !important;
}
</style>

<template>
  <div class="shipments-page">
    <!-- 搜索和操作栏 -->
    <el-card class="search-card">
      <div class="search-bar">
        <el-input
          v-model="searchKeyword"
          :placeholder="t('common.search') + '集装箱号、备货单号、提单号...'"
          :prefix-icon="Search"
          style="width: 300px; margin-right: 15px"
          @keyup.enter="handleSearch"
        />
        <el-button type="primary" @click="handleSearch">
          <el-icon><Search /></el-icon>
          {{ t('common.search') }}
        </el-button>
        <el-button @click="resetSearch">
          <el-icon><Refresh /></el-icon>
          {{ t('common.reset') }}
        </el-button>

        <!-- 共用的日期范围选择器 -->
        <DateRangePicker
          v-model="shipmentDateRange"
          @update:modelValue="handleShipmentDateChange"
        />

        <!-- 显示当前过滤器 -->
        <el-tag v-if="activeFilter.type" type="warning" closable @close="resetFilter">
          {{ activeFilter.type }}: {{ getFilterLabel(activeFilter.days) }}
        </el-tag>

        <div class="spacer"></div>
        <el-dropdown
          trigger="click"
          @command="
            (cmd: string) => (cmd === 'page' ? handleExportCurrentPage() : handleExportAll())
          "
        >
          <el-button type="primary" plain>
            <el-icon><Download /></el-icon>
            {{ t('common.export') }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="page">{{ t('common.export') }}当前页</el-dropdown-item>
              <el-dropdown-item command="all">{{ t('common.export') }}全部（当前条件）</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="success" @click="reloadAllData">
          <el-icon><Refresh /></el-icon>
          {{ t('common.refresh') }}数据
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
          description="<strong>统计范围：</strong>已出运至已还箱的全部货柜（shipped / in_transit / at_port / picked_up / unloaded / returned_empty）<br/><strong>分组结构：</strong><br/>① 已到目的港：目的港有 ATA，子项按今日到港 / 之前未提柜 / 之前已提柜<br/>② 已到中转港：有中转港到港记录且目的港无 ATA，子项按目的港 ETA 细分<br/>③ 预计到港：目的港无 ATA，按目的港 ETA 与今天比较（已逾期、3 天内、7 天内、7 天后、其他），主数=子项之和<br/>④ 到港数据缺失：目的港无 ATA 无 ETA 但状态显示已到港/已提柜等，需补全数据<br/><strong>业务用途：</strong>监控海运段到港进度，区分中转港与目的港，预警逾期；统计与点击列表同源"
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
        <span class="toolbar-label">{{ t('container.logisticsStatus') }}：</span>
        <el-select
          v-model="quickStatusFilter"
          multiple
          collapse-tags
          collapse-tags-tooltip
          :placeholder="t('common.all')"
          clearable
          size="small"
          style="width: 220px; margin-right: 12px"
        >
          <el-option :label="t('container.status.notShipped')" :value="SimplifiedStatus.NOT_SHIPPED" />
          <el-option :label="t('container.status.shipped')" :value="SimplifiedStatus.SHIPPED" />
          <el-option :label="t('container.status.inTransit')" :value="SimplifiedStatus.IN_TRANSIT" />
          <el-option :label="t('container.status.arrivedAtTransit')" :value="'arrived_at_transit'" />
          <el-option :label="t('container.status.atPort')" :value="'arrived_at_destination'" />
          <el-option :label="t('container.status.pickedUp')" :value="SimplifiedStatus.PICKED_UP" />
          <el-option :label="t('container.status.unloaded')" :value="SimplifiedStatus.UNLOADED" />
          <el-option :label="t('container.status.returnedEmpty')" :value="SimplifiedStatus.RETURNED_EMPTY" />
        </el-select>
        <el-checkbox v-model="alertFilter" size="small" style="margin-right: 12px">
          <el-icon><Warning /></el-icon>
          预警数量 > 0
        </el-checkbox>
        <el-button type="default" plain @click="columnSettingOpen = true">
          <el-icon><Setting /></el-icon>
          列设置
        </el-button>
        <el-button
          type="success"
          plain
          :disabled="selectedRows.length === 0"
          @click="handleBatchExport"
        >
          <el-icon><Download /></el-icon>
          批量{{ t('common.export') }}
        </el-button>
        <!-- 甘特图按钮 -->
        <el-button type="success" @click="goGanttChart()">
          <el-icon><Calendar /></el-icon>
          甘特图
        </el-button>
        <el-button
          type="primary"
          plain
          :loading="batchScheduleLoading"
          @click="handleBatchSchedule"
        >
          <el-icon><Edit /></el-icon>
          一键排产
        </el-button>
        <el-button
          type="info"
          plain
          :loading="demurrageWriteBackLoading"
          @click="handleDemurrageWriteBackWrapper"
        >
          <el-icon><Calendar /></el-icon>
          免费日更新
        </el-button>
      </div>
      <el-table
        ref="tableRef"
        :data="filteredContainers"
        :size="tableSize"
        :default-sort="{ prop: tableSort.prop || undefined, order: tableSort.order || undefined }"
        v-loading="loading"
        stripe
        height="calc(100vh - 380px)"
        style="width: 100%"
        @sort-change="handleSortChange"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="45" fixed="left" />
        <el-table-column type="expand" width="45" fixed="left">
          <template #default="{ row }">
            <div class="table-expand-detail">
              <div class="expand-row">
                <span class="expand-label">目的港</span
                ><span>{{ row.destinationPort || '-' }}</span>
                <span class="expand-label">预计到港</span
                ><span>{{ row.etaDestPort ? formatDate(row.etaDestPort) : '-' }}</span>
                <span class="expand-label">实际到港</span
                ><span>{{ row.ataDestPort ? formatDate(row.ataDestPort) : '-' }}</span>
              </div>
              <div class="expand-row">
                <span class="expand-label">计划提柜日</span
                ><span>{{ row.plannedPickupDate ? formatDate(row.plannedPickupDate) : '-' }}</span>
                <span class="expand-label">最晚提柜日</span
                ><span>{{ row.lastFreeDate ? formatDate(row.lastFreeDate) : '-' }}</span>
                <span class="expand-label">最晚还箱日</span
                ><span>{{ row.lastReturnDate ? formatDate(row.lastReturnDate) : '-' }}</span>
                <span class="expand-label">实际还箱日</span
                ><span>{{ row.returnTime ? formatDate(row.returnTime) : '-' }}</span>
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
                <span class="empty-hint"
                  >当前筛选条件下没有货柜记录，可尝试调整日期范围或清除筛选。</span
                >
              </template>
              <template v-else>
                <span class="empty-hint">在所选日期范围内暂无出运记录。</span>
              </template>
            </el-empty>
          </div>
        </template>
        <template v-for="key in sortedVisibleColumnKeys" :key="key">
          <!-- 集装箱号 -->
          <el-table-column v-if="key === 'containerNumber'" prop="containerNumber" :label="t('container.containerNumber')" width="140" fixed />

          <!-- 出运日期 -->
          <el-table-column v-else-if="key === 'actualShipDate'" prop="actualShipDate" label="出运日期" width="120" sortable="custom">
            <template #default="{ row }">
              {{ formatShipmentDate(row.actualShipDate || row.createdAt) }}
            </template>
          </el-table-column>

          <!-- 备货单号 -->
          <el-table-column v-else-if="key === 'orderNumber'" prop="orderNumber" :label="t('container.orderNumber')" width="140" />

          <!-- 提单号 -->
          <el-table-column v-else-if="key === 'billOfLadingNumber'" prop="billOfLadingNumber" label="提单号" width="140" />

          <!-- MBL Number -->
          <el-table-column v-else-if="key === 'mblNumber'" prop="mblNumber" label="MBL Number" width="140" />

          <!-- 柜型 -->
          <el-table-column v-else-if="key === 'containerTypeCode'" prop="containerTypeCode" label="柜型" width="80">
            <template #default="{ row }">
              <el-tag size="small">{{ row.containerTypeCode || '-' }}</el-tag>
            </template>
          </el-table-column>

          <!-- 物流状态 -->
          <el-table-column v-else-if="key === 'logisticsStatus'" prop="logisticsStatus" :label="t('container.logisticsStatus')" width="120">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.logisticsStatus)" size="small">
                {{ getLogisticsStatusText(row) || '-' }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 五节点状态 -->
          <el-table-column v-else-if="key === 'fiveNodeStatus'" label="五节点状态" width="180">
            <template #default="{ row }">
              <div class="five-node-status">
                <el-tag size="small" type="info" class="status-tag">
                  {{ row.customsStatus ? customsStatusMap[row.customsStatus]?.text : '未清关' }}
                </el-tag>
                <el-tag size="small" type="warning" class="status-tag">
                  {{ row.plannedPickupDate ? '已计划提柜' : '未计划提柜' }}
                </el-tag>
                <el-tag size="small" type="success" class="status-tag">
                  {{ row.returnTime ? '已还箱' : '未还箱' }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <!-- 预警 -->
          <el-table-column v-else-if="key === 'alerts'" label="预警" width="80" align="center">
            <template #default="{ row }">
              <el-badge :value="row.alertCount || 0" type="danger" :hidden="!(row.alertCount > 0)">
                <el-icon><Warning /></el-icon>
              </el-badge>
            </template>
          </el-table-column>

          <!-- 总费用 -->
          <el-table-column v-else-if="key === 'totalCost'" label="总费用" width="100" align="right">
            <template #default="{ row }">
              {{ row.totalCost ? `$${row.totalCost.toFixed(2)}` : '-' }}
            </template>
          </el-table-column>

          <!-- 查验 -->
          <el-table-column v-else-if="key === 'inspectionRequired'" prop="inspectionRequired" label="查验" width="70" align="center">
            <template #default="{ row }">
              <el-tag :type="row.inspectionRequired ? 'warning' : 'info'" size="small">
                {{ row.inspectionRequired ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 开箱 -->
          <el-table-column v-else-if="key === 'isUnboxing'" prop="isUnboxing" label="开箱" width="70" align="center">
            <template #default="{ row }">
              <el-tag :type="row.isUnboxing ? 'warning' : 'info'" size="small">
                {{ row.isUnboxing ? '是' : '否' }}
              </el-tag>
            </template>
          </el-table-column>

          <!-- 目的港 -->
          <el-table-column v-else-if="key === 'destinationPort'" prop="destinationPort" label="目的港" width="100" />

          <!-- 当前位置 -->
          <el-table-column v-else-if="key === 'location'" prop="location" label="当前位置" width="100" />

          <!-- 预计到港 -->
          <el-table-column v-else-if="key === 'etaDestPort'" prop="etaDestPort" label="预计到港" width="110" sortable="custom">
            <template #default="{ row }">
              {{ row.etaDestPort ? formatDate(row.etaDestPort) : '-' }}
            </template>
          </el-table-column>

          <!-- 修正ETA -->
          <el-table-column v-else-if="key === 'etaCorrection'" label="修正ETA" width="110">
            <template #default="{ row }">
              <template v-if="row.etaCorrection ?? getEtaCorrection(row)">
                <el-tag type="success" size="small">
                  {{ formatDate((row.etaCorrection ?? getEtaCorrection(row)) as string | Date) }}
                </el-tag>
              </template>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <!-- 实际到港 -->
          <el-table-column v-else-if="key === 'ataDestPort'" prop="ataDestPort" label="实际到港" width="110" sortable="custom">
            <template #default="{ row }">
              {{ row.ataDestPort ? formatDate(row.ataDestPort) : '-' }}
            </template>
          </el-table-column>

          <!-- 清关状态 -->
          <el-table-column v-else-if="key === 'customsStatus'" prop="customsStatus" label="清关状态" width="100">
            <template #default="{ row }">
              <el-tag
                :type="customsStatusMap[row.customsStatus]?.type || 'info'"
                size="small"
                v-if="row.customsStatus"
              >
                {{ customsStatusMap[row.customsStatus]?.text || row.customsStatus }}
              </el-tag>
              <span v-else>-</span>
            </template>
          </el-table-column>

          <!-- 计划提柜日 -->
          <el-table-column v-else-if="key === 'plannedPickupDate'" prop="plannedPickupDate" label="计划提柜日" width="110" sortable="custom">
            <template #default="{ row }">
              {{ row.plannedPickupDate ? formatDate(row.plannedPickupDate) : '-' }}
            </template>
          </el-table-column>

          <!-- 实际提柜日 -->
          <el-table-column v-else-if="key === 'pickupDate'" prop="pickupDate" label="实际提柜日" width="110" sortable="custom">
            <template #default="{ row }">
              {{ row.pickupDate ? formatDate(row.pickupDate) : '-' }}
            </template>
          </el-table-column>

          <!-- 最晚提柜日 -->
          <el-table-column v-else-if="key === 'lastFreeDate'" prop="lastFreeDate" label="最晚提柜日" width="110" sortable="custom">
            <template #default="{ row }">
              {{ row.lastFreeDate ? formatDate(row.lastFreeDate) : '-' }}
            </template>
          </el-table-column>

          <!-- 最晚还箱日 -->
          <el-table-column v-else-if="key === 'lastReturnDate'" prop="lastReturnDate" label="最晚还箱日" width="110" sortable="custom">
            <template #default="{ row }">
              {{ row.lastReturnDate ? formatDate(row.lastReturnDate) : '-' }}
            </template>
          </el-table-column>

          <!-- 实际还箱日 -->
          <el-table-column v-else-if="key === 'returnTime'" prop="returnTime" label="实际还箱日" width="110" sortable="custom">
            <template #default="{ row }">
              {{ row.returnTime ? formatDate(row.returnTime) : '-' }}
            </template>
          </el-table-column>

          <!-- 货物描述 -->
          <el-table-column v-else-if="key === 'cargoDescription'" prop="cargoDescription" :label="t('container.cargoDescription')" min-width="150" show-overflow-tooltip />

          <!-- 最后更新 -->
          <el-table-column v-else-if="key === 'lastUpdated'" prop="lastUpdated" label="最后更新" width="160" sortable="custom">
            <template #default="{ row }">
              {{ row.lastUpdated ? formatDate(row.lastUpdated) : '-' }}
            </template>
          </el-table-column>

          <!-- 操作 -->
          <el-table-column v-else-if="key === 'actions'" :label="t('common.actions')" width="100" fixed="right" align="center">
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
      <el-drawer v-model="columnSettingOpen" title="列显示设置" size="400px">
        <div class="column-setting-body">
          <p class="column-setting-hint">拖动列项调整顺序，勾选显示/隐藏列</p>
          <div class="column-setting-list">
            <div
              v-for="key in columnOrder"
              :key="key"
              class="column-setting-item"
              :class="{ 'is-dragging': draggedColumnKey === key }"
              draggable="true"
              @dragstart="e => handleDragStart(e, key)"
              @dragover="handleDragOver"
              @drop="e => handleDrop(e, key)"
              @dragend="handleDragEnd"
            >
              <el-icon class="drag-handle"><ArrowDown /></el-icon>
              <el-checkbox v-model="columnVisible[key]" @mousedown.stop :label="key">
                {{ columnLabels[key].includes('.') ? t(columnLabels[key]) : columnLabels[key] }}
              </el-checkbox>
            </div>
          </div>
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

  <!-- 一键排产选择对话框 -->
  <el-dialog
    v-model="scheduleDialogVisible"
    title="一键排产"
    width="500px"
    :close-on-click-modal="false"
  >
    <div class="schedule-dialog-content">
      <div class="schedule-desc">
        <p style="font-weight: bold; margin-bottom: 12px;">智能排产流程：</p>
        <ol style="padding-left: 20px; line-height: 1.8;">
          <li>查询所有"待排产"状态的货柜（schedule_status = initial）</li>
          <li>按清关可放行日排序（先到先得）</li>
          <li>为每个货柜匹配滞港费标准，计算最晚提柜日</li>
          <li>根据目的港选择候选仓库和车队</li>
          <li>计算计划提柜日、计划卸柜日、最晚还箱日</li>
          <li>更新货柜的排产状态和计划日期</li>
        </ol>
        <p style="color: #909399; font-size: 13px; margin-top: 12px;">
          提示：处理"待排产"(initial)和"已排产"(issued)状态，"已派工"(dispatched)的货柜不可重复处理
        </p>
      </div>
    </div>
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="scheduleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleExecuteDirectSchedule">
          <el-icon><Edit /></el-icon>
          直接开始排产
        </el-button>
        <el-button type="success" @click="goToSchedulingPage">
          <el-icon><ArrowRight /></el-icon>
          跳转到排产页面
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.shipments-page {
  padding: 20px;
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

  .column-setting-list {
    max-height: 600px;
    overflow-y: auto;
  }

  .column-setting-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    margin-bottom: 8px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
    cursor: move;
    transition: all 0.2s;
    user-select: none;

    &:hover {
      background: var(--el-fill-color-lighter);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    &.is-dragging {
      opacity: 0.4;
      background: var(--el-color-primary-light-9);
      transform: scale(0.98);
    }

    .drag-handle {
      color: var(--el-text-color-secondary);
      cursor: move;
      flex-shrink: 0;
    }

    .el-checkbox {
      flex: 1;
    }
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

.five-node-status {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .status-tag {
    font-size: 11px;
    padding: 2px 6px;
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
