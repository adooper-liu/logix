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

    <!-- ✅ 优化：排产结果卡片 - 按注意力路线重新布局 -->
    <el-card v-if="scheduleResult || !loading" class="result-card">
      <!-- ① 卡片头部：标题 + 核心操作（第一眼关注） -->
      <template #header>
        <div class="card-header-optimized">
          <div class="header-left">
            <el-icon class="header-icon"><DataLine /></el-icon>
            <span class="header-title">排产结果</span>
            <el-tag v-if="scheduleResult?.total > 0" :type="getResultTagType()" size="small">
              {{ scheduleResult.total }} 个货柜
            </el-tag>
          </div>
          <div class="header-right">
            <!-- 主要操作：导出 -->
            <el-button
              type="primary"
              size="small"
              @click="exportScheduleResult"
              :disabled="!scheduleResult"
            >
              <el-icon><Download /></el-icon> 导出
            </el-button>
            <!-- 次要操作：查看甘特图 -->
            <el-button
              type="success"
              size="small"
              plain
              @click="router.push('/gantt-chart')"
              :disabled="!scheduleResult"
            >
              <el-icon><View /></el-icon> 甘特图
            </el-button>
          </div>
        </div>
      </template>

      <!-- 有数据时显示统计徽章和 TAB -->
      <template v-if="scheduleResult">
        <!-- ② 统计徽章区：4 个关键指标（视觉焦点） -->
        <div class="result-stats-enhanced">
          <div class="stat-badge total">
            <div class="stat-badge-icon">
              <el-icon><Box /></el-icon>
            </div>
            <div class="stat-badge-content">
              <div class="stat-value">{{ scheduleResult.total }}</div>
              <div class="stat-label">总计</div>
            </div>
          </div>

          <div class="stat-badge success">
            <div class="stat-badge-icon">
              <el-icon><CircleCheck /></el-icon>
            </div>
            <div class="stat-badge-content">
              <div class="stat-value">{{ scheduleResult.successCount }}</div>
              <div class="stat-label">成功</div>
            </div>
          </div>

          <div class="stat-badge failed">
            <div class="stat-badge-icon">
              <el-icon><CircleClose /></el-icon>
            </div>
            <div class="stat-badge-content">
              <div class="stat-value">{{ scheduleResult.failedCount }}</div>
              <div class="stat-label">失败</div>
            </div>
          </div>

          <div class="stat-badge rate">
            <div class="stat-badge-content">
              <div class="stat-value">
                {{
                  scheduleResult.total > 0
                    ? ((scheduleResult.successCount / scheduleResult.total) * 100).toFixed(1)
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
            <el-tab-pane :label="`全部 ${scheduleResult.total}`" name="all">
              <div class="tab-toolbar">
                <span class="tab-desc"
                  ><el-icon><Document /></el-icon> 所有排产结果</span
                >
                <el-input
                  v-if="resultTab === 'all'"
                  v-model="searchText"
                  placeholder="搜索柜号..."
                  prefix-icon="Search"
                  size="small"
                  clearable
                  style="width: 200px"
                />
              </div>
              <el-table
                :data="scheduleResult.results"
                max-height="300"
                size="small"
                stripe
                highlight-current-row
              >
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
                <el-table-column label="计划日期" min-width="200">
                  <template #default="{ row }">
                    <span v-if="row.plannedData">
                      <span class="date-item"
                        >提柜: {{ row.plannedData.plannedPickupDate || '-' }}</span
                      >
                      <span class="date-item"
                        >送仓: {{ row.plannedData.plannedDeliveryDate || '-' }}</span
                      >
                      <span class="date-item"
                        >还箱: {{ row.plannedData.plannedReturnDate || '-' }}</span
                      >
                    </span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <el-table-column prop="message" label="消息" show-overflow-tooltip />
              </el-table>
            </el-tab-pane>

            <el-tab-pane :label="`成功 ${scheduleResult.successCount}`" name="success">
              <div class="tab-toolbar">
                <span class="tab-desc success"
                  ><el-icon><CircleCheck /></el-icon> ✓ 排产成功的货柜</span
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
                :data="successResults"
                max-height="300"
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
                <el-table-column
                  prop="warehouseName"
                  label="仓库"
                  width="120"
                  show-overflow-tooltip
                />
                <el-table-column label="计划日期" min-width="200">
                  <template #default="{ row }">
                    <span v-if="row.plannedData">
                      <span class="date-item"
                        >提柜: {{ row.plannedData.plannedPickupDate || '-' }}</span
                      >
                      <span class="date-item"
                        >送仓: {{ row.plannedData.plannedDeliveryDate || '-' }}</span
                      >
                      <span class="date-item"
                        >还箱: {{ row.plannedData.plannedReturnDate || '-' }}</span
                      >
                    </span>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>

            <el-tab-pane :label="`失败 ${scheduleResult.failedCount}`" name="failed">
              <div class="tab-toolbar">
                <span class="tab-desc danger"
                  ><el-icon><CircleClose /></el-icon> ✗ 排产失败的货柜</span
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
                :data="failedResults"
                max-height="300"
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
            </el-tab-pane>
          </el-tabs>
        </div>
      </template>

      <!-- 无数据时显示提示 -->
      <template v-else>
        <el-empty description="暂无排产结果，请点击“预览排产”执行排产流程" />
      </template>
    </el-card>

    <!-- 预览确认弹窗 -->
    <SchedulingPreviewModal
      v-model="showPreviewModal"
      :preview-results="previewResults"
      @confirm="handleConfirmSchedule"
      @cancel="showPreviewModal = false"
      @view-container="cn => router.push(`/shipments/${cn}`)"
    />

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
  CircleCheck,
  CircleClose,
  Clock,
  Cpu,
  DocumentAdd,
  Download,
  Edit,
  House,
  InfoFilled,
  Setting,
  View,
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DesignatedWarehouseDialog from './components/DesignatedWarehouseDialog.vue'
import SchedulingPreviewModal from './components/SchedulingPreviewModal.vue'

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
const resultTab = ref('all')

// ✅ 新增：搜索文本
const searchText = ref('')

// 计算属性
const successResults = computed(() => {
  return scheduleResult.value?.results?.filter((r: any) => r.success) || []
})

const failedResults = computed(() => {
  return scheduleResult.value?.results?.filter((r: any) => !r.success) || []
})

// 导出CSV
const exportScheduleResult = () => {
  if (!scheduleResult.value?.results?.length) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  const headers = [
    '柜号',
    '状态',
    '目的港',
    '仓库',
    'ETA',
    'ATA',
    '计划提柜日',
    '计划送仓日',
    '计划还箱日',
    '消息',
  ]
  const rows = scheduleResult.value.results.map((r: any) => [
    r.containerNumber,
    r.success ? '成功' : '失败',
    r.destinationPort || '',
    r.warehouseName || '',
    r.etaDestPort || '',
    r.ataDestPort || '',
    r.plannedData?.plannedPickupDate || '',
    r.plannedData?.plannedDeliveryDate || '',
    r.plannedData?.plannedReturnDate || '',
    r.message || '',
  ])

  const csvContent = [headers, ...rows]
    .map(row => row.map((cell: unknown) => `"${cell}"`).join(','))
    .join('\n')

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

// 预览确认相关
const showPreviewModal = ref(false)
const previewResults = ref<any[]>([])

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
      warehouseName: r.plannedData?.warehouseName || '-',
      truckingCompany: r.plannedData?.truckingCompany || '-',
      unloadMode: r.plannedData?.unloadModePlan || '-',
      estimatedCosts: r.plannedData?.estimatedCosts || r.estimatedCosts || undefined,
    }))

    addLog(`预览完成：成功 ${result.successCount} 个，失败 ${result.failedCount} 个`, 'info')
    showPreviewModal.value = true
  } catch (error: any) {
    ElMessage.error('预览失败：' + (error.message || '未知错误'))
  } finally {
    scheduling.value = false
  }
}

// 确认保存排产结果
const handleConfirmSchedule = async (selectedContainers: string[]) => {
  if (selectedContainers.length === 0) {
    ElMessage.warning('请选择要保存的货柜')
    return
  }

  try {
    addLog(`正在保存 ${selectedContainers.length} 个货柜的排产结果...`, 'info')

    // 调用 confirm 接口（重新计算并保存）
    const result = await containerService.confirmSchedule({
      containerNumbers: selectedContainers,
    })

    if (result.success) {
      ElMessage.success(`成功保存 ${result.savedCount} 个货柜`)
      addLog(`确认保存完成：成功 ${result.savedCount} 个`, 'success')

      // 关闭弹窗
      showPreviewModal.value = false
      previewResults.value = []

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
  }
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
