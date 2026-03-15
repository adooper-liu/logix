<template>
  <div class="simple-gantt-chart">
    <!-- 顶部信息栏 -->
    <GanttHeader
      :filter-label="filterLabel"
      :container-count="finalFilteredContainers.length"
      :loading="loading"
      @export="exportData"
      @back="goBack"
      @refresh="loadData"
    >
      <!-- 搜索栏 -->
      <GanttSearchBar @search="handleSearch" @update:searchField="handleSearchFieldChange" />
    </GanttHeader>

    <!-- 统计面板 -->
    <GanttStatisticsPanel :containers="finalFilteredContainers" @filter="handleStatFilter" />

    <!-- 工具栏：视图模式 + 日期范围 + 图例 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <span class="toolbar-label">视图：</span>
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="independent">独立表格</el-radio-button>
          <el-radio-button value="modal">弹窗详情</el-radio-button>
        </el-radio-group>
      </div>
      <div class="toolbar-center">
        <span class="toolbar-label">日期：</span>
        <el-radio-group v-model="rangeType" size="small" @change="onRangeChange">
          <el-radio-button :value="0">动态</el-radio-button>
          <el-radio-button :value="7">7天</el-radio-button>
          <el-radio-button :value="15">15天</el-radio-button>
          <el-radio-button :value="30">30天</el-radio-button>
        </el-radio-group>
        <span class="date-range">{{ formatDateRange(displayRange) }}</span>
      </div>
      <GanttLegend :status-colors="statusColors" />
    </div>

    <!-- 独立表格主体 -->
    <div v-if="viewMode === 'independent'" class="gantt-body" v-loading="loading">
      <div class="gantt-body-scroll">
        <!-- 时间轴头部 -->
        <div class="gantt-header-row">
          <div class="tree-column-header">
            <span>分类</span>
            <div class="collapse-all-buttons">
              <el-button size="small" text @click="expandAllGroups">
                <el-icon><arrow-down /></el-icon> 展开
              </el-button>
              <el-button size="small" text @click="collapseAllGroups(finalGroupedByPort)">
                <el-icon><arrow-up /></el-icon> 折叠
              </el-button>
            </div>
          </div>
          <div class="dates-header" :style="{ width: getTotalDatesWidth() }">
            <div
              v-for="date in dateRange"
              :key="date.getTime()"
              class="date-cell"
              :class="{
                'is-weekend': isWeekend(date),
                'is-today': isToday(date),
              }"
              :style="{ width: getHeaderDateCellWidth(date) }"
            >
              <div class="date-day">{{ formatDateShort(date) }}</div>
              <div class="date-weekday">{{ getWeekday(date) }}</div>
            </div>
          </div>
        </div>

        <!-- 三级分组：目的港 -> 五节点 -> 供应商 -->
        <!-- 目的港汇总行 -->
        <!-- 三级分组：目的港 -> 节点 -> 供应商（嵌套结构） -->
        <template v-for="(nodesByPort, port) in finalGroupedByPort" :key="port">
          <!-- 一级：目的港汇总行 -->
          <div class="gantt-data-row port-summary-row">
            <!-- 目的港行 - 支持折叠展开，采用树形缩进 -->
            <div
              class="tree-column level-1"
              :style="{ height: getPortRowHeight(getTotalContainersInPort(nodesByPort)) }"
              @click="toggleGroupCollapse(port + '-port')"
              style="cursor: pointer"
            >
              <el-icon
                class="collapse-icon"
                :class="{ expanded: !isGroupCollapsed(port + '-port') }"
              >
                <arrow-right />
              </el-icon>
              <strong>{{ getPortDisplayName(port) }}</strong>
              <span class="group-count">({{ getTotalContainersInPort(nodesByPort) }})</span>
            </div>

            <!-- 目的港日期列 -->
            <div
              class="dates-column port-summary-dates"
              :style="{
                height: getPortRowHeight(getTotalContainersInPort(nodesByPort)),
              }"
            >
              <!-- 折叠：显示所有圆点；展开：显示未分类圆点 -->
              <template v-if="isGroupCollapsed(port + '-port')">
                <div
                  v-for="date in dateRange"
                  :key="date.getTime()"
                  class="date-cell"
                  :class="{ 'is-weekend': isWeekend(date), 'is-today': isToday(date) }"
                  :style="{ width: getDateCellWidth(date) }"
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
                        'main-task': getNodeDisplayType(container, '清关') === 'main',
                        'dashed-task': getNodeDisplayType(container, '清关') === 'dashed',
                        'completed-task': isNodeFinished(container, '清关'),
                      }"
                      :style="{ backgroundColor: getStatusColor(container.logisticsStatus) }"
                      @mouseenter="showTooltip(container, $event)"
                      @mouseleave="hideTooltip"
                      @click="handleDotClick(container)"
                    ></div>
                  </div>
                </div>
              </template>
              <template v-else>
                <div
                  v-for="date in dateRange"
                  :key="date.getTime()"
                  class="date-cell"
                  :class="{ 'is-weekend': isWeekend(date), 'is-today': isToday(date) }"
                  :style="{ width: getDateCellWidth(date) }"
                >
                  <div class="dots-container">
                    <div
                      v-for="container in getUnclassifiedContainersByDateAndPort(date, port)"
                      :key="container.containerNumber"
                      class="container-dot"
                      :class="{
                        clickable: true,
                        'is-dragging': draggingContainer?.containerNumber === container.containerNumber,
                        'has-warning': hasAlert(container),
                        'main-task': getNodeDisplayType(container, '清关') === 'main',
                        'dashed-task': getNodeDisplayType(container, '清关') === 'dashed',
                        'completed-task': isNodeFinished(container, '清关'),
                      }"
                      :style="{ backgroundColor: getStatusColor(container.logisticsStatus) }"
                      @mouseenter="showTooltip(container, $event)"
                      @mouseleave="hideTooltip"
                      @click="handleDotClick(container)"
                    ></div>
                  </div>
                </div>
              </template>
            </div>
          </div>

          <!-- 二级：五节点行（仅当港口展开时，嵌套在港口内部） -->
          <template v-if="!isGroupCollapsed(port + '-port')">
            <div
              v-for="(suppliersByNode, node) in filterNormalNodes(nodesByPort)"
              :key="port + '-' + node"
              class="gantt-data-row node-group-row"
            >
              <!-- 节点行：缩进 -->
              <div
                class="tree-column level-2"
                :style="{ height: getNodeRowHeight(suppliersByNode), paddingLeft: '20px' }"
                @click="toggleGroupCollapse(port + '-' + node)"
                style="cursor: pointer"
              >
                <el-icon
                  class="collapse-icon"
                  :class="{ expanded: !isGroupCollapsed(port + '-' + node) }"
                >
                  <arrow-right />
                </el-icon>
                {{ node }}
                <span class="group-count">({{ getTotalContainersInNode(suppliersByNode) }})</span>
              </div>

              <!-- 节点日期列 -->
              <div class="dates-column node-dates">
                <template v-if="!isGroupCollapsed(port + '-' + node)">
                  <div
                    v-for="(containersBySupplier, supplier) in suppliersByNode"
                    :key="port + '-' + node + '-' + supplier"
                    class="supplier-row"
                  >
                    <!-- 供应商行：二级缩进 -->
                    <div
                      class="tree-column level-3"
                      :style="{
                        height: getSupplierRowHeight(containersBySupplier.length),
                        paddingLeft: '40px',
                      }"
                      @click="toggleGroupCollapse(port + '-' + node + '-' + supplier)"
                      style="cursor: pointer"
                    >
                      <el-icon
                        class="collapse-icon"
                        :class="{ expanded: !isGroupCollapsed(port + '-' + node + '-' + supplier) }"
                      >
                        <arrow-right />
                      </el-icon>
                      {{ supplier }}
                      <span class="group-count">({{ containersBySupplier.length }})</span>
                    </div>

                    <!-- 供应商日期列 -->
                    <div
                      v-if="!isGroupCollapsed(port + '-' + node + '-' + supplier)"
                      class="dates-column level-3-dates"
                      :style="{
                        height: getSupplierRowHeight(containersBySupplier.length),
                      }"
                    >
                      <div
                        v-for="date in dateRange"
                        :key="date.getTime()"
                        class="date-cell"
                        :class="{
                          'is-weekend': isWeekend(date),
                          'is-today': isToday(date),
                          'is-drop-zone':
                            isDropZone && dragOverDate && dayjs(dragOverDate).isSame(date, 'day'),
                        }"
                        :style="{ width: getDateCellWidth(date) }"
                        @dragover="handleDragOver($event)"
                        @drop="handleDrop(date)"
                      >
                        <div class="dots-container">
                          <div
                            v-for="container in getContainersByDateAndSupplier(
                              date,
                              containersBySupplier
                            )"
                            :key="container.containerNumber"
                            class="container-dot"
                            :class="{
                              clickable: true,
                              'is-dragging':
                                draggingContainer?.containerNumber === container.containerNumber,
                              'has-warning': hasAlert(container),
                              'main-task': isMainTask(container),
                              'dashed-task': isDashedTask(container),
                            }"
                            :style="{
                              backgroundColor: isMainTask(container)
                                ? getStatusColor(container.logisticsStatus)
                                : 'transparent',
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
                </template>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>

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

    <!-- 方案三：弹窗详情模式 -->
    <div v-if="viewMode === 'modal'" class="modal-view">
      <!-- 港口选择列表 -->
      <div class="port-select-list">
        <div class="port-select-header">
          <span>选择目的港</span>
          <span class="port-count">共 {{ portList.length }} 个港口</span>
        </div>
        <div class="port-items">
          <div
            v-for="port in portList"
            :key="port"
            class="port-item"
            :class="{ active: selectedPortForModal === port }"
            @click="selectedPortForModal = port"
          >
            <span class="port-name">{{ getPortDisplayName(port) }}</span>
            <span class="port-count"
              >({{ getTotalContainersInPort(finalGroupedByPort[port]) }})</span
            >
            <el-icon v-if="selectedPortForModal === port" class="check-icon"><check /></el-icon>
          </div>
        </div>
      </div>

      <!-- 弹窗详情甘特图 -->
      <div v-if="selectedPortForModal" class="modal-gantt">
        <div class="modal-gantt-header">
          <strong>{{ getPortDisplayName(selectedPortForModal) }}</strong>
          <el-button size="small" @click="selectedPortForModal = null">关闭</el-button>
        </div>
        <div class="modal-gantt-body">
          <!-- 复用统一视图的结构，但只渲染选中的港口 -->
          <div class="gantt-header-row">
            <div class="tree-column-header">
              <span>分类</span>
            </div>
            <div class="dates-header" :style="{ width: getTotalDatesWidth() }">
              <div
                v-for="date in dateRange"
                :key="date.getTime()"
                class="date-cell"
                :class="{ 'is-weekend': isWeekend(date), 'is-today': isToday(date) }"
                :style="{ width: getHeaderDateCellWidth(date) }"
              >
                <div class="date-day">{{ formatDateShort(date) }}</div>
                <div class="date-weekday">{{ getWeekday(date) }}</div>
              </div>
            </div>
          </div>
          <!-- 汇总行 -->
          <div class="gantt-data-row port-summary-row">
            <div class="tree-column level-1">
              <strong>汇总</strong>
              <span class="group-count"
                >({{ getTotalContainersInPort(finalGroupedByPort[selectedPortForModal]) }})</span
              >
            </div>
            <div
              class="dates-column port-summary-dates"
              :style="{
                height: getPortRowHeight(
                  getTotalContainersInPort(finalGroupedByPort[selectedPortForModal])
                ),
              }"
            >
              <div
                v-for="date in dateRange"
                :key="date.getTime()"
                class="date-cell"
                :class="{ 'is-weekend': isWeekend(date), 'is-today': isToday(date) }"
                :style="{ width: getDateCellWidth(date) }"
              >
                <div class="dots-container">
                  <div
                    v-for="container in getContainersByDateAndPort(date, selectedPortForModal)"
                    :key="container.containerNumber"
                    class="container-dot"
                    :class="{
                      clickable: true,
                      'has-warning': hasAlert(container),
                      'main-task': getNodeDisplayType(container, '清关') === 'main',
                      'dashed-task': getNodeDisplayType(container, '清关') === 'dashed',
                      'completed-task': isNodeFinished(container, '清关'),
                    }"
                    :style="{ backgroundColor: getStatusColor(container.logisticsStatus) }"
                    @mouseenter="showTooltip(container, $event)"
                    @mouseleave="hideTooltip"
                    @click="handleDotClick(container)"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <!-- 节点行 -->
          <div
            v-for="(suppliersByNode, node) in filterNormalNodes(
              finalGroupedByPort[selectedPortForModal]
            )"
            :key="selectedPortForModal + '-' + node"
            class="gantt-data-row node-group-row"
          >
            <div class="tree-column level-2" style="padding-left: 20px">
              {{ node }}
              <span class="group-count">({{ getTotalContainersInNode(suppliersByNode) }})</span>
            </div>
            <div class="dates-column node-dates" style="margin-left: 200px">
              <div
                v-for="(containersBySupplier, supplier) in suppliersByNode"
                :key="selectedPortForModal + '-' + node + '-' + supplier"
                class="supplier-row"
              >
                <div class="tree-column level-3" style="padding-left: 40px">
                  {{ supplier }}
                  <span class="group-count">({{ containersBySupplier.length }})</span>
                </div>
                <div
                  class="dates-column level-3-dates"
                  :style="{ height: getSupplierRowHeight(containersBySupplier.length) }"
                >
                  <div
                    v-for="date in dateRange"
                    :key="date.getTime()"
                    class="date-cell"
                    :class="{ 'is-weekend': isWeekend(date), 'is-today': isToday(date) }"
                    :style="{ width: getDateCellWidth(date) }"
                  >
                    <div class="dots-container">
                      <div
                        v-for="container in getContainersByDateAndSupplier(date, containersBySupplier)"
                        :key="container.containerNumber"
                        class="container-dot"
                        :class="{
                          clickable: true,
                          'has-warning': hasAlert(container),
                          'main-task': getNodeDisplayType(container, node as string) === 'main',
                          'dashed-task': getNodeDisplayType(container, node as string) === 'dashed',
                          'completed-task': isNodeFinished(container, node as string),
                        }"
                        :style="{ backgroundColor: getStatusColor(container.logisticsStatus) }"
                        @mouseenter="showTooltip(container, $event)"
                        @mouseleave="hideTooltip"
                        @click="handleDotClick(container)"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="modal-empty">
        <span>请选择左侧目的港查看详情</span>
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
import { ArrowDown, ArrowRight, ArrowUp, Check, Warning } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ContainerContextMenu from './ContainerContextMenu.vue'
import ContainerDateEditDialog from './ContainerDateEditDialog.vue'
import ContainerDetailSidebar from './ContainerDetailSidebar.vue'
import GanttHeader from './gantt/GanttHeader.vue'
import GanttLegend from './gantt/GanttLegend.vue'
import GanttSearchBar from './gantt/GanttSearchBar.vue'
import GanttStatisticsPanel from './gantt/GanttStatisticsPanel.vue'
import { useGanttLogic } from './gantt/useGanttLogic'

