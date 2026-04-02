<template>
  <div class="container-table-component">
    <!-- 表格主体 -->
    <el-table
      ref="tableRef"
      :data="data"
      :size="tableSize"
      :default-sort="defaultSort"
      v-loading="loading"
      stripe
      height="calc(100vh - 380px)"
      style="width: 100%"
      @sort-change="handleSortChange"
      @selection-change="handleSelectionChange"
    >
      <!-- 选择列 -->
      <el-table-column type="selection" width="45" fixed="left" />
      
      <!-- 展开列 -->
      <el-table-column type="expand" width="45" fixed="left">
        <template #default="{ row }">
          <div class="table-expand-detail">
            <div class="expand-row">
              <span class="expand-label">到港日期</span>
              <span>
                {{ row.etaDestPort ? formatDate(row.etaDestPort) : '-' }} eta /
                {{
                  (row.etaCorrection ?? getEtaCorrection(row))
                    ? formatDate((row.etaCorrection ?? getEtaCorrection(row)) as string | Date)
                    : '-'
                }}
                rev / {{ row.ataDestPort ? formatDate(row.ataDestPort) : '-' }} ata
              </span>
            </div>
            <div class="expand-row">
              <span class="expand-label">提柜日期</span>
              <span>
                {{ row.lastFreeDate ? formatDate(row.lastFreeDate) : '-' }} lfd /
                {{ row.plannedPickupDate ? formatDate(row.plannedPickupDate) : '-' }} plan /
                {{ row.pickupDate ? formatDate(row.pickupDate) : '-' }} act
              </span>
            </div>
            <div class="expand-row">
              <span class="expand-label">还箱日期</span>
              <span>
                {{ row.lastReturnDate ? formatDate(row.lastReturnDate) : '-' }} lrd /
                {{ row.plannedReturnDate ? formatDate(row.plannedReturnDate) : '-' }} plan /
                {{ row.returnTime ? formatDate(row.returnTime) : '-' }} act
              </span>
            </div>
            <div class="expand-row">
              <span class="expand-label">货物描述</span>
              <span>{{ row.cargoDescription || '-' }}</span>
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- 空状态 -->
      <template #empty>
        <div class="table-empty">
          <el-empty description="暂无数据">
            <template v-if="activeFilter?.type">
              <span class="empty-hint">
                当前筛选条件下没有货柜记录，可尝试调整日期范围或清除筛选。
              </span>
            </template>
            <template v-else>
              <span class="empty-hint">在所选日期范围内暂无出运记录。</span>
            </template>
          </el-empty>
        </div>
      </template>

      <!-- 动态列渲染 -->
      <el-table-column
        v-for="key in sortedVisibleColumnKeys"
        :key="key"
        v-if="key === 'containerNumber'"
        label="货柜号/备货单号"
        width="180"
        fixed
      >
        <template #default="{ row }">
          <div class="combined-numbers">
            <div class="number-item">
              <span class="number-label">{{ t('container.containerNumber') }}:</span>
              <span class="number-value highlight">{{ row.containerNumber }}</span>
            </div>
            <div
              v-if="row.allOrders && row.allOrders.length > 0"
              class="number-item"
            >
              <span class="number-label">{{ t('container.orderNumber') }}:</span>
              <span class="number-value">{{ row.allOrders[0].orderNumber }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column
        v-for="key in sortedVisibleColumnKeys"
        :key="key"
        v-if="key === 'billOfLadingNumber'"
        label="提单号/MBL"
        width="150"
      >
        <template #default="{ row }">
          <div class="bbl-mbl-container">
            <div class="bbl-mbl-item">
              <span class="bbl-mbl-label">BBL:</span>
              <span class="bbl-mbl-value">{{ row.billOfLadingNumber || '-' }}</span>
            </div>
            <div v-if="row.seaFreight?.mblNumber" class="bbl-mbl-item">
              <span class="bbl-mbl-label">MBL:</span>
              <span class="bbl-mbl-value">{{ row.seaFreight.mblNumber }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column
        v-for="key in sortedVisibleColumnKeys"
        :key="key"
        v-if="key === 'skuSummary'"
        label="SKU 数量/体积/重量"
        width="150"
      >
        <template #default="{ row }">
          <div v-if="row.summary" class="combined-numbers">
            <div class="number-item">
              <span class="number-label">总毛重:</span>
              <span class="number-value">
                {{ Number(row.summary.totalGrossWeight || 0).toFixed(2) }} kg
              </span>
            </div>
            <div class="number-item">
              <span class="number-label">总体积:</span>
              <span class="number-value">
                {{ Number(row.summary.totalCbm || 0).toFixed(2) }} cbm
              </span>
            </div>
            <div class="number-item">
              <span class="number-label">总箱数:</span>
              <span class="number-value">{{ row.summary.totalBoxes || 0 }}</span>
            </div>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>
      
      <el-table-column
        v-for="key in sortedVisibleColumnKeys"
        :key="key"
        v-if="key === 'alerts'"
        label="预警"
        width="70"
        align="center"
      >
        <template #default="{ row }">
          <div v-if="row.alerts && row.alerts.length > 0" class="alerts-container">
            <el-tooltip
              v-for="(alert, index) in row.alerts"
              :key="alert.id || index"
              :content="alert.message"
              placement="top"
              effect="light"
            >
              <el-badge
                :value="formatAlertTypeBadge(alert.type)"
                :type="alert.resolved ? 'info' : 'danger'"
                class="alert-badge"
                :class="{ 'resolved-alert': alert.resolved }"
              >
                <el-icon :size="14"><Warning /></el-icon>
              </el-badge>
            </el-tooltip>
          </div>
          <div v-else-if="row.alertCount && row.alertCount > 0" class="alerts-container">
            <el-tooltip content="点击查看详细预警信息" placement="top" effect="light">
              <el-badge
                :value="row.alertCount"
                :type="row.hasResolvedAlerts ? 'info' : 'danger'"
                class="alert-badge"
              >
                <el-icon :size="14"><Warning /></el-icon>
              </el-badge>
            </el-tooltip>
          </div>
          <div
            v-else-if="row.resolvedAlertCount && row.resolvedAlertCount > 0"
            class="alerts-container"
          >
            <el-tooltip content="已处理的预警" placement="top" effect="light">
              <el-badge
                :value="row.resolvedAlertCount"
                type="info"
                class="alert-badge resolved-alert"
              >
                <el-icon :size="14"><Warning /></el-icon>
              </el-badge>
            </el-tooltip>
          </div>
          <template v-else>
            <el-icon :size="14" style="color: #ccc"><Warning /></el-icon>
          </template>
        </template>
      </el-table-column>
      
      <el-table-column
        v-for="key in sortedVisibleColumnKeys"
        :key="key"
        v-if="key === 'totalCost'"
        label="总费用"
        width="100"
        align="right"
      >
        <template #default="{ row }">
          <el-tooltip
            v-if="row.totalCost != null"
            :content="getCostDetailsText(row)"
            placement="top-start"
            effect="light"
            raw-content
          >
            <span class="cost-total-text">
              {{ getRowCurrencyPrefix(row) }}{{ Number(row.totalCost || 0).toFixed(2) }}
            </span>
          </el-tooltip>
          <span v-else>-</span>
        </template>
      </el-table-column>
      
      <el-table-column
        v-for="key in sortedVisibleColumnKeys"
        :key="key"
        v-if="key === 'inspectionRequired'"
        label="查验/开箱"
        width="120"
        align="center"
      >
        <template #default="{ row }">
          <div class="inspection-unboxing">
            <span class="inspection-text">
              查验：{{ row.inspectionRequired ? '是' : '否' }}
            </span>
            <span class="inspection-text">
              开箱：{{ row.isUnboxing ? '是' : '否' }}
            </span>
          </div>
        </template>
      </el-table-column>
      
      <el-table-column
        v-for="key in sortedVisibleColumnKeys"
        :key="key"
        v-if="key === 'destinationPort'"
        label="目的港"
        width="100"
      >
        <template #default="{ row }">
          {{ getDestinationPortDisplay(row) }}
        </template>
      </el-table-column>

        <!-- 当前位置 -->
        <el-table-column
          v-else-if="key === 'location'"
          label="当前位置"
          width="100"
        >
          <template #default="{ row }">
            {{
              getCurrentLocationText(
                row.logisticsStatus,
                getDestinationPortDisplay(row),
                row.currentPortType || row.latestPortOperation?.portType
              ) || '-'
            }}
          </template>
        </el-table-column>

        <!-- 到港日期（ETA、修正 ETA、ATA） -->
        <el-table-column
          v-else-if="key === 'etaDestPort'"
          label="到港日期"
          width="180"
          sortable="custom"
        >
          <template #default="{ row }">
            <div class="eta-ata-container">
              <div class="date-item">
                <span
                  class="date-text"
                  :class="getDateColorClass(row.etaDestPort, row.ataDestPort, 'eta')"
                >
                  {{ row.etaDestPort ? formatDate(row.etaDestPort) : '-' }}
                </span>
                <span class="date-label">eta</span>
              </div>
              <div class="date-item">
                <span
                  v-if="row.etaCorrection ?? getEtaCorrection(row)"
                  class="date-text"
                  :class="
                    getDateColorClass(
                      (row.etaCorrection ?? getEtaCorrection(row)) as string | Date,
                      null,
                      'eta'
                    )
                  "
                >
                  {{ formatDate((row.etaCorrection ?? getEtaCorrection(row)) as string | Date) }}
                </span>
                <span v-else>-</span>
                <span class="date-label">rev</span>
              </div>
              <div class="date-item">
                <span
                  class="date-text"
                  :class="getDateColorClass(row.ataDestPort, null, 'eta')"
                >
                  {{ row.ataDestPort ? formatDate(row.ataDestPort) : '-' }}
                </span>
                <span class="date-label">ata</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 清关状态 -->
        <el-table-column
          v-else-if="key === 'customsStatus'"
          prop="customsStatus"
          label="清关状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              :type="customsStatusMap[row.customsStatus]?.type || 'info'"
              size="small"
              v-if="row.customsStatus"
            >
              {{ getCustomsStatusText(row.customsStatus) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <!-- 提柜日期 -->
        <el-table-column
          v-else-if="key === 'lastFreeDate'"
          label="提柜日期"
          width="180"
          sortable="custom"
        >
          <template #default="{ row }">
            <div class="pickup-dates-container">
              <div class="date-item">
                <span
                  class="date-text"
                  :class="
                    getDateColorClass(
                      row.lastFreeDate,
                      row.pickupDate,
                      'pickup',
                      row.lastFreeDate
                    )
                  "
                >
                  {{ row.lastFreeDate ? formatDate(row.lastFreeDate) : '-' }}
                </span>
                <span class="date-label">lfd</span>
              </div>
              <div class="date-item">
                <span
                  class="date-text"
                  :class="
                    getDateColorClass(
                      row.plannedPickupDate,
                      row.pickupDate,
                      'pickup',
                      row.lastFreeDate
                    )
                  "
                >
                  {{ row.plannedPickupDate ? formatDate(row.plannedPickupDate) : '-' }}
                </span>
                <span class="date-label">plan</span>
              </div>
              <div class="date-item">
                <span
                  class="date-text"
                  :class="getDateColorClass(row.pickupDate, null, 'pickup')"
                >
                  {{ row.pickupDate ? formatDate(row.pickupDate) : '-' }}
                </span>
                <span class="date-label">act</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 还箱日期 -->
        <el-table-column
          v-else-if="key === 'plannedReturnDate'"
          label="还箱日期"
          width="180"
          sortable="custom"
        >
          <template #default="{ row }">
            <div class="return-dates-container">
              <div class="date-item">
                <span
                  class="date-text"
                  :class="
                    getDateColorClass(
                      row.lastReturnDate,
                      row.returnTime,
                      'return',
                      row.lastReturnDate
                    )
                  "
                >
                  {{ row.lastReturnDate ? formatDate(row.lastReturnDate) : '-' }}
                </span>
                <span class="date-label">lrd</span>
              </div>
              <div class="date-item">
                <span
                  class="date-text"
                  :class="
                    getDateColorClass(
                      row.plannedReturnDate,
                      row.returnTime,
                      'return',
                      row.lastReturnDate
                    )
                  "
                >
                  {{ row.plannedReturnDate ? formatDate(row.plannedReturnDate) : '-' }}
                </span>
                <span class="date-label">plan</span>
              </div>
              <div class="date-item">
                <span
                  class="date-text"
                  :class="getDateColorClass(row.returnTime, null, 'return')"
                >
                  {{ row.returnTime ? formatDate(row.returnTime) : '-' }}
                </span>
                <span class="date-label">act</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 排产状态 -->
        <el-table-column
          v-else-if="key === 'scheduleStatus'"
          prop="scheduleStatus"
          label="排产状态"
          width="100"
        >
          <template #default="{ row }">
            <el-tag
              :type="scheduleStatusMap[row.scheduleStatus]?.type || 'info'"
              size="small"
              v-if="row.scheduleStatus"
            >
              {{ getScheduleStatusText(row.scheduleStatus) }}
            </el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <!-- 更新日期 -->
        <el-table-column
          v-else-if="key === 'lastUpdated'"
          label="更新日期"
          width="120"
          sortable="custom"
        >
          <template #default="{ row }">
            <span
              class="date-text"
              :class="getDateColorClass(row.lastUpdated, null, 'update')"
            >
              {{ row.lastUpdated ? formatDate(row.lastUpdated) : '-' }}
            </span>
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column
          v-else-if="key === 'actions'"
          :label="t('common.actions')"
          width="110"
          fixed="right"
          align="center"
        >
          <template #default="{ row }">
            <div class="action-icons-grid">
              <!-- 查看历史记录按钮（仅已排产的货柜显示） -->
              <el-button
                v-if="row.scheduleStatus === 'issued'"
                size="small"
                type="info"
                circle
                @click="$emit('view-history', row)"
                title="查看排产历史"
              >
                📋
              </el-button>

              <el-button
                size="small"
                type="primary"
                circle
                @click="$emit('view-detail', row)"
                title="查看"
              >
                <el-icon><View /></el-icon>
              </el-button>
              <el-button
                size="small"
                circle
                @click="$emit('edit', row)"
                title="编辑"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button
                size="small"
                type="success"
                circle
                :loading="singleFreeDateWriteBackLoading === row.containerNumber"
                :title="t('container.shipmentsList.singleFreeDateWriteBack')"
                @click="$emit('free-date-writeback', row)"
              >
                <el-icon v-if="singleFreeDateWriteBackLoading !== row.containerNumber">
                  <Calendar />
                </el-icon>
              </el-button>
              <el-button
                size="small"
                type="warning"
                circle
                :loading="manualLfdLoading === row.containerNumber"
                title="LFD 手工维护"
                @click="$emit('manual-lfd', row)"
              >
                <el-icon v-if="manualLfdLoading !== row.containerNumber">
                  <Edit />
                </el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </template>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="internalCurrentPage"
        v-model:page-size="internalPageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 列设置抽屉 -->
    <el-drawer
      v-model="columnSettingOpen"
      title="列显示设置"
      size="400px"
    >
      <div class="column-setting-body">
        <p class="column-setting-hint">拖动列项调整顺序，勾选显示/隐藏列</p>
        <div class="column-setting-list">
          <div
            v-for="key in columnOrder"
            :key="key"
            class="column-setting-item"
            draggable="true"
            @dragstart="e => handleDragStart(e, key)"
            @dragover="handleDragOver"
            @drop="e => handleDrop(e, key)"
            @dragend="handleDragEnd"
          >
            <el-icon class="drag-handle"><ArrowDown /></el-icon>
            <el-checkbox
              v-model="columnVisible[key]"
              @mousedown.stop
              :label="getColumnLabel(key)"
            />
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="resetColumnVisible">恢复默认</el-button>
        <el-button type="primary" @click="saveColumnVisible">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import type { Container } from '@/types/container'
import {
    Calendar,
    Edit,
    View,
    Warning
} from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type {
    ColumnKey,
    ContainerTableEmits,
    ContainerTableProps
} from './types'
import { COLUMN_LABELS, DEFAULT_COLUMN_ORDER } from './types'
import { useContainerTable } from './useContainerTable'

// Props & Emits
const props = withDefaults(defineProps<ContainerTableProps>(), {
  tableSize: 'default',
  virtualScroll: false,
  defaultSort: () => ({ prop: '', order: null }),
  columnVisible: () => ({}),
  columnOrder: () => [...DEFAULT_COLUMN_ORDER]
})

const emit = defineEmits<ContainerTableEmits & {
  'view-history': [row: Container]
  'view-detail': [row: Container]
  'edit': [row: Container]
  'free-date-writeback': [row: Container]
  'manual-lfd': [row: Container]
}>()

// i18n
const { t } = useI18n()

// 内部状态
const tableRef = ref<any>()
const internalCurrentPage = ref(props.currentPage)
const internalPageSize = ref(props.pageSize)
const singleFreeDateWriteBackLoading = ref<string | null>(null)
const manualLfdLoading = ref<string | null>(null)
const activeFilter = ref<any>(null)

// 使用 Composable
const {
  columnVisible,
  columnOrder,
  columnSettingOpen,
  draggedColumn,
  toggleColumnVisible,
  resetColumnVisible,
  saveColumnVisible,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd
} = useContainerTable(props)

// 计算属性：可见且排序后的列
const sortedVisibleColumnKeys = computed(() => {
  return columnOrder.value.filter(key => columnVisible.value[key])
})

// 监听外部变化
watch(() => props.currentPage, val => {
  internalCurrentPage.value = val
})

watch(() => props.pageSize, val => {
  internalPageSize.value = val
})

/**
 * 格式化日期
 */
function formatDate(dateStr?: string | Date): string {
  if (!dateStr) return '-'
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

/**
 * 获取 ETA 修正值
 */
function getEtaCorrection(row: Container): string | Date | null {
  return row.etaCorrection || null
}

/**
 * 获取目的地港口显示文本
 */
function getDestinationPortDisplay(row: Container): string {
  return row.destinationPort || row.etaDestPort || '-'
}

/**
 * 获取当前位置文本
 */
function getCurrentLocationText(
  status: string,
  destination: string,
  portType?: string
): string {
  if (!status) return '-'
  // 简化实现，实际应该使用 logisticsStatusMachine
  return portType || status
}

/**
 * 获取日期标签类型
 */
function getDateColorClass(
  date: string | Date | null | undefined,
  actualDate?: string | Date | null | undefined,
  type?: 'eta' | 'pickup' | 'return' | 'shipment' | 'update' | 'delivery' | 'unload',
  lastDate?: string | Date | null | undefined
): string {
  const tagType = getDateTagType(date, actualDate, type, lastDate)
  return `date-color-${tagType}`
}

/**
 * 获取日期标签类型（内部函数）
 */
function getDateTagType(
  date: string | Date | null | undefined,
  _actualDate?: string | Date | null | undefined,
  type?: 'eta' | 'pickup' | 'return',
  lastDate?: string | Date | null | undefined
): 'success' | 'warning' | 'danger' | 'info' {
  if (!date) return 'info'

  if (type === 'pickup' || type === 'return') {
    if ((type === 'pickup' && date === lastDate) || 
        (type === 'return' && date === lastDate)) {
      return 'info'
    }

    if (lastDate) {
      const dateDay = getUtcDayNumber(date)
      const lastDateDay = getUtcDayNumber(lastDate)
      if (dateDay == null || lastDateDay == null) return 'info'
      const diffDays = dateDay - lastDateDay

      if (diffDays <= 0) {
        return 'success'
      } else if (diffDays <= 3) {
        return 'warning'
      } else {
        return 'danger'
      }
    }
  }

  return 'info'
}

/**
 * 获取 UTC 日序号
 */
function getUtcDayNumber(input: string | Date | null | undefined): number | null {
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

/**
 * 格式化预警徽章
 */
function formatAlertTypeBadge(type: string): string | number {
  return type || 1
}

/**
 * 获取费用详情文本
 */
function getCostDetailsText(row: Container): string {
  // 简化实现
  return `总费用：$${Number(row.totalCost || 0).toFixed(2)}`
}

/**
 * 获取币种前缀
 */
function getRowCurrencyPrefix(row: Container): string {
  return '$'
}

/**
 * 清关状态映射
 */
const customsStatusMap: Record<string, { type: 'success' | 'warning' | 'danger' | 'info'; text: string }> = {
  pending: { type: 'warning', text: '待清关' },
  cleared: { type: 'success', text: '已清关' },
  hold: { type: 'danger', text: '查验中' }
}

/**
 * 获取清关状态文本
 */
function getCustomsStatusText(status: string): string {
  return customsStatusMap[status]?.text || status
}

/**
 * 排产状态映射
 */
const scheduleStatusMap: Record<string, { type: 'success' | 'warning' | 'danger' | 'info'; text: string }> = {
  initial: { type: 'info', text: '待排产' },
  issued: { type: 'success', text: '已排产' },
  dispatched: { type: 'warning', text: '已派工' },
  adjusted: { type: 'info', text: '已调整' }
}

/**
 * 获取排产状态文本
 */
function getScheduleStatusText(status: string): string {
  return scheduleStatusMap[status]?.text || status
}

/**
 * 处理排序变化
 */
function handleSortChange({ prop, order }: any) {
  emit('sort-change', { prop, order })
}

/**
 * 处理选择变化
 */
function handleSelectionChange(selection: Container[]) {
  emit('selection-change', selection)
}

/**
 * 处理页码变化
 */
function handlePageChange(page: number) {
  emit('update:page', page)
}

/**
 * 处理每页条数变化
 */
function handleSizeChange(size: number) {
  emit('update:pageSize', size)
}

/**
 * 获取列标签
 */
function getColumnLabel(key: ColumnKey): string {
  const label = COLUMN_LABELS[key]
  return label.includes('.') ? t(label) : label
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.container-table-component {
  width: 100%;
}

.table-expand-detail {
  padding: 16px;
  
  .expand-row {
    margin-bottom: 8px;
    font-size: 13px;
    
    .expand-label {
      font-weight: 600;
      color: #606266;
      margin-right: 8px;
      min-width: 80px;
      display: inline-block;
    }
    
    span:last-child {
      color: #303133;
    }
  }
}

.table-empty {
  padding: 40px;
  text-align: center;
  
  .empty-hint {
    color: #909399;
    font-size: 13px;
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
    
    .number-value {
      color: #303133;
      
      &.highlight {
        color: #409EFF;
        font-weight: 600;
      }
    }
  }
}

.bbl-mbl-container {
  .bbl-mbl-item {
    margin-bottom: 4px;
    font-size: 12px;
    
    .bbl-mbl-label {
      font-weight: 500;
      color: #606266;
      margin-right: 4px;
    }
    
    .bbl-mbl-value {
      color: #303133;
    }
  }
}

.alerts-container {
  display: flex;
  gap: 4px;
  justify-content: center;
  
  .alert-badge {
    cursor: pointer;
    
    &.resolved-alert {
      opacity: 0.6;
    }
  }
}

.cost-total-text {
  color: #67C23A;
  font-weight: 600;
  font-size: 13px;
}

.inspection-unboxing {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
  
  .inspection-text {
    color: #303133;
  }
}

.eta-ata-container,
.pickup-dates-container,
.return-dates-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  
  .date-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    
    .date-text {
      flex: 1;
      color: #303133;
      
      &.date-color-success {
        color: #67C23A;
      }
      
      &.date-color-warning {
        color: #E6A23C;
      }
      
      &.date-color-danger {
        color: #F56C6C;
      }
      
      &.date-color-info {
        color: #909399;
      }
    }
    
    .date-label {
      color: #909399;
      font-size: 11px;
      min-width: 24px;
    }
  }
}

.action-icons-grid {
  display: flex;
  gap: 4px;
  justify-content: center;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.column-setting-body {
  .column-setting-hint {
    color: #909399;
    font-size: 13px;
    margin-bottom: 16px;
  }
  
  .column-setting-list {
    .column-setting-item {
      display: flex;
      align-items: center;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 8px;
      background: #f5f7fa;
      cursor: move;
      
      &:hover {
        background: #e4e7ed;
      }
      
      .drag-handle {
        margin-right: 8px;
        cursor: move;
        color: #606266;
      }
      
      .el-checkbox {
        flex: 1;
      }
    }
  }
}
</style>
