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

    <!-- 紧凑流程图 -->
    <div class="flow-bar">
      <div class="flow-step" :class="{ active: currentStep >= 1 }">
        <span class="step-num">1</span>
        <span class="step-text">查询</span>
      </div>
      <span class="flow-arrow">→</span>
      <div class="flow-step" :class="{ active: currentStep >= 2 }">
        <span class="step-num">2</span>
        <span class="step-text">排序</span>
      </div>
      <span class="flow-arrow">→</span>
      <div class="flow-step" :class="{ active: currentStep >= 3 }">
        <span class="step-num">3</span>
        <span class="step-text">计划日</span>
      </div>
      <span class="flow-arrow">→</span>
      <div class="flow-step" :class="{ active: currentStep >= 4 }">
        <span class="step-num">4</span>
        <span class="step-text">资源</span>
      </div>
      <span class="flow-arrow">→</span>
      <div class="flow-step" :class="{ active: currentStep >= 5 }">
        <span class="step-num">5</span>
        <span class="step-text">写回</span>
      </div>
    </div>

    <!-- ✅ 优化：将执行日志移到下方，与排产结果并列 -->
    <el-row :gutter="12">
      <el-col :span="24">
        <el-card class="log-card" v-if="logs.length > 0">
          <template #header>
            <div class="card-header">
              <span
                ><el-icon><Document /></el-icon> 执行日志</span
              >
              <div class="header-actions">
                <el-tag size="small" :type="logs.length > 0 ? 'success' : 'info'">
                  {{ logs.length }} 条记录
                </el-tag>
                <el-button text size="small" @click="logs = []">
                  <el-icon><Delete /></el-icon> 清空
                </el-button>
              </div>
            </div>
          </template>

          <div class="log-container" ref="logContainer">
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

    <!-- ✅ 优化：排产结果/预览合并卡片 - 根据 isPreviewMode 切换模式 -->
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
          <!-- ✅ 新增：预览模式下的批量操作栏 -->
          <div v-if="isPreviewMode" class="batch-action-bar">
            <el-alert type="warning" :closable="false" show-icon style="flex: 1">
              <template #title>
                已选择 <strong>{{ selectedPreviewContainers.length }}</strong> 个货柜，请确认后保存
              </template>
            </el-alert>
            <el-button
              type="primary"
              size="small"
              @click="selectAllOnPage"
              :disabled="displayResults.every((r: any) => r.success === false)"
            >
              全选成功项
            </el-button>
            <el-button type="default" size="small" @click="clearSelection"> 取消全选 </el-button>
          </div>

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
                    <el-option label="Direct" value="Direct" />
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
                        <div>免费天数：{{ row.freeDays !== undefined ? row.freeDays : '-' }}</div>
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
                        <div>免费天数：{{ row.freeDays !== undefined ? row.freeDays : '-' }}</div>
                        <div>计算逻辑：从卸柜日开始计算免费期</div>
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
                <el-table-column label="计划日期" min-width="160">
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
                        <span class="date-value">{{ row.plannedData.unloadDate || '-' }}</span>
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
                        <span class="date-value">{{ row.plannedData.unloadDate || '-' }}</span>
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
  </div>
</template>

<script setup lang="ts">
import DateRangePicker from '@/components/common/DateRangePicker.vue'
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
// ✅ 已移除：SchedulingPreviewModal 组件不再需要

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
const scheduling = ref(false)
const loading = ref(true) // 添加 loading 状态
const currentStep = ref(0)
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

