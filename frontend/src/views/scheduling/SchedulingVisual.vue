<template>
  <div class="scheduling-page" v-loading="loading">
    <!-- ✅ 优化：顶部操作区 - 按注意力路线分组 -->
    <div class="top-action-bar">
      <!-- ① 左侧：核心过滤条件 -->
      <div class="filter-group">
        <div class="filter-item">
          <span class="filter-label">日期范围：</span>
          <DateRangePicker v-model="dateRange" />
        </div>
        <div class="filter-item">
          <span class="filter-label">目的港：</span>
          <el-select
            v-model="selectedPortCode"
            placeholder="所有港口"
            clearable
            filterable
            class="port-select"
            @change="handlePortChange"
          >
            <el-option
              v-for="port in overview.ports"
              :key="port.port_code"
              :label="`${port.port_code} - ${port.port_name} (${port.count})`"
              :value="port.port_code"
            />
          </el-select>
        </div>
      </div>

      <!-- ② 中间：高级设置 -->
      <div class="advanced-group">
        <el-tooltip content="排产时自动在 ETA 基础上顺延的天数" placement="bottom">
          <div class="advanced-setting">
            <span class="filter-label">ETA 顺延：</span>
            <el-input-number
              v-model="etaBufferDays"
              :min="0"
              :max="7"
              :step="1"
              placeholder="0-7 天"
              controls-position="right"
              size="small"
              style="width: 100px"
            />
            <span class="unit-label">天</span>
          </div>
        </el-tooltip>
        <el-button
          type="info"
          size="small"
          @click="showLogicDialog = true"
          title="查看智能排产逻辑"
        >
          <el-icon><InfoFilled /></el-icon>
          逻辑
        </el-button>
      </div>

      <!-- ③ 右侧：操作按钮组 -->
      <div class="action-group">
        <!-- ✅ 新增：批量保存优化按钮 -->
        <el-button
          v-if="optimizedContainers.size > 0"
          type="success"
          :loading="saving"
          @click="handleBatchSaveOptimizations"
          size="default"
          title="批量保存所有优化方案"
        >
          <el-icon><Check /></el-icon>
          批量保存优化 ({{ optimizedContainers.size }})
        </el-button>

        <el-button
          type="primary"
          :loading="scheduling"
          @click="handlePreviewSchedule"
          size="default"
          title="预览排产方案，确认后保存"
        >
          <el-icon><Cpu /></el-icon>
          预览排产
        </el-button>
        <el-button
          type="warning"
          plain
          @click="openDesignatedWarehouseDialog"
          :disabled="overview.pendingCount === 0"
          title="手工指定仓库进行排产"
          size="default"
        >
          <el-icon><Setting /></el-icon>
          手工指定
        </el-button>
        <el-button type="default" @click="goBackToShipments" size="default">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <el-button type="success" plain @click="loadOverview" size="default" title="刷新统计数据">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 紧凑统计栏 -->
    <div class="stat-bar">
      <div class="stat-item">
        <el-icon class="stat-icon pending"><Clock /></el-icon>
        <span class="stat-value">{{ overview.pendingCount }}</span>
        <span class="stat-label">待排产</span>
      </div>
      <div class="stat-item">
        <el-icon class="stat-icon initial"><DocumentAdd /></el-icon>
        <span class="stat-value">{{ overview.initialCount }}</span>
        <span class="stat-label">initial</span>
      </div>
      <div class="stat-item">
        <el-icon class="stat-icon issued"><Edit /></el-icon>
        <span class="stat-value">{{ overview.issuedCount }}</span>
        <span class="stat-label">issued</span>
      </div>
      <div class="stat-item">
        <el-icon class="stat-icon warehouse"><House /></el-icon>
        <span class="stat-value">{{ overview.warehouses?.length || 0 }}</span>
        <span class="stat-label">仓库</span>
      </div>
    </div>

    <!-- ✅ 优化：将执行日志移到下方，与排产结果并列 -->
    <el-row :gutter="12" v-if="logs.length > 0">
      <el-col :span="24">
        <el-card class="log-card">
          <template #header>
            <div class="card-header">
              <span
                ><el-icon><Document /></el-icon> 执行日志</span
              >
              <div class="header-actions">
                <el-tag size="small" :type="logs.length > 0 ? 'success' : 'info'">
                  {{ logs.length }} 条记录
                </el-tag>
                <!-- ✅ 新增：折叠按钮 -->
                <el-button text size="small" @click="isLogCollapsed = !isLogCollapsed">
                  <el-icon><ArrowUp v-if="isLogCollapsed" /><ArrowDown v-else /></el-icon>
                  {{ isLogCollapsed ? '展开' : '收起' }}
                </el-button>
                <el-button text size="small" @click="logs = []">
                  <el-icon><Delete /></el-icon> 清空
                </el-button>
              </div>
            </div>
          </template>

          <!-- ✅ 可折叠内容 -->
          <div v-show="!isLogCollapsed" class="log-container" ref="logContainer">
            <div v-for="(log, index) in logs" :key="index" class="log-item" :class="log.type">
              <el-icon v-if="log.type === 'success'">
                <CircleCheck />
              </el-icon>
              <el-icon v-else-if="log.type === 'error'">
                <CircleClose />
              </el-icon>
              <el-icon v-else-if="log.type === 'info'">
                <InfoFilled />
              </el-icon>
              <span class="log-time">{{ log.time }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
            <div v-if="logs.length === 0" class="log-empty">点击"预览排产"执行排产流程</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 空状态 -->
    <div v-if="!loading && overview.pendingCount === 0" class="empty-state">
      <el-empty description="没有待排产的货柜">
        <el-button type="primary" @click="goBackToShipments">返回货柜管理</el-button>
      </el-empty>
    </div>

    <!-- ✅ 排产结果/预览合并卡片 - 根据 isPreviewMode 切换模式 -->
    <el-card v-if="displayResults.length > 0 || !loading" class="result-card">
      <!-- ① 卡片头部：标题 + 核心操作（第一眼关注） -->
      <template #header>
        <div class="card-header-optimized">
          <div class="header-left">
            <el-icon class="header-icon"><DataLine /></el-icon>
            <span class="header-title">{{ isPreviewMode ? '排产预览' : '排产结果' }}</span>
            <el-tag v-if="displayResults.length > 0" :type="getResultTagType()" size="small">
              {{ displayResults.length }} 个货柜
            </el-tag>
            <el-tag v-if="isPreviewMode" type="warning" size="small" effect="plain">
              ⚠️ 预览模式，未保存
            </el-tag>
          </div>
          <div class="header-right">
            <!-- 预览模式：显示操作按钮组 -->
            <template v-if="isPreviewMode">
              <!-- 选择操作区 -->
              <div v-if="displayResults.length > 0" class="selection-actions-inline">
                <el-tag
                  v-if="selectedPreviewContainers.length > 0"
                  type="warning"
                  size="small"
                  effect="plain"
                >
                  已选 {{ selectedPreviewContainers.length }} 个
                </el-tag>
                <el-button
                  type="primary"
                  size="small"
                  plain
                  @click="selectAllOnPage"
                  :disabled="displayResults.every((r: any) => r.success === false)"
                >
                  全选成功项
                </el-button>
                <el-button
                  type="default"
                  size="small"
                  plain
                  @click="clearSelection"
                  :disabled="selectedPreviewContainers.length === 0"
                >
                  取消全选
                </el-button>
              </div>

              <!-- 确认操作区 -->
              <el-button
                type="success"
                size="small"
                @click="handleConfirmSave"
                :disabled="selectedPreviewContainers.length === 0"
                :loading="saving"
                title="保存选中的排产方案"
              >
                <el-icon><Check /></el-icon> 确认保存 ({{ selectedPreviewContainers.length }})
              </el-button>
              <el-button
                type="info"
                size="small"
                plain
                @click="handleDiscardPreview"
                title="放弃预览结果"
              >
                <el-icon><Close /></el-icon> 放弃
              </el-button>
            </template>

            <!-- 正式模式：显示导出和甘特图 -->
            <template v-else>
              <el-button
                type="primary"
                size="small"
                @click="exportScheduleResult"
                :disabled="!scheduleResult"
              >
                <el-icon><Download /></el-icon> 导出
              </el-button>
              <el-button
                type="success"
                size="small"
                plain
                @click="router.push('/gantt-chart')"
                :disabled="!scheduleResult"
              >
                <el-icon><View /></el-icon> 甘特图
              </el-button>
            </template>
          </div>
        </div>
      </template>

      <!-- 有数据时显示统计徽章和 TAB -->
      <template v-if="displayResults.length > 0">
        <!-- ② 统计徽章区：4 个关键指标（视觉焦点） -->
        <div class="result-stats-enhanced">
          <div class="stat-badge total">
            <div class="stat-badge-icon">
              <el-icon><Box /></el-icon>
            </div>
            <div class="stat-badge-content">
              <div class="stat-value">{{ displayResults.length }}</div>
              <div class="stat-label">总柜数</div>
            </div>
          </div>

          <div class="stat-badge success">
            <div class="stat-badge-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-badge-content">
              <div class="stat-value">{{ successCount }}</div>
              <div class="stat-label">成功</div>
            </div>
          </div>

          <div class="stat-badge failed">
            <div class="stat-badge-icon">
              <el-icon><CircleClose /></el-icon>
            </div>
            <div class="stat-badge-content">
              <div class="stat-value">{{ failedCount }}</div>
              <div class="stat-label">失败</div>
            </div>
          </div>

          <div class="stat-badge rate">
            <div class="stat-badge-content">
              <div class="stat-value">
                {{
                  displayResults.length > 0
                    ? ((successCount / displayResults.length) * 100).toFixed(1)
                    : 0
                }}%
              </div>
              <div class="stat-label">成功率</div>
            </div>
          </div>
        </div>

        <!-- ③ TAB 过滤区：带计数的标签页（快速筛选） -->
        <div class="tabs-filter-section">
          <el-tabs v-model="resultTab" class="result-tabs" type="border-card">
            <el-tab-pane :label="`全部 ${displayResults.length}`" name="all">
              <div class="tab-toolbar">
                <span class="tab-desc"
                  ><el-icon><Document /></el-icon>
                  {{ isPreviewMode ? '所有预览结果' : '所有排产结果' }}</span
                >
                <!-- ✅ 增强：高级搜索区 -->
                <div class="advanced-search">
                  <el-input
                    v-model="searchText"
                    placeholder="搜索柜号/目的港/仓库..."
                    prefix-icon="Search"
                    size="small"
                    clearable
                    style="width: 220px"
                  />
                  <el-select
                    v-model="searchUnloadMode"
                    placeholder="卸柜方式"
                    clearable
                    size="small"
                    style="width: 130px; margin-left: 8px"
                  >
                    <el-option label="Live Unload" value="Direct" />
                    <el-option label="Drop off" value="Drop off" />
                    <el-option label="Expedited" value="Expedited" />
                  </el-select>
                  <el-input-number
                    v-model="searchMaxCost"
                    placeholder="最大费用"
                    :min="0"
                    :precision="2"
                    size="small"
                    controls-position="right"
                    style="width: 140px; margin-left: 8px"
                  />
                </div>
              </div>
              <!-- ✅ P2: 性能优化 - 使用虚拟滚动表格 -->
              <el-table
                :data="paginatedData"
                max-height="400"
                size="small"
                stripe
                highlight-current-row
                ref="resultTableRef"
                @selection-change="handlePreviewSelectionChange"
              >
                <!-- ✅ 新增：预览模式下显示勾选框 -->
                <el-table-column
                  v-if="isPreviewMode"
                  type="selection"
                  width="50"
                  fixed
                  :selectable="(row: any) => row.success"
                />
                <el-table-column label="柜号" width="130" fixed>
                  <template #default="{ row }">
                    <el-link
                      type="primary"
                      @click="router.push(`/shipments/${row.containerNumber}`)"
                    >
                      {{ row.containerNumber }}
                    </el-link>
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="70">
                  <template #default="{ row }">
                    <el-tag :type="row.success ? 'success' : 'danger'" size="small">
                      {{ row.success ? '成功' : '失败' }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="destinationPort" label="目的港" width="90" />
                <el-table-column
                  prop="warehouseName"
                  label="仓库"
                  width="120"
                  show-overflow-tooltip
                />
                <el-table-column prop="etaDestPort" label="ETA" width="100" />
                <el-table-column prop="ataDestPort" label="ATA" width="100" />
                <!-- ✅ 优化：免费期信息 - 显示最晚提柜日、最晚还箱日两列 -->
                <el-table-column label="最晚提柜日 (LFD)" width="140">
                  <template #default="{ row }">
                    <el-tooltip>
                      <template #content>
                        <div>
                          免费天数：{{
                            row.pickupFreeDays !== undefined ? row.pickupFreeDays : '-'
                          }}
                        </div>
                        <div>计算逻辑：从卸柜日开始计算免费期</div>
                      </template>
                      <div
                        v-if="row.lastFreeDate"
                        style="display: flex; flex-direction: column; gap: 4px"
                      >
                        <span>{{ row.lastFreeDate }}</span>
                        <el-tag :type="getLfdTagStatus(row)" size="small">
                          {{ getLfdCountdown(row) }}
                        </el-tag>
                      </div>
                      <span v-else>-</span>
                    </el-tooltip>
                  </template>
                </el-table-column>
                <el-table-column label="最晚还箱日 (LRD)" width="140">
                  <template #default="{ row }">
                    <el-tooltip>
                      <template #content>
                        <div>
                          免费天数：{{
                            row.returnFreeDays !== undefined ? row.returnFreeDays : '-'
                          }}
                        </div>
                        <div>计算逻辑：从提柜日开始计算免费期</div>
                      </template>
                      <div
                        v-if="row.lastReturnDate"
                        style="display: flex; flex-direction: column; gap: 4px"
                      >
                        <span>{{ row.lastReturnDate }}</span>
                        <el-tag :type="getLrdTagStatus(row)" size="small">
                          {{ getLrdCountdown(row) }}
                        </el-tag>
                      </div>
                      <span v-else>-</span>
                    </el-tooltip>
                  </template>
                </el-table-column>
                <el-table-column label="计划日期" min-width="200">
                  <template #default="{ row }">
                    <div v-if="row.plannedData" class="plan-dates-container">
                      <div class="plan-date-item">
                        <el-icon><Clock /></el-icon>
                        <span class="date-label">提柜:</span>
                        <span class="date-value">{{
                          row.plannedData.plannedPickupDate || '-'
                        }}</span>
                        <span
                          v-if="row.plannedData.plannedPickupDate"
                          :class="[
                            'date-status',
                            getDateStatusClass(row.plannedData.plannedPickupDate),
                          ]"
                        >
                          {{ getDateStatusText(row.plannedData.plannedPickupDate) }}
                        </span>
                      </div>
                      <div class="plan-date-item">
                        <el-icon><Van /></el-icon>
                        <span class="date-label">送仓:</span>
                        <span class="date-value">{{
                          row.plannedData.plannedDeliveryDate || '-'
                        }}</span>
                        <span
                          v-if="row.plannedData.plannedDeliveryDate"
                          :class="[
                            'date-status',
                            getDateStatusClass(row.plannedData.plannedDeliveryDate),
                          ]"
                        >
                          {{ getDateStatusText(row.plannedData.plannedDeliveryDate) }}
                        </span>
                      </div>
                      <div class="plan-date-item">
                        <el-icon><Box /></el-icon>
                        <span class="date-label">卸柜:</span>
                        <span class="date-value">{{
                          row.plannedData.plannedUnloadDate || '-'
                        }}</span>
                        <span
                          v-if="row.plannedData.plannedUnloadDate"
                          :class="[
                            'date-status',
                            getDateStatusClass(row.plannedData.plannedUnloadDate),
                          ]"
                        >
                          {{ getDateStatusText(row.plannedData.plannedUnloadDate) }}
                        </span>
                      </div>
                      <div class="plan-date-item">
                        <el-icon><OfficeBuilding /></el-icon>
                        <span class="date-label">还箱:</span>
                        <span class="date-value">{{
                          row.plannedData.plannedReturnDate || '-'
                        }}</span>
                        <span
                          v-if="row.plannedData.plannedReturnDate"
                          :class="[
                            'date-status',
                            getDateStatusClass(row.plannedData.plannedReturnDate),
                          ]"
                        >
                          {{ getDateStatusText(row.plannedData.plannedReturnDate) }}
                        </span>
                      </div>
                    </div>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <!-- ✅ 新增：资源占用状态 -->
                <el-table-column label="资源状态" width="120">
                  <template #default="{ row }">
                    <div v-if="row.plannedData" class="resource-status">
                      <!-- 仓库档期状态 -->
                      <el-tooltip placement="top">
                        <template #content>
                          <div>仓库：{{ row.plannedData.warehouseName || '-' }}</div>
                          <div>卸柜日期：{{ row.plannedData.plannedUnloadDate || '-' }}</div>
                          <div>占用率：{{ getWarehouseOccupancyRate(row) }}%</div>
                        </template>
                        <el-tag
                          size="small"
                          :type="getWarehouseCapacityType(row)"
                          effect="plain"
                          style="margin-bottom: 4px"
                        >
                          🏭 {{ getWarehouseCapacityLabel(row) }}
                        </el-tag>
                      </el-tooltip>

                      <!-- 车队档期状态 -->
                      <el-tooltip placement="top">
                        <template #content>
                          <div>车队：{{ row.plannedData.truckingCompany || '-' }}</div>
                          <div>提柜日期：{{ row.plannedData.plannedPickupDate || '-' }}</div>
                          <div>占用率：{{ getTruckingOccupancyRate(row) }}%</div>
                        </template>
                        <el-tag size="small" :type="getTruckingCapacityType(row)" effect="plain">
                          🚛 {{ getTruckingCapacityLabel(row) }}
                        </el-tag>
                      </el-tooltip>
                    </div>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <!-- ✅ 优化：费用信息 - 树形结构展示 -->
                <el-table-column label="费用明细" min-width="210">
                  <template #default="{ row }">
                    <el-tree
                      v-if="row.estimatedCosts && row.estimatedCosts.totalCost"
                      :data="
                        buildCostTree(row.estimatedCosts, row.plannedData?.warehouseCountry || 'US')
                      "
                      :props="costTreeProps"
                      :expand-on-click-node="false"
                      default-expand-all
                      size="small"
                      class="cost-tree"
                    >
                      <template #default="{ node, data }">
                        <span class="cost-tree-node">
                          <span class="cost-tree-label" v-if="data.level === 1">{{
                            node.label
                          }}</span>
                          <span
                            class="cost-tree-value"
                            :class="
                              data.level === 0 ? 'cost-value-total' : getAmountClass(data.value)
                            "
                          >
                            {{
                              formatCurrency(data.value, row.plannedData?.warehouseCountry || 'US')
                            }}
                          </span>
                        </span>
                      </template>
                    </el-tree>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <!-- ✅ 新增：操作列 - 成本优化快捷入口 -->
                <el-table-column label="操作" width="120" fixed v-if="displayResults.length > 0">
                  <template #default="{ row }">
                    <el-button
                      v-if="row.success && row.plannedData"
                      type="primary"
                      size="small"
                      @click="handleOptimizeContainer(row)"
                      title="成本优化"
                    >
                      <el-icon><Money /></el-icon> 优化
                    </el-button>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <el-table-column prop="message" label="消息" show-overflow-tooltip />
              </el-table>
              <!-- ✅ P2: 分页组件 -->
              <div
                class="pagination-container"
                style="display: flex; justify-content: flex-end; margin-top: 16px"
              >
                <el-pagination
                  v-model:current-page="currentPage"
                  :page-size="pageSize"
                  :total="filteredDisplayResults.length"
                  :page-sizes="[20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </el-tab-pane>

            <el-tab-pane :label="`成功 ${successCount}`" name="success">
              <div class="tab-toolbar">
                <span class="tab-desc success"
                  ><el-icon><CircleCheck /></el-icon> ✓
                  {{ isPreviewMode ? '预览成功' : '排产成功' }}的货柜</span
                >
                <el-input
                  v-if="resultTab === 'success'"
                  v-model="searchText"
                  placeholder="搜索成功柜号..."
                  prefix-icon="Search"
                  size="small"
                  clearable
                  style="width: 200px"
                />
              </div>
              <el-table
                :data="successPaginatedData"
                max-height="400"
                size="small"
                stripe
                highlight-current-row
              >
                <el-table-column v-if="isPreviewMode" type="selection" width="50" fixed />
                <el-table-column label="柜号" width="150" fixed>
                  <template #default="{ row }">
                    <el-link
                      type="primary"
                      @click="router.push(`/shipments/${row.containerNumber}`)"
                    >
                      {{ row.containerNumber }}
                    </el-link>
                  </template>
                </el-table-column>
                <el-table-column prop="destinationPort" label="目的港" width="90" />
                <el-table-column
                  prop="warehouseName"
                  label="仓库"
                  width="120"
                  show-overflow-tooltip
                />
                <el-table-column label="计划日期" min-width="280">
                  <template #default="{ row }">
                    <div v-if="row.plannedData" class="plan-dates-container">
                      <div class="plan-date-item">
                        <el-icon><Clock /></el-icon>
                        <span class="date-label">提柜:</span>
                        <span class="date-value">{{
                          row.plannedData.plannedPickupDate || '-'
                        }}</span>
                      </div>
                      <div class="plan-date-item">
                        <el-icon><Van /></el-icon>
                        <span class="date-label">送仓:</span>
                        <span class="date-value">{{
                          row.plannedData.plannedDeliveryDate || '-'
                        }}</span>
                      </div>
                      <div class="plan-date-item">
                        <el-icon><Box /></el-icon>
                        <span class="date-label">卸柜:</span>
                        <span class="date-value">{{
                          row.plannedData.plannedUnloadDate || '-'
                        }}</span>
                      </div>
                      <div class="plan-date-item">
                        <el-icon><OfficeBuilding /></el-icon>
                        <span class="date-label">还箱:</span>
                        <span class="date-value">{{
                          row.plannedData.plannedReturnDate || '-'
                        }}</span>
                      </div>
                    </div>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
              </el-table>
              <!-- ✅ P2: 分页组件 -->
              <div
                class="pagination-container"
                style="display: flex; justify-content: flex-end; margin-top: 16px"
              >
                <el-pagination
                  v-model:current-page="currentPage"
                  :page-size="pageSize"
                  :total="successFilteredResults.length"
                  :page-sizes="[20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </el-tab-pane>

            <el-tab-pane :label="`失败 ${failedCount}`" name="failed">
              <div class="tab-toolbar">
                <span class="tab-desc danger"
                  ><el-icon><CircleClose /></el-icon> ✗
                  {{ isPreviewMode ? '预览失败' : '排产失败' }}的货柜</span
                >
                <el-input
                  v-if="resultTab === 'failed'"
                  v-model="searchText"
                  placeholder="搜索失败原因..."
                  prefix-icon="Search"
                  size="small"
                  clearable
                  style="width: 200px"
                />
              </div>
              <el-table
                :data="failedPaginatedData"
                max-height="400"
                size="small"
                stripe
                highlight-current-row
              >
                <el-table-column label="柜号" width="150" fixed>
                  <template #default="{ row }">
                    <el-link
                      type="primary"
                      @click="router.push(`/shipments/${row.containerNumber}`)"
                    >
                      {{ row.containerNumber }}
                    </el-link>
                  </template>
                </el-table-column>
                <el-table-column prop="destinationPort" label="目的港" width="90" />
                <el-table-column prop="etaDestPort" label="ETA" width="100" />
                <el-table-column prop="message" label="失败原因" show-overflow-tooltip />
              </el-table>
              <!-- ✅ P2: 分页组件 -->
              <div
                class="pagination-container"
                style="display: flex; justify-content: flex-end; margin-top: 16px"
              >
                <el-pagination
                  v-model:current-page="currentPage"
                  :page-size="pageSize"
                  :total="failedFilteredResults.length"
                  :page-sizes="[20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  @size-change="handleSizeChange"
                  @current-change="handleCurrentChange"
                />
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </template>

      <!-- 无数据时显示提示 -->
      <template v-else>
        <el-empty
          :description="
            isPreviewMode
              ? '暂无预览结果，请点击“预览排产”计算方案'
              : '暂无排产结果，请点击“预览排产”执行排产流程'
          "
        />
      </template>
    </el-card>

    <!-- ✅ 新增：成本优化面板（移到底部） -->
    <el-row :gutter="12" style="margin-top: 20px; margin-bottom: 20px">
      <el-col :span="24">
        <CostOptimizationPanel
          :selected-containers="selectedPreviewContainers"
          @applied="handleOptimizationApplied"
        />
      </el-col>
    </el-row>

    <!-- ✅ 已移除：预览确认弹窗 - 改为直接在页面显示 -->
    <!-- <SchedulingPreviewModal
      v-model="showPreviewModal"
      :preview-results="previewResults"
      @confirm="handleConfirmSchedule"
      @cancel="showPreviewModal = false"
      @view-container="cn => router.push(`/shipments/${cn}`)
    /> -->

    <!-- 手工指定仓库对话框 -->
    <DesignatedWarehouseDialog
      v-model:visible="showDesignatedWarehouseDialog"
      :container-numbers="[]"
      :port-code="currentPortCode"
      :country-code="resolvedCountry"
      @confirm="handleDesignatedWarehouseConfirm"
    />

    <!-- ✅ 成本优化结果卡片弹窗 -->
    <el-dialog
      v-model="showOptimizationDialog"
      :title="`💰 货柜 ${currentOptimizationContainer} 优化完成`"
      width="1200px"
      :close-on-click-modal="false"
    >
      <OptimizationResultCard
        v-if="optimizationReport"
        :report="optimizationReport"
        :container-number="currentOptimizationContainer"
        :loading="false"
        :show-actions="true"
        @accept="handleAcceptOptimization"
        @reject="handleRejectOptimization"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import CostOptimizationPanel from '@/components/CostOptimizationPanel.vue'
