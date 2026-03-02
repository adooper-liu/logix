<script setup lang="ts">
import SankeyChart from '@/components/SankeyChart.vue'
import { containerService } from '@/services/container'
import { Box, Check, Clock, Refresh, Ship, TrendCharts, Warning } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { ElMessage } from 'element-plus'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)

// 统计数据
const stats = ref({
  totalContainers: 0,
  activeContainers: 0,
  completedContainers: 0,
  alertContainers: 0,
})

// 最近活动
const recentActivities = ref<any[]>([])

// 状态分布数据
const statusDistribution = ref<any[]>([])

// 状态原始数据（用于桑基图）
const statusData = ref<Record<string, number>>({})

// 图表实例
let chartInstance: echarts.ECharts | null = null

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const [verifyResponse, statusResponse] = await Promise.all([
      containerService.getStatisticsVerification(),
      containerService.getStatisticsDetailed(),
    ])

    if (verifyResponse.success && verifyResponse.data) {
      const data = verifyResponse.data
      stats.value = {
        totalContainers: data.totalContainers,
        activeContainers: data.totalInTransit, // 已出运 + 在途 + 已到目的港
        completedContainers: 0, // 将在 statusResponse 中计算
        alertContainers: 0, // 暂时设为 0，后续可以从 statusResponse 计算
      }
    }

    if (statusResponse.success && statusResponse.data) {
      const dist = statusResponse.data.statusDistribution

      // 保存原始状态数据（用于桑基图）
      statusData.value = dist

      // 已完成 = 已还箱
      stats.value.completedContainers = dist.returned_empty || 0

      // 异常集装箱 = 逾期未到港 + 已到中转港(列示)
      // 注意：根据物流业务逻辑，已到中转港可能表示在中转港停留较长时间，属于异常情况
      const arrivalDist = statusResponse.data.arrivalDistribution
      if (arrivalDist) {
        stats.value.alertContainers = (arrivalDist.overdue || 0) + (dist.arrived_at_transit || 0)
      } else {
        stats.value.alertContainers = dist.arrived_at_transit || 0
      }

      // 状态分布数据
      statusDistribution.value = [
        { name: '未出运', value: dist.not_shipped || 0, color: '#909399' },
        { name: '已出运', value: dist.shipped || 0, color: '#409eff' },
        { name: '在途', value: dist.in_transit || 0, color: '#e6a23c' },
        { name: '已到中转港', value: dist.arrived_at_transit || 0, color: '#909399' },
        { name: '已到目的港', value: dist.at_port || 0, color: '#67c23a' },
        { name: '已提柜', value: dist.picked_up || 0, color: '#f39c12' },
        { name: '已卸柜', value: dist.unloaded || 0, color: '#3498db' },
        { name: '已还箱', value: dist.returned_empty || 0, color: '#95a5a6' },
      ]

      // 更新图表
      updateChart()
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

// 跳转到 Shipments 页面
const goToShipments = () => {
  router.push('/shipments')
}

// 刷新数据
const handleRefresh = () => {
  loadData()
}

onMounted(() => {
  initChart()
  loadData()

  // 每30秒自动刷新
  const interval = setInterval(loadData, 30000)
  onUnmounted(() => clearInterval(interval))
})

const initChart = () => {
  const chartDom = document.getElementById('status-chart')
  if (chartDom) {
    chartInstance = echarts.init(chartDom)

    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)',
      },
      legend: {
        orient: 'vertical',
        left: 'left',
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
            borderWidth: 2,
          },
          label: {
            show: false,
            position: 'center',
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold',
            },
          },
          labelLine: {
            show: false,
          },
          data: statusDistribution.value,
        },
      ],
    }

    chartInstance.setOption(option)
  }
}

// 更新图表数据
const updateChart = () => {
  if (chartInstance) {
    chartInstance.setOption({
      series: [
        {
          data: statusDistribution.value,
        },
      ],
    })
  }
}
</script>

<template>
  <div class="dashboard">
    <!-- 头部 -->
    <div class="dashboard-header">
      <h2>数据概览</h2>
      <el-button type="primary" :icon="Refresh" :loading="loading" @click="handleRefresh">
        刷新数据
      </el-button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <el-card class="stat-card clickable" @click="goToShipments">
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

      <el-card class="stat-card clickable" @click="goToShipments">
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

      <el-card class="stat-card clickable" @click="goToShipments">
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

      <el-card class="stat-card clickable" @click="goToShipments">
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

    <!-- 桑基图 -->
    <div class="sankey-section">
      <el-card class="sankey-card">
        <template #header>
          <div class="card-header">
            <span>货柜状态流转</span>
            <el-icon><TrendCharts /></el-icon>
          </div>
        </template>
        <SankeyChart :data="{ statusDistribution: statusData }" />
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
        <div id="status-chart" style="height: 300px"></div>
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
@use '@/assets/styles/variables' as *;

.dashboard {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: $text-primary;
  }
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

      &.primary {
        background: #409eff;
      }
      &.success {
        background: #67c23a;
      }
      &.warning {
        background: #e6a23c;
      }
      &.info {
        background: #909399;
      }
    }

    .stat-info {
      .stat-value {
        font-size: 28px;
        font-weight: bold;
        color: $text-primary;
        margin-bottom: 5px;
      }

      .stat-label {
        color: $text-secondary;
        font-size: 14px;
      }
    }
  }

  &.clickable {
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
  margin-top: 20px;
}

.chart-card,
.activity-card {
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
        color: $text-primary;
      }

      .activity-time {
        font-size: 12px;
        color: $text-secondary;
      }
    }

    .activity-status {
      font-size: 18px;
      &.activity-success {
        color: $success-color;
      }
      &.activity-warning {
        color: $warning-color;
      }
      &.activity-info {
        color: $primary-color;
      }
      &.activity-danger {
        color: $danger-color;
      }
    }
  }
}

.sankey-section {
  margin-top: 20px;

  .sankey-card {
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: bold;
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
