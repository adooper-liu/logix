<template>
  <div class="scheduling-page">
    <!-- 日期范围（与 Shipments 一致，出运日期口径） -->
    <el-row class="mb-4" align="middle">
      <el-col :span="24">
        <span class="filter-label">日期范围：</span>
        <DateRangePicker v-model="dateRange" />
        <el-button type="primary" link @click="loadOverview">刷新概览</el-button>
      </el-col>
    </el-row>

    <!-- 顶部统计卡片 -->
    <el-row :gutter="20" class="mb-4">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon pending">
            <el-icon :size="32"><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ overview.pendingCount }}</div>
            <div class="stat-label">待排产</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon initial">
            <el-icon :size="32"><DocumentAdd /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ overview.initialCount }}</div>
            <div class="stat-label">待排产(initial)</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon issued">
            <el-icon :size="32"><Edit /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ overview.issuedCount }}</div>
            <div class="stat-label">待排产(issued)</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-icon warehouse">
            <el-icon :size="32"><House /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ overview.warehouses?.length || 0 }}</div>
            <div class="stat-label">可用仓库</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 流程图 -->
    <el-card class="mb-4">
      <template #header>
        <div class="card-header">
          <span>智能排产流程</span>
          <el-button type="primary" :loading="scheduling" @click="handleSchedule">
            <el-icon><Cpu /></el-icon>
            开始排产
          </el-button>
        </div>
      </template>
      
      <div class="flow-chart">
        <div class="flow-step" :class="{ active: currentStep >= 1 }">
          <div class="step-circle">1</div>
          <div class="step-content">
            <div class="step-title">查询待排产</div>
            <div class="step-desc">筛选 initial/issued 状态货柜</div>
          </div>
        </div>
        <div class="flow-arrow">
          <el-icon><ArrowRight /></el-icon>
        </div>
        <div class="flow-step" :class="{ active: currentStep >= 2 }">
          <div class="step-circle">2</div>
          <div class="step-content">
            <div class="step-title">排序</div>
            <div class="step-desc">按 ATA/ETA 先到先得</div>
          </div>
        </div>
        <div class="flow-arrow">
          <el-icon><ArrowRight /></el-icon>
        </div>
        <div class="flow-step" :class="{ active: currentStep >= 3 }">
          <div class="step-circle">3</div>
          <div class="step-content">
            <div class="step-title">计算计划日</div>
            <div class="step-desc">清关日→提柜日→送仓日</div>
          </div>
        </div>
        <div class="flow-arrow">
          <el-icon><ArrowRight /></el-icon>
        </div>
        <div class="flow-step" :class="{ active: currentStep >= 4 }">
          <div class="step-circle">4</div>
          <div class="step-content">
            <div class="step-title">选择资源</div>
            <div class="step-desc">仓库产能/车队档期</div>
          </div>
        </div>
        <div class="flow-arrow">
          <el-icon><ArrowRight /></el-icon>
        </div>
        <div class="flow-step" :class="{ active: currentStep >= 5 }">
          <div class="step-circle">5</div>
          <div class="step-content">
            <div class="step-title">写回数据</div>
            <div class="step-desc">更新排产日期到数据库</div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 资源配置和执行日志 -->
    <el-row :gutter="20">
      <!-- 资源配置 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>可用资源配置</span>
          </template>
          
          <el-tabs v-model="activeTab">
            <el-tab-pane label="仓库" name="warehouse">
              <el-table :data="overview.warehouses" max-height="300" size="small">
                <el-table-column prop="code" label="编码" width="100" />
                <el-table-column prop="name" label="名称" />
                <el-table-column prop="country" label="国家" width="80" />
                <el-table-column prop="dailyCapacity" label="日产能" width="80" />
              </el-table>
            </el-tab-pane>
            <el-tab-pane label="车队" name="trucking">
              <el-table :data="overview.truckings" max-height="300" size="small">
                <el-table-column prop="code" label="编码" width="100" />
                <el-table-column prop="name" label="名称" />
                <el-table-column prop="country" label="国家" width="80" />
                <el-table-column prop="dailyCapacity" label="日产能" width="80" />
              </el-table>
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
    <el-card v-if="scheduleResult" class="mt-4">
      <template #header>
        <div class="card-header">
          <span>排产结果</span>
          <div class="result-actions">
            <el-button type="primary" link @click="exportScheduleResult">
              <el-icon><Download /></el-icon>
              导出CSV
            </el-button>
            <el-button type="primary" link @click="router.push('/gantt-chart')">
              <el-icon><View /></el-icon>
              查看甘特图
            </el-button>
          </div>
        </div>
      </template>
      
      <!-- 优化统计卡片 -->
      <div class="schedule-stats">
        <div class="stat-box total">
          <div class="stat-icon-bg"><el-icon :size="28"><Box /></el-icon></div>
          <div class="stat-info">
            <div class="stat-num">{{ scheduleResult.total }}</div>
            <div class="stat-text">总计</div>
          </div>
        </div>
        <div class="stat-box success">
          <div class="stat-icon-bg"><el-icon :size="28"><CircleCheck /></el-icon></div>
          <div class="stat-info">
            <div class="stat-num">{{ scheduleResult.successCount }}</div>
            <div class="stat-text">成功</div>
          </div>
        </div>
        <div class="stat-box failed">
          <div class="stat-icon-bg"><el-icon :size="28"><CircleClose /></el-icon></div>
          <div class="stat-info">
            <div class="stat-num">{{ scheduleResult.failedCount }}</div>
            <div class="stat-text">失败</div>
          </div>
        </div>
        <div class="stat-box progress">
          <div class="progress-wrapper">
            <el-progress 
              type="circle" 
              :percentage="scheduleResult.total > 0 ? Math.round((scheduleResult.successCount / scheduleResult.total) * 100) : 0" 
              :width="70"
              :stroke-width="8"
              :color="successRateColor"
            />
          </div>
          <div class="stat-info">
            <div class="stat-num">{{ scheduleResult.total > 0 ? ((scheduleResult.successCount / scheduleResult.total) * 100).toFixed(1) : 0 }}%</div>
            <div class="stat-text">成功率</div>
          </div>
        </div>
      </div>

      <!-- 分组显示：成功/失败 -->
      <el-tabs v-model="resultTab" class="result-tabs mt-4">
        <el-tab-pane label="全部" name="all">
          <el-table :data="scheduleResult.results" max-height="300" size="small" stripe>
            <el-table-column label="柜号" width="150" fixed>
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
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Clock, DocumentAdd, Edit, House, Cpu, ArrowRight, CircleCheck, CircleClose, InfoFilled, View, Download, Box } from '@element-plus/icons-vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import { containerService } from '@/services/container'
import { useAppStore } from '@/store/app'
import dayjs from 'dayjs'

