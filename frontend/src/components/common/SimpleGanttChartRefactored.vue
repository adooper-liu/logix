<template>
  <div class="simple-gantt-chart">
    <!-- 顶部信息栏 -->
    <GanttHeader
      :filter-label="filterLabel"
      :container-count="finalFilteredContainers.length"
      :loading="loading"
      :rebuild-snapshot-loading="rebuildSnapshotLoading"
      @export="exportData"
      @back="goBack"
      @refresh="loadData"
      @rebuild-gantt-snapshot="handleRebuildGanttSnapshot"
    >
      <!-- 搜索栏 -->
      <GanttSearchBar @search="handleSearch" @update:searchField="handleSearchFieldChange" />
    </GanttHeader>

    <!-- 统计面板 -->
    <GanttStatisticsPanel :containers="finalFilteredContainers" @filter="handleStatFilter" />

    <!-- 工具栏：视图模式 + 日期范围 + 资源统计 + 图例 -->
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
        <el-switch
          v-model="showResourceStats"
          active-text="资源占用"
          inactive-text=""
          size="small"
          style="margin-left: 16px"
          @change="loadWarehouseOccupancy"
        />
      </div>
      <GanttLegend :status-colors="statusColors" />
    </div>

    <!-- 独立表格主体 -->
    <div v-if="viewMode === 'independent'" class="gantt-body" v-loading="loading">
      <!-- 性能提示：数据量大时显示提示 -->
      <div v-if="finalFilteredContainers.length > 200" class="performance-hint">
        <el-icon><info-filled /></el-icon>
        数据量较大 ({{ finalFilteredContainers.length }} 条)，建议使用筛选功能缩小范围
      </div>
      <div
        class="gantt-body-scroll"
        :class="{ 'scrolling-fast': isScrollingFast }"
        @scroll="handleScroll"
      >
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
              v-for="(date, index) in dateRange"
              :key="date.getTime()"
              class="date-cell"
              :data-date-index="index"
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
                  v-for="(date, index) in dateRange"
                  :key="date.getTime()"
                  class="date-cell"
                  :data-date-index="index"
                  :class="{
                    'is-weekend': isWeekend(date),
                    'is-today': isToday(date),
                  }"
                  :style="{ width: getDateCellWidth(date) }"
                  @dragover.prevent="handleDragOver($event)"
                  @drop="handleDrop(date, '未分类')"
                >
                  <div class="dots-container">
                    <template
                      v-for="container in getContainersByDateAndPort(date, port)"
                      :key="container.containerNumber"
                    >
                      <div
                        v-if="getNodeDisplayType(container, '清关') !== null"
                        class="container-dot"
                        :class="{
                          clickable: true,
                          'is-dragging':
                            draggingContainer?.containerNumber === container.containerNumber,
                          'has-warning': hasAlert(container),
                          'main-task': getNodeDisplayType(container, '清关') === 'main',
                          'dashed-task': getNodeDisplayType(container, '清关') === 'dashed',
                          'completed-task': isNodeFinished(container, '清关'),
                        }"
                        :style="{
                          backgroundColor: getStatusColor(container.logisticsStatus),
                          borderColor: getContainerBorderColor(container),
                        }"
                        draggable="true"
                        @mouseenter="showTooltip(container, $event)"
                        @mouseleave="hideTooltip"
                        @click="handleDotClick(container)"
                        @contextmenu.prevent="openContextMenu(container, $event)"
                        @dragstart="handleDragStart(container, $event)"
                        @dragend="handleDragEnd"
                      ></div>
                    </template>
                  </div>
                </div>
              </template>
              <template v-else>
                <div
                  v-for="(date, index) in dateRange"
                  :key="date.getTime()"
                  class="date-cell"
                  :data-date-index="index"
                  :class="{
                    'is-weekend': isWeekend(date),
                    'is-today': isToday(date),
                  }"
                  :style="{ width: getDateCellWidth(date) }"
                  @dragover.prevent="handleDragOver($event)"
                  @drop="handleDrop(date, '未分类')"
                >
                  <div class="dots-container">
                    <template
                      v-for="container in getUnclassifiedContainersByDateAndPort(date, port)"
                      :key="container.containerNumber"
                    >
                      <div
                        v-if="getNodeDisplayType(container, '清关') !== null"
                        class="container-dot"
                        :class="{
                          clickable: true,
                          'is-dragging':
                            draggingContainer?.containerNumber === container.containerNumber,
                          'has-warning': hasAlert(container),
                          'main-task': getNodeDisplayType(container, '清关') === 'main',
                          'dashed-task': getNodeDisplayType(container, '清关') === 'dashed',
                          'completed-task': isNodeFinished(container, '清关'),
                        }"
                        :style="{
                          backgroundColor: getStatusColor(container.logisticsStatus),
                          borderColor: getContainerBorderColor(container),
                        }"
                        draggable="true"
                        @mouseenter="showTooltip(container, $event)"
                        @mouseleave="hideTooltip"
                        @click="handleDotClick(container)"
                        @contextmenu.prevent="openContextMenu(container, $event)"
                        @dragstart="handleDragStart(container, $event)"
                        @dragend="handleDragEnd"
                      ></div>
                    </template>
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
              class="node-group-container"
            >
              <!-- 节点行：显示在分类列 -->
              <div
                class="gantt-data-row node-group-row"
                @click="toggleGroupCollapse(port + '-' + node)"
                style="cursor: pointer"
              >
                <div
                  class="tree-column level-2"
                  :style="{ height: getNodeRowHeight(suppliersByNode) }"
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
                <div
                  v-if="!isGroupCollapsed(port + '-' + node)"
                  class="dates-column node-dates"
                  :style="{ height: getNodeRowHeight(suppliersByNode) }"
                ></div>
              </div>

              <!-- 三级：供应商行（嵌套在第二级内，展开节点时显示） -->
              <template v-if="!isGroupCollapsed(port + '-' + node)">
                <!-- 已有货柜分配的供应商行 -->
                <div
                  v-for="(containersBySupplier, supplier) in suppliersByNode"
                  :key="port + '-' + node + '-' + supplier"
                  class="gantt-data-row supplier-row"
                >
                  <!-- 供应商行：显示在分类列 -->
                  <div
                    class="tree-column level-3"
                    :style="{
                      height: getSupplierRowHeight(containersBySupplier.length),
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
                    {{ getSupplierDisplayName(node, supplier, containersBySupplier) }}
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
                      v-for="(date, index) in dateRange"
                      :key="date.getTime()"
                      class="date-cell"
                      :data-date-index="index"
                      :class="{
                        'is-weekend': isWeekend(date),
                        'is-today': isToday(date),
                      }"
                      :style="{ width: getDateCellWidth(date) }"
                      @dragover.prevent="handleDragOver($event)"
                      @drop="handleDrop(date, node)"
                    >
                      <div class="dots-container">
                        <template
                          v-for="container in getContainersByDateAndSupplier(
                            date,
                            containersBySupplier,
                            node
                          )"
                          :key="container.containerNumber"
                        >
                          <div
                            v-if="getNodeDisplayType(container, node as string) !== null"
                            class="container-dot"
                            :class="{
                              clickable: true,
                              'is-dragging':
                                draggingContainer?.containerNumber === container.containerNumber,
                              'has-warning': hasAlert(container),
                              'main-task': getNodeDisplayType(container, node as string) === 'main',
                              'dashed-task':
                                getNodeDisplayType(container, node as string) === 'dashed',
                            }"
                            :style="{
                              backgroundColor: getStatusColor(container.logisticsStatus),
                              borderColor: getContainerBorderColor(container),
                            }"
                            @mouseenter="showTooltip(container, $event)"
                            @mouseleave="hideTooltip"
                            @click="handleDotClick(container)"
                            @contextmenu.prevent="openContextMenu(container, $event)"
                            draggable="true"
                            @dragstart="handleDragStart(container, $event)"
                            @dragend="handleDragEnd"
                          ></div>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 可用供应商行：当节点下没有货柜分配但有可用供应商时显示 -->
                <template v-if="Object.keys(suppliersByNode).length === 0">
                  <div
                    v-for="availableSupplier in getAvailableSuppliersForNode(port, node)"
                    :key="port + '-' + node + '-available-' + availableSupplier.supplierCode"
                    class="gantt-data-row supplier-row available-supplier-row"
                  >
                    <!-- 供应商行：显示在分类列 -->
                    <div
                      class="tree-column level-3"
                      :style="{ height: MIN_ROW_HEIGHT + 'px' }"
                      style="cursor: default"
                    >
                      <span class="available-supplier-icon">◇</span>
                      <span class="available-supplier-name">{{
                        availableSupplier.supplierName
                      }}</span>
                      <span class="group-count">({{ availableSupplier.count }})</span>
                    </div>
                    <!-- 空日期列 -->
                    <div
                      class="dates-column level-3-dates"
                      :style="{ height: MIN_ROW_HEIGHT + 'px' }"
                    >
                      <div
                        v-for="(date, index) in dateRange"
                        :key="date.getTime()"
                        class="date-cell empty-cell"
                        :data-date-index="index"
                        :class="{
                          'is-weekend': isWeekend(date),
                          'is-today': isToday(date),
                        }"
                        :style="{ width: getDateCellWidth(date) }"
                      >
                        <div class="dots-container"></div>
                      </div>
                    </div>
                  </div>
                </template>
              </template>
            </div>
          </template>
        </template>
      </div>
    </div>

    <!-- Tooltip -->
    <!-- 增强版 Tooltip：包含完整物流信息 -->
    <div
      v-if="tooltipVisible"
      class="gantt-tooltip"
      :style="{
        left: tooltipPosition.x + 'px',
        top: tooltipPosition.y + 'px',
      }"
    >
      <!-- 标题区：柜号 + 状态颜色指示 -->
      <div class="tooltip-title">
        <span class="tooltip-title-text">{{ tooltipContainer?.containerNumber }}</span>
        <span
          class="tooltip-status-badge"
          :style="{ backgroundColor: getStatusColor(tooltipContainer?.logisticsStatus) }"
        >
          {{ tooltipContainer?.logisticsStatus }}
        </span>
      </div>

      <!-- 基本信息区 -->
      <div class="tooltip-section">
        <div class="tooltip-row">
          <span class="label">备货单：</span>
          <span class="value">{{ tooltipContainer?.orderNumber || '-' }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">目的港：</span>
          <span class="value">{{ tooltipContainer?.destinationPort || '-' }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">船名/航次：</span>
          <span class="value">
            {{ tooltipContainer?.seaFreight?.vesselName || '-' }}/{{
              tooltipContainer?.seaFreight?.voyageNumber || '-'
            }}
          </span>
        </div>
      </div>

      <!-- 到港信息区 -->
      <div class="tooltip-section">
        <div class="tooltip-section-title">到港信息</div>
        <div class="tooltip-row">
          <span class="label">ETA：</span>
          <span class="value" :class="{ 'is-warning': isEtaApproaching(tooltipContainer) }">
            {{ formatDate(tooltipContainer?.etaDestPort) }}
          </span>
        </div>
        <div class="tooltip-row" v-if="tooltipContainer?.ataDestPort">
          <span class="label">ATA：</span>
          <span class="value is-arrived">{{ formatDate(tooltipContainer?.ataDestPort) }}</span>
        </div>
        <div class="tooltip-row" v-if="tooltipContainer?.etaCorrection">
          <span class="label">修正ETA：</span>
          <span class="value is-corrected">{{ formatDate(tooltipContainer?.etaCorrection) }}</span>
        </div>
      </div>

      <!-- 计划日期区 -->
      <div class="tooltip-section">
        <div class="tooltip-section-title">计划日期</div>
        <div class="tooltip-row">
          <span class="label">计划清关：</span>
          <span class="value">{{ formatDate(getPlannedCustomsDate(tooltipContainer)) }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">计划提柜：</span>
          <span class="value">{{ formatDate(getPlannedPickupDate(tooltipContainer)) }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">计划送仓：</span>
          <span class="value">{{ formatDate(getPlannedDeliveryDate(tooltipContainer)) }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">计划卸柜：</span>
          <span class="value">{{ formatDate(getPlannedUnloadDate(tooltipContainer)) }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">计划还箱：</span>
          <span class="value">{{ formatDate(getPlannedReturnDate(tooltipContainer)) }}</span>
        </div>
      </div>

      <!-- 实际日期区 -->
      <div class="tooltip-section" v-if="hasActualDates(tooltipContainer)">
        <div class="tooltip-section-title">实际日期</div>
        <div class="tooltip-row" v-if="tooltipContainer?.portOperations?.[0]?.actualCustomsDate">
          <span class="label">实际清关：</span>
          <span class="value is-arrived">{{
            formatDate(tooltipContainer.portOperations[0].actualCustomsDate)
          }}</span>
        </div>
        <div class="tooltip-row" v-if="getActualPickupDate(tooltipContainer)">
          <span class="label">实际提柜：</span>
          <span class="value is-arrived">{{
            formatDate(getActualPickupDate(tooltipContainer) || undefined)
          }}</span>
        </div>
        <div class="tooltip-row" v-if="getActualDeliveryDate(tooltipContainer)">
          <span class="label">实际送仓：</span>
          <span class="value is-arrived">{{
            formatDate(getActualDeliveryDate(tooltipContainer) || undefined)
          }}</span>
        </div>
        <div class="tooltip-row" v-if="tooltipContainer?.warehouseOperations?.[0]?.unloadDate">
          <span class="label">实际卸柜：</span>
          <span class="value is-arrived">{{
            formatDate(tooltipContainer.warehouseOperations[0].unloadDate)
          }}</span>
        </div>
        <div class="tooltip-row" v-if="tooltipContainer?.emptyReturns?.[0]?.returnTime">
          <span class="label">实际还箱：</span>
          <span class="value is-arrived">{{
            formatDate(tooltipContainer.emptyReturns[0].returnTime)
          }}</span>
        </div>
      </div>

      <!-- 关键日期区 -->
      <div class="tooltip-section critical-section">
        <div class="tooltip-section-title">关键日期</div>
        <div class="tooltip-row">
          <span class="label">最晚提柜：</span>
          <span class="value" :class="getTooltipDateClass(tooltipContainer)">
            {{ formatDate(getLastFreeDate(tooltipContainer)) || '-' }}
          </span>
        </div>
        <div class="tooltip-row">
          <span class="label">最晚还箱：</span>
          <span class="value">{{ formatDate(getLastReturnDate(tooltipContainer)) }}</span>
        </div>
      </div>

      <!-- 供应商信息区 -->
      <div class="tooltip-section">
        <div class="tooltip-section-title">执行方</div>
        <div class="tooltip-row">
          <span class="label">清关行：</span>
          <span class="value">{{ getCustomsBrokerName(tooltipContainer) || '-' }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">拖车公司：</span>
          <span class="value">{{ getTruckingCompanyName(tooltipContainer) || '-' }}</span>
        </div>
        <div class="tooltip-row">
          <span class="label">仓库：</span>
          <span class="value">{{ getWarehouseName(tooltipContainer) || '-' }}</span>
        </div>
      </div>

      <!-- 候选供应商区（基于映射关系） -->
      <div
        v-if="
          tooltipContainer?.availableTruckingCompanies?.length ||
          tooltipContainer?.availableWarehouses?.length
        "
        class="tooltip-section candidate-section"
      >
        <div class="tooltip-section-title">可用供应商（基于映射）</div>
        <!-- 候选车队 -->
        <div v-if="tooltipContainer?.availableTruckingCompanies?.length" class="candidate-group">
          <div class="candidate-label">可用车队：</div>
          <div class="candidate-items">
            <span
              v-for="(truck, idx) in tooltipContainer.availableTruckingCompanies"
              :key="truck.truckingCompanyId"
              class="candidate-tag"
              :class="{
                'is-default': truck.isDefault,
                'is-current':
                  getTruckingCompanyName(tooltipContainer) === truck.truckingCompanyName,
              }"
            >
              {{ truck.truckingCompanyName }}{{ truck.isDefault ? ' ⭐' : '' }}
            </span>
          </div>
        </div>
        <!-- 候选仓库 -->
        <div v-if="tooltipContainer?.availableWarehouses?.length" class="candidate-group">
          <div class="candidate-label">可用仓库：</div>
          <div class="candidate-items">
            <span
              v-for="(wh, idx) in tooltipContainer.availableWarehouses"
              :key="wh.warehouseCode"
              class="candidate-tag"
              :class="{
                'is-default': wh.isDefault,
                'is-current': getWarehouseName(tooltipContainer) === wh.warehouseName,
              }"
            >
              {{ wh.warehouseName }}{{ wh.isDefault ? ' ⭐' : '' }}
            </span>
          </div>
        </div>
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
                v-for="(date, index) in dateRange"
                :key="date.getTime()"
                class="date-cell"
                :data-date-index="index"
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
                v-for="(date, index) in dateRange"
                :key="date.getTime()"
                class="date-cell"
                :data-date-index="index"
                :class="{
                  'is-weekend': isWeekend(date),
                  'is-today': isToday(date),
                }"
                :style="{ width: getDateCellWidth(date) }"
                @dragover.prevent="handleDragOver($event)"
                @drop="handleDrop(date, '未分类')"
              >
                <div class="dots-container">
                  <template
                    v-for="container in getContainersByDateAndPort(date, selectedPortForModal)"
                    :key="container.containerNumber"
                  >
                    <div
                      v-if="getNodeDisplayType(container, '清关') !== null"
                      class="container-dot"
                      :class="{
                        clickable: true,
                        'is-dragging':
                          draggingContainer?.containerNumber === container.containerNumber,
                        'has-warning': hasAlert(container),
                        'main-task': getNodeDisplayType(container, '清关') === 'main',
                        'dashed-task': getNodeDisplayType(container, '清关') === 'dashed',
                        'completed-task': isNodeFinished(container, '清关'),
                      }"
                      :style="{
                        backgroundColor: getStatusColor(container.logisticsStatus),
                        borderColor: getContainerBorderColor(container),
                      }"
                      draggable="true"
                      @mouseenter="showTooltip(container, $event)"
                      @mouseleave="hideTooltip"
                      @click="handleDotClick(container)"
                      @contextmenu.prevent="openContextMenu(container, $event)"
                      @dragstart="handleDragStart(container, $event)"
                      @dragend="handleDragEnd"
                    ></div>
                  </template>
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
            class="node-group-container"
          >
            <!-- 节点行：显示在分类列，与独立表格一致 -->
            <div
              class="gantt-data-row node-group-row"
              @click="toggleGroupCollapse(selectedPortForModal + '-' + node)"
              style="cursor: pointer"
            >
              <div class="tree-column level-2" style="padding-left: 20px">
                <el-icon
                  class="collapse-icon"
                  :class="{ expanded: !isGroupCollapsed(selectedPortForModal + '-' + node) }"
                >
                  <arrow-right />
                </el-icon>
                {{ node }}
                <span class="group-count">({{ getTotalContainersInNode(suppliersByNode) }})</span>
              </div>
              <!-- 节点日期列（隐藏，因为供应商行自己显示日期） -->
              <div
                v-if="!isGroupCollapsed(selectedPortForModal + '-' + node)"
                class="dates-column node-dates"
                :style="{ height: getNodeRowHeight(suppliersByNode) }"
              ></div>
            </div>

            <!-- 供应商行（嵌套在节点内，与独立表格一致） -->
            <template v-if="!isGroupCollapsed(selectedPortForModal + '-' + node)">
              <div
                v-for="(containersBySupplier, supplier) in suppliersByNode"
                :key="selectedPortForModal + '-' + node + '-' + supplier"
                class="gantt-data-row supplier-row"
              >
                <div class="tree-column level-3" style="padding-left: 40px">
                  <el-icon
                    class="collapse-icon"
                    :class="{
                      expanded: !isGroupCollapsed(
                        selectedPortForModal + '-' + node + '-' + supplier
                      ),
                    }"
                  >
                    <arrow-right />
                  </el-icon>
                  {{ getSupplierDisplayName(node, supplier, containersBySupplier) }}
                  <span class="group-count">({{ containersBySupplier.length }})</span>
                </div>
                <div
                  v-if="!isGroupCollapsed(selectedPortForModal + '-' + node + '-' + supplier)"
                  class="dates-column level-3-dates"
                  :style="{ height: getSupplierRowHeight(containersBySupplier.length) }"
                >
                  <div
                    v-for="(date, index) in dateRange"
                    :key="date.getTime()"
                    class="date-cell"
                    :data-date-index="index"
                    :class="{
                      'is-weekend': isWeekend(date),
                      'is-today': isToday(date),
                    }"
                    :style="{ width: getDateCellWidth(date) }"
                    @dragover.prevent="handleDragOver($event)"
                    @drop="handleDrop(date, node)"
                  >
                    <div class="dots-container">
                      <template
                        v-for="container in getContainersByDateAndSupplier(
                          date,
                          containersBySupplier,
                          node
                        )"
                        :key="container.containerNumber"
                      >
                        <div
                          v-if="getNodeDisplayType(container, node as string) !== null"
                          class="container-dot"
                          :class="{
                            clickable: true,
                            'is-dragging':
                              draggingContainer?.containerNumber === container.containerNumber,
                            'has-warning': hasAlert(container),
                            'main-task': getNodeDisplayType(container, node as string) === 'main',
                            'dashed-task':
                              getNodeDisplayType(container, node as string) === 'dashed',
                            'completed-task': isNodeFinished(container, node as string),
                          }"
                          :style="{
                            backgroundColor: getStatusColor(container.logisticsStatus),
                            borderColor: getContainerBorderColor(container),
                          }"
                          draggable="true"
                          @mouseenter="showTooltip(container, $event)"
                          @mouseleave="hideTooltip"
                          @click="handleDotClick(container)"
                          @contextmenu.prevent="openContextMenu(container, $event)"
                          @dragstart="handleDragStart(container, $event)"
                          @dragend="handleDragEnd"
                        ></div>
                      </template>
                    </div>
                    <!-- 资源占用统计：仅在卸柜节点且开启资源统计时显示 -->
                    <div v-if="showResourceStats && node === '卸柜'" class="resource-stats">
                      <template v-if="supplier && supplier !== '未指定'">
                        <span
                          class="resource-stat-item"
                          :style="{
                            color: getOccupancyStatusColor(
                              getWarehouseOccupancy(date, supplier)?.status || 'normal'
                            ),
                          }"
                        >
                          {{ getWarehouseOccupancy(date, supplier)?.planned_count || 0 }}/{{
                            getWarehouseOccupancy(date, supplier)?.capacity || '-'
                          }}
                          <span
                            v-if="getWarehouseOccupancy(date, supplier)?.remaining !== undefined"
                          >
                            (余{{ getWarehouseOccupancy(date, supplier).remaining }})
                          </span>
                        </span>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </template>
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

    <!-- 拖拽指示：仅高亮鼠标指向的单个单元格 -->
    <div
      v-if="dropIndicatorCellRect"
      class="drop-cell-highlight"
      :style="{
        left: dropIndicatorCellRect.left + 'px',
        top: dropIndicatorCellRect.top + 'px',
        width: dropIndicatorCellRect.width + 'px',
        height: dropIndicatorCellRect.height + 'px',
      }"
    />
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
import { containerService } from '@/services/container'
import { dictService } from '@/services/dict'
import { useAppStore } from '@/store/app'
import type { Container, GanttDerived, GanttDerivedNode, GanttNodeKey } from '@/types/container'
import { ArrowDown, ArrowRight, ArrowUp, Check, InfoFilled, Warning } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
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
const appStore = useAppStore()

