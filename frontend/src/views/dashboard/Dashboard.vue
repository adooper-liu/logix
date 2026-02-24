<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { 
  House, 
  Box, 
  Warning, 
  TrendCharts,
  Ship,
  Clock,
  Check,
  Close
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'

// 统计数据
const stats = ref({
  totalContainers: 1247,
  activeContainers: 892,
  completedContainers: 355,
  alertContainers: 23
})

// 最近活动
const recentActivities = ref([
  { id: 1, container: 'COSU1234567', status: '已离港', time: '2小时前', type: 'success' },
  { id: 2, container: 'MSKU7890123', status: '海关查验', time: '4小时前', type: 'warning' },
  { id: 3, container: 'ONEY4567890', status: '已到港', time: '6小时前', type: 'info' },
  { id: 4, container: 'MAEU2345678', status: '装船完成', time: '8小时前', type: 'success' }
])

// 状态分布数据
const statusDistribution = ref([
  { name: '在途运输', value: 45, color: '#409EFF' },
  { name: '港口作业', value: 25, color: '#67C23A' },
  { name: '等待提货', value: 15, color: '#E6A23C' },
  { name: '异常状态', value: 10, color: '#F56C6C' },
  { name: '已完成', value: 5, color: '#909399' }
])

// 图表实例
let chartInstance: echarts.ECharts | null = null

onMounted(() => {
  initChart()
})

const initChart = () => {
  const chartDom = document.getElementById('status-chart')
  if (chartDom) {
    chartInstance = echarts.init(chartDom)
    
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: '状态分布',
          type: 'pie',
          radius: ['40%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: statusDistribution.value
        }
      ]
    }
    
    chartInstance.setOption(option)
  }
}
</script>

<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon primary">
            <el-icon><Box /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.totalContainers }}</div>
            <div class="stat-label">总集装箱数</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon success">
            <el-icon><Ship /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.activeContainers }}</div>
            <div class="stat-label">在途集装箱</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon warning">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.alertContainers }}</div>
            <div class="stat-label">异常集装箱</div>
          </div>
        </div>
      </el-card>
      
      <el-card class="stat-card">
        <div class="stat-content">
          <div class="stat-icon info">
            <el-icon><Check /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ stats.completedContainers }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 图表和活动区域 -->
    <div class="content-grid">
      <!-- 状态分布图表 -->
      <el-card class="chart-card">
        <template #header>
          <div class="card-header">
            <span>集装箱状态分布</span>
            <el-icon><TrendCharts /></el-icon>
          </div>
        </template>
        <div id="status-chart" style="height: 300px;"></div>
      </el-card>

      <!-- 最近活动 -->
      <el-card class="activity-card">
        <template #header>
          <div class="card-header">
            <span>最近活动</span>
            <el-icon><Clock /></el-icon>
          </div>
        </template>
        <div class="activity-list">
          <div 
            v-for="activity in recentActivities" 
            :key="activity.id"
            class="activity-item"
            :class="`activity-${activity.type}`"
          >
            <div class="activity-content">
              <div class="activity-title">
                集装箱 {{ activity.container }} {{ activity.status }}
              </div>
              <div class="activity-time">{{ activity.time }}</div>
            </div>
            <div class="activity-status">
              <el-icon v-if="activity.type === 'success'"><Check /></el-icon>
              <el-icon v-else-if="activity.type === 'warning'"><Warning /></el-icon>
              <el-icon v-else-if="activity.type === 'info'"><Ship /></el-icon>
              <el-icon v-else><Close /></el-icon>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  .stat-content {
    display: flex;
    align-items: center;
    
    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 20px;
      font-size: 24px;
      color: white;
      
      &.primary { background: #409EFF; }
      &.success { background: #67C23A; }
      &.warning { background: #E6A23C; }
      &.info { background: #909399; }
    }
    
    .stat-info {
      .stat-value {
        font-size: 28px;
        font-weight: bold;
        color: #303133;
        margin-bottom: 5px;
      }
      
      .stat-label {
        color: #909399;
        font-size: 14px;
      }
    }
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.chart-card, .activity-card {
  .card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: bold;
  }
}

.activity-list {
  .activity-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 0;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .activity-content {
      .activity-title {
        font-weight: 500;
        margin-bottom: 5px;
        color: #303133;
      }
      
      .activity-time {
        font-size: 12px;
        color: #909399;
      }
    }
    
    .activity-status {
      font-size: 18px;
      &.activity-success { color: #67C23A; }
      &.activity-warning { color: #E6A23C; }
      &.activity-info { color: #409EFF; }
      &.activity-danger { color: #F56C6C; }
    }
  }
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
  
  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>