<template>
  <div class="scheduling-page" v-loading="loading">
    <!-- 紧凑顶部栏 -->
    <div class="top-bar">
      <span class="filter-label">日期：</span>
      <DateRangePicker v-model="dateRange" />
      <el-button type="primary" link @click="loadOverview">刷新</el-button>
      <el-button type="info" size="small" @click="showLogicDialog = true">
        <el-icon><InfoFilled /></el-icon>
        逻辑
      </el-button>
      <el-button
        type="primary"
        :loading="scheduling"
        @click="handlePreviewSchedule"
        title="预览排产方案，确认后保存"
      >
        <el-icon><Cpu /></el-icon>
        预览排产
      </el-button>
      <el-button
        type="success"
        :loading="scheduling"
        @click="handleSchedule"
        title="直接开始排产，分批处理并实时显示结果"
      >
        <el-icon><VideoPlay /></el-icon>
        执行排产
      </el-button>
      <el-button type="default" @click="goBackToShipments">
        <el-icon><ArrowLeft /></el-icon>
        返回货柜管理
      </el-button>
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

    <!-- 执行日志 -->
    <el-row :gutter="12">
      <el-col :span="24">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>执行日志</span>
              <el-button text @click="logs = []">清空</el-button>
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
            <div v-if="logs.length === 0" class="log-empty">点击"开始排产"执行排产流程</div>
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

    <!-- 排产结果 -->
    <el-card v-if="scheduleResult" class="mt-4 compact-card">
      <template #header>
        <div class="card-header">
          <span>排产结果</span>
          <div class="result-actions">
            <el-button type="primary" link @click="exportScheduleResult">
              <el-icon><Download /></el-icon>
            </el-button>
            <el-button type="primary" link @click="router.push('/gantt-chart')">
              <el-icon><View /></el-icon>
            </el-button>
          </div>
        </div>
      </template>

      <!-- 紧凑统计 -->
      <div class="result-stats">
        <span class="result-stat">
          <el-icon><Box /></el-icon>
          {{ scheduleResult.total }} 总计
        </span>
        <span class="result-stat success">
          <el-icon><CircleCheck /></el-icon>
          {{ scheduleResult.successCount }} 成功
        </span>
        <span class="result-stat failed">
          <el-icon><CircleClose /></el-icon>
          {{ scheduleResult.failedCount }} 失败
        </span>
        <span class="result-stat">
          成功率:
          {{
            scheduleResult.total > 0
              ? ((scheduleResult.successCount / scheduleResult.total) * 100).toFixed(1)
              : 0
          }}%
        </span>
      </div>

      <!-- 分组显示 -->
      <el-tabs v-model="resultTab" class="result-tabs">
        <el-tab-pane label="全部" name="all">
          <el-table :data="scheduleResult.results" max-height="250" size="small" stripe>
            <el-table-column label="柜号" width="130" fixed>
              <template #default="{ row }">
                <el-link type="primary" @click="router.push(`/shipments/${row.containerNumber}`)">
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
            <el-table-column prop="warehouseName" label="仓库" width="120" show-overflow-tooltip />
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

        <el-tab-pane label="成功" name="success">
          <el-table :data="successResults" max-height="300" size="small" stripe>
            <el-table-column label="柜号" width="150" fixed>
              <template #default="{ row }">
                <el-link type="primary" @click="router.push(`/shipments/${row.containerNumber}`)">
                  {{ row.containerNumber }}
                </el-link>
              </template>
            </el-table-column>
            <el-table-column prop="destinationPort" label="目的港" width="90" />
            <el-table-column prop="warehouseName" label="仓库" width="120" show-overflow-tooltip />
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

        <el-tab-pane label="失败" name="failed">
          <el-table :data="failedResults" max-height="300" size="small" stripe>
            <el-table-column label="柜号" width="150" fixed>
              <template #default="{ row }">
                <el-link type="primary" @click="router.push(`/shipments/${row.containerNumber}`)">
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
    </el-card>
  </div>

  <!-- 智能排柜逻辑说明对话框 -->
  <el-dialog
    v-model="showLogicDialog"
    title="智能排柜逻辑说明"
    width="700px"
    :close-on-click-modal="true"
  >
    <div class="logic-dialog-content">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="待排产条件">
          scheduleStatus = 'initial' | 'issued'，且有 ATA 或 ETA（目的港）
        </el-descriptions-item>
        <el-descriptions-item label="排产排序">
          按 ATA/ETA 升序，同日内按 lastFreeDate 升序（先到先得）
        </el-descriptions-item>
        <el-descriptions-item label="计划清关日"> = ETA（无则用 ATA） </el-descriptions-item>
        <el-descriptions-item label="计划提柜日">
          = 清关日 + 1天，且 ≤ lastFreeDate
        </el-descriptions-item>
        <el-descriptions-item label="候选仓库">
          港口→车队→仓库 映射链，无则返回 []
        </el-descriptions-item>
        <el-descriptions-item label="选择仓库">
          从候选仓库中找最早有产能的仓库和卸柜日
        </el-descriptions-item>
        <el-descriptions-item label="卸柜方式">
          提柜日=卸柜日 ? "Live load" : "Drop off"
        </el-descriptions-item>
        <el-descriptions-item label="计划还箱日">
          从 EmptyReturn 取 lastReturnDate，或 fallback lastFreeDate+7
        </el-descriptions-item>
        <el-descriptions-item label="选择车队">
          仓库→车队映射 + 港口→车队映射，取有剩余档期的
        </el-descriptions-item>
        <el-descriptions-item label="选择清关公司">
          根据国家匹配，无则用 "UNSPECIFIED"
        </el-descriptions-item>
        <el-descriptions-item label="数据写入">
          拖卡运输、仓库操作、港口操作、还箱记录
        </el-descriptions-item>
      </el-descriptions>

      <el-divider>数据写入详情</el-divider>

      <el-table :data="writeDataInfo" size="small" border>
        <el-table-column prop="table" label="表" width="220" />
        <el-table-column prop="fields" label="写入字段" />
      </el-table>

      <el-divider>关键约束</el-divider>

      <ul class="constraint-list">
        <li><strong>仓库选择</strong>：严格按映射链（港口→车队→仓库），无回退</li>
        <li>
          <strong>车队选择</strong>：必须在 warehouse_trucking_mapping + trucking_port_mapping
          中同时存在
        </li>
        <li><strong>产能扣减</strong>：排产后立即扣减仓库日产能和车队档期</li>
        <li><strong>还箱码头</strong>：使用仓库信息（warehouseCode/warehouseName）</li>
        <li><strong>提柜日回退</strong>：如果计划提柜日 &lt; 今天，则提柜日=今天，清关日=昨天</li>
        <li><strong>还箱日约束</strong>：还箱日 ≥ 卸柜日（Live load: 还=卸；Drop off: 还=卸+1）</li>
      </ul>
    </div>
    <template #footer>
      <el-button type="primary" @click="showLogicDialog = false">关闭</el-button>
    </template>
  </el-dialog>

  <!-- 预览确认弹窗 -->
  <SchedulingPreviewModal
    v-model="showPreviewModal"
    :preview-results="previewResults"
    @confirm="handleConfirmSchedule"
    @cancel="showPreviewModal = false"
    @view-container="cn => router.push(`/shipments/${cn}`)"
  />
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
  VideoPlay,
  View
} from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
})
const scheduling = ref(false)
const loading = ref(true) // 添加 loading 状态
const currentStep = ref(0)
const logs = ref<Array<{ time: string; message: string; type: string }>>([])
const logContainer = ref<HTMLElement>()
const scheduleResult = ref<any>(null)
const resultTab = ref('all')

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
      startDate: dateRange.value?.[0] ? dayjs(dateRange.value[0]).format('YYYY-MM-DD') : undefined,
      endDate: dateRange.value?.[1] ? dayjs(dateRange.value[1]).format('YYYY-MM-DD') : undefined,
      dryRun: true, // ← 关键：预览模式
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

/* 结果统计 */
.result-stats {
  display: flex;
  gap: 16px;
  margin-bottom: 10px;
}

.result-stat {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #606266;
}

.result-stat.success {
  color: #67c23a;
}

.result-stat.failed {
  color: #f56c6c;
}

.result-tabs :deep(.el-tabs__content) {
  padding: 0;
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