import { useSchedulingFlow } from '@/composables/useSchedulingFlow'
import api from '@/services/api'
import { containerService } from '@/services/container'
import { useAppStore } from '@/store/app'
import {
  ArrowLeft,
  Box,
  Check,
  CircleCheck,
  CircleClose,
  Clock,
  Close,
  Cpu,
  DocumentAdd,
  Download,
  Edit,
  House,
  InfoFilled,
  Money,
  OfficeBuilding,
  Setting,
  Van,
  View,
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DesignatedWarehouseDialog from './components/DesignatedWarehouseDialog.vue'
import OptimizationResultCard from './components/OptimizationResultCard.vue'

console.log('[SchedulingVisual] 组件开始加载')

// Props
const props = defineProps<{
  country?: string
  initialDateRange?: [Date, Date]
  containers?: string
}>()

// Events
const emit = defineEmits<{
  (e: 'complete', result: any): void
  (e: 'error', error: any): void
}>()

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()

console.log('[SchedulingVisual] route:', route)
console.log('[SchedulingVisual] query:', route.query)

// ✅ 新增：预览模式相关状态
const isPreviewMode = ref(false) // 是否为预览模式
const previewResults = ref<any[]>([]) // 预览结果
const selectedPreviewContainers = ref<string[]>([]) // 用户选中的柜号
const resultTableRef = ref() // 表格引用，用于全选操作
const saving = ref(false) // 保存中状态

// ✅ 新增：成本优化卡片对话框状态
const showOptimizationDialog = ref(false)
const currentOptimizationContainer = ref('') // 当前优化的柜号
const optimizationReport = ref<any>(null) // 单个柜优化报告

// ✅ 增强：高级搜索相关状态
const searchUnloadMode = ref<string>('') // 卸柜方式过滤
const searchMaxCost = ref<number | undefined>() // 最大费用过滤

// ✅ 新增：统一数据展示源（优先使用预览结果，否则使用正式结果）
const displayResults = computed(() => {
  const isPreview = isPreviewMode.value
  const previewLen = previewResults.value.length
  const scheduleResults = scheduleResult.value?.results || []

  if (isPreview && previewLen > 0) {
    return previewResults.value
  }
  return scheduleResults as any[]
})

// ✅ 新增：搜索文本（必须在 watch 之前定义）
const searchText = ref('')

// ✅ 新增：结果 TAB（必须在 watch 之前定义）
const resultTab = ref('all')

// ✅ 新增：成功和失败的统计（基于 displayResults）
const successCount = computed(() => {
  return displayResults.value.filter((r: any) => r.success).length
})

const failedCount = computed(() => {
  return displayResults.value.filter((r: any) => !r.success).length
})

// ✅ 新增：过滤后的结果（支持搜索）
const filteredDisplayResults = computed(() => {
  const results = displayResults.value

  if (!searchText.value) return results

  const searchLower = searchText.value.toLowerCase()
  return results.filter(
    (r: any) =>
      r.containerNumber?.toLowerCase().includes(searchLower) ||
      r.destinationPort?.toLowerCase().includes(searchLower) ||
      r.warehouseName?.toLowerCase().includes(searchLower)
  )
})

// ✅ P2: 分页 - 当前页码和每页大小
const currentPage = ref(1)
const pageSize = ref(50)

// ✅ P2: 分页 - 计算总页数
const totalPages = computed(() => {
  const filtered = filteredDisplayResults.value
  return Math.ceil(filtered.length / pageSize.value)
})

// ✅ P2: 分页 - 成功结果的当前页数据
const successPaginatedData = computed(() => {
  const filtered = successFilteredResults.value
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filtered.slice(start, end)
})

// ✅ P2: 分页 - 失败结果的当前页数据
const failedPaginatedData = computed(() => {
  const filtered = failedFilteredResults.value
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filtered.slice(start, end)
})

// ✅ P2: 分页 - 当前页数据（虚拟滚动优化）
const paginatedData = computed(() => {
  const filtered = filteredDisplayResults.value
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filtered.slice(start, end)
})

// ✅ P2: 分页 - 页码改变时重置到第一页
watch([searchText, resultTab], () => {
  currentPage.value = 1
})

// ✅ P2: 分页处理函数
const handleSizeChange = (val: number) => {
  pageSize.value = val
  currentPage.value = 1 // 重置到第一页
}

const handleCurrentChange = (val: number) => {
  currentPage.value = val
  // 滚动到表格顶部
  nextTick(() => {
    const tableContainer = document.querySelector('.el-table__body-wrapper')
    if (tableContainer) {
      tableContainer.scrollTop = 0
    }
  })
}

// ✅ 费用树形结构配置
const costTreeProps = {
  children: 'children',
  label: 'label',
  value: 'value',
}

// ✅ 构建费用树形结构
const buildCostTree = (costs: any, _country: string) => {
  const tree: any[] = []

  // 添加子节点（分项费用）
  const children: any[] = []

  if (costs.demurrageCost) {
    children.push({
      label: '滞港费',
      value: costs.demurrageCost,
      level: 1,
    })
  }

  if (costs.detentionCost) {
    children.push({
      label: '滞箱费',
      value: costs.detentionCost,
      level: 1,
    })
  }

  if (costs.ddCombinedCost) {
    children.push({
      label: 'D&D 合并费',
      value: costs.ddCombinedCost,
      level: 1,
    })
  }

  if (costs.storageCost) {
    children.push({
      label: '港口存储费',
      value: costs.storageCost,
      level: 1,
    })
  }

  if (costs.transportationCost) {
    children.push({
      label: '运输费',
      value: costs.transportationCost,
      level: 1,
    })
  }

  if (costs.yardStorageCost) {
    children.push({
      label: '堆场堆存费',
      value: costs.yardStorageCost,
      level: 1,
    })
  }

  if (costs.handlingCost) {
    children.push({
      label: '操作费',
      value: costs.handlingCost,
      level: 1,
    })
  }

  // 添加根节点（总费用）
  tree.push({
    label: '总费用',
    value: costs.totalCost,
    level: 0,
    children: children,
  })

  return tree
}

const successFilteredResults = computed(() => {
  const results = displayResults.value.filter((r: any) => r.success)

  if (!searchText.value) return results

  const searchLower = searchText.value.toLowerCase()
  return results.filter(
    (r: any) =>
      r.containerNumber?.toLowerCase().includes(searchLower) ||
      r.destinationPort?.toLowerCase().includes(searchLower) ||
      r.warehouseName?.toLowerCase().includes(searchLower)
  )
})

const failedFilteredResults = computed(() => {
  const results = displayResults.value.filter(r => !r.success)

  if (!searchText.value) return results

  const searchLower = searchText.value.toLowerCase()
  return results.filter(
    (r: any) =>
      r.containerNumber?.toLowerCase().includes(searchLower) ||
      r.destinationPort?.toLowerCase().includes(searchLower) ||
      r.message?.toLowerCase().includes(searchLower)
  )
})

// 计算属性 - 优先使用 URL 参数
const resolvedCountry = computed(() => {
  const country =
    (route.query.country as string) || props.country || appStore.scopedCountryCode || ''
  console.log('[SchedulingVisual] resolvedCountry:', country)
  return country
})

// 添加错误处理
const handleError = (error: any, context: string) => {
  console.error(`[SchedulingVisual] ${context}:`, error)
  ElMessage.error(`${context}: ${error.message}`)
}

// 日期范围（出运日期口径，与 Shipments 一致）
const dateRange = ref<[Date, Date]>(
  props.initialDateRange || [dayjs().startOf('year').toDate(), dayjs().endOf('day').toDate()]
)

// 操作说明相关
const showLogicDialog = ref(false)
const etaBufferDays = ref<number>(0) // ✅ 新增：ETA 顺延天数
const writeDataInfo = [
  {
    table: 'process_trucking_transport',
    fields:
      'plannedPickupDate, plannedDeliveryDate, truckingCompanyId, unloadModePlan, scheduleStatus',
  },
  { table: 'process_warehouse_operations', fields: 'plannedUnloadDate, warehouseId' },
  { table: 'process_port_operations', fields: 'plannedCustomsDate, customsBrokerCode' },
  {
    table: 'process_empty_returns',
    fields: 'plannedReturnDate, returnTerminalCode, returnTerminalName',
  },
]

// 数据
const overview = ref<any>({
  pendingCount: 0,
  initialCount: 0,
  issuedCount: 0,
  warehouses: [],
  truckings: [],
  ports: [], // ✅ 新增：港口列表
})
const loading = ref(true) // 添加 loading 状态
const isLogCollapsed = ref(false) // ✅ 新增：日志折叠状态
const logs = ref<Array<{ time: string; message: string; type: string }>>([])
const logContainer = ref<HTMLElement>()

// ✅ 新增：港口选择
const selectedPortCode = ref<string>('')
const scheduleResult = ref<any>(null)

// ✅ P3: 导出增强 - 包含费用明细和筛选条件
const exportScheduleResult = () => {
  if (!scheduleResult.value?.results?.length) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  // ✅ P3: 添加筛选条件到导出文件头部
  const filterInfo = [
    ['导出时间', dayjs().format('YYYY-MM-DD HH:mm:ss')],
    [
      '日期范围',
      dateRange.value
        ? `${dayjs(dateRange.value[0]).format('YYYY-MM-DD')} 至 ${dayjs(dateRange.value[1]).format('YYYY-MM-DD')}`
        : '全部',
    ],
    ['目的港', selectedPortCode.value || '所有港口'],
    ['搜索关键词', searchText.value || '无'],
    ['总柜数', scheduleResult.value.results.length],
    ['成功', successCount.value],
    ['失败', failedCount.value],
    [
      '成功率',
      displayResults.value.length > 0
        ? ((successCount.value / displayResults.value.length) * 100).toFixed(1) + '%'
        : '0%',
    ],
    ['', ''], // 空行分隔
  ]

  // ✅ P3: 扩展 CSV 表头包含费用明细
  const headers = [
    '柜号',
    '状态',
    '目的港',
    '仓库',
    'ETA',
    'ATA',
    '最晚提柜日 (LFD)',
    '最晚还箱日 (LRD)',
    '剩余免费天',
    '计划提柜日',
    '计划送仓日',
    '计划还箱日',
    '卸柜策略',
    '滞港费',
    '滞箱费',
    '港口存储费',
    '运输费',
    '堆场堆存费',
    '总费用',
    '消息',
  ]

  // ✅ P3: 提取费用明细数据
  const rows = scheduleResult.value.results.map((r: any) => {
    const costs = r.estimatedCosts || {}
    return [
      r.containerNumber,
      r.success ? '成功' : '失败',
      r.destinationPort || '',
      r.warehouseName || '',
      r.etaDestPort || '',
      r.ataDestPort || '',
      r.lastFreeDate || '',
      r.lastReturnDate || '',
      r.freeDaysRemaining !== undefined ? String(r.freeDaysRemaining) : '',
      r.plannedData?.plannedPickupDate || '',
      r.plannedData?.plannedDeliveryDate || '',
      r.plannedData?.plannedReturnDate || '',
      r.plannedData?.unloadModePlan || '',
      costs.demurrageCost !== undefined ? String(costs.demurrageCost.toFixed(2)) : '',
      costs.detentionCost !== undefined ? String(costs.detentionCost.toFixed(2)) : '',
      costs.storageCost !== undefined ? String(costs.storageCost.toFixed(2)) : '',
      costs.transportationCost !== undefined ? String(costs.transportationCost.toFixed(2)) : '',
      costs.yardStorageCost !== undefined ? String(costs.yardStorageCost.toFixed(2)) : '',
      costs.totalCost !== undefined ? String(costs.totalCost.toFixed(2)) : '',
      r.message || '',
    ]
  })

  const csvContent = [
    ...filterInfo.map((row: string[]) => row.map((cell: unknown) => `"${cell}"`).join(',')), // ✅ P3: 添加筛选条件
    headers.map((cell: string) => `"${cell}"`).join(','),
    ...rows.map((row: string[]) => row.map((cell: unknown) => `"${cell}"`).join(',')),
  ].join('\n')

  const BOM = '\uFEFF'
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `排产结果_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
  link.click()
  URL.revokeObjectURL(url)

  ElMessage.success('导出成功')
}

// 加载概览数据
const loadOverview = async () => {
  try {
    loading.value = true
    console.log('[SchedulingVisual] loadOverview 开始')

    const params: any = {
      country: resolvedCountry.value || undefined,
      portCode: selectedPortCode.value || undefined, // ✅ 新增：传递港口参数
    }

    if (dateRange.value?.[0]) {
      params.startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
    }
    if (dateRange.value?.[1]) {
      params.endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')
    }

    console.log('[SchedulingVisual] loadOverview - 请求参数:', params)

    const result = await containerService.getSchedulingOverview(params)

    console.log('[SchedulingVisual] loadOverview - API 返回:', result)

    if (result.success && result.data) {
      // 遵循 SKILL：直接赋值整个对象，确保响应式更新
      overview.value = {
        pendingCount: result.data.pendingCount || 0,
        initialCount: result.data.initialCount || 0,
        issuedCount: result.data.issuedCount || 0,
        warehouses: result.data.warehouses || [],
        truckings: result.data.truckings || [],
        ports: result.data.ports || [], // ✅ 新增：港口数据
      }
      console.log('[SchedulingVisual] ✓ 数据加载成功:', {
        pendingCount: overview.value.pendingCount,
        initialCount: overview.value.initialCount,
        issuedCount: overview.value.issuedCount,
        warehouses: overview.value.warehouses.length,
        truckings: overview.value.truckings.length,
      })
    } else {
      console.warn('[SchedulingVisual] API 返回 success=false:', result)
      ElMessage.warning('加载排产概览失败：未知错误')
    }
  } catch (error: any) {
    console.error('[SchedulingVisual] loadOverview - 错误:', error)
    ElMessage.error('加载排产概览失败：' + error.message)
  } finally {
    loading.value = false
  }
}

// ✅ 新增：处理港口选择变化
const handlePortChange = (portCode: string | null) => {
  console.log('[SchedulingVisual] 港口选择变化:', portCode)
  // 重新加载概览数据（带港口过滤）
  loadOverview()
}

// ✅ 新增：获取结果标签类型
const getResultTagType = (): 'success' | 'warning' | 'danger' | 'info' => {
  // 预览模式：基于预览结果计算
  if (isPreviewMode.value && previewResults.value.length > 0) {
    const total = previewResults.value.length
    const success = previewResults.value.filter(r => r.success).length
    if (total === 0) return 'info'
    const successRate = success / total
    if (successRate >= 0.9) return 'success'
    if (successRate >= 0.7) return 'warning'
    return 'danger'
  }

  // 正式模式：基于正式结果计算
  if (scheduleResult.value?.total === 0) return 'info'
  const successRate = scheduleResult.value.successCount / scheduleResult.value.total
  if (successRate >= 0.9) return 'success'
  if (successRate >= 0.7) return 'warning'
  return 'danger'
}

// 高亮选中的货柜（可选功能）
const highlightContainers = (containerNumbers: string[]) => {
  // 可以在这里实现高亮逻辑
  console.log('[SchedulingVisual] 高亮货柜:', containerNumbers)
  // TODO: 实现具体的高亮逻辑
}

// 监听路由变化（遵循 SKILL：监听 URL 参数变化）
watch(
  () => route.query,
  newQuery => {
    if (newQuery.from === 'shipments' && newQuery.country) {
      // 从货柜页面跳转过来，自动加载数据
      console.log('从货柜页面跳转，加载排产数据:', {
        country: newQuery.country,
        startDate: newQuery.startDate,
        endDate: newQuery.endDate,
        containers: newQuery.containers,
      })

      // 更新 store
      if (newQuery.country) {
        appStore.setScopedCountryCode(newQuery.country as string)
      }

      // 如果有选中的货柜号，可以高亮显示
      if (newQuery.containers) {
        const containerNumbers = (newQuery.containers as string).split(',').filter(Boolean)
        highlightContainers(containerNumbers)
      }

      // 加载概览数据
      loadOverview()
    }
  },
  { immediate: true }
)

// 返回货柜管理页面
const goBackToShipments = () => {
  router.push({
    path: '/shipments',
    query: {
      // 可以保留一些筛选条件
      days: route.query.filterCondition,
      startDate: route.query.startDate,
      endDate: route.query.endDate,
    },
  })
}

// 添加日志
const addLog = (message: string, type: string = 'info') => {
  const now = new Date()
  const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logs.value.push({ time, message, type })

  // 自动滚动到底部
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight
    }
  })
}

// ✅ 新增：判断是否为周末
const isWeekend = (dateStr: string): boolean => {
  if (!dateStr) return false
  const date = new Date(dateStr)
  const day = date.getDay()
  return day === 0 || day === 6 // 0 = 周日，6 = 周六
}

const BATCH_SIZE = 3

// ✅ 使用 Composable 统一管理排产流程
const { scheduling, handleBatchSchedule: executeSchedulingFlow } = useSchedulingFlow({
  onLog: addLog,
  onProgress: progress => {
    console.log('[排产进度]', progress)
  },
  onSuccess: result => {
    console.log('[排产成功]', result)
  },
  onError: error => {
    console.error('[排产错误]', error)
  },
})

// ✅ 使用 Composable 统一管理资源档期（备用）
// const {
//   capacityCache: resourceCapacityCache,
//   loading: capacityLoading,
//   getWarehouseCapacityText,
//   getTruckingCapacityText,
//   getWarehouseCapacityStatus,
//   getTruckingCapacityStatus,
//   preloadFromResults: preloadCapacityFromResults,
//   clearCache: clearResourceCapacityCache,
// } = useResourceCapacity({
//   onError: (error) => {
//     console.error('[档期检查错误]', error)
//   },
//   onLog: (message) => {
//     console.log('[档期管理]', message)
//   },
// })

// 预览确认相关 - 已移除，改为内联显示
// const showPreviewModal = ref(false)
// const previewResults = ref<any[]>([]) // 已移到上面与 isPreviewMode 一起声明

// 执行排产（分步：每批 3 个，暂停确认是否继续）
const handleSchedule = async () => {
  if (overview.value.pendingCount === 0) {
    ElMessage.warning('没有待排产的货柜')
    return
  }

  scheduling.value = true
  scheduleResult.value = null
  logs.value = []
  const allResults: Array<{
    containerNumber: string
    success: boolean
    message?: string
    plannedData?: Record<string, string>
  }> = []
  let totalSuccess = 0
  let totalFailed = 0

  try {
    addLog(`开始排产，待排产货柜：${overview.value.pendingCount} 个`, 'info')
    addLog('按 ATA/ETA 排序（先到先得）', 'info')
    addLog('计算计划清关日/提柜日/送仓日', 'info')
    addLog(
      `可用仓库：${overview.value.warehouses?.length || 0} 个，可用车队：${overview.value.truckings?.length || 0} 个`,
      'info'
    )
    addLog(`每批处理 ${BATCH_SIZE} 个货柜，计算完成后暂停确认`, 'info')

    let skip = 0
    let total = 0
    let hasMore = true

    while (hasMore) {
      addLog(`--- 正在处理第 ${Math.floor(skip / BATCH_SIZE) + 1} 批 ---`, 'info')

      const result = await containerService.batchSchedule({
        country: resolvedCountry.value || undefined,
        startDate: dateRange.value?.[0]
          ? dayjs(dateRange.value[0]).format('YYYY-MM-DD')
          : undefined,
        endDate: dateRange.value?.[1] ? dayjs(dateRange.value[1]).format('YYYY-MM-DD') : undefined,
        limit: BATCH_SIZE,
        skip,
      })

      total = result.total
      hasMore = result.hasMore ?? false

      // 每条结果写入日志
      result.results.forEach((r: any, index: number) => {
        allResults.push(r)
        if (r.success) {
          totalSuccess += 1
          const dates = r.plannedData
            ? ` 提柜:${r.plannedData.plannedPickupDate} 送仓:${r.plannedData.plannedDeliveryDate} 还箱:${r.plannedData.plannedReturnDate}`
            : ''

          // ✅ 新增：如果是第一条成功记录，显示详细计算过程
          if (index === 0 && result.results.length > 0) {
            addLog(`\ud83d\udcca 首个货柜计算详情:`, 'info')
            addLog(`  - 柜号：${r.containerNumber}`)
            if (r.plannedData) {
              addLog(`  - 仓库：${r.warehouseName || r.plannedData.warehouseName || '-'}`)
              addLog(`  - 车队：${r.plannedData.truckingCompany || '-'}`)
              addLog(`  - 卸柜方式：${r.plannedData.unloadModePlan || '-'}`)
              if (r.estimatedCosts) {
                addLog(`  - 预估费用：$${r.estimatedCosts.totalCost?.toFixed(2) || '0.00'}`)
                // 显示所有费用项（按重要性排序）
                if (r.estimatedCosts.demurrageCost) {
                  addLog(
                    `    \u2022 滞港费：$${r.estimatedCosts.demurrageCost?.toFixed(2) || '0.00'}`
                  )
                }
                if (r.estimatedCosts.detentionCost) {
                  addLog(
                    `    \u2022 滞箱费：$${r.estimatedCosts.detentionCost?.toFixed(2) || '0.00'}`
                  )
                }
                if (r.estimatedCosts.ddCombinedCost) {
                  addLog(
                    `    \u2022 D&D 合并费：$${r.estimatedCosts.ddCombinedCost?.toFixed(2) || '0.00'}`
                  )
                }
                if (r.estimatedCosts.storageCost) {
                  addLog(
                    `    \u2022 仓储费：$${r.estimatedCosts.storageCost?.toFixed(2) || '0.00'}`
                  )
                }
                if (r.estimatedCosts.transportationCost) {
                  addLog(
                    `    \u2022 运输费：$${r.estimatedCosts.transportationCost?.toFixed(2) || '0.00'}`
                  )
                }
                if (r.estimatedCosts.yardStorageCost) {
                  addLog(
                    `    \u2022 堆场堆存费：$${r.estimatedCosts.yardStorageCost?.toFixed(2) || '0.00'}`
                  )
                }
                if (r.estimatedCosts.handlingCost) {
                  addLog(
                    `    \u2022 操作费：$${r.estimatedCosts.handlingCost?.toFixed(2) || '0.00'}`
                  )
                }
                if (r.estimatedCosts.otherCost) {
                  addLog(`    \u2022 其他：$${r.estimatedCosts.otherCost?.toFixed(2) || '0.00'}`)
                }
              }
              if (r.freeDaysRemaining !== undefined) {
                addLog(`  - 免期剩余：${r.freeDaysRemaining} 天`)
              }
              if (r.lastFreeDate) {
                addLog(`  - 最后免期日：${r.lastFreeDate}`)
              }
            }
            addLog(`  - 计算说明：${r.message || '成功'}`)
            addLog(`${'\u2713'} ${r.containerNumber}: ${r.message || '成功'}${dates}`, 'success')
          } else {
            addLog(`${'\u2713'} ${r.containerNumber}: ${r.message || '成功'}${dates}`, 'success')
          }
        } else {
          totalFailed += 1
          addLog(`${'\u2717'} ${r.containerNumber}: ${r.message || '失败'}`, 'error')
        }
      })

      scheduleResult.value = {
        success: result.success,
        total,
        successCount: totalSuccess,
        failedCount: totalFailed,
        results: allResults,
      }

      if (hasMore) {
        try {
          await ElMessageBox.confirm(
            `本批已处理 ${result.results.length} 个货柜，累计成功 ${totalSuccess} / 失败 ${totalFailed}。是否继续排产剩余货柜？`,
            '是否继续',
            {
              confirmButtonText: '继续',
              cancelButtonText: '停止',
              type: 'info',
            }
          )
        } catch {
          addLog('用户选择停止，排产已中止', 'info')
          break
        }
        skip += BATCH_SIZE
      }
    }

    addLog(
      `排产结束: 成功 ${totalSuccess}/${total}，失败 ${totalFailed}`,
      totalFailed > 0 ? 'error' : 'success'
    )
    ElMessage.success(`排产结束: 成功 ${totalSuccess}/${total}`)

    await loadOverview()

    // 触发排产完成事件
    emit('complete', scheduleResult.value)
  } catch (error: any) {
    addLog(`排产异常: ${error.message}`, 'error')
    ElMessage.error('排产异常: ' + error.message)

    // 触发错误事件
    emit('error', error)
  } finally {
    scheduling.value = false
  }
}

// ✅ 新增：手工指定仓库相关状态
const showDesignatedWarehouseDialog = ref(false)
// const selectedContainersForDesignation = ref<string[]>([]); // 不再需要预先选择
// const hasSelectedContainers = computed(() => selectedContainersForDesignation.value.length > 0);
const currentPortCode = ref<string>('') // 当前选中的港口

// 打开手工指定对话框 - 对所有待排产货柜生效
const openDesignatedWarehouseDialog = () => {
  if (overview.value.pendingCount === 0) {
    ElMessage.warning('没有待排产的货柜')
    return
  }

  showDesignatedWarehouseDialog.value = true
}

// 确认手工指定仓库排产 - 对所有待排产货柜生效
const handleDesignatedWarehouseConfirm = async (data: {
  warehouseCode: string
  containerNumbers?: string[]
}) => {
  try {
    addLog(`开始手工指定仓库排产...`, 'info')

    // 调用排产 API，传入手工指定参数
    // 如果不指定 containerNumbers，则对所有待排产货柜生效
    const result = await containerService.batchSchedule({
      designatedWarehouseMode: true,
      designatedWarehouseCode: data.warehouseCode,
      portCode: selectedPortCode.value || undefined, // ✅ 新增：传递港口参数
      containerNumbers: data.containerNumbers, // 如果用户选择了特定柜号则使用，否则为 undefined（全部）
      dryRun: false, // 直接保存
      etaBufferDays: etaBufferDays.value,
    })

    if (result.success) {
      ElMessage.success(`排产成功：${result.successCount} 个`)
      addLog(`手工指定仓库排产完成：成功 ${result.successCount} 个`, 'success')
      showDesignatedWarehouseDialog.value = false
      // 刷新数据
      loadOverview()
    } else {
      ElMessage.error('排产失败：' + (result as any).message)
      addLog(`手工指定仓库排产失败：${(result as any).message}`, 'error')
    }
  } catch (error: any) {
    ElMessage.error('排产失败：' + (error.message || '未知错误'))
    addLog(`手工指定仓库排产异常：${error.message}`, 'error')
  }
}

// 预览排产（不保存，只显示方案）
const handlePreviewSchedule = async () => {
  if (overview.value.pendingCount === 0) {
    ElMessage.warning('没有待排产的货柜')
    return
  }

  scheduling.value = true
  previewResults.value = []

  try {
    addLog('开始预览排产方案...', 'info')

    // 调用 Composable 的 handlePreviewSchedule
    const result = await executeSchedulingFlow({
      country: resolvedCountry.value || undefined,
      portCode: selectedPortCode.value || undefined,
      startDate: dateRange.value?.[0] ? dayjs(dateRange.value[0]).format('YYYY-MM-DD') : undefined,
      endDate: dateRange.value?.[1] ? dayjs(dateRange.value[1]).format('YYYY-MM-DD') : undefined,
      dryRun: true, // ← 关键：预览模式
      etaBufferDays: etaBufferDays.value,
    })

    if (!result.success) {
      ElMessage.error('预览失败：' + (result as any).message)
      return
    }

    // 转换数据格式以适配预览组件
    previewResults.value = (result.results || []).map((r: any, index: number) => {
      // ✅ 新增：如果是第一条成功记录，显示详细计算过程
      if (index === 0 && r.success) {
        addLog(`\ud83d\udcca 首个货柜计算详情（预览）:`, 'info')
        addLog(`  - 柜号：${r.containerNumber}`)
        if (r.plannedData) {
          addLog(`  - 仓库：${r.warehouseName || r.plannedData.warehouseName || '-'}`)
          addLog(`  - 车队：${r.plannedData.truckingCompany || '-'}`)
          addLog(`  - 卸柜方式：${r.plannedData.unloadModePlan || '-'}`)
          if (r.estimatedCosts) {
            addLog(`  - 预估费用：$${r.estimatedCosts.totalCost?.toString() || '0.00'}`)
            addLog(`    • 运输费：$${r.estimatedCosts.transportationCost?.toString() || '0.00'}`)
            addLog(`    • 卸货费：$${r.estimatedCosts.handlingCost?.toString() || '0.00'}`)
            addLog(`    • 仓储费：$${r.estimatedCosts.storageCost?.toString() || '0.00'}`)
            addLog(`    • 其他：$${r.estimatedCosts.otherCost?.toString() || '0.00'}`)
          }
          if (r.freeDaysRemaining !== undefined) {
            addLog(`  - 免期剩余：${r.freeDaysRemaining} 天`)
          }
          if (r.lastFreeDate) {
            addLog(`  - 最后免期日：${r.lastFreeDate}`)
          }
          // ✅ 新增：显示免费天数
          if (r.pickupFreeDays !== undefined) {
            addLog(`  - 提柜免费天数：${r.pickupFreeDays} 天`)
          }
          if (r.returnFreeDays !== undefined) {
            addLog(`  - 还箱免费天数：${r.returnFreeDays} 天`)
          }
        }
        addLog(`  - 计算说明：${r.message || '成功'}`)
      }

      const transformed = {
        ...r,
        plannedPickupDate: r.plannedData?.plannedPickupDate || '-',
        plannedDeliveryDate: r.plannedData?.plannedDeliveryDate || '-',
        plannedUnloadDate: r.plannedData?.plannedUnloadDate || '-',
        plannedReturnDate: r.plannedData?.plannedReturnDate || '-',
        warehouseName: r.warehouseName || r.plannedData?.warehouseName || '-',
        truckingCompany: r.plannedData?.truckingCompany || '-',
        unloadMode: r.plannedData?.unloadModePlan || '-',
        estimatedCosts: r.plannedData?.estimatedCosts || r.estimatedCosts || undefined,
        lastFreeDate: r.lastFreeDate || '-',
        lastReturnDate: r.lastReturnDate || '-',
        pickupFreeDays: r.pickupFreeDays,
        returnFreeDays: r.returnFreeDays,
        freeDaysRemaining: r.freeDaysRemaining ?? undefined,
      }
      
      // ✅ 调试：输出前 3 条数据的完整结构
      if (index < 3) {
        console.log(`[预览数据 ${index}]`, {
          containerNumber: r.containerNumber,
          truckingCompany: transformed.truckingCompany,
          unloadMode: transformed.unloadMode,
          plannedData: r.plannedData,
        })
      }
      
      return transformed
    })

    // ✅ 直接显示预览结果，不再弹出对话框
    isPreviewMode.value = true
    scheduleResult.value = null // 清空正式结果

    addLog(`预览完成：成功 ${result.totalSuccess} 个，失败 ${result.totalFailed} 个`, 'info')
    ElMessage.success(`预览完成：成功 ${result.totalSuccess} 个，请在下方审查并勾选要保存的方案`)

    // ✅ 新增：自动滚动到结果区域
    await nextTick()
    scrollToResults()

    // ✅ 新增：预加载所有档期数据，避免渲染时重复请求
    if (result.results && result.results.length > 0) {
      await preloadCapacityData(result.results)
    }
  } catch (error: any) {
    ElMessage.error('预览失败：' + (error.message || '未知错误'))
  } finally {
    scheduling.value = false
  }
}

// 确认保存排产结果 - 已移除，改用 handleConfirmSave 替代
// const handleConfirmSchedule = async (selectedContainers: string[]) => { ... }

// ✅ 新增：确认保存预览结果
const handleConfirmSave = async () => {
  if (selectedPreviewContainers.value.length === 0) {
    ElMessage.warning('请至少选择一个货柜')
    return
  }

  try {
    saving.value = true
    addLog(`正在保存 ${selectedPreviewContainers.value.length} 个货柜的排产结果...`, 'info')

    // ✅ 关键修复：从 previewResults 中提取已选中的货柜数据
    const selectedResults = previewResults.value.filter((r: any) =>
      selectedPreviewContainers.value.includes(r.containerNumber)
    )

    console.log('[handleConfirmSave] 保存的预览数据:', selectedResults)

    // ✅ 调用 confirm 接口（传递 previewResults，直接保存不重新计算）
    const result = await containerService.confirmSchedule({
      containerNumbers: selectedPreviewContainers.value,
      previewResults: selectedResults, // ✅ 传递预览数据
    })

    if (result.success) {
      ElMessage.success(`成功保存 ${result.savedCount} 个货柜`)
      addLog(`确认保存完成：成功 ${result.savedCount} 个`, 'success')

      // ✅ 关键修复：设置 scheduleResult，让排产结果区域显示已保存的数据
      scheduleResult.value = {
        total: result.savedCount,
        successCount: result.savedCount,
        failedCount: 0,
        results: selectedResults.filter((r: any) => r.success),
      }

      // ✅ 新增：保存后刷新档期数据
      await refreshCapacityData()

      // 清空预览状态
      isPreviewMode.value = false
      previewResults.value = []
      selectedPreviewContainers.value = []

      // ✅ 新增：刷新待排产数量统计
      await loadOverview()
    } else {
      ElMessage.error('保存失败')
      addLog(`确认保存失败`, 'error')
    }
  } catch (error: any) {
    console.error('[handleConfirmSave] Error:', error)
    ElMessage.error('保存失败：' + error.message)
    addLog(`确认保存失败：${error.message}`, 'error')
  } finally {
    saving.value = false
  }
}

// ✅ 新增：刷新档期数据（清空缓存）
const refreshCapacityData = async () => {
  console.log('[refreshCapacityData] 刷新档期数据...')
  // 清空档期缓存
  capacityCache.value.clear()

  // 重新加载当前可见的档期数据（可选）
  // 如果需要立即刷新 UI，可以重新调用 getWarehouseCapacityText 等方法
}

// ✅ 新增：放弃预览结果
const handleDiscardPreview = () => {
  isPreviewMode.value = false
  previewResults.value = []
  selectedPreviewContainers.value = []
  addLog('用户放弃了预览结果', 'info')
  ElMessage.info('已放弃预览结果')
}

// ✅ 新增：全选成功的货柜
const selectAllOnPage = () => {
  if (resultTableRef.value) {
    // 获取所有成功的行
    const successRows = displayResults.value.filter((r: any) => r.success)
    // 设置选中状态
    resultTableRef.value.toggleAllSelection()

    // 手动设置选中项（只选中成功的）
    selectedPreviewContainers.value = successRows.map((r: any) => r.containerNumber)

    ElMessage.success(`已选择 ${selectedPreviewContainers.value.length} 个成功的货柜`)
  }
}

// ✅ 新增：取消全选
const clearSelection = () => {
  if (resultTableRef.value) {
    resultTableRef.value.clearSelection()
  }
  selectedPreviewContainers.value = []
}

// ✅ 新增：处理表格选择变化
const handlePreviewSelectionChange = (selection: any[]) => {
  selectedPreviewContainers.value = selection.map((r: any) => r.containerNumber)
}

// ✅ 新增：自动滚动到结果区域
const scrollToResults = () => {
  nextTick(() => {
    // 查找结果卡片元素
    const resultCard = document.querySelector('.result-card')
    if (resultCard) {
      resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })
}

// ✅ 新增：处理成本优化应用后的回调
const handleOptimizationApplied = (containerNumber: string | 'all') => {
  // 刷新相关数据
  if (containerNumber === 'all') {
    // 如果是批量应用，重新加载整个列表
    ElMessage.success('优化已应用，正在刷新数据...')
    // 可以在这里添加刷新逻辑
  } else {
    // 如果只应用了单个货柜，可以针对性刷新
    ElMessage.success(`货柜 ${containerNumber} 的优化已应用`)
  }

  // TODO: 如果需要，可以在这里调用刷新 API
  // await loadOverview() // 或者刷新具体的货柜数据
}

// ✅ 增强：辅助方法 - 格式化货币
const formatCurrency = (value: number | string, currency: string = 'US') => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(numValue)) return '-'

  const currencySymbols: Record<string, string> = {
    US: '$',
    CN: '¥',
    EU: '€',
    UK: '£',
  }

  const symbol = currencySymbols[currency] || '$'
  return `${symbol}${numValue.toFixed(2)}`
}

// ✅ 增强：辅助方法 - 获取费用颜色类别
const getAmountClass = (amount: number) => {
  if (amount <= 0) return 'cost-low'
  if (amount < 500) return 'cost-medium'
  if (amount < 1000) return 'cost-high'
  return 'cost-critical'
}

// ✅ 新增：档期数据缓存（避免重复请求）
const capacityCache = ref<Map<string, any>>(new Map())

/**
 * ✅ 新增：预加载所有货柜的档期信息（批量请求，避免 429）
 */
const preloadCapacityData = async (results: any[]) => {
  const truckingRequests = new Set<string>()
  const warehouseRequests = new Set<string>()

  // 收集所有需要请求的车队和仓库
  results.forEach(row => {
    if (row.plannedData) {
      // 收集车队
      const truckingId = row.plannedData.truckingCompanyId || row.plannedData.truckingCompany
      const pickupDate = row.plannedData.plannedPickupDate
      if (truckingId && pickupDate) {
        const key = `trucking:${truckingId}:${pickupDate}`
        truckingRequests.add(key)
      }

      // 收集仓库
      // ✅ 修复：warehouseId 就是 warehouseCode，直接使用
      const warehouseCode = row.plannedData.warehouseId
      const unloadDate = row.plannedData.plannedUnloadDate
      if (warehouseCode && unloadDate) {
        const key = `warehouse:${warehouseCode}:${unloadDate}`
        warehouseRequests.add(key)
      }
    }
  })

  console.info(
    `[预加载] 需要加载 ${truckingRequests.size} 个车队，${warehouseRequests.size} 个仓库`
  )

  // 批量并发请求 (限制并发数)
  const MAX_CONCURRENT = 10

  // 处理车队请求
  const truckingChunks = Array.from(truckingRequests).reduce((acc, key, i) => {
    if (i % MAX_CONCURRENT === 0) acc.push([])
    acc[acc.length - 1].push(key)
    return acc
  }, [] as string[][])

  for (const chunk of truckingChunks) {
    const promises = chunk.map(async key => {
      const [type, id, date] = key.split(':')
      try {
        if (type === 'trucking') {
          await getTruckingCapacityText({
            plannedData: {
              truckingCompanyId: id,
              plannedPickupDate: date,
            },
          })
        }
      } catch (error) {
        console.warn(`[预加载] ${key} 失败:`, error)
      }
    })
    await Promise.all(promises)
  }

  // 处理仓库请求
  const warehouseChunks = Array.from(warehouseRequests).reduce((acc, key, i) => {
    if (i % MAX_CONCURRENT === 0) acc.push([])
    acc[acc.length - 1].push(key)
    return acc
  }, [] as string[][])

  for (const chunk of warehouseChunks) {
    const promises = chunk.map(async key => {
      const [type, code, date] = key.split(':')
      try {
        if (type === 'warehouse') {
          await getWarehouseCapacityText({
            plannedData: {
              warehouseId: code, // ✅ warehouseId 就是 warehouseCode
              plannedUnloadDate: date,
            },
          })
        }
      } catch (error) {
        console.warn(`[预加载] ${key} 失败:`, error)
      }
    })
    await Promise.all(promises)
  }

  console.info('[预加载] 完成')
}

// ✅ 新增：获取仓库档期状态文本（集成真实 API）
const getWarehouseCapacityText = async (row: any) => {
  const warehouseCode = row.plannedData?.warehouseId || row.plannedData?.warehouseCode
  const unloadDate = row.plannedData?.plannedUnloadDate

  if (!warehouseCode || !unloadDate) return '未知'

  // 检查缓存
  const cacheKey = `warehouse:${warehouseCode}:${unloadDate}`
  if (capacityCache.value.has(cacheKey)) {
    const cached = capacityCache.value.get(cacheKey)
    return typeof cached === 'string' ? cached : cached.status
  }

  try {
    // 调用后端 API 获取真实档期数据
    const response = await api.get('/scheduling/resources/capacity/range', {
      params: {
        resourceType: 'warehouse',
        warehouseCode,
        start: unloadDate,
        end: unloadDate,
      },
    })

    if (response.data.success && response.data.data.length > 0) {
      const capacityData = response.data.data[0]
      const occupancyRate =
        capacityData.baseCapacity > 0
          ? (capacityData.occupied / capacityData.baseCapacity) * 100
          : 0

      let status = '正常'
      if (occupancyRate >= 95) status = '超负荷'
      else if (occupancyRate >= 80) status = '紧张'

      // 缓存状态和占用率
      capacityCache.value.set(cacheKey, { status, occupancyRate })
      return status
    }
  } catch (error) {
    console.error('获取仓库档期失败:', error)
  }

  // 降级逻辑：仅基于占用率判断（不再考虑日期）
  // 如果 API 失败，返回默认状态
  capacityCache.value.set(cacheKey, { status: '正常', occupancyRate: 0 })
  return '正常'
}

// ✅ 新增：获取仓库档期状态类型（集成真实 API）
const getWarehouseCapacityStatus = async (row: any) => {
  const text = await getWarehouseCapacityText(row)
  if (text === '已过期' || text === '超负荷') return 'danger'
  if (text === '紧张') return 'warning'
  return 'success'
}

// ✅ 新增：获取车队档期状态文本（集成真实 API）
const getTruckingCapacityText = async (row: any) => {
  const truckingCompanyId = row.plannedData?.truckingCompanyId || row.plannedData?.truckingCompany
  const pickupDate = row.plannedData?.plannedPickupDate

  if (!truckingCompanyId || !pickupDate) return '未知'

  // 检查缓存
  const cacheKey = `trucking:${truckingCompanyId}:${pickupDate}`
  if (capacityCache.value.has(cacheKey)) {
    const cached = capacityCache.value.get(cacheKey)
    return typeof cached === 'string' ? cached : cached.status
  }

  try {
    // 调用后端 API 获取真实档期数据
    const response = await api.get('/scheduling/resources/capacity/range', {
      params: {
        resourceType: 'trucking',
        truckingCompanyId,
        start: pickupDate,
        end: pickupDate,
      },
    })

    if (response.data.success && response.data.data.length > 0) {
      const capacityData = response.data.data[0]
      const occupancyRate =
        capacityData.baseCapacity > 0
          ? (capacityData.occupied / capacityData.baseCapacity) * 100
          : 0

      let status = '正常'
      if (occupancyRate >= 95) status = '超负荷'
      else if (occupancyRate >= 80) status = '紧张'

      // 缓存状态和占用率
      capacityCache.value.set(cacheKey, { status, occupancyRate })
      return status
    }
  } catch (error) {
    console.error('获取车队档期失败:', error)
  }

  // 降级逻辑：仅基于占用率判断（不再考虑日期）
  // 如果 API 失败，返回默认状态
  capacityCache.value.set(cacheKey, { status: '正常', occupancyRate: 0 })
  return '正常'
}

// ✅ 新增：获取车队档期状态类型（集成真实 API）
const getTruckingCapacityStatus = async (row: any) => {
  const text = await getTruckingCapacityText(row)
  if (text === '已过期' || text === '超负荷') return 'danger'
  if (text === '紧张') return 'warning'
  return 'success'
}

// ✅ 新增：同步方法用于模板渲染（使用缓存数据）
const getWarehouseCapacityLabel = (row: any) => {
  const warehouseCode = row.plannedData?.warehouseId || row.plannedData?.warehouseCode
  const unloadDate = row.plannedData?.plannedUnloadDate

  if (!warehouseCode || !unloadDate) return '未知'

  const cacheKey = `warehouse:${warehouseCode}:${unloadDate}`
  if (capacityCache.value.has(cacheKey)) {
    const data = capacityCache.value.get(cacheKey)
    return typeof data === 'string' ? data : data.status
  }

  // ✅ 修复：不再触发请求，直接返回默认值 (预加载已处理)
  return '暂无数据'
}

const getWarehouseCapacityType = (row: any) => {
  const warehouseCode = row.plannedData?.warehouseId || row.plannedData?.warehouseCode
  const unloadDate = row.plannedData?.plannedUnloadDate

  if (!warehouseCode || !unloadDate) return 'info'

  const cacheKey = `warehouse:${warehouseCode}:${unloadDate}`
  if (capacityCache.value.has(cacheKey)) {
    const data = capacityCache.value.get(cacheKey)
    const text = typeof data === 'string' ? data : data.status
    if (text === '已过期' || text === '超负荷') return 'danger'
    if (text === '紧张') return 'warning'
    return 'success'
  }

  // ✅ 关键修复：渲染时禁止触发异步请求，直接返回默认值
  // 预加载已处理所有数据，这里只是防御性代码
  return 'info'
}

const getWarehouseOccupancyRate = (row: any) => {
  const warehouseCode = row.plannedData?.warehouseId || row.plannedData?.warehouseCode
  const unloadDate = row.plannedData?.plannedUnloadDate

  if (!warehouseCode || !unloadDate) return 0

  const cacheKey = `warehouse:${warehouseCode}:${unloadDate}`
  if (capacityCache.value.has(cacheKey)) {
    const data = capacityCache.value.get(cacheKey)
    return typeof data === 'string' ? 0 : data.occupancyRate || 0
  }

  // ✅ 关键修复：渲染时禁止触发异步请求，直接返回 0
  return 0
}

const getTruckingCapacityLabel = (row: any) => {
  const truckingCompanyId = row.plannedData?.truckingCompanyId || row.plannedData?.truckingCompany
  const pickupDate = row.plannedData?.plannedPickupDate

  if (!truckingCompanyId || !pickupDate) return '未知'

  const cacheKey = `trucking:${truckingCompanyId}:${pickupDate}`
  if (capacityCache.value.has(cacheKey)) {
    const data = capacityCache.value.get(cacheKey)
    return typeof data === 'string' ? data : data.status
  }

  // ✅ 修复：不再触发请求，直接返回默认值 (预加载已处理)
  return '暂无数据'
}

const getTruckingCapacityType = (row: any) => {
  const truckingCompanyId = row.plannedData?.truckingCompanyId || row.plannedData?.truckingCompany
  const pickupDate = row.plannedData?.plannedPickupDate

  if (!truckingCompanyId || !pickupDate) return 'info'

  const cacheKey = `trucking:${truckingCompanyId}:${pickupDate}`
  if (capacityCache.value.has(cacheKey)) {
    const data = capacityCache.value.get(cacheKey)
    const text = typeof data === 'string' ? data : data.status
    if (text === '已过期' || text === '超负荷') return 'danger'
    if (text === '紧张') return 'warning'
    return 'success'
  }

  // ✅ 关键修复：渲染时禁止触发异步请求，直接返回默认值
  return 'info'
}

const getTruckingOccupancyRate = (row: any) => {
  const truckingCompanyId = row.plannedData?.truckingCompanyId || row.plannedData?.truckingCompany
  const pickupDate = row.plannedData?.plannedPickupDate

  if (!truckingCompanyId || !pickupDate) return 0

  const cacheKey = `trucking:${truckingCompanyId}:${pickupDate}`
  if (capacityCache.value.has(cacheKey)) {
    const data = capacityCache.value.get(cacheKey)
    return typeof data === 'string' ? 0 : data.occupancyRate || 0
  }

  // ✅ 关键修复：渲染时禁止触发异步请求，直接返回 0
  return 0
}

// ✅ 新增：成本优化快捷操作
const handleOptimizeContainer = async (row: any) => {
  const containerNumber = row.containerNumber

  // ✅ 关键修复：plannedData.warehouseId 存储的就是 warehouseCode（见后端代码第 674 行）
  // 优先级：plannedData.warehouseId > warehouseCode > 其他备用字段
  const warehouseCode =
    row.plannedData?.warehouseId || // ✅ 首选：排产数据中的 warehouseId（实际是 warehouseCode）
    row.plannedData?.warehouseCode || // 备选：plannedData 中的 warehouseCode 字段
    row.warehouseCode || // 从根对象获取
    row.warehouseId || // 备用字段（根对象的 warehouseId）
    row.destinationWarehouse || // 备用字段 1
    row.warehouseName?.split(' ')[0] || // 最后尝试：从仓库名称提取
    row.plannedData?.warehouseName?.split(' '[0]) // 从 plannedData 的仓库名称提取

  // ✅ 优化：从多个可能的字段获取车队 ID
  const truckingCompanyId =
    row.plannedData?.truckingCompanyId || row.truckingCompanyId || row.truckingCompany

  const basePickupDate = row.plannedData?.plannedPickupDate || row.plannedPickupDate

  console.log('[handleOptimizeContainer] 检查参数:', {
    containerNumber,
    warehouseCode,
    truckingCompanyId,
    basePickupDate,
    plannedData: row.plannedData,
    rowKeys: Object.keys(row),
  })

  if (!warehouseCode) {
    console.error('[handleOptimizeContainer] 缺少仓库代码，所有可能的字段都为空')
    ElMessage.warning('缺少仓库信息，无法进行优化。请确认排产结果中是否包含仓库信息。')
    return
  }

  if (!truckingCompanyId) {
    console.error('[handleOptimizeContainer] 缺少车队 ID，所有可能的字段都为空')
    ElMessage.warning('缺少车队信息，无法进行优化。请确认排产结果中是否包含车队信息。')
    return
  }

  if (!basePickupDate) {
    console.error('[handleOptimizeContainer] 缺少计划提柜日期')
    ElMessage.warning('缺少计划提柜日期，无法进行优化。请确认排产结果中是否包含计划日期。')
    return
  }

  try {
    ElMessageBox.confirm(
      `是否对货柜 ${containerNumber} 进行成本优化？系统将重新计算最优卸柜日期。`,
      '成本优化',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info',
      }
    ).then(async () => {
      addLog(`开始优化货柜 ${containerNumber}...`, 'info')

      // ✅ 调用后端成本优化 API
      const result = await containerService.optimizeContainer({
        containerNumber,
        warehouseCode,
        truckingCompanyId,
        basePickupDate,
      })

      if (result.success && result.data) {
        const data = result.data as any
        const {
          originalCost,
          optimizedCost,
          savings,
          savingsPercent,
          suggestedPickupDate,
          suggestedStrategy,
          alternatives,
        } = data

        // ✅ 构建优化报告（使用 OptimizationResultCard 需要的格式）
        const firstAlt = alternatives?.[0] as any
        const lastAlt = alternatives?.[alternatives.length - 1] as any

        // ✅ 关键修复：原方案应该使用 basePickupDate，而不是 alternatives[0].pickupDate
        const originalPickupDate = basePickupDate // ✅ 使用原始计划日期
        const originalStrategy = truckingCompanyId?.hasYard ? 'Drop off' : 'Direct'

        // 从 alternatives 中提取 breakdown 数据（后端现在返回 breakdown）
        const originalBreakdown = firstAlt?.breakdown || {
          demurrageCost: 0,
          detentionCost: 0,
          storageCost: 0,
          transportationCost: 0,
          yardStorageCost: 0,
          handlingCost: 0,
          totalCost: typeof originalCost === 'number' ? originalCost : 0,
        }

        const optimizedBreakdown = lastAlt?.breakdown || {
          demurrageCost: 0,
          detentionCost: 0,
          storageCost: 0,
          transportationCost: 0,
          yardStorageCost: 0,
          handlingCost: 0,
          totalCost: typeof optimizedCost === 'number' ? optimizedCost : 0,
        }

        optimizationReport.value = {
          originalCost: {
            total: typeof originalCost === 'number' ? originalCost : 0,
            pickupDate: originalPickupDate, // ✅ 使用原始计划日期
            strategy: originalStrategy, // ✅ 使用原始策略
            breakdown: originalBreakdown,
          },
          optimizedCost: {
            total: typeof optimizedCost === 'number' ? optimizedCost : 0,
            pickupDate: suggestedPickupDate,
            strategy: suggestedStrategy || 'Direct',
            breakdown: optimizedBreakdown,
          },
          savings: {
            amount: typeof savings === 'number' ? savings : 0,
            percentage: typeof savingsPercent === 'number' ? savingsPercent : 0,
            explanation: `通过调整提柜日期从 ${originalPickupDate} 至 ${suggestedPickupDate}，采用 ${suggestedStrategy} 策略，预计节省 $${(savings || 0).toFixed(2)}`,
          },
          decisionSupport: {
            freeDaysRemaining: 0, // TODO: 从后端获取
            lastFreeDate: '', // TODO: 从后端获取
            warehouseAvailability: '充足',
            weekendAlert: false, // TODO: 根据日期判断
          },
          allAlternatives: (alternatives || []) as any[],
        }

        // ✅ 显示优化结果对话框
        currentOptimizationContainer.value = containerNumber
        showOptimizationDialog.value = true

        addLog(
          `优化完成：建议 ${suggestedPickupDate} 提柜，${suggestedStrategy}，节省 $${(savings || 0).toFixed(2)}`,
          'success'
        )
      } else {
        ElMessage.warning('优化未返回结果')
        addLog(`优化未返回结果`, 'warning')
      }
    })
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('优化失败：' + error.message)
      addLog(`优化失败：${error.message}`, 'error')
    }
  }
}

// ✅ 新增：获取日期状态文本（剩余天数/超期天数）
const getDateStatusText = (dateStr: string) => {
  if (!dateStr) return ''

  const today = dayjs().startOf('day')
  const targetDate = dayjs(dateStr).startOf('day')
  const diffDays = targetDate.diff(today, 'day')

  if (diffDays < 0) {
    return `已超期${Math.abs(diffDays)}天`
  } else if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '明天'
  } else {
    return `剩余${diffDays}天`
  }
}

// ✅ 新增：获取日期状态样式类
const getDateStatusClass = (dateStr: string) => {
  if (!dateStr) return ''

  const today = dayjs().startOf('day')
  const targetDate = dayjs(dateStr).startOf('day')
  const diffDays = targetDate.diff(today, 'day')

  if (diffDays < 0) {
    return 'date-status-overdue' // 超期 - 红色
  } else if (diffDays <= 2) {
    return 'date-status-urgent' // 紧急 - 橙色
  } else {
    return 'date-status-normal' // 正常 - 绿色
  }
}

// ✅ 新增：批量优化保存
const optimizedContainers = ref<Set<string>>(new Set()) // 存储已优化的货柜号

// ✅ 处理接受优化结果（支持批量保存）
const handleAcceptOptimization = async (alternative: any) => {
  console.log('[SchedulingVisual] 接受优化方案:', alternative)

  try {
    // 1. 获取当前货柜的完整预览数据
    const currentContainer = previewResults.value.find(
      (r: any) => r.containerNumber === currentOptimizationContainer.value
    )

    if (!currentContainer) {
      ElMessage.error('未找到货柜数据')
      return
    }

    // 2. 更新为优化后的方案
    const optimizedData = {
      ...currentContainer,
      plannedData: {
        ...currentContainer.plannedData,
        plannedPickupDate: alternative.pickupDate,
        unloadMode: alternative.strategy,
        plannedReturnDate: alternative.returnDate || currentContainer.plannedData.plannedReturnDate,
      },
      estimatedCosts: alternative.breakdown,
    }

    // 3. 添加到批量保存列表
    optimizedContainers.value.add(currentOptimizationContainer.value)

    // 4. 更新预览结果（本地更新，不立即保存）
    const index = previewResults.value.findIndex(
      (r: any) => r.containerNumber === currentOptimizationContainer.value
    )
    if (index !== -1) {
      previewResults.value[index] = optimizedData
    }

    ElMessage.success(`已添加优化方案到保存列表 (${optimizedContainers.value.size} 个)`)
    addLog(`已添加优化方案：${currentOptimizationContainer.value}`, 'success')

    // 5. 关闭对话框
    showOptimizationDialog.value = false

    // 6. 提示用户是否立即保存
    if (optimizedContainers.value.size > 1) {
      ElMessageBox.confirm(
        `已有 ${optimizedContainers.value.size} 个优化方案待保存。是否立即批量保存？`,
        '批量保存优化方案',
        {
          confirmButtonText: '立即保存',
          cancelButtonText: '稍后保存',
          type: 'warning',
        }
      )
        .then(async () => {
          await handleBatchSaveOptimizations()
        })
        .catch(() => {
          // 用户选择稍后保存
          ElMessage.info('可以继续优化其他货柜，稍后统一保存')
        })
    }
  } catch (error: any) {
    console.error('[handleAcceptOptimization] error:', error)
    ElMessage.error('保存失败：' + (error.message || '未知错误'))
    addLog('保存失败：' + error.message, 'error')
  } finally {
    saving.value = false
  }
}

// ✅ 新增：批量保存优化方案
const handleBatchSaveOptimizations = async () => {
  if (optimizedContainers.value.size === 0) {
    ElMessage.warning('没有需要保存的优化方案')
    return
  }

  try {
    saving.value = true
    addLog(`正在批量保存 ${optimizedContainers.value.size} 个优化方案...`, 'info')

    // 1. 收集所有优化后的数据
    const containersToSave = Array.from(optimizedContainers.value)
    const optimizedDataList = previewResults.value.filter((r: any) =>
      containersToSave.includes(r.containerNumber)
    )

    console.log('[handleBatchSaveOptimizations] 保存的优化方案:', optimizedDataList)

    // 2. 批量调用后端保存
    const result = await containerService.confirmSchedule({
      containerNumbers: containersToSave,
      previewResults: optimizedDataList,
    })

    if (result.success) {
      ElMessage.success(`成功保存 ${result.savedCount} 个优化方案`)
      addLog(`批量保存完成：成功 ${result.savedCount} 个`, 'success')

      // 3. 清空优化列表
      optimizedContainers.value.clear()
      saving.value = false

      // 4. 刷新概览数据
      await loadOverview()

      // 5. 退出预览模式，显示正式排产结果
      isPreviewMode.value = false
      previewResults.value = []
      selectedPreviewContainers.value = []

      // 6. 重新执行预览排产（获取最新的 initial 货柜）
      // await handlePreviewSchedule()  ← 已移除，不需要自动重新预览

      ElMessage.success('所有优化方案已保存')
      addLog('所有优化方案已保存，请刷新页面查看最新排产结果', 'success')
    } else {
      ElMessage.error('保存失败：' + (result as any).message)
      addLog('保存失败：' + (result as any).message, 'error')
    }
  } catch (error: any) {
    console.error('[handleBatchSaveOptimizations] error:', error)
    ElMessage.error('保存失败：' + (error.message || '未知错误'))
    addLog('保存失败：' + error.message, 'error')
  } finally {
    saving.value = false
  }
}

// ✅ 处理拒绝优化结果
const handleRejectOptimization = (alternative: any) => {
  console.log('[SchedulingVisual] 拒绝优化方案:', alternative)
  ElMessage.info('已取消优化')
  showOptimizationDialog.value = false
}

// ✅ 新增：获取最晚提柜日标签状态
const getLfdTagStatus = (row: any) => {
  const today = new Date()
  const lfd = row.lastFreeDate ? new Date(row.lastFreeDate) : null
  if (!lfd) return 'info'

  const diffDays = Math.floor((lfd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'danger' // 超期
  if (diffDays <= 2) return 'warning' // 即将到期
  return 'success' // 安全
}

// ✅ 新增：获取最晚提柜日倒计时文本
const getLfdCountdown = (row: any) => {
  const today = new Date()
  const lfd = row.lastFreeDate ? new Date(row.lastFreeDate) : null
  if (!lfd) return ''

  const diffDays = Math.floor((lfd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `超期${Math.abs(diffDays)}天`
  if (diffDays === 0) return '今天到期'
  if (diffDays === 1) return '明天到期'
  return `剩${diffDays}天`
}

// ✅ 新增：获取最晚还箱日标签状态
const getLrdTagStatus = (row: any) => {
  const today = new Date()
  const lrd = row.lastReturnDate ? new Date(row.lastReturnDate) : null
  if (!lrd) return 'info'

  const diffDays = Math.floor((lrd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'danger' // 超期
  if (diffDays <= 2) return 'warning' // 即将到期
  return 'success' // 安全
}

// ✅ 新增：获取最晚还箱日倒计时文本
const getLrdCountdown = (row: any) => {
  const today = new Date()
  const lrd = row.lastReturnDate ? new Date(row.lastReturnDate) : null
  if (!lrd) return ''

  const diffDays = Math.floor((lrd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return `超期${Math.abs(diffDays)}天`
  if (diffDays === 0) return '今天到期'
  if (diffDays === 1) return '明天到期'
  return `剩${diffDays}天`
}

// ✅ 新增：获取剩余免费天样式类
const getFreeDaysClass = (days: number) => {
  if (days < 0) return 'text-danger font-weight-bold' // 超期
  if (days <= 2) return 'text-warning font-weight-bold' // 紧张
  return 'text-success' // 安全
}

// 监听国家变化
const watchCountryChange = () => {
  loadOverview()
}

onMounted(() => {
  console.log('[SchedulingVisual] onMounted')

  try {
    // 优先使用 props，其次使用 route.query
    const country = props.country || (route.query.country as string)
    const startDate = route.query.startDate as string
    const endDate = route.query.endDate as string

    // 如果有 country 参数，更新 store
    if (country) {
      console.log('[SchedulingVisual] 设置国家代码:', country)
      appStore.setScopedCountryCode(country)
    }

    // 初始化日期范围：优先 props，其次 route.query
    if (props.initialDateRange) {
      console.log('[SchedulingVisual] 使用 props 日期范围:', props.initialDateRange)
      dateRange.value = props.initialDateRange
    } else if (startDate && endDate) {
      console.log('[SchedulingVisual] 设置日期范围:', startDate, endDate)
      dateRange.value = [dayjs(startDate).toDate(), dayjs(endDate).toDate()]
    }

    console.log('[SchedulingVisual] 调用 loadOverview')
    loadOverview().catch(err => handleError(err, '初始化加载失败'))

    // 监听国家变化
    appStore.$subscribe(_mutation => {
      watchCountryChange()
    })
  } catch (error: any) {
    handleError(error, '组件初始化失败')
  }
})
</script>

<style scoped>
/* ✅ 优化：顶部操作区样式 */
.top-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

/* ① 左侧过滤条件组 */
.filter-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 400px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
  min-width: 60px;
}

.port-select {
  width: 220px;
}

/* ② 中间高级设置组 */
.advanced-group {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border-left: 1px solid #e4e7ed;
  border-right: 1px solid #e4e7ed;
}

.advanced-setting {
  display: flex;
  align-items: center;
  gap: 8px;
}

.unit-label {
  font-size: 13px;
  color: #909399;
  margin-left: 4px;
}

/* ③ 右侧操作按钮组 */
.action-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 响应式支持 */
@media (max-width: 1400px) {
  .top-action-bar {
    flex-wrap: wrap;
  }

  .filter-group {
    min-width: 100%;
  }

  .advanced-group {
    width: 100%;
    justify-content: center;
    padding: 12px 0;
    border: none;
    border-top: 1px solid #e4e7ed;
  }

  .action-group {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .top-action-bar {
    padding: 12px 16px;
  }

  .filter-item {
    flex-wrap: wrap;
  }

  .filter-label {
    min-width: 100%;
  }
}
.scheduling-page {
  padding: 12px;
  min-height: 100vh;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* 紧凑顶部栏 */
.top-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
}

.filter-label {
  margin-right: 4px;
  color: #606266;
  font-size: 13px;
}

/* 紧凑统计栏 */
.stat-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.stat-item {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.stat-item .stat-icon {
  font-size: 18px;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.stat-item .stat-icon.pending {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.stat-item .stat-icon.initial {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}
.stat-item .stat-icon.issued {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}
.stat-item .stat-icon.warehouse {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-item .stat-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.stat-item .stat-label {
  font-size: 12px;
  color: #909399;
}

/* 紧凑卡片 */
.compact-card {
  margin-bottom: 12px;
}

.compact-card :deep(.el-card__header) {
  padding: 10px 14px;
  font-size: 13px;
}

.compact-card :deep(.el-card__body) {
  padding: 10px;
}

/* ✅ 优化：执行日志卡片样式 */
.log-card {
  margin-top: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ✅ 新增：批量操作栏样式 */
.batch-action-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #fff7e6 0%, #ffffff 100%);
  border: 1px solid #ffd591;
  border-radius: 8px;
  margin-bottom: 16px;
}

/* ✅ 新增：顶部批量操作栏样式（标题栏下方） */
.batch-action-bar-top {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f5f7fa;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin: 12px 0;
}

/* ✅ 新增：选择操作区样式（独立容器） */
.selection-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ✅ 新增：选择操作区样式（内联到标题栏） */
.selection-actions-inline {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-right: 1px solid #dcdfe6;
  margin-right: 12px;
}

/* ✅ 增强：高级搜索区样式 */
.advanced-search {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* ✅ 增强：费用明细样式 */
.cost-breakdown {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.cost-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.cost-label {
  color: #666;
  flex-shrink: 0;
}

.cost-value {
  font-weight: 500;
  text-align: right;
  flex-shrink: 0;
}

.cost-value.danger {
  color: #f56c6c;
}

.cost-value.warning {
  color: #e6a23c;
}

.cost-value.info {
  color: #409eff;
}

.cost-value-total {
  font-weight: bold;
  font-size: 13px;
}

.cost-row.total {
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px dashed #ddd;
}

/* 费用颜色类别 */
.cost-low {
  color: #67c23a;
}

.cost-medium {
  color: #e6a23c;
}

.cost-high {
  color: #f56c6c;
}

.cost-critical {
  color: #f56c6c;
  font-weight: bold;
}

/* ✅ 优化：免费期显示样式 */
.text-danger {
  color: #f56c6c;
}

.text-warning {
  color: #e6a23c;
}

.text-success {
  color: #67c23a;
}

.font-weight-bold {
  font-weight: bold;
}

/* ✅ 优化：结果卡片样式 */
.result-card {
  margin-top: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* ① 卡片头部优化 */
.card-header-optimized {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 20px;
  color: #409eff;
  margin-right: 8px;
}

.header-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.header-right {
  display: flex;
  gap: 8px;
}

/* ② TAB 过滤区优化 */
.tabs-filter-section {
  margin-top: 16px;
}

/* ✅ 优化：增强统计信息展示 */
.result-stats-enhanced {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 8px;
}

.stat-badge {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
}

.stat-badge:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.stat-badge-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.stat-badge.total .stat-badge-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-badge.success .stat-badge-icon {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
}

.stat-badge.failed .stat-badge-icon {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
}

.stat-badge.rate .stat-badge-icon {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
}

.stat-badge-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 2px;
}

/* ✅ 优化：TAB 工具栏 */
.tab-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.tab-desc {
  font-size: 13px;
  color: #606266;
}

.tab-desc.success {
  color: #67c23a;
  font-weight: 500;
}

.tab-desc.danger {
  color: #f56c6c;
  font-weight: 500;
}

/* ✅ 优化：结果卡片样式 */
.result-card {
  margin-top: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* ① 卡片头部优化 */
.card-header-optimized {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-icon {
  font-size: 20px;
  color: #409eff;
  margin-right: 8px;
}

.header-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.header-right {
  display: flex;
  gap: 8px;
}

/* ② TAB 过滤区优化 */
.tabs-filter-section {
  margin-top: 16px;
}

/* ✅ 响应式支持 */
@media (max-width: 1400px) {
  .result-stats-enhanced {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .result-stats-enhanced {
    grid-template-columns: 1fr;
  }

  .stat-badge {
    padding: 12px;
  }

  .stat-value {
    font-size: 20px;
  }

  .stat-badge-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
}

.mb-4 {
  margin-bottom: 12px;
}

.mt-2 {
  margin-top: 8px;
}

.mt-4 {
  margin-top: 12px;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.tab-header span {
  font-size: 13px;
  color: #303133;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flow-arrow {
  color: #c0c4cc;
  font-size: 24px;
}

.log-container {
  height: 200px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 8px;
  font-family: monospace;
  font-size: 12px;
}

.log-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 8px;
  color: #dcdfe6;
}

.log-item .el-icon {
  margin-right: 8px;
  margin-top: 2px;
}

.log-item.success {
  color: #67c23a;
}

.log-item.error {
  color: #f56c6c;
}

.log-item.info {
  color: #409eff;
}

.log-time {
  color: #909399;
  margin-right: 8px;
}

.log-message {
  flex: 1;
}

.log-empty {
  color: #606266;
  text-align: center;
  padding: 100px 0;
}

.text-success {
  color: #67c23a;
  font-weight: bold;
}

.text-danger {
  color: #f56c6c;
  font-weight: bold;
}

.result-actions {
  display: flex;
  gap: 8px;
}

.result-tabs :deep(.el-tabs__content) {
  padding-top: 10px;
}

.schedule-stats {
  display: flex;
  justify-content: space-around;
  padding: 20px 0;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 8px;
  margin-bottom: 16px;
}

.stat-box {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.stat-icon-bg {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-box.total .stat-icon-bg {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-box.success .stat-icon-bg {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  color: white;
}

.stat-box.failed .stat-icon-bg {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
  color: white;
}

.stat-box.progress {
  flex-direction: column;
  padding: 12px 20px;
}

.progress-wrapper {
  margin-bottom: 8px;
}

.stat-info {
  text-align: center;
}

.stat-num {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.stat-box.success .stat-num {
  color: #67c23a;
}

.stat-box.failed .stat-num {
  color: #f56c6c;
}

/* ✅ 计划日期样式 */
.plan-dates-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.plan-date-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}

.plan-date-item .el-icon {
  color: #909399;
  font-size: 14px;
}

.date-label {
  color: #606266;
  font-weight: 500;
  min-width: 40px;
}

.date-value {
  color: #303133;
  font-weight: 500;
}

/* ✅ 费用树形结构样式 */
.cost-tree {
  width: 100%;
}

.cost-tree-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 2px 4px; /* ✅ 更紧凑：从 4px 0 改为 2px 4px */
}

.cost-tree-label {
  color: #606266;
  font-size: 13px;
  flex: 1; /* ✅ 标签占据剩余空间 */
}

.cost-tree-value {
  font-weight: 500;
  font-size: 13px;
  min-width: 100px; /* ✅ 金额固定宽度 */
  text-align: left; /* ✅ 金额左对齐 */
}

.cost-tree-value.cost-value-total {
  color: #303133;
  font-weight: bold;
  font-size: 14px;
}

/* 费用等级样式 */
.cost-tree-value.cost-critical {
  color: #f56c6c;
  font-weight: bold;
}

.cost-tree-value.cost-warning {
  color: #e6a23c;
  font-weight: 500;
}

/* 树形节点缩进 */
.cost-tree :deep(.el-tree-node__content) {
  height: auto;
  padding: 2px 0; /* ✅ 更紧凑：减少垂直间距 */
}

.cost-tree :deep(.el-tree-node__expand-icon) {
  font-size: 12px;
  color: #909399;
}

/* ✅ 总费用行样式（隐藏标签，只显示金额） */
.cost-tree :deep(.el-tree-node.is-leaf .el-tree-node__content) {
  padding-left: 0; /* ✅ 根节点不缩进 */
}

.stat-text {
  font-size: 13px;
  color: #909399;
  margin-top: 2px;
}

.date-item {
  display: inline-block;
  margin-right: 12px;
  font-size: 12px;
}

.date-item::before {
  content: '';
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-right: 4px;
  background: #409eff;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.tab-header span {
  font-weight: bold;
  font-size: 14px;
  color: #303133;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.chart-container {
  height: 400px;
  margin-top: 16px;
}

.chart {
  width: 100%;
  height: 100%;
}

.date-range-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-range-picker span {
  color: #606266;
  font-size: 14px;
}

/* 日期状态样式 */
.date-status {
  margin-left: 8px;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.date-status-normal {
  color: #67c23a;
  background-color: #f0f9eb;
}

.date-status-urgent {
  color: #e6a23c;
  background-color: #fdf6ec;
}

.date-status-overdue {
  color: #f56c6c;
  background-color: #fef0f0;
}
</style>
