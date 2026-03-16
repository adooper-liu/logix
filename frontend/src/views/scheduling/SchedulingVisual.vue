<template>
  <div class="scheduling-page">
    <!-- 紧凑顶部栏 -->
    <div class="top-bar">
      <span class="filter-label">日期：</span>
      <DateRangePicker v-model="dateRange" />
      <el-button type="primary" link @click="loadOverview">刷新</el-button>
      <el-button type="info" size="small" @click="showLogicDialog = true">
        <el-icon><InfoFilled /></el-icon>
        逻辑
      </el-button>
      <el-button type="primary" :loading="scheduling" @click="handleSchedule">
        <el-icon><Cpu /></el-icon>
        开始排产
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

    <!-- 资源配置和执行日志 -->
    <el-row :gutter="12">
      <!-- 资源配置 -->
      <el-col :span="12">
        <el-card class="compact-card">
          <template #header>
            <span>可用资源配置</span>
          </template>
          
          <el-tabs v-model="activeTab">
            <el-tab-pane label="仓库" name="warehouse">
              <el-table :data="overview.warehouses" max-height="200" size="small">
                <el-table-column prop="code" label="编码" width="80" />
                <el-table-column prop="name" label="名称" />
                <el-table-column prop="country" label="国家" width="60" />
                <el-table-column prop="dailyCapacity" label="产能" width="60" />
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="车队" name="trucking">
              <el-table :data="overview.truckings" max-height="200" size="small">
                <el-table-column prop="code" label="编码" width="80" />
                <el-table-column prop="name" label="名称" />
                <el-table-column prop="country" label="国家" width="60" />
                <el-table-column prop="dailyCapacity" label="产能" width="60" />
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="堆场" name="yard">
              <div class="tab-header">
                <el-button type="primary" size="small" @click="showYardDialog()">
                  <el-icon><Plus /></el-icon>
                </el-button>
              </div>
              <el-table :data="yards" max-height="200" size="small">
                <el-table-column prop="yardCode" label="编码" width="80" />
                <el-table-column prop="yardName" label="名称" />
                <el-table-column prop="portCode" label="港口" width="60" />
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="资源占用" name="occupancy">
              <div class="tab-header">
                <span>资源占用情况</span>
                <div class="date-range-picker">
                  <span>日期范围：</span>
                  <DateRangePicker v-model="occupancyDateRange" />
                  <el-button type="primary" size="small" @click="loadOccupancyData">
                    刷新数据
                  </el-button>
                </div>
              </div>
              <el-tabs v-model="occupancyTab" @tab-change="handleOccupancyTabChange">
                <el-tab-pane label="仓库占用" name="warehouse">
                  <div class="chart-container">
                    <div ref="warehouseChart" class="chart"></div>
                  </div>
                </el-tab-pane>
                <el-tab-pane label="车队占用" name="trucking">
                  <div class="chart-container">
                    <div ref="truckingChart" class="chart"></div>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </el-tab-pane>
            <el-tab-pane label="资源分析" name="analysis">
              <div class="tab-header">
                <span>资源分析</span>
                <el-button type="primary" size="small" @click="loadAnalysisData">
                  分析数据
                </el-button>
              </div>
              <el-tabs v-model="analysisTab">
                <el-tab-pane label="容量利用率" name="utilization">
                  <div class="chart-container">
                    <div ref="utilizationChart" class="chart"></div>
                  </div>
                </el-tab-pane>
                <el-tab-pane label="瓶颈分析" name="bottleneck">
                  <div class="chart-container">
                    <div ref="bottleneckChart" class="chart"></div>
                  </div>
                </el-tab-pane>
              </el-tabs>
            </el-tab-pane>
          </el-tabs>
        </el-card>
      </el-col>

      <!-- 执行日志 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>执行日志</span>
              <el-button text @click="logs = []">清空</el-button>
            </div>
          </template>
          
          <div class="log-container" ref="logContainer">
            <div v-for="(log, index) in logs" :key="index" class="log-item" :class="log.type">
              <el-icon v-if="log.type === 'success'"><CircleCheck /></el-icon>
              <el-icon v-else-if="log.type === 'error'"><CircleClose /></el-icon>
              <el-icon v-else-if="log.type === 'info'"><InfoFilled /></el-icon>
              <span class="log-time">{{ log.time }}</span>
              <span class="log-message">{{ log.message }}</span>
            </div>
            <div v-if="logs.length === 0" class="log-empty">
              点击"开始排产"执行排产流程
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

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
          成功率: {{ scheduleResult.total > 0 ? ((scheduleResult.successCount / scheduleResult.total) * 100).toFixed(1) : 0 }}%
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
                  <span class="date-item">提柜: {{ row.plannedData.plannedPickupDate || '-' }}</span>
                  <span class="date-item">送仓: {{ row.plannedData.plannedDeliveryDate || '-' }}</span>
                  <span class="date-item">还箱: {{ row.plannedData.plannedReturnDate || '-' }}</span>
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
                  <span class="date-item">提柜: {{ row.plannedData.plannedPickupDate || '-' }}</span>
                  <span class="date-item">送仓: {{ row.plannedData.plannedDeliveryDate || '-' }}</span>
                  <span class="date-item">还箱: {{ row.plannedData.plannedReturnDate || '-' }}</span>
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

  <!-- 仓库编辑模态框 -->
  <el-dialog v-model="warehouseDialogVisible" title="编辑仓库日产能" width="500px">
    <el-form :model="warehouseForm" label-width="120px">
      <el-form-item label="仓库编码">
        <el-input v-model="warehouseForm.code" disabled />
      </el-form-item>
      <el-form-item label="仓库名称">
        <el-input v-model="warehouseForm.name" disabled />
      </el-form-item>
      <el-form-item label="日卸柜能力" required>
        <el-input-number v-model="warehouseForm.dailyCapacity" :min="1" :max="1000" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="warehouseDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveWarehouse">保存</el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 车队编辑模态框 -->
  <el-dialog v-model="truckingDialogVisible" title="编辑车队日容量" width="500px">
    <el-form :model="truckingForm" label-width="120px">
      <el-form-item label="车队编码">
        <el-input v-model="truckingForm.code" disabled />
      </el-form-item>
      <el-form-item label="车队名称">
        <el-input v-model="truckingForm.name" disabled />
      </el-form-item>
      <el-form-item label="日容量" required>
        <el-input-number v-model="truckingForm.dailyCapacity" :min="1" :max="1000" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="truckingDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveTrucking">保存</el-button>
      </span>
    </template>
  </el-dialog>

  <!-- 堆场编辑模态框 -->
  <el-dialog v-model="yardDialogVisible" :title="isEditYard ? '编辑堆场' : '新增堆场'" width="600px">
    <el-form :model="yardForm" label-width="120px">
      <el-form-item label="堆场编码" required>
        <el-input v-model="yardForm.yardCode" :disabled="isEditYard" />
      </el-form-item>
      <el-form-item label="堆场名称" required>
        <el-input v-model="yardForm.yardName" />
      </el-form-item>
      <el-form-item label="港口编码">
        <el-input v-model="yardForm.portCode" />
      </el-form-item>
      <el-form-item label="日容量" required>
        <el-input-number v-model="yardForm.dailyCapacity" :min="1" :max="1000" />
      </el-form-item>
      <el-form-item label="日费用" required>
        <el-input-number v-model="yardForm.feePerDay" :min="0" :step="0.01" />
      </el-form-item>
      <el-form-item label="地址">
        <el-input v-model="yardForm.address" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item label="联系电话">
        <el-input v-model="yardForm.contactPhone" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="yardDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveYard">保存</el-button>
      </span>
    </template>
  </el-dialog>

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
        <el-descriptions-item label="计划清关日">
          = ETA（无则用 ATA）
        </el-descriptions-item>
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
        <li><strong>车队选择</strong>：必须在 warehouse_trucking_mapping + trucking_port_mapping 中同时存在</li>
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, DocumentAdd, Edit, House, Cpu, ArrowRight, ArrowDown, ArrowUp, CircleCheck, CircleClose, InfoFilled, View, Download, Box, Plus, ArrowLeft } from '@element-plus/icons-vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import { containerService } from '@/services/container'
import { useAppStore } from '@/store/app'
import dayjs from 'dayjs'