const route = useRoute()
const router = useRouter()

// 搜索相关状态
const searchKeyword = ref('')
const searchField = ref<'containerNumber' | 'billOfLading' | 'destinationPort' | 'shipVoyage'>(
  'containerNumber'
)

// 每行显示的货柜数量
const CONTAINERS_PER_ROW = 10

// 每行高度
const ROW_HEIGHT = 10

// 每个容器的行高
const ROW_HEIGHT_PER_CONTAINER = ROW_HEIGHT

// 默认行数（固定）
const DEFAULT_ROWS = 10

// 默认列数（固定）
const DEFAULT_COLS = 10

// 每列宽度
const COL_WIDTH = 10

// 最小行高 = 10行 * 10px = 100px
const MIN_ROW_HEIGHT = DEFAULT_ROWS * ROW_HEIGHT

// 最小列宽 = 10列 * 10px = 100px
const MIN_COL_WIDTH = DEFAULT_COLS * COL_WIDTH

// 计算每个港口行的固定高度（最多10行）
const getPortRowHeight = (containerCount: number): string => {
  // 始终使用10行高度，超出内容通过增加日期列宽度来适应
  return MIN_ROW_HEIGHT + 'px'
}

// 计算港口总容器数
const getTotalContainersInPort = (nodesByPort: Record<string, Record<string, any[]>>): number => {
  let total = 0
  Object.values(nodesByPort).forEach(suppliersByNode => {
    Object.values(suppliersByNode).forEach(containers => {
      total += containers.length
    })
  })
  return total
}

