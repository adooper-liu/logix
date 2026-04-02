<script setup lang="ts">
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import CountdownCard from '@/components/CountdownCard.vue'
import SchedulingHistoryCard from '@/components/SchedulingHistoryCard.vue'
import ContainerTable from './components/ContainerTable.vue'
import { useContainerCountdown } from '@/composables/useContainerCountdown'
import { useLogisticsStatus } from '@/composables/useLogisticsStatus'
import { useShipmentsExport } from '@/composables/useShipmentsExport'
import { useShipmentsSchedule } from '@/composables/useShipmentsSchedule'
import { useShipmentsTable } from '@/composables/useShipmentsTable'
import { containerService } from '@/services/container'
import { useAppStore } from '@/store/app'
import { useGanttFilterStore } from '@/store/ganttFilters'
import type { PortOperation } from '@/types/container'
import { getCurrentLocationText } from '@/utils/logisticsStatusMachine'
import {
  ArrowDown,
  ArrowRight,
  Calendar,
  CircleCheck,
  CircleClose,
  Download,
  Edit,
  Refresh,
  Search,
  View,
  Warning,
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

const getUtcDayNumber = (input: string | Date | null | undefined): number | null => {
  if (!input) return null
  if (typeof input === 'string') {
    const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/)
    if (m) {
      const y = Number(m[1])
      const mon = Number(m[2]) - 1
      const d = Number(m[3])
      return Math.floor(Date.UTC(y, mon, d) / 86400000)
    }
  }
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) return null
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86400000
  )
}

// 获取日期标签类型
const getDateTagType = (
  date: string | Date | null | undefined,
  _actualDate?: string | Date | null | undefined,
  type?: 'eta' | 'pickup' | 'return' | 'shipment' | 'update' | 'delivery' | 'unload',
  lastDate?: string | Date | null | undefined
): 'success' | 'warning' | 'danger' | 'info' => {
  if (!date) return 'info'

  // 提柜日和还箱日的特殊规则
  if (type === 'pickup' || type === 'return') {
    // 最晚提柜日或最晚还箱日固定为灰色
    if ((type === 'pickup' && date === lastDate) || (type === 'return' && date === lastDate)) {
      return 'info'
    }

    // 计划提柜日、实际提柜日、计划还箱日、实际还箱日
    if (lastDate) {
      const dateDay = getUtcDayNumber(date)
      const lastDateDay = getUtcDayNumber(lastDate)
      if (dateDay == null || lastDateDay == null) return 'info'
      const diffDays = dateDay - lastDateDay

      if (diffDays <= 0) {
        return 'success' // 早于或等于最晚提柜日/还箱日为绿色
      } else if (diffDays <= 3) {
        return 'warning' // 晚于最晚提柜日/还箱日 3 天内为黄色
      } else {
        return 'danger' // 晚于最晚提柜日/还箱日>3 天为红色
      }
    }
  }

  // 其他日期（包括 ETA、修正 ETA、ATA、出运日期、更新日期、送仓日期、卸柜日期）都显示为灰色
  return 'info'
}

// 获取日期颜色类
const getDateColorClass = (
  date: string | Date | null | undefined,
  actualDate?: string | Date | null | undefined,
  type?: 'eta' | 'pickup' | 'return' | 'shipment' | 'update' | 'delivery' | 'unload',
  lastDate?: string | Date | null | undefined
): string => {
  const tagType = getDateTagType(date, actualDate, type, lastDate)
  return `date-color-${tagType}`
}

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const ganttFilterStore = useGanttFilterStore()

// 使用 Composable
const { t } = useI18n()
const {
  loading,
  containers,
  pagination,
  activeFilter,
  tableSort,
  columnOrder,
  columnVisible,
  quickStatusFilter,
  alertFilter,
  sortedVisibleColumnKeys,
  filteredContainers,
  fetchContainers,
  resetFilter: resetFilterState,
  columnLabels,
  SimplifiedStatus,
} = useShipmentsTable()

const {
  scheduleDialogVisible,
  batchScheduleLoading,
  demurrageWriteBackLoading,
  singleFreeDateWriteBackLoading,
  manualLfdLoading,
  handleBatchSchedule,
  handleSingleFreeDateWriteBack,
  handleManualLfdUpdate,
} = useShipmentsSchedule()

const { handleExportCurrentPage, handleExportAll } = useShipmentsExport()

const { countdownData, refreshCountdown } = useContainerCountdown()
const { logisticsStatusMap, getLogisticsStatusText, getCustomsStatusText, customsStatusMap } =
  useLogisticsStatus()