const appStore = useAppStore()
const router = useRouter()
const route = useRoute()

// 日期范围（出运日期口径，与 Shipments 一致）
const dateRange = ref<[Date, Date]>([
  dayjs().startOf('year').toDate(),
  dayjs().endOf('day').toDate()
])

// 从路由参数初始化日期范围
const initDateRangeFromRoute = () => {
  const startDate = route.query.startDate as string
  const endDate = route.query.endDate as string
  
  if (startDate && endDate) {
    dateRange.value = [
      dayjs(startDate).toDate(),
      dayjs(endDate).toDate()
    ]
  }
}


// 操作说明相关
const showLogicDetail = ref(false)
const showLogicDialog = ref(false)
const writeDataInfo = [
  { table: 'process_trucking_transport', fields: 'plannedPickupDate, plannedDeliveryDate, truckingCompanyId, unloadModePlan, scheduleStatus' },
  { table: 'process_warehouse_operations', fields: 'plannedUnloadDate, warehouseId' },
  { table: 'process_port_operations', fields: 'plannedCustomsDate, customsBrokerCode' },
  { table: 'process_empty_returns', fields: 'plannedReturnDate, returnTerminalCode, returnTerminalName' }
]

// 数据
const overview = ref<any>({
  pendingCount: 0,
  initialCount: 0,
  issuedCount: 0,
  warehouses: [],
  truckings: []
})
const yards = ref<any[]>([])
const scheduling = ref(false)
const currentStep = ref(0)
const activeTab = ref('warehouse')
const logs = ref<Array<{ time: string; message: string; type: string }>>([])
const logContainer = ref<HTMLElement>()
const scheduleResult = ref<any>(null)
const resultTab = ref('all')