// 过滤正常节点（排除未分类）
const filterNormalNodes = (
  nodesByPort: Record<string, Record<string, any[]>>
): Record<string, Record<string, any[]>> => {
  const normalNodes: Record<string, Record<string, any[]>> = {}
  const normalNodeNames = ['清关', '提柜', '卸柜', '还箱', '查验']
  Object.keys(nodesByPort).forEach(nodeName => {
    if (normalNodeNames.includes(nodeName)) {
      normalNodes[nodeName] = nodesByPort[nodeName]
    }
  })
  return normalNodes
}

// 计算节点总容器数
const getTotalContainersInNode = (suppliersByNode: Record<string, any[]>): number => {
  let total = 0
  Object.values(suppliersByNode).forEach(containers => {
    total += containers.length
  })
  return total
}

// 计算节点行高度
const getNodeRowHeight = (suppliersByNode: Record<string, any[]>): string => {
  const containerCount = getTotalContainersInNode(suppliersByNode)
  return Math.max(MIN_ROW_HEIGHT, containerCount * ROW_HEIGHT_PER_CONTAINER) + 'px'
}

// 计算供应商行高度
const getSupplierRowHeight = (containerCount: number): string => {
  return `${Math.max(MIN_ROW_HEIGHT, containerCount * ROW_HEIGHT_PER_CONTAINER)}px`
}

// 获取港口下的所有货柜（用于汇总行显示）
const getContainersByPort = (portCode: string): any[] => {
  return finalFilteredContainers.value.filter(c => (c.destinationPort || '未指定') === portCode)
}

// 根据日期和供应商获取容器（基于货柜显示项）
const getContainersByDateAndSupplier = (date: Date, containers: any[]): any[] => {
  return containers.filter(container => {
    const displayItems = getDisplayItems(container)
    return displayItems.some(item => {
      if (item.plannedDate) {
        return dayjs(new Date(item.plannedDate)).isSame(date, 'day')
      }
      return false
    })
  })
}

// 五节点泳道折叠状态
// 五节点各节点折叠状态
const nodeCollapsed = reactive({
  customs: false,
  trucking: false,
  unloading: false,
  return: false,
  inspection: false,
})

// 用于区分单击和双击事件的定时器
const clickTimer = ref<number | null>(null)

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
const getPortDisplayName = (input: Container[] | Record<string, any> | string): string => {
  // 如果是字符串，直接作为港口代码处理
  if (typeof input === 'string') {
    const portCode = input
    if (portCode && ports.value.has(portCode)) {
      return ports.value.get(portCode) || portCode
    }
    return portCode || '未指定'
  }

  // 如果是对象（nodesByPort），尝试从中提取港口信息
  if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
    // 对于空结构，返回港口代码本身
    return '未指定'
  }

  // 如果是容器数组，使用原有逻辑
  const containers = input as Container[]
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
  const nodesByPort = finalGroupedByPort.value[port]
  if (!nodesByPort) return []

  const allContainers: Container[] = []

  // 遍历所有节点和供应商，收集所有容器
  Object.values(nodesByPort).forEach(suppliersByNode => {
    Object.values(suppliersByNode).forEach(containers => {
      allContainers.push(...containers)
    })
  })

  // 过滤指定日期的容器
  return allContainers.filter(container => {
    const containerDate = getContainerDate(container)
    if (!containerDate) return false
    const containerDateStr = dayjs(containerDate).format('YYYY-MM-DD')
    return containerDateStr === dateStr
  })
}

