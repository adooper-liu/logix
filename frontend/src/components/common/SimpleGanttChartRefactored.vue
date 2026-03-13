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
    >
      <!-- 搜索栏 -->
      <GanttSearchBar
        @search="handleSearch"
        @update:searchField="handleSearchFieldChange"
      />
    </GanttHeader>

    <!-- 统计面板 -->
    <GanttStatisticsPanel 
      :containers="finalFilteredContainers" 
      @filter="handleStatFilter"
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
        <div class="gantt-header-row">
          <div class="port-column-header">目的港</div>
          <div class="dates-header">
            <div
              v-for="date in dateRange"
              :key="date.getTime()"
              class="date-cell"
              :class="{
                'is-weekend': isWeekend(date),
                'is-today': isToday(date),
              }"
            >
              <div class="date-day">{{ formatDateShort(date) }}</div>
              <div class="date-weekday">{{ getWeekday(date) }}</div>
            </div>
          </div>
        </div>

        <!-- 按目的港分组的货柜分布 -->
        <div
          v-for="(containersByPort, port) in finalGroupedByPort"
          :key="port"
          class="gantt-data-row"
          :class="{ collapsed: isGroupCollapsed(port) }"
        >
          <div class="port-column" @click="toggleGroupCollapse(port)" style="cursor: pointer">
            <el-icon class="collapse-icon" :class="{ collapsed: isGroupCollapsed(port) }">
              <arrow-right />
            </el-icon>
            {{ getPortDisplayName(containersByPort) }}
            <span class="group-count">({{ containersByPort.length }})</span>
          </div>
          <div v-if="!isGroupCollapsed(port)" class="dates-column">
            <div
              v-for="date in dateRange"
              :key="date.getTime()"
              class="date-cell"
              :class="{
                'is-weekend': isWeekend(date),
                'is-today': isToday(date),
                'is-drop-zone': isDropZone && dayjs(dragOverDate).isSame(date, 'day'),
              }"
              @dragover="handleDragOver($event, date)"
              @drop="handleDrop(date)"
            >
              <div class="dots-container">
                <div
                  v-for="container in getContainersByDateAndPort(date, port)"
                  :key="container.containerNumber"
                  class="container-dot"
                  :class="{
                    clickable: true,
                    'is-dragging': draggingContainer?.containerNumber === container.containerNumber,
                    'has-warning': hasAlert(container),
                  }"
                  :style="{
                    backgroundColor: getStatusColor(container.logisticsStatus),
                    border: getContainerBorderStyle(container),
                  }"
                  @mouseenter="showTooltip(container, $event)"
                  @mouseleave="hideTooltip"
                  @click="handleDotClick(container)"
                  @contextmenu.prevent="openContextMenu(container, $event)"
                  draggable="true"
                  @dragstart="handleDragStart(container, $event)"
                  @dragend="handleDragEnd"
                ></div>
              </div>
            </div>
          </div>
        </div>
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
import { dictService } from '@/services/dict'
import type { Container } from '@/types/container'
import { ArrowRight, Warning } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import ContainerContextMenu from './ContainerContextMenu.vue'
import ContainerDateEditDialog from './ContainerDateEditDialog.vue'
import ContainerDetailSidebar from './ContainerDetailSidebar.vue'
import DateRangeSelector from './gantt/DateRangeSelector.vue'
import GanttHeader from './gantt/GanttHeader.vue'
import GanttLegend from './gantt/GanttLegend.vue'
import GanttSearchBar from './gantt/GanttSearchBar.vue'
import GanttStatisticsPanel from './gantt/GanttStatisticsPanel.vue'
import { useGanttLogic } from './gantt/useGanttLogic'

const route = useRoute()

// 搜索相关状态
const searchKeyword = ref('')
const searchField = ref<'containerNumber' | 'billOfLading' | 'destinationPort' | 'shipVoyage'>(
  'containerNumber'
)

// 港口字典数据
const ports = ref<Map<string, string>>(new Map())