/** 统计卡片 */
const stats = ref<{
  total: number
  notShipped: number
  shipped: number
  inTransit: number
  atPort: number
  pickedUp: number
  unloaded: number
  returnedEmpty: number
  urgentPickup: number
  urgentReturn: number
  hasAlerts: number
}>({
  total: 0,
  notShipped: 0,
  shipped: 0,
  inTransit: 0,
  atPort: 0,
  pickedUp: 0,
  unloaded: 0,
  returnedEmpty: 0,
  urgentPickup: 0,
  urgentReturn: 0,
  hasAlerts: 0,
})

const statisticsCollapsed = ref(false)

/** 排产历史记录相关 */
const historyCardRef = ref<InstanceType<typeof SchedulingHistoryCard>>()
const selectedContainerForHistory = ref<string>('')

/** 查看排产历史 */
const viewSchedulingHistory = (row: any) => {
  selectedContainerForHistory.value = row.containerNumber
  setTimeout(() => {
    historyCardRef.value?.open()
  }, 100)
}

/** 查看详情 */
const viewDetails = (row: any) => {
  router.push(`/containers/${row.containerNumber}`)
}

/** 编辑 */
const editContainer = (row: any) => {
  router.push(`/containers/${row.containerNumber}/edit`)
}

/** 批量导出 */
const handleBatchExport = () => {
  ElMessageBox.confirm('确定要批量导出货柜吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    handleExportAll()
  })
}

/** 跳转到甘特图 */
const goGanttChart = () => {
  router.push('/gantt')
}

/** 免费日回写包装器 */
const handleDemurrageWriteBackWrapper = async () => {
  try {
    demurrageWriteBackLoading.value = true
    const selectedContainerNumbers = selectedRows.value.map(row => row.containerNumber)
    if (selectedContainerNumbers.length === 0) {
      ElMessage.warning('请先选择要更新免费日的货柜')
      return
    }

    await containerService.batchUpdateLastFreeDate(selectedContainerNumbers)
    ElMessage.success('免费日更新成功')
    await fetchContainers()
  } catch (error: any) {
    ElMessage.error(error.message || '免费日更新失败')
  } finally {
    demurrageWriteBackLoading.value = false
  }
}

/** 重置筛选 */
const resetFilter = async () => {
  resetFilterState()
  await fetchContainers()
}

/** 多选与批量导出 */
const selectedRows = ref<any[]>([])
const handleSelectionChange = (rows: any[]) => {
  selectedRows.value = rows
}

/** 排序变化 */
const handleSortChange = ({ prop, order }: any) => {
  tableSort.value = { prop, order }
  pagination.value.page = 1
  fetchContainers()
}

/** 页码变化 */
const handlePageChangeWithLoad = async () => {
  await fetchContainers()
}

/** 每页条数变化 */
const handlePageSizeChangeWithLoad = async () => {
  pagination.value.page = 1
  await fetchContainers()
}

onMounted(async () => {
  await fetchContainers()
  await refreshCountdown()
})

const refreshInterval = ref<NodeJS.Timeout | null>(null)
onMounted(() => {
  refreshInterval.value = setInterval(async () => {
    await refreshCountdown()
  }, 60000)
})
onUnmounted(() => {
  if (refreshInterval.value) {
    clearInterval(refreshInterval.value)
  }
})
</script>