// 对话框状态
const warehouseDialogVisible = ref(false)
const truckingDialogVisible = ref(false)
const yardDialogVisible = ref(false)
const isEditYard = ref(false)

// 表单数据
const warehouseForm = ref({
  code: '',
  name: '',
  dailyCapacity: 10
})

const truckingForm = ref({
  code: '',
  name: '',
  dailyCapacity: 10
})

const yardForm = ref({
  yardCode: '',
  yardName: '',
  portCode: '',
  dailyCapacity: 100,
  feePerDay: 0,
  address: '',
  contactPhone: ''
})

// 资源占用相关
const occupancyDateRange = ref<[Date, Date]>([
  dayjs().subtract(30, 'day').toDate(),
  dayjs().toDate()
])
const occupancyTab = ref('warehouse')
const warehouseChart = ref<HTMLElement>()
const truckingChart = ref<HTMLElement>()
let warehouseChartInstance: any = null
let truckingChartInstance: any = null

// 资源分析相关
const analysisTab = ref('utilization')
const utilizationChart = ref<HTMLElement>()
const bottleneckChart = ref<HTMLElement>()
let utilizationChartInstance: any = null
let bottleneckChartInstance: any = null

// 计算属性
const successRateColor = computed(() => {
  const rate = scheduleResult.value?.total > 0 
    ? (scheduleResult.value.successCount / scheduleResult.value.total) * 100 
    : 0
  if (rate >= 80) return '#67c23a'
  if (rate >= 50) return '#e6a23c'
  return '#f56c6c'
})

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
  
  const headers = ['柜号', '状态', '目的港', '仓库', 'ETA', 'ATA', '计划提柜日', '计划送仓日', '计划还箱日', '消息']
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
    r.message || ''
  ])
  
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
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
    const result = await containerService.getSchedulingOverview({
      country: appStore.scopedCountryCode,
      startDate: dateRange.value?.[0] ? dayjs(dateRange.value[0]).format('YYYY-MM-DD') : undefined,
      endDate: dateRange.value?.[1] ? dayjs(dateRange.value[1]).format('YYYY-MM-DD') : undefined
    })
    if (result.success) {
      overview.value = result.data
    }
  } catch (error: any) {
    ElMessage.error('加载排产概览失败: ' + error.message)
  }
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
  const allResults: Array<{ containerNumber: string; success: boolean; message?: string; plannedData?: Record<string, string> }> = []
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
    addLog(`可用仓库: ${overview.value.warehouses?.length || 0} 个，可用车队: ${overview.value.truckings?.length || 0} 个`, 'info')
    currentStep.value = 5
    addLog(`每批处理 ${BATCH_SIZE} 个货柜，计算完成后暂停确认`, 'info')

    let skip = 0
    let total = 0
    let hasMore = true

    while (hasMore) {
      addLog(`--- 正在处理第 ${Math.floor(skip / BATCH_SIZE) + 1} 批 ---`, 'info')

      const result = await containerService.batchSchedule({
        country: appStore.scopedCountryCode,
        startDate: dateRange.value?.[0] ? dayjs(dateRange.value[0]).format('YYYY-MM-DD') : undefined,
        endDate: dateRange.value?.[1] ? dayjs(dateRange.value[1]).format('YYYY-MM-DD') : undefined,
        limit: BATCH_SIZE,
        skip
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
        results: allResults
      }

      if (hasMore) {
        try {
          await ElMessageBox.confirm(
            `本批已处理 ${result.results.length} 个货柜，累计成功 ${totalSuccess} / 失败 ${totalFailed}。是否继续排产剩余货柜？`,
            '是否继续',
            {
              confirmButtonText: '继续',
              cancelButtonText: '停止',
              type: 'info'
            }
          )
        } catch {
          addLog('用户选择停止，排产已中止', 'info')
          break
        }
        skip += BATCH_SIZE
      }
    }

    addLog(`排产结束: 成功 ${totalSuccess}/${total}，失败 ${totalFailed}`, totalFailed > 0 ? 'error' : 'success')
    ElMessage.success(`排产结束: 成功 ${totalSuccess}/${total}`)

    await loadOverview()
  } catch (error: any) {
    addLog(`排产异常: ${error.message}`, 'error')
    ElMessage.error('排产异常: ' + error.message)
  } finally {
    scheduling.value = false
    currentStep.value = 0
  }
}

