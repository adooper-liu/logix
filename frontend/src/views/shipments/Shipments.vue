<script setup lang="ts">
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import SchedulingHistoryCard from '@/components/SchedulingHistoryCard.vue'
import { useContainerCountdown } from '@/composables/useContainerCountdown'
import { useShipmentsExport } from '@/composables/useShipmentsExport'
import { useShipmentsSchedule } from '@/composables/useShipmentsSchedule'
import { useShipmentsTable } from '@/composables/useShipmentsTable'
import { containerService } from '@/services/container'
import { useAppStore } from '@/store/app'
import { ArrowDown, ArrowRight, Download, Edit, Refresh, Search } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import ContainerTable from './components/ContainerTable.vue'
import CountdownCardsGroup from './components/CountdownCardsGroup.vue'

const router = useRouter()
const appStore = useAppStore()
const { t } = useI18n()

// 使用表格相关 composable
const {
  containers,
  loading,
  searchKeyword,
  pagination,
  activeFilter,
  tableSort,
  columnLabels,
  columnOrder,
  filteredContainers,
  handlePageChange,
  handlePageSizeChange,
  handleSortChange,
  handleSearch: updateSearchState,
  resetSearch: resetSearchState,
  handleCountdownFilter: updateCountdownFilterState,
  resetFilter: resetFilterState,
} = useShipmentsTable()

// 使用导出相关 composable
const { handleExportCurrentPage, handleExportAll, customsStatusMap } = useShipmentsExport()

// 使用排产相关 composable
const { scheduleDialogVisible, executeDirectSchedule, handleDemurrageWriteBack } =
  useShipmentsSchedule()

// 组件卸载标记，防止卸载后响应式更新
const isUnmounted = ref(false)

/** 单柜「免费日更新」按钮 loading（按柜号） */
const singleFreeDateWriteBackLoading = ref<string | null>(null)
/** 单柜「LFD 手工维护」按钮 loading（按柜号） */
const manualLfdLoading = ref<string | null>(null)
/** 统计卡片组折叠状态 */
const statisticsCollapsed = ref(false)

/** 排产历史记录相关 */
const selectedContainerForHistory = ref<string>('')

// 统计数据（从后端 API 获取，不依赖全量数据）
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
const selectedRows = ref<any[]>([])
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

// 使用倒计时 composable（传入统计数据，不再依赖 allContainers）
const { startTimer, stopTimer } = useContainerCountdown(statisticsData)

