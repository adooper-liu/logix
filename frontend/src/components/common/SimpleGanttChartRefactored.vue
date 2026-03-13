<template>
  <div class="simple-gantt-chart">
    <!-- 顶部信息栏 -->
    <GanttHeader
      :filter-label="filterLabel"
      :container-count="finalFilteredContainers.length"
      :filter-count="selectedStatuses.length"
      :loading="loading"
      @filter="showFilterDrawer = true"
      @export="exportData"
      @back="goBack"
      @refresh="loadData"
    />

    <!-- 统计面板 -->
    <GanttStatisticsPanel :containers="finalFilteredContainers" />

    <!-- 搜索栏 -->
    <GanttSearchBar
      @search="handleSearch"
      @filterChange="handleQuickFilterChange"
      @update:searchField="handleSearchFieldChange"
    />

    <!-- 日期范围切换 -->
    <DateRangeSelector
      v-model="rangeType"
      :display-range="displayRange"
      @change="onRangeChange"
      @custom-change="onCustomDateChange"
    />

    <!-- 甘特图主体 -->
    <div class="gantt-body" v-loading="loading">
      <div class="gantt-body-scroll">
        <!-- 时间轴头部 -->
        <GanttTimelineHeader :dates="dateRange" />

        <!-- 按目的港分组的货柜分布 -->
        <GanttPortGroup
          v-for="(containersByPort, port) in finalGroupedByPort"
          :key="port"
          :port-key="port"
          :containers="containersByPort"
          :dates="dateRange"
          :is-collapsed="isGroupCollapsed(port)"
          :drag-over-date="dragOverDate"
          :is-drop-zone="!!dragOverDate"
          :dragging-container="draggingContainer"
          :status-colors="statusColors"
          :get-container-alerts="getContainerAlerts"
          :has-alert="hasAlert"
          :get-container-border-style="getContainerBorderStyle"
          @toggle-collapse="toggleGroupCollapse"
          @show-tooltip="showTooltip"
          @hide-tooltip="hideTooltip"
          @click-dot="handleDotClick"
          @open-context-menu="openContextMenu"
          @drag-start="handleDragStart"
          @drag-end="handleDragEnd"
          @dragover="handleDragOver"
          @drop="handleDrop"
        />
      </div>
    </div>

    <!-- 图例 -->
    <GanttLegend :status-colors="statusColors" />

    <!-- Tooltip -->
    <div
      v-if="tooltipVisible"
      class="gantt-tooltip"
      :style="{
        left: tooltipPosition.x + 'px',
        top: tooltipPosition.y + 'px',
      }"
    >
      <div class="tooltip-title">{{ tooltipContainer?.containerNumber }}</div>
      <div class="tooltip-content">
        <div class="tooltip-row">
          <span class="label">物流状态：</span>
          <span class="value">{{ tooltipContainer?.logisticsStatus }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">目的港：</span>
          <span class="value">{{ tooltipContainer?.destinationPort }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">预计到港：</span>
          <span class="value">{{ formatDate(tooltipContainer?.etaDestPort) }}</span>
        </div>
        <div class="tooltip-row" v-if="tooltipContainer?.ataDestPort">
          <span class="label">实际到港：</span>
          <span class="value">{{ formatDate(tooltipContainer?.ataDestPort) }}</span>
        </div>
        <div class="tooltip-row" v-if="getPlannedPickupDate(tooltipContainer)">
          <span class="label">计划提柜：</span>
          <span class="value">{{ formatDate(getPlannedPickupDate(tooltipContainer)) }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">最晚提柜：</span>
          <span class="value" :class="getTooltipDateClass(tooltipContainer)">
            {{ formatDate(getLastFreeDate(tooltipContainer)) }}
            <el-icon v-if="hasAlert(tooltipContainer!)" class="alert-icon">
              <warning />
            </el-icon>
          </span>
        </div>

        <!-- 预警信息 -->
        <div v-if="tooltipContainer && hasAlert(tooltipContainer)" class="tooltip-alerts">
          <div
            v-for="alert in getContainerAlerts(tooltipContainer)"
            :key="alert.id"
            class="alert-item"
            :class="alert.level"
          >
            <el-icon><warning /></el-icon>
            <span>{{ alert.message }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情侧边栏 -->
    <ContainerDetailSidebar v-model:visible="showDetailSidebar" :container="selectedContainer" />

    <!-- 右键菜单 -->
    <ContainerContextMenu
      v-model:visible="showContextMenu"
      :container="selectedContainer"
      :position="contextMenuPosition"
      @viewDetail="handleViewDetail"
      @editDate="handleEditDate"
      @copyContainerNumber="handleCopyContainerNumber"
      @delete="handleDelete"
    />

    <!-- 日期编辑对话框 -->
    <ContainerDateEditDialog
      v-model:visible="showDateEditDialog"
      :container="selectedContainer"
      @save="handleDateSave"
    />

    <!-- 拖拽指示器 -->
    <div
      v-if="dragOverDate"
      class="drop-indicator"
      :style="{
        left: dropIndicatorPosition.x + 'px',
        top: dropIndicatorPosition.y + 'px',
      }"
    >
      拖放至 {{ formatDateShort(dragOverDate) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { Warning } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ContainerContextMenu from './ContainerContextMenu.vue'
import ContainerDateEditDialog from './ContainerDateEditDialog.vue'
import ContainerDetailSidebar from './ContainerDetailSidebar.vue'
import DateRangeSelector from './gantt/DateRangeSelector.vue'
import GanttHeader from './gantt/GanttHeader.vue'
import GanttLegend from './gantt/GanttLegend.vue'
import GanttPortGroup from './gantt/GanttPortGroup.vue'
import GanttSearchBar from './gantt/GanttSearchBar.vue'
import GanttStatisticsPanel from './gantt/GanttStatisticsPanel.vue'
import GanttTimelineHeader from './gantt/GanttTimelineHeader.vue'
import { useGanttLogic } from './gantt/useGanttLogic'

const route = useRoute()

// 搜索相关状态
const searchKeyword = ref('')
const searchField = ref<'containerNumber' | 'billOfLading' | 'destinationPort' | 'shipVoyage'>(
  'containerNumber'
)
const quickFilters = ref<string[]>([])

// 使用甘特图逻辑 composable
const {
  containers,
  loading,
  filteredContainers,
  groupedByPort,
  filterLabel,
  selectedStatuses,
  showFilterDrawer,
  rangeType,
  displayRange,
  dateRange,
  customDateRange,
  collapsedGroups,
  tooltipVisible,
  tooltipPosition,
  tooltipContainer,
  selectedContainer,
  showDetailSidebar,
  showContextMenu,
  contextMenuPosition,
  showDateEditDialog,
  draggingContainer,
  dragOverDate,
  dropIndicatorPosition,
  statusColors,
  alertRules,
  getContainerAlerts,
  hasAlert,
  getAlertLevel,
  getContainerBorderStyle,
  isCriticalDate,
  loadData,
  toggleGroupCollapse,
  isGroupCollapsed,
  showTooltip,
  hideTooltip,
  formatDate,
  formatDateShort,
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
  goBack,
  exportData,
  handleDragOver,
  handleGlobalDrop,
} = useGanttLogic()

// 辅助方法：获取计划提柜日期
const getPlannedPickupDate = (container: any) => {
  return container?.truckingTransports?.[0]?.plannedPickupDate
}

// 辅助方法：获取最晚提柜日期
const getLastFreeDate = (container: any) => {
  return container?.portOperations?.find((op: any) => op.portType === 'destination')?.lastFreeDate
}

// 辅助方法：获取最晚提柜日期的样式类
const getTooltipDateClass = (container: any) => {
  if (!container) return ''
  const lastFreeDate = getLastFreeDate(container)
  if (!lastFreeDate) return ''

  const daysUntilDeadline = dayjs(lastFreeDate).diff(dayjs(), 'day')
  if (daysUntilDeadline < 0) return 'is-danger'
  if (daysUntilDeadline <= 3) return 'is-warning'
  return ''
}

// 搜索处理
const handleSearch = (keyword: string) => {
  searchKeyword.value = keyword
}

// 搜索字段变化
const handleSearchFieldChange = (field: string) => {
  searchField.value = field as 'containerNumber' | 'billOfLading' | 'destinationPort' | 'shipVoyage'
}

// 快速筛选变化
const handleQuickFilterChange = (filters: string[]) => {
  quickFilters.value = filters
}

// 最终的过滤容器（结合 URL 筛选和搜索）
const finalFilteredContainers = computed(() => {
  let result = filteredContainers.value

  // 应用搜索关键词
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(container => {
      switch (searchField.value) {
        case 'containerNumber':
          return container.containerNumber?.toLowerCase().includes(keyword)
        case 'billOfLading':
          return (
            container.seaFreight?.mblNumber?.toLowerCase().includes(keyword) ||
            container.seaFreight?.billOfLadingNumber?.toLowerCase().includes(keyword)
          )
        case 'destinationPort':
          return (
            container.destinationPort?.toLowerCase().includes(keyword) ||
            container.seaFreight?.portOfDischarge?.toLowerCase().includes(keyword)
          )
        case 'shipVoyage':
          return (
            container.seaFreight?.vesselName?.toLowerCase().includes(keyword) ||
            container.seaFreight?.voyageNumber?.toLowerCase().includes(keyword)
          )
        default:
          return false
      }
    })
  }

  // 应用快速筛选
  if (quickFilters.value.length > 0) {
    result = result.filter(container => {
      const lastFreeDate = container.portOperations?.find(op => op.lastFreeDate)?.lastFreeDate
      const status = container.logisticsStatus?.toLowerCase()

      if (quickFilters.value.includes('critical')) {
        // 即将超期（3 天内）
        if (lastFreeDate) {
          const daysUntilDeadline = dayjs(lastFreeDate).diff(dayjs(), 'day')
          if (daysUntilDeadline >= 0 && daysUntilDeadline <= 3) return true
        }
      }

      if (quickFilters.value.includes('overdue')) {
        // 已超期
        if (lastFreeDate && dayjs().isAfter(dayjs(lastFreeDate))) {
          const isPickedUp =
            status === 'picked_up' || status === 'unloaded' || status === 'returned_empty'
          if (!isPickedUp) return true
        }
      }

      if (quickFilters.value.includes('atPort')) {
        // 已到港
        if (status === 'at_port') return true
      }

      return false
    })
  }

  return result
})

// 最终的分组（基于搜索后的结果）
const finalGroupedByPort = computed(() => {
  const groups: Record<string, any[]> = {}
  finalFilteredContainers.value.forEach(container => {
    const portCode = container.destinationPort || '未指定'
    if (!groups[portCode]) {
      groups[portCode] = []
    }
    groups[portCode].push(container)
  })
  return groups
})

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
</script>

<style scoped>
.simple-gantt-chart {
  padding: 20px;
  background: #fff;
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.gantt-body {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  position: relative;
}

.gantt-body-scroll {
  overflow-x: auto;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Tooltip */
.gantt-tooltip {
  position: fixed;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  min-width: 200px;
  pointer-events: none;
}

.tooltip-title {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.tooltip-content {
  font-size: 12px;
}

.tooltip-row {
  display: flex;
  margin-bottom: 6px;
}

.tooltip-row .label {
  color: #909399;
  min-width: 70px;
}

.tooltip-row .value {
  color: #303133;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tooltip-row .value.is-warning {
  color: #e6a23c;
  font-weight: bold;
}

.tooltip-row .value.is-danger {
  color: #f56c6c;
  font-weight: bold;
}

.alert-icon {
  color: inherit;
}

/* 预警信息区域 */
.tooltip-alerts {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e4e7ed;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 4px;
}

.alert-item.warning {
  background-color: #fdf6ec;
  color: #e6a23c;
}

.alert-item.danger {
  background-color: #fef0f0;
  color: #f56c6c;
}

/* 拖拽指示器 */
.drop-indicator {
  position: fixed;
  background: #67c23a;
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  z-index: 9999;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}
</style>