const BATCH_SIZE = 3

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
  currentStep.value = 0
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
    currentStep.value = 1
    addLog(`开始排产，待排产货柜: ${overview.value.pendingCount} 个`, 'info')
    currentStep.value = 2
    addLog('按 ATA/ETA 排序（先到先得）', 'info')
    currentStep.value = 3
    addLog('计算计划清关日/提柜日/送仓日', 'info')
    currentStep.value = 4
    addLog(
      `可用仓库: ${overview.value.warehouses?.length || 0} 个，可用车队: ${overview.value.truckings?.length || 0} 个`,
      'info'
    )
    currentStep.value = 5
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
      result.results.forEach((r: any) => {
        allResults.push(r)
        if (r.success) {
          totalSuccess += 1
          const dates = r.plannedData
            ? ` 提柜:${r.plannedData.plannedPickupDate} 送仓:${r.plannedData.plannedDeliveryDate} 还箱:${r.plannedData.plannedReturnDate}`
            : ''
          addLog(`✓ ${r.containerNumber}: ${r.message || '成功'}${dates}`, 'success')
        } else {
          totalFailed += 1
          addLog(`✗ ${r.containerNumber}: ${r.message || '失败'}`, 'error')
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
    currentStep.value = 0
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

    // 调用批量排产接口，dryRun=true（只计算不保存）
    const result = await containerService.batchSchedule({
      country: resolvedCountry.value || undefined,
      portCode: selectedPortCode.value || undefined, // ✅ 新增：传递港口参数
      startDate: dateRange.value?.[0] ? dayjs(dateRange.value[0]).format('YYYY-MM-DD') : undefined,
      endDate: dateRange.value?.[1] ? dayjs(dateRange.value[1]).format('YYYY-MM-DD') : undefined,
      dryRun: true, // ← 关键：预览模式
      etaBufferDays: etaBufferDays.value, // ✅ 新增：ETA 顺延天数
    })

    if (!result.success) {
      ElMessage.error('预览失败：' + (result as any).message)
      return
    }

    // 转换数据格式以适配预览组件
    previewResults.value = result.results.map((r: any) => ({
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
      freeDaysRemaining: r.freeDaysRemaining ?? undefined,
    }))

    // ✅ 直接显示预览结果，不再弹出对话框
    isPreviewMode.value = true
    scheduleResult.value = null // 清空正式结果

    addLog(`预览完成：成功 ${result.successCount} 个，失败 ${result.failedCount} 个`, 'info')
    ElMessage.success(`预览完成：成功 ${result.successCount} 个，请在下方审查并勾选要保存的方案`)
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

    // 调用 confirm 接口（重新计算并保存）
    const result = await containerService.confirmSchedule({
      containerNumbers: selectedPreviewContainers.value,
    })

    if (result.success) {
      ElMessage.success(`成功保存 ${result.savedCount} 个货柜`)
      addLog(`确认保存完成：成功 ${result.savedCount} 个`, 'success')

      // 清空预览状态
      isPreviewMode.value = false
      previewResults.value = []
      selectedPreviewContainers.value = []

      // 刷新概览数据
      await loadOverview()

      // 触发完成事件
      emit('complete', result)
    } else {
      ElMessage.error('保存失败：' + (result as any).message)
      addLog('保存失败：' + (result as any).message, 'error')
    }
  } catch (error: any) {
    ElMessage.error('保存失败：' + (error.message || '未知错误'))
    addLog('保存失败：' + error.message, 'error')
  } finally {
    saving.value = false
  }
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

// ✅ 新增：成本优化快捷操作
const handleOptimizeContainer = async (row: any) => {
  const containerNumber = row.containerNumber

  // ✅ 优化：从多个可能的字段获取仓库代码
  const warehouseCode =
    row.plannedData?.warehouseCode || // 优先从 plannedData 获取
    row.warehouseCode || // 从根对象获取
    row.destinationWarehouse || // 备用字段 1
    row.warehouseId || // 备用字段 2
    row.warehouseName?.split(' ')[0] || // ✅ 新增：从仓库名称提取（如果有）
    row.plannedData?.warehouseName?.split(' ')[0] // ✅ 新增：从 plannedData 的仓库名称提取

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
        const { savings, suggestedPickupDate, suggestedStrategy, alternatives } = result.data

        // 显示优化结果
        ElMessageBox.alert(
          `<div class="optimize-result">
            <p><strong>优化方案：</strong></p>
            <ul>
              <li>建议提柜日：${suggestedPickupDate}</li>
              <li>建议策略：${suggestedStrategy}</li>
              <li>预计节省：$${savings.toFixed(2)}</li>
            </ul>
            <p><strong>备选方案：</strong></p>
            <ul>
              ${alternatives
                .slice(0, 3)
                .map(
                  (alt: any) =>
                    `<li>提柜日：${alt.pickupDate} | 策略：${alt.strategy} | 总成本：$${alt.totalCost.toFixed(2)} | 节省：$${alt.savings.toFixed(2)}</li>`
                )
                .join('')}
            </ul>
          </div>`,
          `货柜 ${containerNumber} 优化完成`,
          {
            dangerouslyUseHTMLString: true,
            confirmButtonText: '确定',
            type: 'success',
          }
        )
        addLog(
          `优化完成：建议 ${suggestedPickupDate} 提柜，${suggestedStrategy}，节省 $${savings.toFixed(2)}`,
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

/* 紧凑流程条 */
.flow-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px;
  background: #fff;
  border-radius: 4px;
}

.flow-step {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 4px;
  background: #f5f7fa;
  color: #909399;
}

.flow-step.active {
  background: #409eff;
  color: #fff;
}

.flow-step .step-num {
  font-size: 12px;
  font-weight: 600;
}

.flow-step .step-text {
  font-size: 12px;
}

.flow-bar .flow-arrow {
  color: #c0c4cc;
  font-size: 12px;
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
</style>