// 加载堆场列表
const loadYards = async () => {
  try {
    const response = await fetch(`/api/v1/scheduling/resources/yards?country=${appStore.scopedCountryCode}`)
    const data = await response.json()
    if (data.success) {
      yards.value = data.data
    }
  } catch (error: any) {
    ElMessage.error('加载堆场列表失败: ' + error.message)
  }
}

// 编辑仓库
const editWarehouse = (row: any) => {
  warehouseForm.value = {
    code: row.code,
    name: row.name,
    dailyCapacity: row.dailyCapacity
  }
  warehouseDialogVisible.value = true
}

// 保存仓库
const saveWarehouse = async () => {
  try {
    const response = await fetch(`/api/v1/scheduling/resources/warehouse/${warehouseForm.value.code}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dailyUnloadCapacity: warehouseForm.value.dailyCapacity
      })
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('仓库日卸柜能力更新成功')
      warehouseDialogVisible.value = false
      loadOverview()
    } else {
      ElMessage.error(data.message)
    }
  } catch (error: any) {
    ElMessage.error('更新失败: ' + error.message)
  }
}

// 编辑车队
const editTrucking = (row: any) => {
  truckingForm.value = {
    code: row.code,
    name: row.name,
    dailyCapacity: row.dailyCapacity
  }
  truckingDialogVisible.value = true
}

// 保存车队
const saveTrucking = async () => {
  try {
    const response = await fetch(`/api/v1/scheduling/resources/trucking/${truckingForm.value.code}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        dailyCapacity: truckingForm.value.dailyCapacity
      })
    })
    const data = await response.json()
    if (data.success) {
      ElMessage.success('车队日容量更新成功')
      truckingDialogVisible.value = false
      loadOverview()
    } else {
      ElMessage.error(data.message)
    }
  } catch (error: any) {
    ElMessage.error('更新失败: ' + error.message)
  }
}

// 显示堆场对话框
const showYardDialog = (row?: any) => {
  if (row) {
    // 编辑模式
    isEditYard.value = true
    yardForm.value = {
      yardCode: row.yardCode,
      yardName: row.yardName,
      portCode: row.portCode || '',
      dailyCapacity: row.dailyCapacity,
      feePerDay: row.feePerDay,
      address: row.address || '',
      contactPhone: row.contactPhone || ''
    }
  } else {
    // 新增模式
    isEditYard.value = false
    yardForm.value = {
      yardCode: '',
      yardName: '',
      portCode: '',
      dailyCapacity: 100,
      feePerDay: 0,
      address: '',
      contactPhone: ''
    }
  }
  yardDialogVisible.value = true
}