<template>
  <div class="shipments-page">
    <!-- 顶部统计卡片 -->
    <div class="statistics-grid" :class="{ collapsed: statisticsCollapsed }">
      <CountdownCard
        :count="stats.notShipped"
        :label="t('container.stats.notShipped')"
        type="not-shipped"
        collapsible
        @toggle="statisticsCollapsed = !statisticsCollapsed"
      />
      <CountdownCard
        :count="stats.shipped"
        :label="t('container.stats.shipped')"
        type="shipped"
        :collapsed="statisticsCollapsed"
      />
      <CountdownCard
        :count="stats.inTransit"
        :label="t('container.stats.inTransit')"
        type="in-transit"
        :collapsed="statisticsCollapsed"
      />
      <CountdownCard
        :count="stats.atPort"
        :label="t('container.stats.atPort')"
        type="at-port"
        :collapsed="statisticsCollapsed"
      />
      <CountdownCard
        :count="stats.pickedUp"
        :label="t('container.stats.pickedUp')"
        type="picked-up"
        :collapsed="statisticsCollapsed"
      />
      <CountdownCard
        :count="stats.unloaded"
        :label="t('container.stats.unloaded')"
        type="unloaded"
        :collapsed="statisticsCollapsed"
      />
      <CountdownCard
        :count="stats.returnedEmpty"
        :label="t('container.stats.returnedEmpty')"
        type="returned-empty"
        :collapsed="statisticsCollapsed"
      />
      <CountdownCard
        :count="stats.urgentPickup"
        :label="t('container.stats.urgentPickup')"
        type="urgent-pickup"
        :collapsed="statisticsCollapsed"
      />
      <CountdownCard
        :count="stats.urgentReturn"
        :label="t('container.stats.urgentReturn')"
        type="urgent-return"
        :collapsed="statisticsCollapsed"
      />
      <CountdownCard
        :count="stats.hasAlerts"
        :label="t('container.stats.hasAlerts')"
        type="has-alerts"
        :collapsed="statisticsCollapsed"
      />
    </div>

    <!-- 筛选与操作栏 -->
    <el-card class="filter-card">
      <div class="filter-toolbar">
        <DateRangePicker v-model="activeFilter.dateRange" @change="fetchContainers" />
        <el-input
          v-model="searchKeyword"
          :placeholder="t('container.searchPlaceholder')"
          clearable
          style="width: 300px"
          @clear="fetchContainers"
          @keyup.enter="fetchContainers"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-button type="primary" @click="fetchContainers">
          <el-icon><Refresh /></el-icon>
          {{ t('common.search') }}
        </el-button>
        <el-button @click="resetFilter">
          <el-icon><Refresh /></el-icon>
          {{ t('common.reset') }}
        </el-button>
        <el-tag v-if="activeFilter.type" type="warning" closable @close="resetFilter">
          {{ t('container.filter.active') }}
        </el-tag>
      </div>
    </el-card>

    <!-- 集装箱表格组件 -->
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
          <el-option
            :label="t('container.status.notShipped')"
            :value="SimplifiedStatus.NOT_SHIPPED"
          />
          <el-option :label="t('container.status.shipped')" :value="SimplifiedStatus.SHIPPED" />
          <el-option
            :label="t('container.status.inTransit')"
            :value="SimplifiedStatus.IN_TRANSIT"
          />
          <el-option
            :label="t('container.status.arrivedAtTransit')"
            :value="'arrived_at_transit'"
          />
          <el-option :label="t('container.status.atPort')" :value="'arrived_at_destination'" />
          <el-option :label="t('container.status.pickedUp')" :value="SimplifiedStatus.PICKED_UP" />
          <el-option :label="t('container.status.unloaded')" :value="SimplifiedStatus.UNLOADED" />
          <el-option
            :label="t('container.status.returnedEmpty')"
            :value="SimplifiedStatus.RETURNED_EMPTY"
          />
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

      <!-- ✅ 使用 ContainerTable 组件 -->
      <ContainerTable
        :data="filteredContainers as any"
        :loading="loading"
        :current-page="pagination.page || 1"
        :page-size="pagination.pageSize || 10"
        :total="pagination.total || 0"
        :default-sort="{ prop: tableSort.prop || '', order: tableSort.order || null }"
        @update:page="handlePageChangeWithLoad"
        @update:pageSize="handlePageSizeChangeWithLoad"
        @sort-change="handleSortChange"
        @selection-change="handleSelectionChange"
        @view-history="viewSchedulingHistory"
        @view-detail="viewDetails"
        @edit="editContainer"
        @free-date-writeback="handleSingleFreeDateWriteBack"
        @manual-lfd="handleManualLfdUpdate"
      />
    </el-card>

    <!-- ✅ 新增：排产历史记录组件 -->
    <SchedulingHistoryCard
      v-if="selectedContainerForHistory"
      ref="historyCardRef"
      :container-number="selectedContainerForHistory"
    />

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
            <li>自动匹配销往国家的清关行</li>
            <li>根据 ETA 和仓库能力分配仓库</li>
            <li>根据仓库位置和车队能力分配车队</li>
            <li>计算最优的提柜和还柜日期</li>
          </ol>
        </div>
        <div class="schedule-params">
          <p style="font-weight: bold; margin-bottom: 8px">排产参数：</p>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="清关行">
              {{ selectedRows.length }} 个货柜
            </el-descriptions-item>
            <el-descriptions-item label="仓库">
              根据能力和距离自动分配
            </el-descriptions-item>
            <el-descriptions-item label="车队">
              根据能力和位置自动分配
            </el-descriptions-item>
          </el-descriptions>
        </div>
      </div>
      <template #footer>
        <el-button @click="scheduleDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchSchedule">确认排产</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.shipments-page {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.statistics-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 12px;
  margin-bottom: 20px;

  &.collapsed {
    grid-template-columns: repeat(5, 1fr);
  }
}

.filter-card {
  margin-bottom: 20px;

  .filter-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.table-card {
  .table-toolbar {
    display: flex;
    align-items: center;
    margin-bottom: 16px;
    gap: 8px;

    .toolbar-label {
      font-weight: 500;
      color: #606266;
      margin-right: 8px;
    }
  }
}

.schedule-dialog-content {
  .schedule-desc {
    margin-bottom: 16px;
  }

  .schedule-params {
    margin-top: 16px;
  }
}
</style>