// 加载港口字典
const loadPorts = async () => {
  try {
    const response = await dictService.getPorts()
    if (response.success && response.data) {
      const portMap = new Map<string, string>()
      response.data.forEach(port => {
        portMap.set(port.code, port.name)
      })
      ports.value = portMap
    }
  } catch (error) {
    console.error('加载港口字典失败:', error)
  }
}

// 获取港口显示名称
const getPortDisplayName = (containers: Container[]): string => {
  if (!containers || containers.length === 0) return '未指定'
  const firstContainer = containers[0]
  if (!firstContainer) return '未指定'

  // 优先使用 latestPortOperation 中的港口名称
  if (firstContainer.latestPortOperation?.portName) {
    return firstContainer.latestPortOperation.portName
  }

  // 其次从港口字典中根据港口代码获取名称
  const portCode = firstContainer.destinationPort
  if (portCode && ports.value.has(portCode)) {
    return ports.value.get(portCode) || portCode
  }

  // 最后使用港口代码
  return portCode || '未指定'
}

// 根据日期和港口获取货柜
const getContainersByDateAndPort = (date: Date, port: string): Container[] => {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  const containersByPort = finalGroupedByPort.value[port]
  if (!containersByPort) return []

  return containersByPort.filter(container => {
    const containerDate = getContainerDate(container)
    if (!containerDate) return false
    const containerDateStr = dayjs(containerDate).format('YYYY-MM-DD')
    return containerDateStr === dateStr
  })
}

// 辅助方法：获取星期
const getWeekday = (date: Date): string => {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `周${weekdays[date.getDay()]}`
}

// 辅助方法：判断是否周末
const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 0 || day === 6
}

// 辅助方法：判断是否今天
const isToday = (date: Date): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  return today.getTime() === compareDate.getTime()
}

// 计算属性：是否为拖放区域
const isDropZone = computed(() => !!dragOverDate)

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
  getStatusColor,
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