const appStore = useAppStore()
const router = useRouter()

// 日期范围（出运日期口径，与 Shipments 一致）
const dateRange = ref<[Date, Date]>([
  dayjs().startOf('year').toDate(),
  dayjs().endOf('day').toDate()
])

// 数据
const overview = ref<any>({
  pendingCount: 0,
  initialCount: 0,
  issuedCount: 0,
  warehouses: [],
  truckings: []
})
const scheduling = ref(false)
const currentStep = ref(0)
const activeTab = ref('warehouse')
const logs = ref<Array<{ time: string; message: string; type: string }>>([])
const logContainer = ref<HTMLElement>()
const scheduleResult = ref<any>(null)
const resultTab = ref('all')

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

onMounted(() => {
  loadOverview()
})
</script>

<style scoped>
.scheduling-page {
  padding: 20px;
}

.filter-label {
  margin-right: 8px;
  color: #606266;
  font-size: 14px;
}

.mb-4 {
  margin-bottom: 20px;
}

.mt-4 {
  margin-top: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.stat-icon.pending {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.stat-icon.initial {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.stat-icon.issued {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.stat-icon.warehouse {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.flow-chart {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 0;
}

.flow-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 120px;
  opacity: 0.4;
  transition: all 0.3s;
}

.flow-step.active {
  opacity: 1;
}

.step-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #dcdfe6;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 8px;
  transition: all 0.3s;
}

.flow-step.active .step-circle {
  background: linear-gradient(135deg, #409eff 0%, #67c23a 100%);
  color: white;
}

.step-title {
  font-weight: bold;
  font-size: 14px;
  color: #303133;
}

.step-desc {
  font-size: 12px;
  color: #909399;
  text-align: center;
  margin-top: 4px;
}

.flow-arrow {
  color: #c0c4cc;
  font-size: 24px;
}

.log-container {
  height: 300px;
  overflow-y: auto;
  background: #1e1e1e;
  border-radius: 4px;
  padding: 12px;
  font-family: monospace;
  font-size: 13px;
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
</style>