// 搜索相关状态
const searchKeyword = ref('')
const searchField = ref<'containerNumber' | 'billOfLading' | 'destinationPort' | 'shipVoyage'>(
  'containerNumber'
)

// 每行显示的货柜数量
const CONTAINERS_PER_ROW = 10

// 静态映射数据结构
interface StaticMappings {
  ports: Array<{
    portCode: string
    portName: string
    country: string
  }>
  truckingByPort: Record<
    string,
    Array<{
      truckingCompanyId: string
      truckingCompanyName: string
      isDefault: boolean
    }>
  >
  warehousesByTrucking: Record<
    string,
    Array<{
      warehouseCode: string
      warehouseName: string
      isDefault: boolean
    }>
  >
}

// 静态映射数据
const staticMappings = ref<StaticMappings | null>(null)

// 加载静态映射数据
const loadStaticMappings = async () => {
  try {
    const res = await containerService.getStaticMappings()
    if (res.success && res.data) {
      staticMappings.value = res.data
      console.log('[甘特图] 静态映射数据加载成功:', {
        ports: res.data.ports.length,
        truckingKeys: Object.keys(res.data.truckingByPort).length,
        warehouseKeys: Object.keys(res.data.warehousesByTrucking).length,
      })
    }
  } catch (e) {
    console.error('[甘特图] 加载静态映射失败:', e)
  }
}

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