// 编辑堆场
const editYard = (row: any) => {
  showYardDialog(row)
}

// 保存堆场
const saveYard = async () => {
  try {
    const url = isEditYard.value 
      ? `/api/v1/scheduling/resources/yards/${yardForm.value.yardCode}`
      : '/api/v1/scheduling/resources/yards'
    
    const method = isEditYard.value ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(yardForm.value)
    })
    
    const data = await response.json()
    if (data.success) {
      ElMessage.success(isEditYard.value ? '堆场信息更新成功' : '堆场创建成功')
      yardDialogVisible.value = false
      loadYards()
    } else {
      ElMessage.error(data.message)
    }
  } catch (error: any) {
    ElMessage.error('操作失败: ' + error.message)
  }
}

// 删除堆场
const deleteYard = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除堆场 ${row.yardName} 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await fetch(`/api/v1/scheduling/resources/yards/${row.yardCode}`, {
      method: 'DELETE'
    })
    
    const data = await response.json()
    if (data.success) {
      ElMessage.success('堆场删除成功')
      loadYards()
    } else {
      ElMessage.error(data.message)
    }
  } catch (error: any) {
    if (error.message !== 'cancel') {
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

// 加载仓库占用数据
const loadWarehouseOccupancy = async () => {
  try {
    const startDate = dayjs(occupancyDateRange.value[0]).format('YYYY-MM-DD')
    const endDate = dayjs(occupancyDateRange.value[1]).format('YYYY-MM-DD')
    
    const response = await fetch(`/api/v1/scheduling/resources/occupancy/warehouse?startDate=${startDate}&endDate=${endDate}&country=${appStore.scopedCountryCode}`)
    const data = await response.json()
    
    if (data.success) {
      renderWarehouseChart(data.data)
    }
  } catch (error: any) {
    ElMessage.error('加载仓库占用数据失败: ' + error.message)
  }
}

// 加载车队占用数据
const loadTruckingOccupancy = async () => {
  try {
    const startDate = dayjs(occupancyDateRange.value[0]).format('YYYY-MM-DD')
    const endDate = dayjs(occupancyDateRange.value[1]).format('YYYY-MM-DD')
    
    const response = await fetch(`/api/v1/scheduling/resources/occupancy/trucking?startDate=${startDate}&endDate=${endDate}&country=${appStore.scopedCountryCode}`)
    const data = await response.json()
    
    if (data.success) {
      renderTruckingChart(data.data)
    }
  } catch (error: any) {
    ElMessage.error('加载车队占用数据失败: ' + error.message)
  }
}

// 渲染仓库占用热力图
const renderWarehouseChart = (data: any[]) => {
  if (!warehouseChart.value) return
  
  // 检查容器尺寸并初始化
  const checkSizeAndInit = () => {
    if (!warehouseChart.value) return
    
    const width = warehouseChart.value.clientWidth
    const height = warehouseChart.value.clientHeight
    
    if (width > 0 && height > 0) {
      // 动态导入 ECharts
      import('echarts').then(echarts => {
        if (!warehouseChartInstance) {
          warehouseChartInstance = echarts.init(warehouseChart.value)
        }
        
        // 处理数据
        const warehouses = [...new Set(data.map(item => item.warehouse_code))]
        const dates = [...new Set(data.map(item => item.date))].sort()
        
        const seriesData = data.map(item => {
          const warehouseIndex = warehouses.indexOf(item.warehouse_code)
          const dateIndex = dates.indexOf(item.date)
          const utilization = item.capacity > 0 ? (item.planned_count / item.capacity) * 100 : 0
          return [dateIndex, warehouseIndex, utilization]
        })
        
        const option = {
          tooltip: {
            position: 'top',
            formatter: function(params: any) {
              const data = params.data
              const date = dates[data[0]]
              const warehouse = warehouses[data[1]]
              const utilization = data[2].toFixed(2)
              return `日期: ${date}<br/>仓库: ${warehouse}<br/>利用率: ${utilization}%`
            }
          },
          grid: {
            height: '60%',
            top: '10%'
          },
          xAxis: {
            type: 'category',
            data: dates,
            splitArea: {
              show: true
            }
          },
          yAxis: {
            type: 'category',
            data: warehouses,
            splitArea: {
              show: true
            }
          },
          visualMap: {
            min: 0,
            max: 100,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '5%',
            inRange: {
              color: ['#e0f2ff', '#66b1ff', '#2979ff', '#0052d9', '#003192']
            }
          },
          series: [{
            name: '利用率',
            type: 'heatmap',
            data: seriesData,
            label: {
              show: true,
              formatter: function(params: any) {
                return params.data[2].toFixed(0) + '%'
              }
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        }
        
        warehouseChartInstance.setOption(option)
      })
    } else {
      // 尺寸为 0，等待一段时间后重试
      setTimeout(checkSizeAndInit, 100)
    }
  }
  
  // 开始检查并初始化
  checkSizeAndInit()
}

// 渲染车队占用热力图
const renderTruckingChart = (data: any[]) => {
  if (!truckingChart.value) return
  
  // 检查容器尺寸并初始化
  const checkSizeAndInit = () => {
    if (!truckingChart.value) return
    
    const width = truckingChart.value.clientWidth
    const height = truckingChart.value.clientHeight
    
    if (width > 0 && height > 0) {
      // 动态导入 ECharts
      import('echarts').then(echarts => {
        if (!truckingChartInstance) {
          truckingChartInstance = echarts.init(truckingChart.value)
        }
        
        // 处理数据
        const truckingCompanies = [...new Set(data.map(item => item.trucking_company_id))]
        const dates = [...new Set(data.map(item => item.date))].sort()
        
        const seriesData = data.map(item => {
          const truckingIndex = truckingCompanies.indexOf(item.trucking_company_id)
          const dateIndex = dates.indexOf(item.date)
          const utilization = item.capacity > 0 ? (item.planned_trips / item.capacity) * 100 : 0
          return [dateIndex, truckingIndex, utilization]
        })
        
        const option = {
          tooltip: {
            position: 'top',
            formatter: function(params: any) {
              const data = params.data
              const date = dates[data[0]]
              const trucking = truckingCompanies[data[1]]
              const utilization = data[2].toFixed(2)
              return `日期: ${date}<br/>车队: ${trucking}<br/>利用率: ${utilization}%`
            }
          },
          grid: {
            height: '60%',
            top: '10%'
          },
          xAxis: {
            type: 'category',
            data: dates,
            splitArea: {
              show: true
            }
          },
          yAxis: {
            type: 'category',
            data: truckingCompanies,
            splitArea: {
              show: true
            }
          },
          visualMap: {
            min: 0,
            max: 100,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '5%',
            inRange: {
              color: ['#e0f2ff', '#66b1ff', '#2979ff', '#0052d9', '#003192']
            }
          },
          series: [{
            name: '利用率',
            type: 'heatmap',
            data: seriesData,
            label: {
              show: true,
              formatter: function(params: any) {
                return params.data[2].toFixed(0) + '%'
              }
            },
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            }
          }]
        }
        
        truckingChartInstance.setOption(option)
      })
    } else {
      // 尺寸为 0，等待一段时间后重试
      setTimeout(checkSizeAndInit, 100)
    }
  }
  
  // 开始检查并初始化
  checkSizeAndInit()
}

// 加载资源占用数据
const loadOccupancyData = () => {
  if (occupancyTab.value === 'warehouse') {
    loadWarehouseOccupancy()
  } else {
    loadTruckingOccupancy()
  }
}

// 监听占用标签页变化
const handleOccupancyTabChange = (tab: string) => {
  occupancyTab.value = tab
  loadOccupancyData()
}

// 加载资源分析数据
const loadAnalysisData = async () => {
  try {
    const startDate = dayjs(occupancyDateRange.value[0]).format('YYYY-MM-DD')
    const endDate = dayjs(occupancyDateRange.value[1]).format('YYYY-MM-DD')
    
    // 并行加载仓库和车队占用数据
    const [warehouseResponse, truckingResponse] = await Promise.all([
      fetch(`/api/v1/scheduling/resources/occupancy/warehouse?startDate=${startDate}&endDate=${endDate}&country=${appStore.scopedCountryCode}`),
      fetch(`/api/v1/scheduling/resources/occupancy/trucking?startDate=${startDate}&endDate=${endDate}&country=${appStore.scopedCountryCode}`)
    ])
    
    const warehouseData = await warehouseResponse.json()
    const truckingData = await truckingResponse.json()
    
    if (warehouseData.success && truckingData.success) {
      if (analysisTab.value === 'utilization') {
        renderUtilizationChart(warehouseData.data, truckingData.data)
      } else {
        renderBottleneckChart(warehouseData.data, truckingData.data)
      }
    }
  } catch (error: any) {
    ElMessage.error('加载分析数据失败: ' + error.message)
  }
}

// 渲染容量利用率图表
const renderUtilizationChart = (warehouseData: any[], truckingData: any[]) => {
  if (!utilizationChart.value) return
  
  // 检查容器尺寸并初始化
  const checkSizeAndInit = () => {
    if (!utilizationChart.value) return
    
    const width = utilizationChart.value.clientWidth
    const height = utilizationChart.value.clientHeight
    
    if (width > 0 && height > 0) {
      // 动态导入 ECharts
      import('echarts').then(echarts => {
        if (!utilizationChartInstance) {
          utilizationChartInstance = echarts.init(utilizationChart.value)
        }
        
        // 计算仓库平均利用率
        const warehouseUtilization = warehouseData.reduce((sum, item) => {
          if (item.capacity > 0) {
            return sum + (item.planned_count / item.capacity)
          }
          return sum
        }, 0) / (warehouseData.length || 1)
        
        // 计算车队平均利用率
        const truckingUtilization = truckingData.reduce((sum, item) => {
          if (item.capacity > 0) {
            return sum + (item.planned_trips / item.capacity)
          }
          return sum
        }, 0) / (truckingData.length || 1)
        
        const option = {
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c}%'
          },
          legend: {
            orient: 'vertical',
            left: 'left',
            data: ['仓库利用率', '车队利用率']
          },
          series: [
            {
              name: '资源利用率',
              type: 'gauge',
              startAngle: 180,
              endAngle: 0,
              min: 0,
              max: 100,
              splitNumber: 10,
              axisLine: {
                lineStyle: {
                  width: 30,
                  color: [
                    [0.3, '#67c23a'],
                    [0.7, '#e6a23c'],
                    [1, '#f56c6c']
                  ]
                }
              },
              pointer: {
                icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
                length: '12%',
                width: 20,
                offsetCenter: [0, '-60%'],
                itemStyle: {
                  color: 'auto'
                }
              },
              axisTick: {
                length: 12,
                lineStyle: {
                  color: 'auto',
                  width: 2
                }
              },
              splitLine: {
                length: 20,
                lineStyle: {
                  color: 'auto',
                  width: 5
                }
              },
              axisLabel: {
                color: '#464646',
                fontSize: 12,
                distance: -60,
                formatter: function (value: any) {
                  if (value === 0 || value === 100) {
                    return value + '%';
                  } else {
                    return '';
                  }
                }
              },
              title: {
                offsetCenter: [0, '-10%'],
                fontSize: 20
              },
              detail: {
                fontSize: 30,
                offsetCenter: [0, '-35%'],
                valueAnimation: true,
                formatter: function (value: any) {
                  return Math.round(value) + '%';
                },
                color: 'auto'
              },
              data: [
                {
                  value: warehouseUtilization * 100,
                  name: '仓库利用率'
                }
              ]
            },
            {
              name: '资源利用率',
              type: 'gauge',
              startAngle: 180,
              endAngle: 0,
              min: 0,
              max: 100,
              splitNumber: 10,
              axisLine: {
                lineStyle: {
                  width: 30,
                  color: [
                    [0.3, '#67c23a'],
                    [0.7, '#e6a23c'],
                    [1, '#f56c6c']
                  ]
                }
              },
              pointer: {
                icon: 'path://M12.8,0.7l12,40.1H0.7L12.8,0.7z',
                length: '12%',
                width: 20,
                offsetCenter: [0, '60%'],
                itemStyle: {
                  color: 'auto'
                }
              },
              axisTick: {
                length: 12,
                lineStyle: {
                  color: 'auto',
                  width: 2
                }
              },
              splitLine: {
                length: 20,
                lineStyle: {
                  color: 'auto',
                  width: 5
                }
              },
              axisLabel: {
                color: '#464646',
                fontSize: 12,
                distance: -60,
                formatter: function (value: any) {
                  if (value === 0 || value === 100) {
                    return value + '%';
                  } else {
                    return '';
                  }
                }
              },
              title: {
                offsetCenter: [0, '90%'],
                fontSize: 20
              },
              detail: {
                fontSize: 30,
                offsetCenter: [0, '65%'],
                valueAnimation: true,
                formatter: function (value: any) {
                  return Math.round(value) + '%';
                },
                color: 'auto'
              },
              data: [
                {
                  value: truckingUtilization * 100,
                  name: '车队利用率'
                }
              ]
            }
          ]
        }
        
        utilizationChartInstance.setOption(option)
      })
    } else {
      // 尺寸为 0，等待一段时间后重试
      setTimeout(checkSizeAndInit, 100)
    }
  }
  
  // 开始检查并初始化
  checkSizeAndInit()
}

// 渲染瓶颈分析图表
const renderBottleneckChart = (warehouseData: any[], truckingData: any[]) => {
  if (!bottleneckChart.value) return
  
  // 动态导入 ECharts
  import('echarts').then(echarts => {
    if (!bottleneckChartInstance) {
      bottleneckChartInstance = echarts.init(bottleneckChart.value)
    }
    
    // 分析仓库瓶颈
    const warehouseBottlenecks = warehouseData
      .filter(item => item.capacity > 0)
      .map(item => ({
        name: item.warehouse_code,
        utilization: (item.planned_count / item.capacity) * 100,
        date: item.date
      }))
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 5)
    
    // 分析车队瓶颈
    const truckingBottlenecks = truckingData
      .filter(item => item.capacity > 0)
      .map(item => ({
        name: item.trucking_company_id,
        utilization: (item.planned_trips / item.capacity) * 100,
        date: item.date
      }))
      .sort((a, b) => b.utilization - a.utilization)
      .slice(0, 5)
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      legend: {
        data: ['仓库瓶颈', '车队瓶颈']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        boundaryGap: [0, 0.01],
        max: 100
      },
      yAxis: {
        type: 'category',
        data: [...warehouseBottlenecks.map(item => `仓库: ${item.name}`), ...truckingBottlenecks.map(item => `车队: ${item.name}`)]
      },
      series: [
        {
          name: '利用率',
          type: 'bar',
          data: [...warehouseBottlenecks.map(item => item.utilization), ...truckingBottlenecks.map(item => item.utilization)],
          itemStyle: {
            color: function(params: any) {
              const utilization = params.value
              if (utilization >= 80) return '#f56c6c'
              if (utilization >= 50) return '#e6a23c'
              return '#67c23a'
            }
          },
          label: {
            show: true,
            position: 'right',
            formatter: '{c}%'
          }
        }
      ]
    }
    
    bottleneckChartInstance.setOption(option)
  })
}

// 监听国家变化
const watchCountryChange = () => {
  loadOverview()
  loadYards()
  // 重新加载占用数据
  loadOccupancyData()
}

// 返回货柜管理页面
const goBackToShipments = () => {
  const startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
  const endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')
  const filterCondition = route.query.filterCondition as string
  
  router.push({
    path: '/shipments',
    query: {
      startDate,
      endDate,
      filterCondition
    }
  })
}

onMounted(() => {
  // 从路由参数初始化日期范围
  initDateRangeFromRoute()
  loadOverview()
  loadYards()
  // 延迟加载图表，确保 DOM 已渲染
  setTimeout(() => {
    loadOccupancyData()
  }, 500)
  
  // 监听国家变化
  appStore.$subscribe((mutation, state) => {
    if (mutation.type === 'setScopedCountryCode') {
      watchCountryChange()
    }
  })
})
</script>

<style scoped>
.scheduling-page {
  padding: 12px;
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

.stat-item .stat-icon.pending { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.stat-item .stat-icon.initial { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.stat-item .stat-icon.issued { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.stat-item .stat-icon.warehouse { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

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