// 根据日期和港口获取未分类节点的货柜
const getUnclassifiedContainersByDateAndPort = (date: Date, port: string): Container[] => {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  const nodesByPort = finalGroupedByPort.value[port]
  if (!nodesByPort || !nodesByPort['未分类']) return []

  const unclassifiedSuppliers = nodesByPort['未分类']
  const allContainers: Container[] = []

  // 遍历未分类节点的所有供应商，收集所有货柜
  Object.values(unclassifiedSuppliers).forEach(containers => {
    allContainers.push(...containers)
  })

  // 过滤指定日期的货柜
  return allContainers.filter(container => {
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

// 缓存每个日期的货柜数量（避免重复计算）
const dateContainerCounts = computed(() => {
  const counts: Map<string, number> = new Map()
  for (const date of dateRange.value) {
    const dateStr = dayjs(date).format('YYYY-MM-DD')
    let maxCount = 0
    for (const port of Object.keys(finalGroupedByPort.value)) {
      const containers = getContainersByDateAndPort(date, port)
      maxCount = Math.max(maxCount, containers.length)
    }
    counts.set(dateStr, maxCount)
  }
  return counts
})

// 缓存每个日期格子的宽度
const dateCellWidths = computed(() => {
  const widths: Map<string, string> = new Map()
  for (const date of dateRange.value) {
    const dateStr = dayjs(date).format('YYYY-MM-DD')
    const maxCount = dateContainerCounts.value.get(dateStr) || 0

    if (maxCount === 0) {
      widths.set(dateStr, `${MIN_COL_WIDTH}px`)
    } else {
      const columnsNeeded = Math.ceil(maxCount / CONTAINERS_PER_ROW)
      const columnWidth = 13
      const width = Math.max(columnsNeeded * columnWidth, MIN_COL_WIDTH)
      widths.set(dateStr, `${width}px`)
    }
  }
  return widths
})

// 缓存表头日期格子宽度
const headerDateCellWidths = computed(() => dateCellWidths.value)

// 缓存表头日期列总宽度
const totalDatesWidth = computed(() => {
  let totalWidth = 0
  for (const date of dateRange.value) {
    const dateStr = dayjs(date).format('YYYY-MM-DD')
    const width = parseInt(dateCellWidths.value.get(dateStr)?.replace('px', '') || '0')
    totalWidth += width
  }
  return `${Math.max(totalWidth, MIN_COL_WIDTH)}px`
})

// 优化后的日期格子宽度获取方法（使用缓存）
const getDateCellWidth = (date: Date): string => {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  return dateCellWidths.value.get(dateStr) || `${MIN_COL_WIDTH}px`
}

// 优化后的表头日期格子宽度获取方法
const getHeaderDateCellWidth = (date: Date): string => {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  return headerDateCellWidths.value.get(dateStr) || `${MIN_COL_WIDTH}px`
}

// 优化后的表头日期列总宽度获取方法
const getTotalDatesWidth = (): string => {
  return totalDatesWidth.value
}

// 使用甘特图逻辑 composable
const {
  containers,
  loading,
  groupedByPort,
  filterLabel,
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
  expandAllGroups,
  collapseAllGroups,
  showTooltip,
  hideTooltip,
  formatDate,
  formatDateShort,
  getContainerDate,
  getStatusColor,
  getContainerStage,
  getNodeTaskType,
  getNodeDate,
  getNodeGroupKey,
  isNodeCompleted,
  calculateDynamicDateRange,
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

// 视图模式：independent-独立表格, modal-弹窗详情
const viewMode = ref<'independent' | 'modal'>('independent')

// 格式化日期范围显示
const formatDateRange = (range: [Date, Date]): string => {
  const format = (d: Date) => dayjs(d).format('MM-DD')
  return `${format(range[0])} ~ ${format(range[1])}`
}

// 弹窗模式 - 当前选中的港口
const selectedPortForModal = ref<string | null>(null)

// 港口列表（用于弹窗详情模式）
const portList = computed(() => {
  return Object.keys(finalGroupedByPort.value).filter(port => port !== '未指定')
})

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

/**
 * 获取货柜在指定节点的显示类型
 * @param container 货柜
 * @param nodeName 节点名称
 * @returns 'main' | 'dashed' | null（null表示已完成或不存在）
 */
const getNodeDisplayType = (container: any, nodeName: string): 'main' | 'dashed' | null => {
  const nodeStatus = calculateNodeStatus(container)
  const node = nodeStatus.nodes[nodeName as keyof typeof nodeStatus.nodes]

  if (!node?.supplier || node.supplier === '未指定') return null

  // 已完成的节点不显示
  if (node.status === 'completed') return null

  // 活跃节点显示为主任务
  if (node.status === 'active') return 'main'

  // 待处理节点显示为虚线任务
  if (node.status === 'pending') return 'dashed'

  return null
}

/**
 * 判断节点是否已完成（显示✓标记）
 */
const isNodeFinished = (container: any, nodeName: string): boolean => {
  const nodeStatus = calculateNodeStatus(container)
  const node = nodeStatus.nodes[nodeName as keyof typeof nodeStatus.nodes]
  return node?.status === 'completed'
}

// 五节点相关方法
const getContainersByNodeDate = (date: Date, node: string): any[] => {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  return finalFilteredContainers.value.filter(container => {
    switch (node) {
      case 'customs':
        return isPlannedDate(container, 'customs', date) || isActualDate(container, 'customs', date)
      case 'trucking':
        return (
          isPlannedDate(container, 'trucking', date) || isActualDate(container, 'trucking', date)
        )
      case 'unloading':
        return (
          isPlannedDate(container, 'unloading', date) || isActualDate(container, 'unloading', date)
        )
      case 'return':
        return isPlannedDate(container, 'return', date) || isActualDate(container, 'return', date)
      case 'inspection':
        return (
          isPlannedDate(container, 'inspection', date) ||
          isActualDate(container, 'inspection', date)
        )
      default:
        return false
    }
  })
}

const isPlannedDate = (container: any, node: string, date: Date): boolean => {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  switch (node) {
    case 'customs':
      // 清关计划日期
      return (
        container.customsPlannedDate &&
        dayjs(container.customsPlannedDate).format('YYYY-MM-DD') === dateStr
      )
    case 'trucking':
      // 拖卡计划日期
      return (
        container.truckingTransports?.[0]?.plannedPickupDate &&
        dayjs(container.truckingTransports[0].plannedPickupDate).format('YYYY-MM-DD') === dateStr
      )
    case 'unloading':
      // 卸柜计划日期
      return (
        container.unloadingPlannedDate &&
        dayjs(container.unloadingPlannedDate).format('YYYY-MM-DD') === dateStr
      )
    case 'return':
      // 还箱计划日期
      return (
        container.returnPlannedDate &&
        dayjs(container.returnPlannedDate).format('YYYY-MM-DD') === dateStr
      )
    case 'inspection':
      // 查验计划日期
      return (
        container.inspectionPlannedDate &&
        dayjs(container.inspectionPlannedDate).format('YYYY-MM-DD') === dateStr
      )
    default:
      return false
  }
}

const isActualDate = (container: any, node: string, date: Date): boolean => {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  switch (node) {
    case 'customs':
      // 清关实际日期
      return (
        container.customsActualDate &&
        dayjs(container.customsActualDate).format('YYYY-MM-DD') === dateStr
      )
    case 'trucking':
      // 拖卡实际日期
      return (
        container.truckingTransports?.[0]?.actualPickupDate &&
        dayjs(container.truckingTransports[0].actualPickupDate).format('YYYY-MM-DD') === dateStr
      )
    case 'unloading':
      // 卸柜实际日期
      return (
        container.unloadingActualDate &&
        dayjs(container.unloadingActualDate).format('YYYY-MM-DD') === dateStr
      )
    case 'return':
      // 还箱实际日期
      return (
        container.returnActualDate &&
        dayjs(container.returnActualDate).format('YYYY-MM-DD') === dateStr
      )
    case 'inspection':
      // 查验实际日期
      return (
        container.inspectionActualDate &&
        dayjs(container.inspectionActualDate).format('YYYY-MM-DD') === dateStr
      )
    default:
      return false
  }
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

// 处理货柜圆点单击事件
const handleDotClick = (container: any) => {
  // 清除之前的定时器
  if (clickTimer.value) {
    clearTimeout(clickTimer.value)
    clickTimer.value = null
    // 执行双击逻辑
    router.push(`/shipments/${container.containerNumber}`)
    return
  }

  // 设置新的定时器，延迟 300ms 执行单击逻辑
  clickTimer.value = window.setTimeout(() => {
    selectedContainer.value = container
    showDetailSidebar.value = true
    hideTooltip()
    clickTimer.value = null
  }, 300)
}

// 处理货柜圆点双击事件
const handleDotDblClick = (container: any) => {
  // 双击事件已经在 handleDotClick 中处理
}

// 最终的过滤容器（结合 URL 筛选和搜索）
const finalFilteredContainers = computed(() => {
  let result = containers.value

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
          // 默认返回 true，避免所有货柜被过滤掉
          return true
      }
    })
  }

  return result
})

// 最终的分组（基于搜索后的结果）- 三级分组
const finalGroupedByPort = computed(() => {
  // 使用 useGanttLogic 的三级分组逻辑
  const groups: Record<string, Record<string, Record<string, any[]>>> = {}

  finalFilteredContainers.value.forEach(container => {
    const portCode = container.destinationPort || '未指定'

    // 初始化目的港层级（包括"未分类"节点）
    if (!groups[portCode]) {
      groups[portCode] = {
        清关: {},
        提柜: {},
        卸柜: {},
        还箱: {},
        查验: {},
        未分类: {},
      }
    }

    // 确保所有预定义节点都存在
    const allNodes = ['清关', '提柜', '卸柜', '还箱', '查验', '未分类']
    allNodes.forEach(node => {
      if (!groups[portCode][node]) {
        groups[portCode][node] = {}
      }
    })

    // 确定五节点和对应的供应商
    const nodeSupplierMap = getNodeAndSupplierForContainer(container)

    nodeSupplierMap.forEach(({ node, supplier }) => {
      if (!groups[portCode][node][supplier]) {
        groups[portCode][node][supplier] = []
      }
      groups[portCode][node][supplier].push(container)
    })
  })

  // 如果没有数据，创建一个空的默认结构用于显示框架
  if (finalFilteredContainers.value.length === 0) {
    groups['未指定'] = {
      清关: {},
      提柜: {},
      卸柜: {},
      还箱: {},
      查验: {},
    }
  }

  return groups
})

// ========== 货柜节点状态计算 ==========

/**
 * 货柜节点状态接口
 */
interface NodeStatus {
  status: 'pending' | 'active' | 'completed' | 'skipped'
  plannedDate?: Date
  actualDate?: Date
  supplier: string
}

/**
 * 货柜节点状态
 */
interface ContainerNodeStatus {
  containerNumber: string
  portCode: string
  nodes: {
    清关: NodeStatus
    查验: NodeStatus
    提柜: NodeStatus
    卸柜: NodeStatus
    还箱: NodeStatus
  }
}

/**
 * 计算货柜各节点状态
 */
const calculateNodeStatus = (container: any): ContainerNodeStatus => {
  const nodes: any = {
    清关: { status: 'pending', supplier: '未指定', plannedDate: undefined, actualDate: undefined },
    查验: { status: 'pending', supplier: '未指定', plannedDate: undefined, actualDate: undefined },
    提柜: { status: 'pending', supplier: '未指定', plannedDate: undefined, actualDate: undefined },
    卸柜: { status: 'pending', supplier: '未指定', plannedDate: undefined, actualDate: undefined },
    还箱: { status: 'pending', supplier: '未指定', plannedDate: undefined, actualDate: undefined },
  }

  const destPortOp = container.portOperations?.find((op: any) => op.portType === 'destination')
  const portCode = destPortOp?.portCode || '未知目的港'
  const needsInspection = container.inspectionRequired || false

  // 1. 判断清关状态（使用 customsBrokerCode 优先，其次 customsBroker）
  const customsSupplier = destPortOp?.customsBrokerCode || destPortOp?.customsBroker
  if (customsSupplier) {
    nodes.清关.supplier = customsSupplier
    // 优先级：actualCustomsDate > plannedCustomsDate > ataDestPort > etaDestPort
    if (destPortOp.actualCustomsDate) {
      nodes.清关.actualDate = new Date(destPortOp.actualCustomsDate)
      nodes.清关.plannedDate = destPortOp.plannedCustomsDate
        ? new Date(destPortOp.plannedCustomsDate)
        : undefined
    } else if (destPortOp.plannedCustomsDate) {
      nodes.清关.plannedDate = new Date(destPortOp.plannedCustomsDate)
    } else if (destPortOp.ataDestPort) {
      nodes.清关.plannedDate = new Date(destPortOp.ataDestPort)
    } else if (destPortOp.etaDestPort) {
      nodes.清关.plannedDate = new Date(destPortOp.etaDestPort)
    }

    if (destPortOp.actualCustomsDate) {
      nodes.清关.status = 'completed'
    } else if (nodes.清关.plannedDate) {
      nodes.清关.status = 'active'
    }
  }

  // 2. 判断查验状态（如果有查验需求）
  if (needsInspection && customsSupplier) {
    nodes.查验.supplier = customsSupplier
    nodes.查验.plannedDate = destPortOp?.plannedCustomsDate
      ? new Date(destPortOp.plannedCustomsDate)
      : undefined
    nodes.查验.actualDate = destPortOp?.actualCustomsDate
      ? new Date(destPortOp.actualCustomsDate)
      : undefined

    if (nodes.清关.status === 'completed' && nodes.查验.status === 'pending') {
      nodes.查验.status = 'active'
    } else if (destPortOp?.actualCustomsDate && needsInspection) {
      nodes.查验.status = 'completed'
    }
  }

  // 3. 判断提柜状态（只有在不需要查验或查验完成后才能提柜）
  const pickupTransport = container.truckingTransports?.[0]
  // 使用 truckingCompanyId 优先，其次 carrierCompany
  const pickupSupplier = pickupTransport?.truckingCompanyId || pickupTransport?.carrierCompany
  if (pickupSupplier) {
    nodes.提柜.supplier = pickupSupplier
    // 优先级：deliveryDate > plannedDeliveryDate > pickupDate > plannedPickupDate
    if (pickupTransport.deliveryDate) {
      nodes.提柜.actualDate = new Date(pickupTransport.deliveryDate)
      nodes.提柜.plannedDate = pickupTransport.plannedDeliveryDate
        ? new Date(pickupTransport.plannedDeliveryDate)
        : undefined
    } else if (pickupTransport.plannedDeliveryDate) {
      nodes.提柜.plannedDate = new Date(pickupTransport.plannedDeliveryDate)
    } else if (pickupTransport.pickupDate) {
      nodes.提柜.actualDate = new Date(pickupTransport.pickupDate)
      nodes.提柜.plannedDate = pickupTransport.plannedPickupDate
        ? new Date(pickupTransport.plannedPickupDate)
        : undefined
    } else if (pickupTransport.plannedPickupDate) {
      nodes.提柜.plannedDate = new Date(pickupTransport.plannedPickupDate)
    }

    // 检查是否可以进入提柜节点（清关完成后才能提柜）
    let canEnterPickup = nodes.清关.status === 'completed'
    if (needsInspection) {
      canEnterPickup = canEnterPickup && nodes.查验.status === 'completed'
    }

    // 提柜完成判断：使用 deliveryDate（送仓日）
    if (canEnterPickup && !pickupTransport.deliveryDate) {
      nodes.提柜.status = 'active'
    } else if (pickupTransport.deliveryDate) {
      nodes.提柜.status = 'completed'
    }
  }

  // 4. 判断卸柜状态（使用 warehouseId 优先，其次 actualWarehouse/plannedWarehouse）
  const unloadOp = container.warehouseOperations?.[0]
  const unloadSupplier = unloadOp?.warehouseId || unloadOp?.actualWarehouse || unloadOp?.plannedWarehouse
  if (unloadSupplier) {
    nodes.卸柜.supplier = unloadSupplier
    // 优先级：unloadDate > plannedUnloadDate
    if (unloadOp.unloadDate) {
      nodes.卸柜.actualDate = new Date(unloadOp.unloadDate)
      nodes.卸柜.plannedDate = unloadOp.plannedUnloadDate
        ? new Date(unloadOp.plannedUnloadDate)
        : undefined
    } else if (unloadOp.plannedUnloadDate) {
      nodes.卸柜.plannedDate = new Date(unloadOp.plannedUnloadDate)
    }

    if (nodes.提柜.status === 'completed' && !unloadOp?.unloadDate) {
      nodes.卸柜.status = 'active'
    } else if (unloadOp?.unloadDate) {
      nodes.卸柜.status = 'completed'
    }
  }

  // 5. 判断还箱状态（使用 warehouseId 分组，与卸柜相同）
  const emptyReturn = container.emptyReturns?.[0]
  // 还箱与卸柜使用相同的分组（warehouseId）
  if (unloadSupplier) {
    nodes.还箱.supplier = unloadSupplier
    // 优先级：returnTime > lastReturnDate
    if (emptyReturn?.returnTime) {
      nodes.还箱.actualDate = new Date(emptyReturn.returnTime)
      nodes.还箱.plannedDate = emptyReturn.lastReturnDate
        ? new Date(emptyReturn.lastReturnDate)
        : undefined
    } else if (emptyReturn?.lastReturnDate) {
      nodes.还箱.plannedDate = new Date(emptyReturn.lastReturnDate)
    }

    if (nodes.卸柜.status === 'completed' && !emptyReturn?.returnTime) {
      nodes.还箱.status = 'active'
    } else if (emptyReturn?.returnTime) {
      nodes.还箱.status = 'completed'
    }
  }

  // 6. 如果没有找到任何活动节点，但清关有计划日期，则清关为活跃节点
  if (nodes.清关.status === 'pending' && nodes.清关.plannedDate) {
    nodes.清关.status = 'active'
  }

  return {
    containerNumber: container.containerNumber,
    portCode,
    nodes,
  }
}

/**
 * 甘特图显示项接口
 */
interface GanttDisplayItem {
  type: 'main' | 'dashed' // 主任务 / 虚线任务
  port: string
  node: string
  supplier: string
  containerNumber: string
  container: any
  plannedDate?: Date
  actualDate?: Date
  isCurrent: boolean
}

/**
 * 获取货柜的显示项（根据节点状态）
 */
const getDisplayItems = (container: any): GanttDisplayItem[] => {
  const displayItems: GanttDisplayItem[] = []
  const nodeStatus = calculateNodeStatus(container)

  const needsInspection = container.inspectionRequired || false

  // 根据是否需要查验，使用不同的节点顺序
  const nodeOrder: Array<'清关' | '查验' | '提柜' | '卸柜' | '还箱'> = needsInspection
    ? ['清关', '查验', '提柜', '卸柜', '还箱']
    : ['清关', '提柜', '卸柜', '还箱']

  let foundActive = false

  nodeOrder.forEach(nodeName => {
    const node = nodeStatus.nodes[nodeName as keyof typeof nodeStatus.nodes]

    // 有供应商信息就显示节点（不依赖日期）
    if (node.supplier && node.supplier !== '未指定') {
      if (node.status === 'active') {
        // 当前节点 - 主任务（实线圆点）
        displayItems.push({
          type: 'main',
          port: nodeStatus.portCode,
          node: nodeName,
          supplier: node.supplier,
          containerNumber: nodeStatus.containerNumber,
          container,
          plannedDate: node.plannedDate,
          actualDate: node.actualDate,
          isCurrent: true,
        })
        foundActive = true
      } else if (!foundActive && node.status === 'pending') {
        // 未来节点 - 虚线任务（计划中）
        displayItems.push({
          type: 'dashed',
          port: nodeStatus.portCode,
          node: nodeName,
          supplier: node.supplier,
          containerNumber: nodeStatus.containerNumber,
          container,
          plannedDate: node.plannedDate,
          actualDate: node.actualDate,
          isCurrent: false,
        })
      }
      // 已完成的节点不显示（销毁）
    }
  })

  return displayItems
}

// 获取货柜对应的节点和供应商（保留原有逻辑以兼容）
const getNodeAndSupplierForContainer = (
  container: any
): Array<{ node: string; supplier: string }> => {
  const result: Array<{ node: string; supplier: string }> = []

  const displayItems = getDisplayItems(container)
  displayItems.forEach(item => {
    result.push({
      node: item.node,
      supplier: item.supplier,
    })
  })

  // 如果没有找到任何节点供应商映射，至少放在一个默认分组
  if (result.length === 0) {
    result.push({
      node: '未分类',
      supplier: '未指定供应商',
    })
  }

  return result
}

/**
 * 判断货柜在当前节点是否为主任务（实线圆点）
 */
const isMainTask = (container: any): boolean => {
  const displayItems = getDisplayItems(container)
  // 查找当前日期对应的显示项
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const item of displayItems) {
    if (item.type === 'main' && item.plannedDate) {
      const itemDate = new Date(item.plannedDate)
      itemDate.setHours(0, 0, 0, 0)
      if (dayjs(itemDate).isSame(today, 'day')) {
        return true
      }
    }
  }
  return false
}