// 处理统计卡片点击过滤
const handleStatFilter = (filterType: string) => {
  // 根据过滤类型设置搜索关键词和搜索字段
  switch (filterType) {
    case 'all':
      // 清除所有过滤
      searchKeyword.value = ''
      break
    case 'atPort':
      // 过滤已到港的货柜
      searchKeyword.value = 'at_port'
      searchField.value = 'destinationPort'
      break
    case 'critical':
      // 过滤即将超期的货柜
      searchKeyword.value = 'critical'
      searchField.value = 'destinationPort'
      break
    case 'overdue':
      // 过滤已超期的货柜
      searchKeyword.value = 'overdue'
      searchField.value = 'destinationPort'
      break
    case 'returned':
      // 过滤已还箱的货柜
      searchKeyword.value = 'returned_empty'
      searchField.value = 'destinationPort'
      break
  }
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
          // 特殊处理过滤类型
          if (keyword === 'at_port') {
            // 过滤已到港的货柜
            return container.logisticsStatus === 'at_port'
          } else if (keyword === 'critical') {
            // 过滤即将超期的货柜
            const lastFreeDate = container.portOperations?.find(op => op.lastFreeDate)?.lastFreeDate
            if (!lastFreeDate) return false
            const daysUntilDeadline = dayjs(lastFreeDate).diff(dayjs(), 'day')
            return daysUntilDeadline >= 0 && daysUntilDeadline <= 3
          } else if (keyword === 'overdue') {
            // 过滤已超期的货柜
            const lastFreeDate = container.portOperations?.find(op => op.lastFreeDate)?.lastFreeDate
            if (!lastFreeDate) return false
            const status = container.logisticsStatus?.toLowerCase()
            const isPickedUp =
              status === 'picked_up' || status === 'unloaded' || status === 'returned_empty'
            return dayjs().isAfter(dayjs(lastFreeDate)) && !isPickedUp
          } else if (keyword === 'returned_empty') {
            // 过滤已还箱的货柜
            return container.logisticsStatus === 'returned_empty'
          } else {
            // 普通港口名称搜索
            return (
              container.destinationPort?.toLowerCase().includes(keyword) ||
              container.seaFreight?.portOfDischarge?.toLowerCase().includes(keyword)
            )
          }
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
  loadPorts()
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
  position: relative;
  min-width: 0;
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

/* 甘特图表头行 */
.gantt-header-row {
  display: flex;
  min-width: 100%;
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

/* 表头目的港列 */
.port-column-header {
  width: 120px;
  min-width: 120px;
  max-width: 120px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #303133;
  border-right: 1px solid #e4e7ed;
  background: #f5f7fa;
  position: sticky;
  left: 0;
  z-index: 20;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

/* 表头日期列容器 */
.dates-header {
  display: flex;
  flex: 1;
  min-width: 0;
}

/* 甘特图数据行 */
.gantt-data-row {
  display: flex;
  min-width: 100%;
  border-bottom: 2px solid #e4e7ed;
  position: relative;
  transition: min-height 0.3s ease;
}

/* 折叠状态的数据行 */
.gantt-data-row.collapsed {
  min-height: 60px;
}

/* 非折叠状态的数据行 */
.gantt-data-row:not(.collapsed) {
  min-height: 150px;
}

/* 数据行目的港列 */
.port-column {
  width: 120px;
  min-width: 120px;
  max-width: 120px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  font-weight: bold;
  color: #303133;
  border-right: 1px solid #e4e7ed;
  background: #fafafa;
  padding: 10px;
  font-size: 13px;
  text-align: left;
  word-break: break-word;
  gap: 8px;
  position: sticky;
  left: 0;
  z-index: 5;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
  height: 100%;
}

/* 数据行日期列容器 */
.dates-column {
  display: flex;
  flex: 1;
  min-width: 0;
  height: 100%;
}

/* 日期单元格 */
.date-cell {
  width: 150px;
  min-width: 150px;
  border-right: 1px solid #e4e7ed;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  position: relative;
  flex-shrink: 0;
  height: 100%;
}

/* 表头中的日期单元格 */
.gantt-header-row .date-cell {
  height: 60px;
  min-height: 60px;
}

/* 周末日期单元格 */
.date-cell.is-weekend {
  background-color: #fef0f0;
}

/* 今天日期单元格 */
.date-cell.is-today {
  background-color: #ecf5ff;
}

/* 拖放区域日期单元格 */
.date-cell.is-drop-zone {
  background-color: #e1f3d8;
  border: 2px dashed #67c23a;
}

/* 日期单元格内容 */
.date-day {
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.date-weekday {
  color: #909399;
}

/* 货柜点容器 */
.dots-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: flex-start;
  padding-top: 5px;
  gap: 8px;
}

/* 货柜点 */
.container-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

/* 货柜点悬停效果 */
.container-dot:hover {
  transform: scale(1.8);
  box-shadow: 0 0 6px rgba(0, 0, 0, 0.4);
}

/* 可点击货柜点 */
.container-dot.clickable {
  cursor: pointer;
  transition: transform 0.2s;
}

.container-dot.clickable:hover {
  transform: scale(1.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 拖拽中的货柜点 */
.container-dot.is-dragging {
  opacity: 0.5;
  transform: scale(1.2);
}

/* 预警货柜点 */
.container-dot.has-warning {
  box-shadow: 0 0 8px rgba(245, 108, 108, 0.6);
  animation: pulse-warning 2s ease-in-out infinite;
}

/* 预警动画 */
@keyframes pulse-warning {
  0%,
  100% {
    box-shadow: 0 0 8px rgba(245, 108, 108, 0.6);
  }
  50% {
    box-shadow: 0 0 16px rgba(245, 108, 108, 0.9);
  }
}

/* 折叠图标 */
.collapse-icon {
  transition: transform 0.3s ease;
  flex-shrink: 0;
}

.collapse-icon.collapsed {
  transform: rotate(90deg);
}

/* 分组计数 */
.group-count {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
  flex-shrink: 0;
}
</style>