// 从URL参数初始化过滤条件
const initFiltersFromUrl = () => {
  const route = useRoute()
  const filterCondition = route.query.filterCondition as string
  const startDate = route.query.startDate as string
  const endDate = route.query.endDate as string

  if (startDate && endDate) {
    shipmentDateRange.value = [dayjs(startDate).toDate(), dayjs(endDate).toDate()]
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

    // 列表与顶部日期一致，不走短缓存，避免与统计卡片口径不一致
    const response = await containerService.getContainers(params)

    if (!isUnmounted.value) {
      containers.value = response.items ?? []
      pagination.value.total = response.pagination?.total ?? 0
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

/** 操作列：单柜免费日写回（与批量「免费日更新」同源逻辑） */
const handleSingleFreeDateWriteBack = async (row: { containerNumber?: string }) => {
  const cn = row.containerNumber?.trim()
  if (!cn) {
    ElMessage.warning(t('container.shipmentsList.singleFreeDateWriteBackNoContainer'))
    return
  }
  singleFreeDateWriteBackLoading.value = cn
  try {
    const res = await containerService.writeBackDemurrageDatesForContainer(cn)
    const data = res.data
    if (res.success && data?.updated) {
      ElMessage.success(t('container.shipmentsList.singleFreeDateWriteBackSuccess'))
      await loadContainers()
    } else if (res.success) {
      ElMessage.info(data?.message || t('container.shipmentsList.singleFreeDateWriteBackSkipped'))
    } else {
      ElMessage.error(res.message || t('container.shipmentsList.singleFreeDateWriteBackFailed'))
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    ElMessage.error(msg || t('container.shipmentsList.singleFreeDateWriteBackFailed'))
  } finally {
    singleFreeDateWriteBackLoading.value = null
  }
}

/** 操作列：单柜 LFD 手工维护 */
const handleManualLfdUpdate = async (row: {
  containerNumber?: string
  lastFreeDate?: string | Date | null
}) => {
  const cn = row.containerNumber?.trim()
  if (!cn) {
    ElMessage.warning('缺少柜号')
    return
  }

  const defaultDate = row.lastFreeDate ? dayjs(row.lastFreeDate).format('YYYY-MM-DD') : ''
  try {
    const promptResult = (await ElMessageBox.prompt(
      `请输入 ${cn} 的最晚提柜日（YYYY-MM-DD）`,
      'LFD手工维护',
      {
        inputValue: defaultDate,
        inputPlaceholder: '例如：2026-03-25',
        confirmButtonText: '保存',
        cancelButtonText: '取消',
        inputPattern: /^\d{4}-\d{2}-\d{2}$/,
        inputErrorMessage: '日期格式应为 YYYY-MM-DD',
      }
    )) as { value?: string }
    const lfd = String(promptResult.value || '').trim()
    if (!lfd) return

    manualLfdLoading.value = cn
    const res = await containerService.setManualLastFreeDate(cn, lfd, 'shipments-操作列手工维护')
    if (res.success) {
      ElMessage.success('LFD手工维护已保存')
      await loadContainers()
    } else {
      ElMessage.error(res.message || 'LFD手工维护失败')
    }
  } catch {
    // 用户取消不提示
  } finally {
    manualLfdLoading.value = null
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
    const response = await containerService.getStatisticsDetailed(startDate, endDate)
    if (response.success && response.data && !isUnmounted.value) {
      statisticsData.value = response.data
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
    await Promise.all([loadStatistics(), reloadTableByCurrentFilter()])
  }
}

// 同时刷新列表和统计数据
const reloadAllData = async () => {
  await Promise.all([reloadTableByCurrentFilter(), loadStatistics()])
}

// 统一刷新表格：有卡片过滤时走后端过滤接口，无过滤时走常规列表接口
const reloadTableByCurrentFilter = async () => {
  if (activeFilter.value.days) {
    await loadContainersByFilter()
    return
  }
  await loadContainers()
}

const handleSearch = async () => {
  updateSearchState()
  await reloadTableByCurrentFilter()
}

const resetSearch = async () => {
  resetSearchState()
  await reloadTableByCurrentFilter()
}

const handleCountdownFilter = async (type: string, days: string) => {
  updateCountdownFilterState(type, days)
  await loadContainersByFilter()
}

const resetFilter = async () => {
  resetFilterState()
  await loadContainers()
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

// 查看排产历史记录
const viewSchedulingHistory = (container: any) => {
  selectedContainerForHistory.value = container.containerNumber
  // 通过 nextTick 确保 DOM 更新后再调用
  import('vue').then(({ nextTick }) => {
    nextTick(() => {
      if (historyCardRef.value) {
        historyCardRef.value.toggleHistory()
      }
    })
  })
}

// 历史记录组件引用
const historyCardRef = ref<InstanceType<typeof SchedulingHistoryCard>>()

// 编辑集装箱
const editContainer = (container: any) => {
  ElMessage.info(`编辑集装箱 ${container.containerNumber}`)
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

  // 获取当前选中的货柜
  const selectedContainerNumbers = selectedRows.value.length
    ? selectedRows.value.map((r: any) => r.containerNumber).filter(Boolean)
    : []

  // 从选中的货柜中提取国家信息（销往国家）
  const countryFromSelection =
    selectedRows.value.length > 0 ? (selectedRows.value[0] as any)?.sellToCountry : undefined

  // 如果没有选中货柜，使用当前筛选条件的默认国家
  const country = countryFromSelection || appStore.scopedCountryCode || ''

  const startDate = dayjs(shipmentDateRange.value[0]).format('YYYY-MM-DD')
  const endDate = dayjs(shipmentDateRange.value[1]).format('YYYY-MM-DD')
  const filterCondition = activeFilter.value.days
  const filterLabel = getFilterLabel(filterCondition)

  // 跳转到排产配置页面，并默认打开 visual 标签页
  router.push({
    path: '/scheduling',
    query: {
      tab: 'visual', // 指定打开 visual 标签页
      country,
      startDate,
      endDate,
      filterCondition,
      filterLabel,
      containers: selectedContainerNumbers.join(','),
      from: 'shipments',
      timestamp: Date.now(),
    },
  })
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
  name: 'Shipments',
}
</script>

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
            (cmd: string) =>
              cmd === 'page'
                ? handleExportCurrentPage(filteredContainers)
                : handleExportAll(filteredContainers, getFilterLabel(activeFilter.days || 'all'))
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
              <el-dropdown-item command="all"
                >{{ t('common.export') }}全部（当前条件）</el-dropdown-item
              >
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
    <CountdownCardsGroup
      :statistics-data="statisticsData"
      @filter="handleCountdownFilter"
      @update:collapsed="statisticsCollapsed = $event"
    />

    <!-- 集装箱表格 -->
    <ContainerTable
      :data="containers"
      :loading="loading"
      :current-page="pagination.page"
      :page-size="pagination.pageSize"
      :total="pagination.total"
      :default-sort="{ prop: tableSort.prop, order: tableSort.order }"
      @update:page="handlePageChange"
      @update:pageSize="handlePageSizeChange"
      @sort-change="handleSortChange"
      @selection-change="handleSelectionChange"
      @view-history="viewSchedulingHistory"
      @view-detail="viewDetails"
      @edit="editContainer"
      @free-date-writeback="handleSingleFreeDateWriteBack"
      @manual-lfd="handleManualLfdUpdate"
      @batch-schedule="handleBatchSchedule"
      @demurrage-writeback="handleDemurrageWriteBackWrapper"
    />
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
        <p style="font-weight: bold; margin-bottom: 12px">智能排产流程：</p>
        <ol style="padding-left: 20px; line-height: 1.8">
          <li>查询所有"待排产"状态的货柜（schedule_status = initial）</li>
          <li>按清关可放行日排序（先到先得）</li>
          <li>为每个货柜匹配滞港费标准，计算最晚提柜日</li>
          <li>根据目的港选择候选仓库和车队</li>
          <li>计算计划提柜日、计划卸柜日、最晚还箱日</li>
          <li>更新货柜的排产状态和计划日期</li>
        </ol>
        <p style="color: #909399; font-size: 13px; margin-top: 12px">
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

/* 日期颜色类 */
.date-color-success {
  color: #67c23a;
}
.date-color-warning {
  color: #e6a23c;
}
.date-color-danger {
  color: #f56c6c;
}
.date-color-info {
  color: #909399;
}

/* 日期和查验文本样式 */
.date-text {
  font-size: 12px;
}

.inspection-text {
  font-size: 12px;
}

.inspection-unboxing {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}
</style>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.shipments-page {
  padding: 20px;
}

:deep(.el-table th) {
  text-align: center !important;
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

.combined-numbers {
  .number-item {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    font-size: 12px;
    line-height: 1.4;

    .number-label {
      font-weight: 500;
      margin-right: 4px;
      color: #606266;
      min-width: 60px;
    }
  }
}

.bbl-mbl-container {
  .number-item {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    font-size: 12px;
    line-height: 1.4;
  }

  .number-label {
    font-weight: 500;
    margin-right: 4px;
    color: #606266;
    min-width: 52px;
  }
}

.eta-ata-container,
.pickup-dates-container,
.delivery-dates-container,
.unload-dates-container,
.return-dates-container {
  text-align: right;

  .date-item {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    margin-bottom: 4px;
    font-size: 12px;
    line-height: 1.4;

    .date-label {
      font-size: 10px;
      font-weight: 500;
      font-style: italic;
      line-height: 1;
      vertical-align: sub;
      position: relative;
      top: 1px;
      margin-left: 3px;
      color: #606266;
      min-width: auto;
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

.action-icons-grid {
  display: grid;
  grid-template-columns: repeat(2, 28px);
  gap: 6px;
  justify-content: center;
  justify-items: center;
  align-items: center;
}

.action-icons-grid :deep(.el-button) {
  margin: 0;
  width: 28px;
  height: 28px;
  min-height: 28px;
  padding: 0;
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
  flex-wrap: wrap;
  align-items: stretch;
  width: 100%;
  gap: 8px;
  text-align: left;

  .five-node-tag.status-tag {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    width: calc(50% - 4px);
    box-sizing: border-box;
    gap: 14px;
    font-size: 11px;
    padding: 2px 8px 2px 6px;
    margin-inline: 0;
  }

  .five-node-icon-wrap {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    flex-shrink: 0;

    &.kind-ok {
      background: var(--el-color-success-light-8);
      color: var(--el-color-success);
    }

    &.kind-bad {
      background: var(--el-color-danger-light-8);
      color: var(--el-color-danger);
    }

    &.kind-warn {
      background: var(--el-color-warning-light-8);
      color: var(--el-color-warning);
    }
  }

  .five-node-icon {
    display: block;
  }

  .five-node-status-text {
    min-width: 0;
    line-height: 1.25;
    text-align: left;
  }
}

.alerts-container {
  display: inline-flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
  width: 100%;
  max-width: 100%;
  min-height: 24px;
  white-space: normal;
  word-wrap: break-word;

  .alert-badge {
    margin-right: 0;
    transform: scale(0.85);
    transition: all 0.2s ease;
    border-radius: 4px;
    align-self: flex-start;

    &:hover {
      transform: scale(0.95);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .el-icon {
      font-size: 14px;
    }

    .el-badge__content {
      font-size: 10px;
      padding: 0 6px;
      min-width: 16px;
      height: 16px;
      line-height: 16px;
    }
  }

  .el-badge {
    margin-right: 0;
  }

  .resolved-alert {
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }
}

.cost-total-text {
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
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
}
</style>
