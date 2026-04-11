<template>
  <el-card class="table-card">
    <!-- 工具栏 -->
    <ContainerTableToolbar
      v-model:table-size="tableSize"
      v-model:quick-status-filter="quickStatusFilter"
      :alert-filter="!!alertFilter"
      :selected-rows-count="selectedRows.length"
      :batch-schedule-loading="batchScheduleLoading"
      :demurrage-write-back-loading="demurrageWriteBackLoading"
      @update:alert-filter="val => { alertFilter = val }"
      @open-column-setting="columnSettingOpen = true"
      @batch-export="() => handleBatchExport(selectedRows)"
      @go-gantt-chart="goGanttChart"
      @batch-schedule="handleBatchSchedule"
      @demurrage-write-back="handleDemurrageWriteBackWrapper"
    />
    <el-table
      ref="tableRef"
      :data="props.data"
      :size="tableSize"
      :default-sort="props.defaultSort"
      v-loading="props.loading"
      stripe
      height="calc(100vh - 380px)"
      style="width: 100%"
      @sort-change="handleSortChange"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="45" fixed="left" />
      <el-table-column type="expand" width="45" fixed="left">
        <template #default="{ row }">
          <ContainerTableRowExpand :row="row" :format-date="formatDate" />
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
        <!-- 集装箱号、备货单号 -->
        <el-table-column v-if="key === 'containerNumber'" label="货柜号/备货单号" width="180" fixed>
          <template #default="{ row }">
            <div class="combined-numbers">
              <div class="number-item">
                <span>{{ row.containerNumber || '-' }}</span>
              </div>
              <div class="number-item">
                <span>{{ row.orderNumber || '-' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 提单号、MBL -->
        <el-table-column v-else-if="key === 'billOfLadingNumber'" label="提单号/MBL" width="150">
          <template #default="{ row }">
            <div class="bbl-mbl-container">
              <div class="number-item">
                <span>{{ row.billOfLadingNumber || '-' }}</span>
              </div>
              <div class="number-item">
                <span>{{ row.mblNumber || '-' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 出运日期 -->
        <el-table-column
          v-else-if="key === 'actualShipDate'"
          prop="actualShipDate"
          label="出运日期"
          width="120"
          sortable="custom"
        >
          <template #default="{ row }">
            <span
              class="date-text"
              :class="getDateColorClass(row.actualShipDate || row.createdAt, null, 'shipment')"
            >
              {{ formatShipmentDate(row.actualShipDate || row.createdAt) }}
            </span>
          </template>
        </el-table-column>

        <!-- 柜型 -->
        <el-table-column
          v-else-if="key === 'containerTypeCode'"
          prop="containerTypeCode"
          label="柜型"
          width="80"
        >
          <template #default="{ row }">
            <el-tag size="small">{{ row.containerTypeCode || '-' }}</el-tag>
          </template>
        </el-table-column>

        <!-- 物流状态 -->
        <el-table-column
          v-else-if="key === 'logisticsStatus'"
          prop="logisticsStatus"
          :label="t('container.logisticsStatus')"
          width="120"
        >
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.logisticsStatus)" size="small">
              {{ getLogisticsStatusText(row) || '-' }}
            </el-tag>
          </template>
        </el-table-column>

        <!-- 五节点状态 -->
        <el-table-column
          v-else-if="key === 'fiveNodeStatus'"
          label="五节点状态"
          width="200"
          align="left"
        >
          <template #default="{ row }">
            <div class="five-node-status">
              <el-tag
                v-for="(node, idx) in getFiveNodeRows(row)"
                :key="idx"
                size="small"
                :type="node.type"
                class="status-tag five-node-tag"
              >
                <span class="five-node-icon-wrap" :class="`kind-${node.kind}`">
                  <el-icon class="five-node-icon" :size="13">
                    <CircleCheck v-if="node.kind === 'ok'" />
                    <CircleClose v-else-if="node.kind === 'bad'" />
                    <Warning v-else />
                  </el-icon>
                </span>
                <span class="five-node-status-text">{{ node.text }}</span>
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <!-- 预警 -->
        <el-table-column v-else-if="key === 'alerts'" label="预警" width="70" align="center">
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

        <!-- 总费用 -->
        <el-table-column v-else-if="key === 'totalCost'" label="总费用" width="100" align="right">
          <template #default="{ row }">
            <el-tooltip
              v-if="row.totalCost != null"
              :content="getCostDetailsText(row)"
              placement="top-start"
              effect="light"
              raw-content
            >
              <span class="cost-total-text"
                >{{ getRowCurrencyPrefix(row) }}{{ Number(row.totalCost || 0).toFixed(2) }}</span
              >
            </el-tooltip>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <!-- 查验 & 开箱 -->
        <el-table-column
          v-else-if="key === 'inspectionRequired'"
          label="查验/开箱"
          width="150"
          align="center"
        >
          <template #default="{ row }">
            <div class="inspection-unboxing-tags">
              <el-tag
                size="small"
                :type="row.inspectionRequired ? 'warning' : 'info'"
                class="inspection-tag"
              >
                <el-icon :size="12" style="margin-right: 4px; vertical-align: middle">
                  <Warning v-if="row.inspectionRequired" />
                  <CircleCheck v-else />
                </el-icon>
                {{ row.inspectionRequired ? '需查验' : '免查验' }}
              </el-tag>
              <el-tag size="small" :type="row.isUnboxing ? 'primary' : 'info'" class="unboxing-tag">
                <el-icon :size="12" style="margin-right: 4px; vertical-align: middle">
                  <Box v-if="row.isUnboxing" />
                  <CircleCheck v-else />
                </el-icon>
                {{ row.isUnboxing ? '已开箱' : '未开箱' }}
              </el-tag>
            </div>
          </template>
        </el-table-column>

        <!-- 目的港 -->
        <el-table-column v-else-if="key === 'destinationPort'" label="目的港" width="100">
          <template #default="{ row }">
            {{ getDestinationPortDisplay(row) }}
          </template>
        </el-table-column>

        <!-- 当前位置 -->
        <el-table-column v-else-if="key === 'location'" label="当前位置" width="100">
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

        <!-- 到港日期（ETA、修正ETA、ATA） -->
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
                <span class="date-text" :class="getDateColorClass(row.ataDestPort, null, 'eta')">
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
                    getDateColorClass(row.lastFreeDate, row.pickupDate, 'pickup', row.lastFreeDate)
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
                <span class="date-label">pla</span>
              </div>
              <div class="date-item">
                <span
                  class="date-text"
                  :class="getDateColorClass(row.pickupDate, null, 'pickup', row.lastFreeDate)"
                >
                  {{ row.pickupDate ? formatDate(row.pickupDate) : '-' }}
                </span>
                <span class="date-label">act</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 送仓日期 -->
        <el-table-column
          v-else-if="key === 'plannedDeliveryDate'"
          label="送仓日期"
          width="180"
          sortable="custom"
        >
          <template #default="{ row }">
            <div class="delivery-dates-container">
              <div class="date-item">
                <span
                  class="date-text"
                  :class="
                    getDateColorClass(
                      row.truckingTransports?.[0]?.plannedDeliveryDate,
                      row.truckingTransports?.[0]?.deliveryDate,
                      'delivery',
                      null
                    )
                  "
                >
                  {{
                    row.truckingTransports?.[0]?.plannedDeliveryDate
                      ? formatDate(row.truckingTransports[0].plannedDeliveryDate)
                      : '-'
                  }}
                </span>
                <span class="date-label">pla</span>
              </div>
              <div class="date-item">
                <span
                  class="date-text"
                  :class="
                    getDateColorClass(
                      row.truckingTransports?.[0]?.deliveryDate,
                      null,
                      'delivery',
                      null
                    )
                  "
                >
                  {{
                    row.truckingTransports?.[0]?.deliveryDate
                      ? formatDate(row.truckingTransports[0].deliveryDate)
                      : '-'
                  }}
                </span>
                <span class="date-label">act</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 卸柜日期 -->
        <el-table-column
          v-else-if="key === 'plannedUnloadDate'"
          label="卸柜日期"
          width="180"
          sortable="custom"
        >
          <template #default="{ row }">
            <div class="unload-dates-container">
              <div class="date-item">
                <span
                  class="date-text"
                  :class="
                    getDateColorClass(
                      row.warehouseOperations?.[0]?.plannedUnloadDate,
                      row.warehouseOperations?.[0]?.unloadDate,
                      'unload',
                      null
                    )
                  "
                >
                  {{
                    row.warehouseOperations?.[0]?.plannedUnloadDate
                      ? formatDate(row.warehouseOperations[0].plannedUnloadDate)
                      : '-'
                  }}
                </span>
                <span class="date-label">pla</span>
              </div>
              <div class="date-item">
                <span
                  class="date-text"
                  :class="
                    getDateColorClass(
                      row.warehouseOperations?.[0]?.unloadDate,
                      null,
                      'unload',
                      null
                    )
                  "
                >
                  {{
                    row.warehouseOperations?.[0]?.unloadDate
                      ? formatDate(row.warehouseOperations[0].unloadDate)
                      : '-'
                  }}
                </span>
                <span class="date-label">act</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 还箱日期 -->
        <el-table-column
          v-else-if="key === 'lastReturnDate'"
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
                <span class="date-label">pla</span>
              </div>
              <div class="date-item">
                <span
                  class="date-text"
                  :class="getDateColorClass(row.returnTime, null, 'return', row.lastReturnDate)"
                >
                  {{ row.returnTime ? formatDate(row.returnTime) : '-' }}
                </span>
                <span class="date-label">act</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <!-- 货物描述 -->
        <el-table-column
          v-else-if="key === 'cargoDescription'"
          prop="cargoDescription"
          :label="t('container.cargoDescription')"
          min-width="150"
          show-overflow-tooltip
        />

        <!-- 最后更新 -->
        <el-table-column
          v-else-if="key === 'lastUpdated'"
          prop="lastUpdated"
          label="最后更新"
          width="160"
          sortable="custom"
        >
          <template #default="{ row }">
            <span class="date-text" :class="getDateColorClass(row.lastUpdated, null, 'update')">
              {{ row.lastUpdated ? formatDate(row.lastUpdated) : '-' }}
            </span>
          </template>
        </el-table-column>

        <!-- 操作 -->
        <el-table-column
          v-else-if="key === 'actions'"
          :label="t('common.actions')"
          width="150"
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
                @click="viewSchedulingHistory(row)"
                title="查看排产历史"
              >
                📋
              </el-button>

              <el-button size="small" type="primary" circle @click="viewDetails(row)" title="查看">
                <el-icon><View /></el-icon>
              </el-button>
              <el-button size="small" circle @click="editContainer(row)" title="编辑">
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button
                size="small"
                type="success"
                circle
                :loading="singleFreeDateWriteBackLoading === row.containerNumber"
                :title="t('container.shipmentsList.singleFreeDateWriteBack')"
                @click="handleSingleFreeDateWriteBack(row)"
              >
                <el-icon v-if="singleFreeDateWriteBackLoading !== row.containerNumber"
                  ><Calendar
                /></el-icon>
              </el-button>
              <el-button
                size="small"
                type="warning"
                circle
                :loading="manualLfdLoading === row.containerNumber"
                title="LFD 手工维护"
                @click="handleManualLfdUpdate(row)"
              >
                <el-icon v-if="manualLfdLoading !== row.containerNumber"><Edit /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
      </template>
    </el-table>

    <!-- 列设置抽屉 -->
    <ContainerTableColumnSettings
      :visible="columnSettingOpen"
      :column-visible="columnVisible"
      :column-labels="columnLabels"
      :all-column-keys="(columnOrder as any)"
      @update:visible="columnSettingOpen = $event"
      @close="columnSettingOpen = false"
      @reset="resetColumnVisible"
      @toggle-column="
        (key: string) => {
          columnVisible[key as keyof typeof columnVisible] = !columnVisible[key as keyof typeof columnVisible]
        }
      "
      @drag-start="handleDragStart"
      @drag-over="handleDragOver"
      @drop="handleDrop"
      @drag-end="handleDragEnd"
      @save="saveColumnVisible"
    />

    <!-- 分页 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="props.total || 0"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="handlePageChangeWithLoad"
        @size-change="handlePageSizeChangeWithLoad"
      />
    </div>
  </el-card>
</template>

<!-- 集装箱表格 -->
<script setup lang="ts">
import { useLogisticsStatus } from '@/composables/useLogisticsStatus'
import { useShipmentsExport } from '@/composables/useShipmentsExport'
import { useShipmentsSchedule } from '@/composables/useShipmentsSchedule'
import { useShipmentsTable } from '@/composables/useShipmentsTable'
import { useGanttFilterStore } from '@/store/ganttFilters'
import {
  formatAlertTypeBadge,
  getCostDetailsText,
  getCustomsStatusText,
  getDestinationPortDisplay,
  getEtaCorrection,
  getFiveNodeRows,
  getRowCurrencyPrefix,
} from '@/utils/containerDisplay'
import { getCurrentLocationText } from '@/utils/logisticsStatusMachine'
import { Box, CircleCheck, CircleClose, Edit, Warning } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import ContainerTableToolbar from './ContainerTableToolbar.vue'
import ContainerTableRowExpand from './ContainerTableRowExpand.vue'
import ContainerTableColumnSettings from './ContainerTableColumnSettings.vue'

// ==================== Props 定义 ====================
interface Props {
  data?: any[]
  loading?: boolean
  currentPage?: number
  pageSize?: number
  total?: number
  defaultSort?: { prop: string; order: string | null }
}

const props = withDefaults(defineProps<Props>(), {
  data: () => [],
  loading: false,
  currentPage: 1,
  pageSize: 10,
  total: 0,
  defaultSort: () => ({ prop: '', order: null }),
})

// ==================== Emits 定义 ====================
interface Emits {
  (e: 'update:page', page: number): void
  (e: 'update:pageSize', pageSize: number): void
  (e: 'sort-change', data: { prop: string; order: string | null }): void
  (e: 'selection-change', rows: any[]): void
  (e: 'view-history', row: any): void
  (e: 'view-detail', row: any): void
  (e: 'edit', row: any): void
  (e: 'free-date-writeback', row: any): void
  (e: 'manual-lfd', row: any): void
  (e: 'batch-schedule'): void
  (e: 'demurrage-writeback'): void
}

const emit = defineEmits<Emits>()

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
const ganttFilterStore = useGanttFilterStore()
const { t } = useI18n()

// 使用物流状态 composable
const { getLogisticsStatusText, getStatusType } = useLogisticsStatus()

// 使用表格相关 composable
const {
  pagination,
  activeFilter,
  tableSize,
  columnOrder,
  columnVisible,
  columnSettingOpen,
  quickStatusFilter,
  alertFilter,
  sortedVisibleColumnKeys,
  saveColumnVisible,
  resetColumnVisible,
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  handleDrop,
  columnLabels,
} = useShipmentsTable()

// 使用导出相关 composable
const { handleBatchExport, formatDate, formatShipmentDate, customsStatusMap } = useShipmentsExport()

// 使用排产相关 composable
const { batchScheduleLoading, demurrageWriteBackLoading } = useShipmentsSchedule()

// 组件卸载标记，防止卸载后响应式更新
const isUnmounted = ref(false)

/** 单柜「免费日更新」按钮 loading（按柜号） */
const singleFreeDateWriteBackLoading = ref<string | null>(null)
/** 单柜「LFD 手工维护」按钮 loading（按柜号） */
const manualLfdLoading = ref<string | null>(null)

// 时间筛选（Dashboard风格的日期范围选择器）
// 顶部时间窗口默认为本年（出运日期口径）
const shipmentDateRange = ref<[Date, Date]>([
  dayjs().startOf('year').toDate(),
  dayjs().endOf('day').toDate(),
])

// 多选与批量导出
const tableRef = ref<InstanceType<typeof import('element-plus').ElTable>>()
const selectedRows = ref<any[]>([])

// ==================== 表格事件处理（向父组件发送事件）====================
const handleSortChange = ({ prop, order }: { prop: string; order: string | null }) => {
  emit('sort-change', { prop, order })
}

const handleSelectionChange = (rows: any[]) => {
  emit('selection-change', rows)
}

const handlePageChangeWithLoad = (page: number) => {
  emit('update:page', page)
}

const handlePageSizeChangeWithLoad = (pageSize: number) => {
  emit('update:pageSize', pageSize)
}

// 操作列事件包装器（仅用于 emit）
const handleSingleFreeDateWriteBack = (row: any) => {
  emit('free-date-writeback', row)
}

const handleManualLfdUpdate = (row: any) => {
  emit('manual-lfd', row)
}

// 查看详情（兼容 containerNumber / container_number，并对柜号做 URL 编码）
const viewDetails = (container: any) => {
  const id = container?.containerNumber ?? container?.container_number
  if (!id) {
    ElMessage.warning('无法获取集装箱号')
    return
  }
  // 改为 emit 事件，由父组件处理路由跳转
  emit('view-detail', container)
}

// 查看排产历史记录
const viewSchedulingHistory = (container: any) => {
  // 改为 emit 事件，由父组件处理
  emit('view-history', container)
}

// 编辑集装箱
const editContainer = (container: any) => {
  // 改为 emit 事件，由父组件处理
  emit('edit', container)
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
  emit('batch-schedule')
}

// 执行免费日更新（包装函数）
const handleDemurrageWriteBackWrapper = async () => {
  emit('demurrage-writeback')
}

// 辅助函数：根据筛选条件确定时间维度
const getTimeDimensionFromFilter = (
  filterCondition: string
): 'arrival' | 'pickup' | 'lastPickup' | 'return' => {
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
    timeDimension: getTimeDimensionFromFilter(filterCondition),
  })

  // 2. 构建 query 参数（用于 URL 显示和分享）
  const query: Record<string, string> = {
    startDate,
    endDate,
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

  // 组件已改为纯展示组件，不再自动加载数据
  // 数据由父组件通过 props.data 传入
})

onUnmounted(() => {
  isUnmounted.value = true
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

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

/* 表格展开详情 */
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

/* 日期显示容器 */
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

/* 组合数字显示 */
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

/* 五节点状态 */
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

/* 预警徽章 */
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

/* 费用显示 */
.cost-total-text {
  cursor: pointer;
  text-decoration: underline dotted;
  text-underline-offset: 2px;
}

/* 操作列图标网格 */
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

/* 列设置抽屉 */
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

// 查验/开箱标签样式
.inspection-unboxing-tags {
  display: flex;
  gap: 6px;
  justify-content: center;
  align-items: center;

  .inspection-tag,
  .unboxing-tag {
    font-size: 12px;
    padding: 2px 8px;
  }
}
</style>
