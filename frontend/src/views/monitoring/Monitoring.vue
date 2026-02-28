<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { 
  Monitor, 
  Warning, 
  SuccessFilled,
  CircleCheck,
  CircleClose
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// 系统状态数据
const systemStatus = ref({
  apiService: true,
  database: true,
  redis: true,
  feituoAdapter: true,
  logisticsAdapter: true
})

// 性能指标
const performanceMetrics = ref({
  cpuUsage: 45,
  memoryUsage: 68,
  responseTime: 120,
  throughput: 1250
})

// 告警信息
const alerts = ref([
  { id: 1, level: 'warning', message: '集装箱 MSCU1234567 状态更新延迟', time: '2分钟前' },
  { id: 2, level: 'error', message: '飞驼API连接超时', time: '5分钟前' },
  { id: 3, level: 'info', message: '系统自动同步完成', time: '10分钟前' },
  { id: 4, level: 'warning', message: 'Redis缓存命中率下降', time: '15分钟前' }
])

// 服务健康度图表
let healthChart: echarts.ECharts | null = null
let performanceChart: echarts.ECharts | null = null
let updateTimer: number | null = null

// 标记组件是否已卸载
let isMounted = true

// 更新图表
const updateCharts = () => {
  // 检查组件是否已卸载
  if (!isMounted) return

  // 健康度图表
  if (healthChart && !healthChart.isDisposed()) {
    const healthOption = {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' }
      },
      xAxis: {
        type: 'category',
        data: ['API服务', '数据库', 'Redis', '飞驼适配器', '物流适配器']
      },
      yAxis: {
        type: 'value',
        max: 100,
        axisLabel: { formatter: '{value}%' }
      },
      series: [{
        data: [100, 100, 100, 95, 100],
        type: 'bar',
        itemStyle: {
          color: (params: any) => {
            const value = params.value
            if (value >= 95) return '#67C23A'
            if (value >= 80) return '#E6A23C'
            return '#F56C6C'
          }
        }
      }]
    }
    healthChart.setOption(healthOption)
  }

  // 性能图表
  if (performanceChart && !performanceChart.isDisposed()) {
    const performanceOption = {
      tooltip: { trigger: 'axis' },
      legend: { data: ['CPU使用率', '内存使用率'] },
      xAxis: { type: 'category', data: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'] },
      yAxis: { type: 'value', axisLabel: { formatter: '{value}%' } },
      series: [
        {
          name: 'CPU使用率',
          type: 'line',
          data: [35, 42, 48, 45, 52, 49, 45],
          smooth: true,
          itemStyle: { color: $primary-color }
        },
        {
          name: '内存使用率',
          type: 'line',
          data: [55, 62, 68, 65, 72, 69, 68],
          smooth: true,
          itemStyle: { color: $warning-color }
        }
      ]
    }
    performanceChart.setOption(performanceOption)
  }
}

onMounted(() => {
  isMounted = true

  // 初始化图表
  const healthChartDom = document.getElementById('health-chart')
  const performanceChartDom = document.getElementById('performance-chart')

  if (healthChartDom) {
    healthChart = echarts.init(healthChartDom)
  }

  if (performanceChartDom) {
    performanceChart = echarts.init(performanceChartDom)
  }

  updateCharts()

  // 注释掉实时数据更新以避免ECharts错误
  // 模拟实时数据更新
  // updateTimer = window.setInterval(() => {
  //   if (!isMounted) return
  //   performanceMetrics.value.cpuUsage = Math.floor(Math.random() * 30) + 30
  //   performanceMetrics.value.memoryUsage = Math.floor(Math.random() * 20) + 60
  //   updateCharts()
  // }, 5000)
})

onUnmounted(() => {
  isMounted = false

  // 清理定时器
  if (updateTimer) {
    clearInterval(updateTimer)
    updateTimer = null
  }

  // 销毁图表实例
  if (healthChart && !healthChart.isDisposed()) {
    healthChart.dispose()
    healthChart = null
  }
  if (performanceChart && !performanceChart.isDisposed()) {
    performanceChart.dispose()
    performanceChart = null
  }
})
</script>

<template>
  <div class="monitoring-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>监控中心</h2>
      <p>实时监控系统状态和性能指标</p>
    </div>

    <!-- 系统概览 -->
    <div class="overview-grid">
      <el-card class="metric-card">
        <div class="metric-content">
          <div class="metric-icon success">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ performanceMetrics.cpuUsage }}%</div>
            <div class="metric-label">CPU使用率</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="metric-card">
        <div class="metric-content">
          <div class="metric-icon warning">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ performanceMetrics.memoryUsage }}%</div>
            <div class="metric-label">内存使用率</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="metric-card">
        <div class="metric-content">
          <div class="metric-icon info">
            <el-icon><Monitor /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ performanceMetrics.responseTime }}ms</div>
            <div class="metric-label">平均响应时间</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="metric-card">
        <div class="metric-content">
          <div class="metric-icon primary">
            <el-icon><SuccessFilled /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ performanceMetrics.throughput }}</div>
            <div class="metric-label">QPS</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 服务状态和图表 -->
    <div class="charts-grid">
      <!-- 服务健康度 -->
      <el-card class="chart-card">
        <template #header>
          <div class="card-header">
            <span>服务健康度</span>
            <el-icon><Monitor /></el-icon>
          </div>
        </template>
        <div id="health-chart" style="height: 300px;"></div>
      </el-card>

      <!-- 性能趋势 -->
      <el-card class="chart-card">
        <template #header>
          <div class="card-header">
            <span>性能趋势</span>
            <el-icon><Monitor /></el-icon>
          </div>
        </template>
        <div id="performance-chart" style="height: 300px;"></div>
      </el-card>
    </div>

    <!-- 告警信息 -->
    <el-card class="alerts-card">
      <template #header>
        <div class="card-header">
          <span>系统告警</span>
          <el-badge :value="alerts.filter(a => a.level === 'error').length" type="danger">
            <el-button type="primary" size="small">刷新</el-button>
          </el-badge>
        </div>
      </template>
      
      <div class="alerts-list">
        <div 
          v-for="alert in alerts" 
          :key="alert.id"
          class="alert-item"
          :class="`alert-${alert.level}`"
        >
          <div class="alert-icon">
            <el-icon v-if="alert.level === 'error'"><CircleClose /></el-icon>
            <el-icon v-else-if="alert.level === 'warning'"><Warning /></el-icon>
            <el-icon v-else><SuccessFilled /></el-icon>
          </div>
          <div class="alert-content">
            <div class="alert-message">{{ alert.message }}</div>
            <div class="alert-time">{{ alert.time }}</div>
          </div>
          <div class="alert-actions">
            <el-button size="small" type="primary" plain>处理</el-button>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.monitoring-page {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
  
  h2 {
    font-size: 24px;
    color: $text-primary;
    margin-bottom: 10px;
  }
  
  p {
    color: $text-secondary;
    font-size: 14px;
  }
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.metric-card {
  .metric-content {
    display: flex;
    align-items: center;
    
    .metric-icon {
      width: 50px;
      height: 50px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      font-size: 20px;
      color: white;
      
      &.primary { background: #409EFF; }
      &.success { background: #67C23A; }
      &.warning { background: #E6A23C; }
      &.info { background: #909399; }
    }
    
    .metric-info {
      .metric-value {
        font-size: 24px;
        font-weight: bold;
        color: $text-primary;
        margin-bottom: 5px;
      }
      
      .metric-label {
        color: $text-secondary;
        font-size: 14px;
      }
    }
  }
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.chart-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: bold;
  }
}

.alerts-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .alerts-list {
    .alert-item {
      display: flex;
      align-items: center;
      padding: 15px;
      border-radius: 8px;
      margin-bottom: 10px;
      border: 1px solid #f0f0f0;
      
      &.alert-error {
        background: #fef0f0;
        border-color: #fde2e2;
      }
      
      &.alert-warning {
        background: #fdf6ec;
        border-color: #faecd8;
      }
      
      &.alert-info {
        background: #f4f4f5;
        border-color: #e9e9eb;
      }
      
      .alert-icon {
        font-size: 20px;
        margin-right: 15px;
        
        .el-icon {
          &.error { color: $danger-color; }
          &.warning { color: $warning-color; }
          &.success { color: $success-color; }
        }
      }
      
      .alert-content {
        flex: 1;
        
        .alert-message {
          font-weight: 500;
          margin-bottom: 5px;
          color: $text-primary;
        }
        
        .alert-time {
          font-size: 12px;
          color: $text-secondary;
        }
      }
      
      .alert-actions {
        margin-left: 15px;
      }
    }
  }
}

@media (max-width: 768px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
  
  .overview-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>