/**
 * 判断货柜在当前节点是否为虚线任务（计划中）
 */
const isDashedTask = (container: any): boolean => {
  const displayItems = getDisplayItems(container)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const item of displayItems) {
    if (item.type === 'dashed' && item.plannedDate) {
      const itemDate = new Date(item.plannedDate)
      itemDate.setHours(0, 0, 0, 0)
      if (dayjs(itemDate).isSame(today, 'day')) {
        return true
      }
    }
  }
  return false
}

// 生命周期
onMounted(() => {
  loadData()
  loadPorts()

  // 设置目的港默认折叠
  nextTick(() => {
    Object.keys(finalGroupedByPort.value).forEach((port: string) => {
      if (!collapsedGroups.value.has(`${port}-port`)) {
        collapsedGroups.value.add(`${port}-port`)
      }
    })
  })

  document.addEventListener('dragover', handleDragOver)
  document.addEventListener('drop', handleGlobalDrop)
})

onUnmounted(() => {
  document.removeEventListener('dragover', handleDragOver)
  document.removeEventListener('drop', handleGlobalDrop)
})
</script>

<script lang="ts">
export default {
  name: 'SimpleGanttChart',
}
</script>

<style scoped>
/* 工具栏：视图模式 + 日期范围 + 图例 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
  gap: 16px;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-center {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
}

.date-range {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}

/* 方案三：弹窗详情模式 */
.modal-view {
  display: flex;
  height: 600px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.modal-view .port-select-list {
  width: 240px;
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.modal-view .port-select-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  font-weight: bold;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-view .port-count {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}

.modal-view .port-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.modal-view .port-item {
  padding: 12px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  transition: all 0.2s;
}

.modal-view .port-item:hover {
  background: #e4e7ed;
}

.modal-view .port-item.active {
  background: #409eff;
  color: #fff;
}

.modal-view .port-item .check-icon {
  margin-left: 8px;
}

.modal-view .modal-gantt {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-view .modal-gantt-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-view .modal-gantt-body {
  flex: 1;
  overflow: auto;
}

.modal-view .modal-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

/* 方案四：左右分屏模式 */
.split-view {
  display: flex;
  height: 600px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

.split-view .split-sidebar {
  width: 280px;
  background: #f5f7fa;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

.split-view .split-sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  font-weight: bold;
}

.split-view .split-port-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.split-view .split-port-item {
  padding: 14px 16px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.split-view .split-port-item:hover {
  background: #e4e7ed;
}

.split-view .split-port-item.active {
  background: #ecf5ff;
  border-color: #409eff;
}

.split-view .split-port-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.split-view .arrow-icon {
  color: #c0c4cc;
}

.split-view .split-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.split-view .split-gantt-header {
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  font-weight: bold;
}

.split-view .split-gantt-body {
  flex: 1;
  overflow: auto;
}

.split-view .split-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.simple-gantt-chart {
  padding: 20px;
  background: #fff;
  /* height: 100vh; */ /* 移除固定高度，允许根据内容自动增高 */
  display: flex;
  flex-direction: column;
  /* overflow: hidden; */ /* 移除溢出隐藏，允许内容自然流出 */
}

.gantt-body {
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.gantt-body-scroll {
  overflow-x: auto;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  position: relative;
  flex: 1;
}

/* 表头固定 */
.gantt-header-row {
  display: flex;
  min-width: 100%;
  position: sticky;
  top: 0;
  z-index: 15;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
}

/* 表体滚动区域 */
.gantt-body-scroll {
  display: flex;
  flex-direction: column;
  position: relative;
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

/* 表头分类列（树形结构） */
.tree-column-header {
  width: 180px;
  min-width: 180px;
  max-width: 180px;
  height: 60px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #303133;
  border-right: 1px solid #e4e7ed;
  background: #f5f7fa;
  position: sticky;
  left: 0;
  z-index: 20;
  gap: 4px;
}

/* 全部折叠/展开按钮 */
.collapse-all-buttons {
  display: flex;
  gap: 4px;
  font-size: 11px;
}

/* 树形结构列 */
.tree-column {
  width: 180px;
  min-width: 180px;
  max-width: 180px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  border-right: 1px solid #e4e7ed;
  border-bottom: 1px solid #ebeef5;
  padding: 0 10px;
  font-size: 13px;
  position: sticky;
  left: 0;
  z-index: 10;
  background: #f5f7fa;
  box-sizing: border-box;
}

/* 目的港层级 */
.tree-column.level-1 {
  background: #f5f7fa;
  font-weight: bold;
}

/* 节点层级 */
.tree-column.level-2 {
  background: #fafafa;
}

/* 供应商层级 */
.tree-column.level-3 {
  background: #fff;
  font-weight: normal;
  color: #606266;
}

/* 表头日期列容器 */
.dates-header {
  display: flex;
  box-sizing: border-box;
}

/* 工具栏图例 */
.header-legend {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 甘特图数据行 - 动态高度 */
.gantt-data-row {
  display: flex;
  min-width: 100%;
  position: relative;
  /* 高度由动态计算决定 */
  min-height: 30px;
  box-sizing: border-box;
}

/* 折叠状态的数据行 */
.gantt-data-row.collapsed {
  min-height: 30px;
}

/* 数据行目的港列 */
.port-column {
  width: 80px;
  min-width: 80px;
  max-width: 80px;
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
  box-sizing: border-box;
}

/* 节点容器 - 垂直排列 */
.nodes-container {
  display: flex;
  flex-direction: column;
  width: 100%;
}

/* 目的港汇总行样式 */
.port-summary-row {
  border-bottom: 1px solid #ebeef5;
}

.port-summary-dates {
  background: #f5f7fa;
}

.summary-placeholder {
  padding: 8px 10px;
  color: #666;
  font-style: italic;
}

/* 5节点行样式 */
.node-group-row {
  border-bottom: 1px solid #e4e7ed;
}

/* 空的目的港列 */
.port-column.empty {
  background: #fafafa;
  border-left: none;
}

/* 日期单元格 - 宽度由内联样式决定 */
.date-cell {
  min-width: 10px;
  border-right: 1px solid #ebeef5;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  font-size: 12px;
  position: relative;
  flex-shrink: 0;
  height: 100%;
  box-sizing: border-box;
}

/* 表头中的日期单元格 */
.gantt-header-row .date-cell {
  height: 60px;
  min-height: 60px;
  box-sizing: border-box;
  border-right: 1px solid #e4e7ed;
  border-bottom: 1px solid #e4e7ed;
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

/* 货柜点容器 - 垂直排列，每10个一列 */
.dots-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  align-content: flex-start;
  padding: 2px;
  gap: 3px;
  max-height: 100px; /* 固定高度限制，10个圆点 * 10px + 9个gap */
}

/* 货柜点 */
.container-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
  border: 2px solid transparent;
}

/* 主任务 - 实线圆点 */
.container-dot.main-task {
  border: 2px solid;
}

/* 虚线任务 - 虚线圆点（计划中） */
.container-dot.dashed-task {
  background: transparent !important;
  border: 2px dashed #c0c4cc;
}

.container-dot.dashed-task:hover {
  border-color: #909399;
  transform: scale(1.5);
}

/* 已完成任务 - 带✓标记 */
.container-dot.completed-task {
  position: relative;
}

.container-dot.completed-task::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 8px;
  color: white;
  font-weight: bold;
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

/* 三级分组样式 */

/* 港口组 */
.port-group {
  border-bottom: 3px solid #e4e7ed;
}

/* 一级：目的港 */
.port-column.level-1 {
  background: #f5f7fa;
  border-left: 4px solid #e4e7ed;
  font-weight: bold;
}

/* 二级：五节点 */
.node-group {
  border-bottom: 1px solid #ebeef5;
}

/* 三级：供应商 */
.supplier-group {
  border-bottom: 1px solid #e4e7ed;
}

.dates-column.level-3-dates {
  margin-left: 240px; /* 80px * 3 */
}

/* 供应商组容器 */
.supplier-groups {
  display: flex;
  flex-direction: column;
  width: 100%;
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

/* 展开状态：箭头向下 */
.collapse-icon.expanded {
  transform: rotate(90deg);
}

/* 分组计数 */
.group-count {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
  flex-shrink: 0;
}

/* 五节点泳道独立区块样式 */
.five-node-section {
  margin-top: 20px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  overflow: hidden;
}

/* 五节点泳道样式 */
.five-node-lanes {
  display: flex;
  flex-direction: column;
}

/* 五节点日期表头 */
.five-node-header-row {
  display: flex;
  background: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  min-height: 40px;
}

.five-node-header-title {
  width: 80px;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #303133;
  border-right: 1px solid #e4e7ed;
  position: sticky;
  left: 0;
  z-index: 10;
  background: #f5f7fa;
}

.five-node-header-dates {
  display: flex;
  /* 宽度由内联样式 getTotalDatesWidth() 设置 */
}

.five-node-header-date {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  border-right: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.five-node-header-date.is-weekend {
  background-color: #f5f7fa;
}

.five-node-header-date.is-today {
  background-color: #ecf5ff;
}

.lane-header {
  display: flex;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  min-width: 100%;
  position: sticky;
  top: 0;
  z-index: 10;
}

.lane-title {
  width: 80px;
  min-width: 80px;
  max-width: 80px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #303133;
  border-right: 1px solid #e4e7ed;
  position: sticky;
  left: 0;
  z-index: 20;
  background: #f5f7fa;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
}

.lane-dates {
  display: flex;
  flex: 1;
  min-width: 0;
}

.lane-date-cell {
  width: 150px;
  min-width: 150px;
  border-right: 1px solid #e4e7ed;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  color: #303133;
  flex-shrink: 0;
}

.lane-date-cell.is-weekend {
  background-color: #fef0f0;
}

.lane-date-cell.is-today {
  background-color: #ecf5ff;
}

.node-lane {
  display: flex;
  flex-direction: row;
  min-width: 100%;
  border-bottom: 1px solid #e4e7ed;
  height: 100px;
}

.node-lane:last-child {
  border-bottom: none;
}

.node-lane.collapsed {
  min-height: auto;
  height: auto;
}

/* 节点折叠后的头部样式 */
.node-header {
  display: flex;
  align-items: center;
  width: 80px;
  min-width: 80px;
  min-height: 40px;
  height: 100px;
  background: #fafafa;
  border-right: 1px solid #e4e7ed;
  border-bottom: 1px solid #e4e7ed;
  flex-shrink: 0;
}

.node-header .collapse-icon {
  margin: 0 4px;
}

.node-title {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #303133;
  font-size: 14px;
}

.node-dates {
  display: flex;
  flex: 1;
  min-width: 0;
  margin-left: 80px; /* 与表头标题宽度对齐 */
  height: 100px;
  /* 宽度由flex: 1自动计算 */
}

.node-date-cell {
  border-right: 1px solid #e4e7ed;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  position: relative;
  flex-shrink: 0;
}

.node-events {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-content: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  padding: 4px;
}

.node-event {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.2s;
}

.node-event:hover {
  transform: scale(1.3);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* 节点事件类型样式 */
.event-customs {
  background-color: #409eff;
}

.event-trucking {
  background-color: #e6a23c;
}

.event-unloading {
  background-color: #67c23a;
}

.event-return {
  background-color: #909399;
}

.event-inspection {
  background-color: #f56c6c;
}

/* 计划 vs 实际 */
.event-planned {
  border: 2px solid #fff;
}

.event-actual {
  border: 2px solid #000;
}

/* 预警状态 */
.node-event.has-warning {
  box-shadow: 0 0 8px rgba(245, 108, 108, 0.6);
  animation: pulse-warning 2s ease-in-out infinite;
}
</style>