// 二级标题行高（仅显示节点名，如清关、提柜等）
const NODE_TITLE_ROW_HEIGHT = 28

// 最小列宽 = 10列 * 10px = 100px
const MIN_COL_WIDTH = DEFAULT_COLS * COL_WIDTH

// 计算每个港口行的固定高度（最多10行）
const getPortRowHeight = (containerCount: number): string => {
  // 始终使用10行高度，超出内容通过增加日期列宽度来适应
  return MIN_ROW_HEIGHT + 'px'
}

// 计算港口总容器数（去重）
const getTotalContainersInPort = (nodesByPort: Record<string, Record<string, any[]>>): number => {
  const containerNumbers = new Set<string>()
  Object.values(nodesByPort).forEach(suppliersByNode => {
    Object.values(suppliersByNode).forEach(containers => {
      containers.forEach((container: any) => {
        if (container.containerNumber) {
          containerNumbers.add(container.containerNumber)
        }
      })
    })
  })
  return containerNumbers.size
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

// 计算节点总容器数（去重）
const getTotalContainersInNode = (suppliersByNode: Record<string, any[]>): number => {
  const containerNumbers = new Set<string>()
  Object.values(suppliersByNode).forEach(containers => {
    containers.forEach((container: any) => {
      if (container.containerNumber) {
        containerNumbers.add(container.containerNumber)
      }
    })
  })
  return containerNumbers.size
}

// 计算节点行高度（二级仅作标题行，显示节点名即可）
const getNodeRowHeight = (_suppliersByNode?: Record<string, any[]>): string => {
  return NODE_TITLE_ROW_HEIGHT + 'px'
}

// 计算供应商行高度
const getSupplierRowHeight = (containerCount: number): string => {
  return `${Math.max(MIN_ROW_HEIGHT, containerCount * ROW_HEIGHT_PER_CONTAINER)}px`
}

// 获取港口下的所有货柜（用于汇总行显示）
const getContainersByPort = (portCode: string): any[] => {
  return finalFilteredContainers.value.filter(c => (c.destinationPort || '未指定') === portCode)
}

/** 获取货柜在指定节点的计划日期（用于圆点落格） */
const getNodePlannedDate = (container: any, nodeName: string): Date | null => {
  const destPortOp = container.portOperations?.find((op: any) => op.portType === 'destination')
  const trucking = container.truckingTransports?.[0]
  const warehouseOp = container.warehouseOperations?.[0]
  const emptyReturn = container.emptyReturns?.[0]

  switch (nodeName) {
    case '清关':
      // 实际清关 > 计划清关 > ATA > ETA修正 > ETA原始
      if (destPortOp?.actualCustomsDate) return new Date(destPortOp.actualCustomsDate)
      if (destPortOp?.plannedCustomsDate) return new Date(destPortOp.plannedCustomsDate)
      if (destPortOp?.ataDestPort) return new Date(destPortOp.ataDestPort)
      if (destPortOp?.etaCorrection) return new Date(destPortOp.etaCorrection)
      if (destPortOp?.etaDestPort) return new Date(destPortOp.etaDestPort)
      if (container.ataDestPort) return new Date(container.ataDestPort)
      if (container.etaCorrection) return new Date(container.etaCorrection)
      if (container.etaDestPort) return new Date(container.etaDestPort)
      return null
    case '提柜':
      // 实际送仓 > 计划送仓 > 实际提柜 > 计划提柜
      if (trucking?.deliveryDate) return new Date(trucking.deliveryDate)
      if (trucking?.plannedDeliveryDate) return new Date(trucking.plannedDeliveryDate)
      if (trucking?.pickupDate) return new Date(trucking.pickupDate)
      if (trucking?.plannedPickupDate) return new Date(trucking.plannedPickupDate)
      // 备选：基于卸柜日（到港后1天）
      if (warehouseOp?.actualUnloadDate) {
        const date = new Date(warehouseOp.actualUnloadDate)
        date.setDate(date.getDate() + 1)
        return date
      }
      if (warehouseOp?.plannedUnloadDate) {
        const date = new Date(warehouseOp.plannedUnloadDate)
        date.setDate(date.getDate() + 1)
        return date
      }
      return null
    case '卸柜':
      // 实际卸柜 > 计划卸柜
      if (warehouseOp?.actualUnloadDate) return new Date(warehouseOp.actualUnloadDate)
      if (warehouseOp?.plannedUnloadDate) return new Date(warehouseOp.plannedUnloadDate)
      if (warehouseOp?.unloadDate) return new Date(warehouseOp.unloadDate)
      return null
    case '还箱':
      // 实际还箱 > 最晚还箱 > 计划还箱
      if (emptyReturn?.returnTime) return new Date(emptyReturn.returnTime)
      if (emptyReturn?.lastReturnDate) return new Date(emptyReturn.lastReturnDate)
      if (emptyReturn?.plannedReturnDate) return new Date(emptyReturn.plannedReturnDate)
      // 备选：最晚提柜日 + 7天
      if (destPortOp?.lastFreeDate) {
        const date = new Date(destPortOp.lastFreeDate)
        date.setDate(date.getDate() + 7)
        return date
      }
      return null
    case '查验':
      // 与清关使用相同日期来源
      if (destPortOp?.actualCustomsDate) return new Date(destPortOp.actualCustomsDate)
      if (destPortOp?.plannedCustomsDate) return new Date(destPortOp.plannedCustomsDate)
      return null
    default:
      return null
  }
}

/**
 * 判断货柜是否有任一节点的计划日期
 */
const hasAnyPlannedDate = (container: any): boolean => {
  const nodeNames = ['清关', '提柜', '卸柜', '还箱']
  for (const nodeName of nodeNames) {
    const plannedDate = getNodePlannedDate(container, nodeName)
    if (plannedDate) return true
  }
  return false
}

/**
 * 判断货柜是否已还箱（应排除）
 * 支持多种判断条件：
 * 1. logisticsStatus === 'returned_empty' | '已还箱' | 'RETURNED_EMPTY'
 * 2. 存在 emptyReturns 且 returnTime 已填写（实际还箱时间）
 */
const isReturnedEmpty = (container: any): boolean => {
  // 方法1：检查 logisticsStatus 字段
  const status = container.logisticsStatus
  if (status === 'returned_empty' || status === '已还箱' || status === 'RETURNED_EMPTY') {
    return true
  }

  // 方法2：检查 emptyReturns 数据（实际还箱时间）
  if (container.emptyReturns?.length > 0) {
    const emptyReturn = container.emptyReturns[0]
    // 如果有实际还箱时间，说明已还箱
    if (emptyReturn.returnTime) {
      return true
    }
  }

  return false
}

/** 根据日期、供应商货柜列表、节点名筛选该日期格应显示的货柜 */
const getContainersByDateAndSupplier = (date: Date, containers: any[], nodeName: string): any[] => {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  const result = containers.filter(container => {
    // 排除已还箱的货柜
    if (isReturnedEmpty(container)) return false

    const plannedDate = getNodePlannedDate(container, nodeName)
    if (!plannedDate || dayjs(plannedDate).format('YYYY-MM-DD') !== dateStr) {
      return false
    }

    // 只要有计划日期就显示（不限制任务类型）
    return true
  })

  return result
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
// 三级供应商字典：清关行、车队、仓库（code -> name）
const customsBrokerMap = ref<Map<string, string>>(new Map())
const truckingCompanyMap = ref<Map<string, string>>(new Map())
const warehouseMap = ref<Map<string, string>>(new Map())

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

// 加载三级供应商字典（用于显示名称而非代码）
const loadSupplierDicts = async () => {
  try {
    const [cbRes, tcRes, whRes] = await Promise.all([
      dictService.getCustomsBrokers(),
      dictService.getTruckingCompanies(),
      dictService.getWarehouses(),
    ])
    if (cbRes.success && cbRes.data) {
      const m = new Map<string, string>()
      cbRes.data.forEach(item => {
        m.set(item.code, item.name)
        if (item.name && item.name !== item.code) m.set(item.name, item.name)
      })
      customsBrokerMap.value = m
    }
    if (tcRes.success && tcRes.data) {
      const m = new Map<string, string>()
      tcRes.data.forEach(item => m.set(item.code, item.name))
      truckingCompanyMap.value = m
    }
    if (whRes.success && whRes.data) {
      const m = new Map<string, string>()
      whRes.data.forEach(item => {
        m.set(item.code, item.name)
        if (item.name && item.name !== item.code) m.set(item.name, item.name)
      })
      warehouseMap.value = m
    }
  } catch (error) {
    console.error('加载供应商字典失败:', error)
  }
}

/** 三级显示名称（按节点类型从字典查名称，查不到则显示原值；优先用后端已解析的 supplierNames） */
const getSupplierDisplayName = (node: string, codeOrName: string, containers?: any[]): string => {
  if (
    !codeOrName ||
    codeOrName === '未指定' ||
    codeOrName === '未指定供应商' ||
    codeOrName === '未指定清关公司'
  )
    return codeOrName
  switch (node) {
    case '清关':
    case '查验': {
      const fromBackend = containers?.[0]?.supplierNames?.customsBrokerName
      if (fromBackend) return fromBackend
      return customsBrokerMap.value.get(codeOrName) ?? codeOrName
    }
    case '提柜':
      return truckingCompanyMap.value.get(codeOrName) ?? codeOrName
    case '卸柜': {
      const fromBackend = containers?.[0]?.supplierNames?.warehouseName
      if (fromBackend) return fromBackend
      return warehouseMap.value.get(codeOrName) ?? codeOrName
    }
    case '还箱': {
      // 优先使用还箱码头名称
      const fromBackend = containers?.[0]?.supplierNames?.returnTerminalName
      if (fromBackend) return fromBackend
      // 回退到使用仓库名称
      const warehouseName = containers?.[0]?.supplierNames?.warehouseName
      if (warehouseName) return warehouseName
      return codeOrName
    }
    default:
      return codeOrName
  }
}

/**
 * 获取节点的可选供应商文本（用于分类列显示）
 * 提柜节点：显示可用车队列表
 * 卸柜节点：显示可用仓库列表
 */
const getAvailableSuppliersText = (node: string, container: any): string => {
  if (!container) return ''

  switch (node) {
    case '提柜': {
      const available = container.availableTruckingCompanies
      if (!available || available.length === 0) return ''
      // 只显示前3个，hover时显示全部
      if (available.length <= 3) {
        return available.map((t: any) => t.truckingCompanyName).join(', ')
      }
      return (
        available
          .slice(0, 3)
          .map((t: any) => t.truckingCompanyName)
          .join(', ') + ` +${available.length - 3}`
      )
    }
    case '卸柜': {
      const available = container.availableWarehouses
      if (!available || available.length === 0) return ''
      if (available.length <= 3) {
        return available.map((w: any) => w.warehouseName).join(', ')
      }
      return (
        available
          .slice(0, 3)
          .map((w: any) => w.warehouseName)
          .join(', ') + ` +${available.length - 3}`
      )
    }
    default:
      return ''
  }
}

/**
 * 获取节点的全部可选供应商文本（hover提示）
 */
const getAvailableSuppliersFullText = (node: string, container: any): string => {
  if (!container) return ''

  switch (node) {
    case '提柜': {
      const available = container.availableTruckingCompanies
      if (!available || available.length === 0) return ''
      return available.map((t: any) => t.truckingCompanyName).join('\n')
    }
    case '卸柜': {
      const available = container.availableWarehouses
      if (!available || available.length === 0) return ''
      return available.map((w: any) => w.warehouseName).join('\n')
    }
    default:
      return ''
  }
}

/**
 * 获取某个港口节点下的所有可用供应商列表
 * 用于在没有货柜分配时，显示可选供应商
 * @param port 港口代码
 * @param node 节点名称（清关/提柜/卸柜/还箱/查验）
 * @returns 可用供应商数组，每个元素包含 supplierCode, supplierName, count(已分配货柜数)
 */
const getAvailableSuppliersForNode = (
  port: string,
  node: string
): Array<{ supplierCode: string; supplierName: string; count: number }> => {
  const nodesByPort = finalGroupedByPort.value[port]
  if (!nodesByPort) return []

  const result: Array<{ supplierCode: string; supplierName: string; count: number }> = []

  // 获取该港口下所有货柜（从所有节点收集，而不是只看当前节点）
  const allContainers: Container[] = []
  Object.values(nodesByPort).forEach(suppliersByNode => {
    Object.values(suppliersByNode).forEach(containers => {
      allContainers.push(...containers)
    })
  })

  // 如果当前港口没有任何货柜，尝试从 finalFilteredContainers 中获取同一港口的货柜
  let containersForSuppliers = allContainers
  if (containersForSuppliers.length === 0) {
    // 从 finalFilteredContainers 中过滤同一目的港的货柜
    containersForSuppliers = finalFilteredContainers.value.filter((c: Container) => {
      const destPort = c.latestPortOperation?.portCode || c.destinationPort
      return destPort === port
    })
  }

  if (containersForSuppliers.length === 0) return []

  // 根据节点类型获取可用供应商
  switch (node) {
    case '清关': {
      // 清关行默认显示"未指定清关公司"
      // 统计已分配到未指定清关行的货柜数量
      let count = 0
      Object.values(nodesByPort['清关'] || {}).forEach((containers: any[]) => {
        if (
          containers.some(
            (c: Container) =>
              !c.portOperations?.find((op: any) => op.portType === 'destination')
                ?.customsBrokerCode ||
              c.portOperations?.find((op: any) => op.portType === 'destination')
                ?.customsBrokerCode === 'UNSPECIFIED'
          )
        ) {
          count += containers.length
        }
      })
      result.push({
        supplierCode: 'UNSPECIFIED',
        supplierName: '未指定清关公司',
        count,
      })
      break
    }
    case '提柜': {
      // 从同一港口的货柜获取可用车队列表（这些已经是根据映射关系过滤过的）
      const firstContainer = containersForSuppliers[0]
      const available = firstContainer?.availableTruckingCompanies || []

      available.forEach((t: any) => {
        // 统计已分配到该供应商的货柜数量
        let count = 0
        Object.values(nodesByPort['提柜'] || {}).forEach((containers: any[]) => {
          if (
            containers.some(
              (c: Container) =>
                c.truckingTransports?.[0]?.truckingCompanyId === t.truckingCompanyId ||
                c.truckingTransports?.[0]?.carrierCompany === t.truckingCompanyId
            )
          ) {
            count += containers.length
          }
        })
        result.push({
          supplierCode: t.truckingCompanyId,
          supplierName: t.truckingCompanyName,
          count,
        })
      })
      break
    }
    case '卸柜': {
      // 从同一港口的货柜获取可用仓库列表（这些已经是根据映射关系过滤过的）
      const firstContainer = containersForSuppliers[0]
      const available = firstContainer?.availableWarehouses || []

      available.forEach((w: any) => {
        // 统计已分配到该供应商的货柜数量
        let count = 0
        Object.values(nodesByPort['卸柜'] || {}).forEach((containers: any[]) => {
          if (
            containers.some(
              (c: Container) =>
                c.warehouseOperations?.[0]?.warehouseId === w.warehouseCode ||
                c.warehouseOperations?.[0]?.actualWarehouse === w.warehouseCode ||
                c.warehouseOperations?.[0]?.plannedWarehouse === w.warehouseCode
            )
          ) {
            count += containers.length
          }
        })
        result.push({
          supplierCode: w.warehouseCode,
          supplierName: w.warehouseName,
          count,
        })
      })
      break
    }
    default:
      break
  }

  return result
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

// 根据日期和港口获取货柜（港口泳道 - 折叠时显示所有 main-task）
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

  // 使用 Map 去重，只保留每个货柜一次
  const containerMap = new Map<string, Container>()
  allContainers.forEach(container => {
    if (!containerMap.has(container.containerNumber)) {
      containerMap.set(container.containerNumber, container)
    }
  })

  // 过滤：排除已还箱、日期匹配
  return Array.from(containerMap.values()).filter(container => {
    // 排除已还箱的货柜
    if (isReturnedEmpty(container)) return false

    const containerDate = getContainerDate(container)
    if (!containerDate) return false
    const containerDateStr = dayjs(containerDate).format('YYYY-MM-DD')
    if (containerDateStr !== dateStr) return false

    // 只要有日期就显示（不限制任务类型）
    return true
  })
}

// 根据日期和港口获取未分类节点的货柜（港口泳道 - 展开时显示无计划日期的货柜）
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

  // 过滤：排除已还箱、没有任何计划日期、日期匹配
  return allContainers.filter(container => {
    // 排除已还箱的货柜
    if (isReturnedEmpty(container)) return false

    // 排除有任何计划日期的货柜（这些应该显示在三级泳道）
    if (hasAnyPlannedDate(container)) return false

    const containerDate = getContainerDate(container)
    if (!containerDate) return false
    const containerDateStr = dayjs(containerDate).format('YYYY-MM-DD')
    if (containerDateStr !== dateStr) return false

    // 只要有日期就显示（不限制任务类型）
    return true
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

// 每列最小宽度（无货柜时的默认宽度）
const MIN_DATE_CELL_WIDTH = 40
// 每个货柜点占用的宽度
const CONTAINER_DOT_WIDTH = 14
// 每行最大货柜数量（超过则换行）
const MAX_CONTAINERS_PER_ROW = 15

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

// 缓存每个日期格子的宽度（根据货柜数量动态调整）
const dateCellWidths = computed(() => {
  const widths: Map<string, string> = new Map()
  for (const date of dateRange.value) {
    const dateStr = dayjs(date).format('YYYY-MM-DD')
    const maxCount = dateContainerCounts.value.get(dateStr) || 0
    const isTodayCell = isToday(date)
    const isWeekendCell = isWeekend(date)

    if (maxCount === 0) {
      // 无货柜时使用最小宽度
      widths.set(dateStr, `${MIN_DATE_CELL_WIDTH}px`)
    } else {
      // 计算所需列数
      const columnsNeeded = Math.ceil(maxCount / MAX_CONTAINERS_PER_ROW)
      // 计算基础宽度：列数 * 每列宽度 + 内边距
      const baseWidth = columnsNeeded * CONTAINER_DOT_WIDTH + 8
      // 今天和周末适当加宽
      const extraPadding = isTodayCell || isWeekendCell ? 10 : 0
      // 取最大值
      const width = Math.max(baseWidth + extraPadding, MIN_DATE_CELL_WIDTH)
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
  dropIndicatorCellRect,
  statusColors,
  alertRules,
  getContainerAlerts,
  hasAlert,
  getAlertLevel,
  getContainerBorderStyle,
  getContainerBorderColor,
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
  getNodeAndSupplier,
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

/** 全表重算 gantt_derived（后端 POST /containers/rebuild-gantt-derived） */
const rebuildSnapshotLoading = ref(false)

async function handleRebuildGanttSnapshot() {
  try {
    await ElMessageBox.confirm(
      '将按「全表」货柜重算并写入 gantt_derived（含 gantt-v2 节点日期）及物流状态；数据量大时可能耗时数分钟。是否继续？',
      '重算甘特快照',
      { type: 'warning', confirmButtonText: '开始', cancelButtonText: '取消' }
    )
  } catch {
    return
  }
  rebuildSnapshotLoading.value = true
  try {
    const res = await containerService.rebuildGanttDerivedSnapshot()
    ElMessage.success(res.message || `已处理 ${res.processed} 条，写库更新 ${res.updatedCount} 条`)
    await loadData()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { message?: string } }; message?: string }
    ElMessage.error(err?.response?.data?.message || err?.message || '重算失败')
  } finally {
    rebuildSnapshotLoading.value = false
  }
}

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

// 辅助方法：获取实际/计划提柜日期（优先显示实际日期）
const getPlannedPickupDate = (container: any) => {
  const trucking = container?.truckingTransports?.[0]
  // 优先显示实际日期
  if (trucking?.pickupDate) return trucking.pickupDate
  if (trucking?.deliveryDate) return trucking.deliveryDate
  // 回退到计划日期
  if (trucking?.plannedDeliveryDate) return trucking.plannedDeliveryDate
  if (trucking?.plannedPickupDate) return trucking.plannedPickupDate
  return null
}

// 辅助方法：获取实际/计划送仓日期
const getPlannedDeliveryDate = (container: any) => {
  const trucking = container?.truckingTransports?.[0]
  if (trucking?.deliveryDate) return trucking.deliveryDate
  if (trucking?.plannedDeliveryDate) return trucking.plannedDeliveryDate
  return null
}

// 辅助方法：获取实际/计划卸柜日期
const getPlannedUnloadDate = (container: any) => {
  const warehouseOp = container?.warehouseOperations?.[0]
  if (warehouseOp?.actualUnloadDate) return warehouseOp.actualUnloadDate
  if (warehouseOp?.unloadDate) return warehouseOp.unloadDate
  if (warehouseOp?.plannedUnloadDate) return warehouseOp.plannedUnloadDate
  return null
}

// 辅助方法：获取实际/计划还箱日期
const getPlannedReturnDate = (container: any) => {
  const emptyReturn = container?.emptyReturns?.[0]
  if (emptyReturn?.returnTime) return emptyReturn.returnTime
  if (emptyReturn?.plannedReturnDate) return emptyReturn.plannedReturnDate
  return null
}

// 辅助方法：获取最晚提柜日期
const getLastFreeDate = (container: any) => {
  return container?.portOperations?.find((op: any) => op.portType === 'destination')?.lastFreeDate
}

// 辅助方法：获取最晚还箱日期
const getLastReturnDate = (container: any) => {
  return container?.emptyReturns?.[0]?.lastReturnDate
}

// 辅助方法：获取计划清关日期
const getPlannedCustomsDate = (container: any) => {
  const destPortOp = container?.portOperations?.find((op: any) => op.portType === 'destination')
  return destPortOp?.plannedCustomsDate
}

// 辅助方法：判断是否有实际日期
const hasActualDates = (container: any): boolean => {
  if (!container) return false
  const hasCustoms = container?.portOperations?.[0]?.actualCustomsDate
  const hasPickup =
    container?.truckingTransports?.[0]?.pickupDate ||
    container?.truckingTransports?.[0]?.deliveryDate
  const hasUnload = container?.warehouseOperations?.[0]?.unloadDate
  const hasReturn = container?.emptyReturns?.[0]?.returnTime
  return !!(hasCustoms || hasPickup || hasUnload || hasReturn)
}

// 辅助方法：获取实际提柜日期
const getActualPickupDate = (container: any): string | null => {
  const trucking = container?.truckingTransports?.[0]
  if (trucking?.pickupDate) return trucking.pickupDate
  if (trucking?.deliveryDate) return trucking.deliveryDate
  return null
}

// 辅助方法：获取实际送仓日期
const getActualDeliveryDate = (container: any): string | null => {
  const trucking = container?.truckingTransports?.[0]
  if (trucking?.deliveryDate) return trucking.deliveryDate
  return null
}

// 辅助方法：获取清关行名称
const getCustomsBrokerName = (container: any) => {
  const destPortOp = container?.portOperations?.find((op: any) => op.portType === 'destination')
  const brokerCode = destPortOp?.customsBrokerCode || destPortOp?.customsBroker
  if (!brokerCode) return null
  return customsBrokerMap.value.get(brokerCode) || brokerCode
}

// 辅助方法：获取拖车公司名称
const getTruckingCompanyName = (container: any) => {
  const trucking = container?.truckingTransports?.[0]
  const companyCode = trucking?.truckingCompanyId || trucking?.carrierCompany
  if (!companyCode) return null
  return truckingCompanyMap.value.get(companyCode) || companyCode
}

// 辅助方法：获取仓库名称
const getWarehouseName = (container: any) => {
  const warehouseOp = container?.warehouseOperations?.[0]
  const warehouseCode =
    warehouseOp?.warehouseId || warehouseOp?.actualWarehouse || warehouseOp?.plannedWarehouse
  if (!warehouseCode) return null
  return warehouseMap.value.get(warehouseCode) || warehouseCode
}

// 辅助方法：判断ETA是否即将到达（3天内）
const isEtaApproaching = (container: any) => {
  if (!container?.etaDestPort) return false
  const daysUntilEta = dayjs(container.etaDestPort).diff(dayjs(), 'day')
  return daysUntilEta >= 0 && daysUntilEta <= 3
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
/**
 * 处理查验节点的显示类型
 */
const getInspectionNodeType = (node: any): 'main' | 'dashed' | null => {
  if (node.status === 'completed') return null
  if (node.status === 'active') return 'main'
  if (node.status === 'pending') return 'dashed'
  return null
}

/**
 * 使用后端 ganttDerived 数据判断节点显示类型
 */
const getNodeTypeFromGanttDerived = (
  container: any,
  nodeName: string
): 'main' | 'dashed' | null => {
  const gd = container.ganttDerived as GanttDerived | null | undefined
  const key = CHINESE_TO_GANTT_KEY[nodeName]

  // 边界检查：ganttDerived 为 null 或 nodes 为空
  if (!gd || !gd.nodes || gd.nodes.length === 0) {
    return null
  }

  const gn = gd.nodes.find(x => x.key === key)
  if (!gn || gn.completed) return null
  if (gn.taskRole === 'main') return 'main'
  if (gn.taskRole === 'dashed') return 'dashed'
  return null
}

/**
 * 使用本地状态判断节点显示类型
 */
const getNodeTypeFromLocalStatus = (node: any): 'main' | 'dashed' | null => {
  if (node.status === 'completed') return null
  if (node.status === 'active') return 'main'
  if (node.status === 'pending') return 'dashed'
  return null
}

/**
 * 判断节点在甘特图中的显示类型（主任务/虚线任务/不显示）
 * @param container 货柜对象
 * @param nodeName 节点名称（清关/提柜/卸柜/还箱/查验）
 * @returns 'main' 实线圆点, 'dashed' 虚线圆点, null 不显示
 */
const getNodeDisplayType = (container: any, nodeName: string): 'main' | 'dashed' | null => {
  const nodeStatus = calculateNodeStatus(container)
  const node = nodeStatus.nodes[nodeName as keyof typeof nodeStatus.nodes]

  // 边界检查：无供应商或供应商未指定
  // 清关和查验节点的默认供应商是 '未指定清关公司'，提柜/卸柜/还箱是 '未指定'
  if (!node?.supplier || node.supplier === '未指定') return null

  // 1. 查验节点特殊处理（后端 gantt-v1 无此节点，仅信本地状态）
  if (nodeName === '查验') {
    return getInspectionNodeType(node)
  }

  // 2. 清关节点：默认显示为实心主任务（无论 pending 还是 active）
  // - 只要有供应商（包括'未指定清关公司'），就显示实心圆点
  // - 只有清关实际完成后才销毁
  if (nodeName === '清关') {
    return node.status === 'completed' ? null : 'main'
  }

  // 3. 卸柜/还箱节点：优先使用本地状态
  // - 避免后端 ganttDerived 错误标记为 completed
  if (nodeName === '卸柜' || nodeName === '还箱') {
    return getNodeTypeFromLocalStatus(node)
  }

  // 3. 提柜节点：优先使用本地状态（支持反向推导）
  // 注意：提柜也可能被后续节点（卸柜/还箱）反推为 completed
  if (nodeName === '提柜') {
    return getNodeTypeFromLocalStatus(node)
  }

  // 3. 其他节点使用后端 ganttDerived（如果存在且有效）
  const ganttType = getNodeTypeFromGanttDerived(container, nodeName)
  if (ganttType !== null) {
    return ganttType
  }

  // 4. 回退到本地状态判断
  return getNodeTypeFromLocalStatus(node)
}

/**
 * 判断节点是否已完成（显示✓标记）
 */
const isNodeFinished = (container: any, nodeName: string): boolean => {
  const key = CHINESE_TO_GANTT_KEY[nodeName]
  const gd = container.ganttDerived as GanttDerived | null | undefined
  if (key && gd?.nodes?.length) {
    return gd.nodes.find(x => x.key === key)?.completed ?? false
  }
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

// ========== 资源占用数据 ==========
// 是否显示资源占用统计
const showResourceStats = ref(false)

// 仓库占用数据：{ '2026-03-15-WH01': { warehouseCode, warehouseName, date, plannedCount, capacity, remaining, status } }
const warehouseOccupancy = ref<Record<string, any>>({})

// 加载仓库占用数据
const loadWarehouseOccupancy = async () => {
  try {
    const startDate = dayjs(displayRange.value[0]).format('YYYY-MM-DD')
    const endDate = dayjs(displayRange.value[1]).format('YYYY-MM-DD')

    const response = await fetch(
      `/api/v1/scheduling/resources/occupancy/warehouse?startDate=${startDate}&endDate=${endDate}`
    )
    const result = await response.json()

    if (result.success && result.data) {
      // 转换为以日期+仓库代码为key的Map
      const occupancyMap: Record<string, any> = {}
      result.data.forEach((item: any) => {
        const key = `${item.date}-${item.warehouse_code}`
        occupancyMap[key] = item
      })
      warehouseOccupancy.value = occupancyMap
    }
  } catch (error) {
    console.error('加载仓库占用数据失败:', error)
  }
}

// 获取指定日期和仓库的占用信息
const getWarehouseOccupancy = (date: Date, warehouseCode: string): any => {
  const dateStr = dayjs(date).format('YYYY-MM-DD')
  const key = `${dateStr}-${warehouseCode}`
  return warehouseOccupancy.value[key]
}

// 获取资源状态颜色
const getOccupancyStatusColor = (status: string): string => {
  switch (status) {
    case 'full':
      return '#f56c6c' // 红色-满
    case 'warning':
      return '#e6a23c' // 橙色-预警
    default:
      return '#67c23a' // 绿色-正常
  }
}

// 最终的过滤容器（结合 URL 筛选和搜索）
const finalFilteredContainers = computed(() => {
  let result = containers.value

  // 调试：查看原始数据
  console.log('[finalFilteredContainers] 原始 containers 数量:', containers.value.length)
  const returnedContainers = containers.value.filter(c => c.logisticsStatus === 'returned_empty')
  console.log('[finalFilteredContainers] 已还箱的货柜数量:', returnedContainers.length)
  if (returnedContainers.length > 0) {
    console.log('[finalFilteredContainers] 第一个已还箱货柜:', returnedContainers[0])
    console.log(
      '[finalFilteredContainers] logisticsStatus 值:',
      returnedContainers[0].logisticsStatus
    )
  }

  // 第一步：排除已还箱的货柜
  result = result.filter(container => !isReturnedEmpty(container))
  console.log('[finalFilteredContainers] 过滤后的数量:', result.length)

  // 调试：查看每个货柜的提柜/卸柜/还箱日期
  console.log('[finalFilteredContainers] 货柜详细信息:')
  result.forEach((c, index) => {
    const trucking: any = c.truckingTransports?.[0] || {}
    const warehouse: any = c.warehouseOperations?.[0] || {}
    const emptyReturn: any = c.emptyReturns?.[0] || {}

    console.log(`[货柜${index + 1}] ${c.containerNumber} (status: ${c.logisticsStatus}):`)
    console.log('  提柜节点:', {
      pickupDate: trucking.pickupDate,
      plannedPickupDate: trucking.plannedPickupDate,
      deliveryDate: trucking.deliveryDate,
      plannedDeliveryDate: trucking.plannedDeliveryDate,
      truckingCompanyId: trucking.truckingCompanyId,
      carrierCompany: trucking.carrierCompany,
    })
    console.log('  卸柜节点:', {
      unloadDate: warehouse.unloadDate,
      plannedUnloadDate: warehouse.plannedUnloadDate,
      warehouseId: warehouse.warehouseId,
      actualWarehouse: warehouse.actualWarehouse,
      plannedWarehouse: warehouse.plannedWarehouse,
    })
    console.log('  还箱节点:', {
      returnTime: emptyReturn.returnTime,
      lastReturnDate: emptyReturn.lastReturnDate,
      plannedReturnDate: emptyReturn.plannedReturnDate,
      returnTerminalCode: emptyReturn.returnTerminalCode,
    })
    console.log('---')
  })

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

/**
 * 基于静态映射的三级分组
 * 结构：port → node → supplier → containers[]
 *
 * 逻辑：
 * 1. 先收集有货柜的目的港
 * 2. 只显示有货柜的港口
 * 3. 静态映射用于构建供应商结构，货柜叠加到对应节点
 */
const staticBasedGroupedByPort = computed(() => {
  const groups: Record<string, Record<string, Record<string, any[]>>> = {}

  // 1. 先收集所有有货柜的目的港
  const portsWithContainers = new Set<string>()
  finalFilteredContainers.value.forEach(container => {
    const portCode = container.destinationPort || '未指定'
    portsWithContainers.add(portCode)
  })

  // 如果没有货柜，不显示任何港口
  if (portsWithContainers.size === 0) {
    return groups
  }

  // 2. 只显示有货柜的港口 - 使用静态映射构建供应商结构
  if (staticMappings.value?.ports) {
    // 获取当前全局国别
    const scopedCountry = appStore.scopedCountryCode

    staticMappings.value.ports.forEach(portInfo => {
      const portCode = portInfo.portCode
      const portName = portInfo.portName
      const portCountry = portInfo.country

      // 只显示有货柜的港口
      if (!portsWithContainers.has(portCode)) {
        return
      }

      // 如果有全局国别筛选，只显示匹配国别的港口
      if (
        scopedCountry &&
        portCountry !== scopedCountry &&
        !(scopedCountry === 'GB' && portCountry === 'UK') &&
        !(scopedCountry === 'UK' && portCountry === 'GB')
      ) {
        return
      }

      // 初始化港口层级
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

      // 获取该港口+国别的车队列表
      const mappingKey = `${portCode}:${portCountry}`
      const truckingList = staticMappings.value.truckingByPort[mappingKey] || []

      // 清关行：默认"未指定清关公司"
      if (!groups[portCode]['清关']['未指定清关公司']) {
        groups[portCode]['清关']['未指定清关公司'] = []
      }

      // 提柜节点：显示车队
      truckingList.forEach(t => {
        if (!groups[portCode]['提柜'][t.truckingCompanyId]) {
          groups[portCode]['提柜'][t.truckingCompanyId] = []
        }
      })

      // 卸柜节点：显示仓库（从车队映射获取）
      const warehouseKeys = new Set<string>()
      truckingList.forEach(t => {
        const whMappingKey = `${t.truckingCompanyId}:${portCountry}`
        const warehouses = staticMappings.value.warehousesByTrucking[whMappingKey] || []
        warehouses.forEach(w => {
          warehouseKeys.add(w.warehouseCode)
        })
      })
      warehouseKeys.forEach(whCode => {
        if (!groups[portCode]['卸柜'][whCode]) {
          groups[portCode]['卸柜'][whCode] = []
        }
      })

      // 还箱/查验节点：默认空
      if (!groups[portCode]['查验']['未指定清关公司']) {
        groups[portCode]['查验']['未指定清关公司'] = []
      }
    })
  }

  // 3. 将货柜叠加到对应的供应商节点
  finalFilteredContainers.value.forEach(container => {
    const portCode = container.destinationPort || '未指定'

    if (!groups[portCode]) {
      // 港口不存在于静态映射中，创建空结构
      groups[portCode] = {
        清关: {},
        提柜: {},
        卸柜: {},
        还箱: {},
        查验: {},
        未分类: {},
      }
    }

    // 确定货柜属于哪个节点和供应商
    const nodeSupplierMap = getNodeAndSupplier(container)

    nodeSupplierMap.forEach(({ node, supplier }) => {
      if (!groups[portCode][node]) {
        groups[portCode][node] = {}
      }
      if (!groups[portCode][node][supplier]) {
        groups[portCode][node][supplier] = []
      }
      groups[portCode][node][supplier].push(container)
    })
  })

  return groups
})

// 最终的分组（基于搜索后的结果）- 三级分组
// 现在基于静态映射构建，确保不依赖货柜数据
const finalGroupedByPort = computed(() => {
  return staticBasedGroupedByPort.value
})

// ========== 性能优化 ==========
/** 滚动节流：避免快速滚动时频繁触发渲染 */
let scrollRAFId = 0
let lastScrollTop = 0
const isScrollingFast = ref(false)

const handleScroll = (event: Event) => {
  const target = event.target as HTMLElement
  const scrollTop = target.scrollTop
  const scrollLeft = target.scrollLeft

  // 判断是否快速滚动
  const delta = Math.abs(scrollTop - lastScrollTop)
  if (delta > 30) {
    isScrollingFast.value = true
    if (scrollRAFId) cancelAnimationFrame(scrollRAFId)
    scrollRAFId = requestAnimationFrame(() => {
      setTimeout(() => {
        isScrollingFast.value = false
      }, 150)
    })
  }
  lastScrollTop = scrollTop

  // 同步表头滚动
  const headerEl = document.querySelector('.gantt-header-row') as HTMLElement
  if (headerEl && headerEl.scrollLeft !== scrollLeft) {
    headerEl.scrollLeft = scrollLeft
  }
}

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
    清关: {
      status: 'pending',
      supplier: '未指定清关公司',
      plannedDate: undefined,
      actualDate: undefined,
    },
    查验: {
      status: 'pending',
      supplier: '未指定清关公司',
      plannedDate: undefined,
      actualDate: undefined,
    },
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
  }

  // 无论供应商是否存在，都设置计划日期（用于反向推导判断）
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

  // 只有供应商存在时，才设置状态
  if (customsSupplier) {
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

  // 3. 判断提柜状态（有实际提柜或计划提柜就应该显示）
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

    // 提柜状态判断：有实际日期 = completed（销毁），有计划日期但前置未完成 = pending，有计划日期且前置完成 = active
    if (pickupTransport.deliveryDate || pickupTransport.pickupDate) {
      nodes.提柜.status = 'completed' // 已送仓或已提柜 = 完成，销毁不显示
    } else if (nodes.提柜.plannedDate) {
      // 检查前置节点（清关）是否完成
      const customsCompleted = destPortOp?.actualCustomsDate
      if (customsCompleted) {
        nodes.提柜.status = 'active' // 前置已完成 + 有计划 = 活跃，显示实心圆点
      } else {
        nodes.提柜.status = 'pending' // 前置未完成 + 有计划 = 待激活，显示空心圆点
      }
    }
  }

  // 4. 判断卸柜状态（需要前置提柜节点完成）
  const unloadOp = container.warehouseOperations?.[0]
  const unloadSupplier =
    unloadOp?.warehouseId || unloadOp?.actualWarehouse || unloadOp?.plannedWarehouse
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

    // 卸柜状态判断：有实际日期 = completed，有计划日期但前置未完成 = pending，有计划日期且前置完成 = active
    if (unloadOp.unloadDate) {
      nodes.卸柜.status = 'completed' // 已卸柜 = 完成，销毁不显示
    } else if (nodes.卸柜.plannedDate) {
      // 检查前置节点（提柜）是否完成
      const pickupCompleted = pickupTransport?.deliveryDate || pickupTransport?.pickupDate
      if (pickupCompleted) {
        nodes.卸柜.status = 'active' // 前置已完成 + 有计划 = 活跃，显示实线圆点
      } else {
        nodes.卸柜.status = 'pending' // 前置未完成 + 有计划 = 待激活，显示虚线圆点
      }
    }
  }

  // 5. 判断还箱状态（需要前置卸柜节点完成）
  const emptyReturn = container.emptyReturns?.[0]
  // 还箱供应商来源：emptyReturn.returnTerminalCode > warehouseId
  const returnSupplier = emptyReturn?.returnTerminalCode || unloadSupplier
  if (returnSupplier) {
    nodes.还箱.supplier = returnSupplier
    // 优先级：returnTime > lastReturnDate > plannedReturnDate
    if (emptyReturn?.returnTime) {
      nodes.还箱.actualDate = new Date(emptyReturn.returnTime)
      nodes.还箱.plannedDate = emptyReturn.lastReturnDate
        ? new Date(emptyReturn.lastReturnDate)
        : undefined
    } else if (emptyReturn?.lastReturnDate) {
      nodes.还箱.plannedDate = new Date(emptyReturn.lastReturnDate)
    } else if (emptyReturn?.plannedReturnDate) {
      nodes.还箱.plannedDate = new Date(emptyReturn.plannedReturnDate)
    }

    // 还箱状态判断：有实际日期 = completed，有计划日期但前置未完成 = pending，有计划日期且前置完成 = active
    if (emptyReturn?.returnTime) {
      nodes.还箱.status = 'completed' // 已还箱 = 完成，销毁不显示
    } else if (nodes.还箱.plannedDate) {
      // 检查前置节点（卸柜）是否完成
      const unloadCompleted = unloadOp?.unloadDate
      if (unloadCompleted) {
        nodes.还箱.status = 'active' // 前置已完成 + 有计划 = 活跃，显示实线圆点
      } else {
        nodes.还箱.status = 'pending' // 前置未完成 + 有计划 = 待激活，显示虚线圆点
      }
    }
  }

  // ========== 反向链式依赖检查 ==========
  // 业务规则：后续节点完成意味着前置节点必然已完成
  // 已提柜 -> 清关完成 | 已卸柜 -> 清关+提柜完成 | 已还箱 -> 清关+提柜+卸柜完成

  // DEBUG: 输出关键数据
  console.log(`[反向链式] 货柜 ${container.containerNumber}:`, {
    actualCustomsDate: destPortOp?.actualCustomsDate,
    deliveryDate: pickupTransport?.deliveryDate,
    pickupDate: pickupTransport?.pickupDate,
    unloadDate: unloadOp?.unloadDate,
    returnTime: emptyReturn?.returnTime,
    customsSupplier, // ← 检查这个值
    customsBrokerCode: destPortOp?.customsBrokerCode, // ← 新增
    customsBroker: destPortOp?.customsBroker, // ← 新增
    pickupSupplier,
    unloadSupplier,
    // ← 新增：检查清关节点的计划日期
    customsPlannedDate: nodes.清关.plannedDate,
    customsActualDate: nodes.清关.actualDate,
    etaDestPort: destPortOp?.etaDestPort,
    ataDestPort: destPortOp?.ataDestPort,
    plannedCustomsDate: destPortOp?.plannedCustomsDate,
  })

  // 1. 已还箱 -> 反推清关、提柜、卸柜全部完成
  if (emptyReturn?.returnTime) {
    console.log('[反向链式] 检测到已还箱，反推前置节点完成')
    // 简化逻辑：不再检查 plannedDate
    if (!destPortOp?.actualCustomsDate) {
      nodes.清关.status = 'completed' // 反推清关已完成
      console.log('  -> 清关节点反推销毁')
    }
    if (!(pickupTransport?.deliveryDate || pickupTransport?.pickupDate)) {
      nodes.提柜.status = 'completed' // 反推提柜已完成
      console.log('  -> 提柜节点反推销毁')
    }
    if (!unloadOp?.unloadDate) {
      nodes.卸柜.status = 'completed' // 反推卸柜已完成
      console.log('  -> 卸柜节点反推销毁')
    }
    // 还箱本身已在上面标记为 completed，无需重复
  }
  // 2. 已卸柜 -> 反推清关、提柜完成
  else if (unloadOp?.unloadDate) {
    console.log('[反向链式] 检测到已卸柜，反推前置节点完成')
    if (!destPortOp?.actualCustomsDate) {
      nodes.清关.status = 'completed' // 反推清关已完成
      console.log('  -> 清关节点反推销毁')
    }
    if (!(pickupTransport?.deliveryDate || pickupTransport?.pickupDate)) {
      nodes.提柜.status = 'completed' // 反推提柜已完成
      console.log('  -> 提柜节点反推销毁')
    }
    // 卸柜本身已在上面标记为 completed，无需重复
  }
  // 3. 已提柜 -> 反推清关完成
  else if (pickupTransport?.deliveryDate || pickupTransport?.pickupDate) {
    console.log('[反向链式] 检测到已提柜，反推清关完成')
    // 简化逻辑：只要已提柜且清关无实际日期，就反推清关完成
    // 不再检查 plannedDate，因为即使没有计划日期，清关也应该被销毁
    if (!destPortOp?.actualCustomsDate) {
      nodes.清关.status = 'completed' // 反推清关已完成
      console.log('  -> 清关节点反推销毁')
    } else {
      console.log('  -> 清关已有实际日期，跳过反推')
    }
    // 提柜本身已在上面标记为 completed，无需重复
  } else {
    console.log('[反向链式] 无后续节点完成，不执行反推')
  }

  // 6. 如果没有找到任何活动节点，但清关有计划日期，则清关为活跃节点
  if (nodes.清关.status === 'pending' && nodes.清关.plannedDate) {
    nodes.清关.status = 'active'
  }

  // DEBUG: 输出最终返回的节点状态
  if (
    ['HMMU6232153', 'HMMU6019657', 'HMMU6855127', 'GAOU6195045', 'KOCU5129260'].includes(
      container.containerNumber
    )
  ) {
    console.log(`[calculateNodeStatus] 货柜 ${container.containerNumber} 最终状态:`, {
      清关: {
        status: nodes.清关.status,
        supplier: nodes.清关.supplier,
        plannedDate: nodes.清关.plannedDate,
      },
      提柜: { status: nodes.提柜.status, supplier: nodes.提柜.supplier },
      卸柜: { status: nodes.卸柜.status, supplier: nodes.卸柜.supplier },
      还箱: { status: nodes.还箱.status, supplier: nodes.还箱.supplier },
    })
    console.log(
      `[calculateNodeStatus] 清关完整信息:`,
      JSON.stringify({
        status: nodes.清关.status,
        supplier: nodes.清关.supplier,
        plannedDate: nodes.清关.plannedDate,
        actualDate: nodes.清关.actualDate,
      })
    )
  }

  return {
    containerNumber: container.containerNumber,
    portCode,
    nodes,
  }
}

/** 中文节点 ↔ 后端 gantt_derived.nodes[].key（查验不在四节点内，单独走 calculateNodeStatus） */
const CHINESE_TO_GANTT_KEY: Record<string, GanttNodeKey | null> = {
  清关: 'customs',
  提柜: 'pickup',
  卸柜: 'unload',
  还箱: 'return',
  查验: null,
}

/** gantt-v2+ 节点上的 plannedDate/actualDate（YYYY-MM-DD）优先，否则回退 calculateNodeStatus */
function mergeGanttNodeDisplayDates(
  gn: GanttDerivedNode,
  fallback: { plannedDate?: Date; actualDate?: Date }
): { plannedDate?: Date; actualDate?: Date } {
  const plannedDate =
    gn.plannedDate != null && gn.plannedDate !== ''
      ? dayjs(gn.plannedDate).toDate()
      : fallback.plannedDate
  const actualDate =
    gn.actualDate != null && gn.actualDate !== ''
      ? dayjs(gn.actualDate).toDate()
      : fallback.actualDate
  return { plannedDate, actualDate }
}

/**
 * 主/虚/销毁仅信 ganttDerived（+ 查验用本地状态）；计划/实际日期优先 gantt_derived JSON（gantt-v2+）
 */
function getDisplayItemsFromGanttDerived(
  container: any,
  gd: GanttDerived,
  nodeStatus: ContainerNodeStatus
): GanttDisplayItem[] {
  const displayItems: GanttDisplayItem[] = []
  const needsInspection = container.inspectionRequired || false
  const nodeOrder: Array<'清关' | '查验' | '提柜' | '卸柜' | '还箱'> = needsInspection
    ? ['清关', '查验', '提柜', '卸柜', '还箱']
    : ['清关', '提柜', '卸柜', '还箱']

  let foundActive = false

  for (const nodeName of nodeOrder) {
    const node = nodeStatus.nodes[nodeName as keyof typeof nodeStatus.nodes]

    if (nodeName === '查验') {
      if (node?.supplier && node.supplier !== '未指定') {
        if (node.status === 'active') {
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
      }
      continue
    }

    const key = CHINESE_TO_GANTT_KEY[nodeName]
    if (!key) continue

    const gn = gd.nodes.find(x => x.key === key)
    if (!gn || gn.completed) continue

    if (!node?.supplier || node.supplier === '未指定') continue

    if (nodeName === '清关') {
      const hasPlannedPickup = container.truckingTransports?.[0]?.plannedPickupDate
      const hasCustomsBroker = node.supplier && node.supplier !== '未指定清关公司'
      if (!hasPlannedPickup && !hasCustomsBroker) {
        continue
      }
    }

    const mergedDates = mergeGanttNodeDisplayDates(gn, {
      plannedDate: node.plannedDate,
      actualDate: node.actualDate,
    })

    if (gn.taskRole === 'main') {
      displayItems.push({
        type: 'main',
        port: nodeStatus.portCode,
        node: nodeName,
        supplier: node.supplier,
        containerNumber: nodeStatus.containerNumber,
        container,
        plannedDate: mergedDates.plannedDate,
        actualDate: mergedDates.actualDate,
        isCurrent: true,
      })
      foundActive = true
    } else if (gn.taskRole === 'dashed' && !foundActive) {
      displayItems.push({
        type: 'dashed',
        port: nodeStatus.portCode,
        node: nodeName,
        supplier: node.supplier,
        containerNumber: nodeStatus.containerNumber,
        container,
        plannedDate: mergedDates.plannedDate,
        actualDate: mergedDates.actualDate,
        isCurrent: false,
      })
    }
  }

  return displayItems
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
 * 有 ganttDerived 时：主/虚/销毁仅信后端 gantt-v1；查验仍用 calculateNodeStatus
 */
const getDisplayItems = (container: any): GanttDisplayItem[] => {
  // 性能优化：缓存 nodeStatus 计算结果，避免重复计算
  const nodeStatus = calculateNodeStatus(container)
  const gd = container.ganttDerived as GanttDerived | null | undefined

  // 修复：总是使用本地状态（包含反向推导）
  // 原因：后端 gantt-v3 已实现反向链式依赖逻辑
  // 但为了兼容旧数据和确保一致性，前端仍然优先使用本地状态
  // 这样可以确保即使后端数据未更新，前端也能正确显示
  const useLocalState = true // 总是使用本地状态，确保反向推导优先生效

  if (!useLocalState && gd && gd.nodes && gd.nodes.length > 0) {
    return getDisplayItemsFromGanttDerived(container, gd, nodeStatus)
  }

  // 回退到本地状态判断（或卸柜/还箱节点强制使用本地状态）
  const displayItems: GanttDisplayItem[] = []
  const needsInspection = container.inspectionRequired || false
  const nodeOrder: Array<'清关' | '查验' | '提柜' | '卸柜' | '还箱'> = needsInspection
    ? ['清关', '查验', '提柜', '卸柜', '还箱']
    : ['清关', '提柜', '卸柜', '还箱']

  let foundActive = false

  nodeOrder.forEach(nodeName => {
    const node = nodeStatus.nodes[nodeName as keyof typeof nodeStatus.nodes]

    if (nodeName === '清关') {
      const hasPlannedPickup = container.truckingTransports?.[0]?.plannedPickupDate
      const hasCustomsBroker =
        node.supplier && node.supplier !== '未指定' && node.supplier !== '未指定清关公司'
      if (!hasPlannedPickup && !hasCustomsBroker) {
        return
      }
    }

    if (node.supplier && node.supplier !== '未指定') {
      if (node.status === 'active') {
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
      } else if (node.status === 'pending') {
        // 修复：移除 !foundActive 条件，让所有 pending 节点都能显示（支持链式依赖）
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

// 生命周期
onMounted(() => {
  loadStaticMappings() // 先加载静态映射数据
  loadData()
  loadPorts()
  loadSupplierDicts()

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

// 监听国别筛选变化，重新加载静态映射
watch(
  () => appStore.scopedCountryCode,
  () => {
    loadStaticMappings()
  }
)
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

/* 性能提示 */
.performance-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #fdf6ec;
  border-bottom: 1px solid #f5e6d3;
  font-size: 12px;
  color: #e6a23c;
}

.performance-hint .el-icon {
  flex-shrink: 0;
}

/* 快速滚动时隐藏 tooltip 优化性能 */
.gantt-body-scroll.scrolling-fast .gantt-tooltip {
  display: none;
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

/* Tooltip 增强版 */
.gantt-tooltip {
  position: fixed;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 0;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 1000;
  min-width: 280px;
  max-width: 340px;
  pointer-events: none;
  overflow: hidden;
}

.tooltip-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-bottom: 1px solid #e4e7ed;
}

.tooltip-title-text {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}

.tooltip-status-badge {
  font-size: 11px;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 500;
}

.tooltip-section {
  padding: 10px 14px;
  border-bottom: 1px solid #f0f0f0;
}

.tooltip-section:last-child {
  border-bottom: none;
}

.tooltip-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
  margin-bottom: 6px;
  letter-spacing: 0.5px;
}

.tooltip-section.critical-section {
  background: #fffbf0;
}

.tooltip-content {
  font-size: 12px;
}

.tooltip-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  align-items: center;
}

.tooltip-row:last-child {
  margin-bottom: 0;
}

.tooltip-row .label {
  color: #909399;
  font-size: 12px;
}

.tooltip-row .value {
  color: #303133;
  font-weight: 500;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  text-align: right;
}

.tooltip-row .value.is-warning {
  color: #e6a23c;
  font-weight: bold;
}

.tooltip-row .value.is-danger {
  color: #f56c6c;
  font-weight: bold;
}

.tooltip-row .value.is-arrived {
  color: #67c23a;
  font-weight: 600;
}

.tooltip-row .value.is-corrected {
  color: #409eff;
  font-style: italic;
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

/* 候选供应商区域 */
.candidate-section {
  background-color: #f5f7fa;
}

.candidate-group {
  margin-bottom: 8px;
}

.candidate-group:last-child {
  margin-bottom: 0;
}

.candidate-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.candidate-items {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.candidate-tag {
  display: inline-block;
  padding: 2px 8px;
  background-color: #e4e7ed;
  border-radius: 4px;
  font-size: 11px;
  color: #606266;
  white-space: nowrap;
}

.candidate-tag.is-default {
  background-color: #e6f7e6;
  color: #67c23a;
  font-weight: 500;
}

.candidate-tag.is-current {
  background-color: #ecf5ff;
  color: #409eff;
  font-weight: 500;
  border: 1px solid #409eff;
}

/* 拖拽时仅高亮鼠标指向的单个单元格 */
.drop-cell-highlight {
  position: fixed;
  background-color: rgba(103, 194, 58, 0.2);
  border: 2px solid #67c23a;
  border-radius: 2px;
  z-index: 9998;
  pointer-events: none;
}

/* 拖拽指示器（日期提示） */
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

/* 5节点行容器：嵌套结构 */
.node-group-container {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #e4e7ed;
}

/* 5节点行样式 */
.node-group-row {
  display: flex;
  width: 100%;
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
  width: 12px;
  height: 12px;
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
  background: transparent; /* 空心圆点，透明背景 */
  border: 2px dashed #67c23a; /* 绿色虚线边框 */
}

/* 虚线任务 + 预警状态 */
.container-dot.dashed-task.has-warning {
  background: rgba(230, 162, 60, 0.3); /* 半透明橙色背景 */
  border: 2px dashed #f56c6c; /* 红色虚线边框 */
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
  font-size: 9px;
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
  flex-direction: column;
  flex: 1;
  min-width: 0;
  margin-left: 180px; /* 与表头分类列宽度对齐 */
  height: auto;
}

/* 供应商行：嵌套在节点容器内 */
.supplier-row {
  display: flex;
  width: 100%;
  box-sizing: border-box;
  border-bottom: 1px solid #e4e7ed;
}

.supplier-row .tree-column.level-3 {
  width: 180px; /* 与表头分类列宽度一致 */
  min-width: 180px;
  max-width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-left: 40px; /* 树形缩进40px */
  padding-top: 4px;
  padding-bottom: 4px;
  box-sizing: border-box;
  gap: 2px;
}

/* 可用供应商行样式（无货柜分配时显示） */
.available-supplier-row {
  background: #fafafa;
}

.available-supplier-row .tree-column.level-3 {
  flex-direction: row;
  align-items: center;
  gap: 6px;
}

.available-supplier-icon {
  color: #67c23a;
  font-size: 12px;
  flex-shrink: 0;
}

.available-supplier-name {
  color: #606266;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100px;
}

/* 空单元格样式 */
.date-cell.empty-cell {
  background: transparent;
}

.date-cell.empty-cell:hover {
  background: rgba(64, 158, 255, 0.05);
}

/* 可用供应商提示信息 */
.available-suppliers-hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: #909399;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: help;
}

.available-suppliers-hint .available-icon {
  color: #67c23a;
  font-size: 8px;
  flex-shrink: 0;
}

.available-suppliers-hint .available-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.available-suppliers-hint:hover {
  color: #409eff;
}

.dates-column.level-3-dates {
  flex: 1;
  min-width: 0;
  display: flex;
  box-sizing: border-box;
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

/* 资源占用统计 */
.resource-stats {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed #e4e7ed;
  font-size: 11px;
}

.resource-stat-item {
  display: block;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
