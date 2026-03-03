<script setup lang="ts">
import CardHeader from '@/components/dashboard/CardHeader.vue'
import RecentActivities from '@/components/dashboard/RecentActivities.vue'
import StatsCard from '@/components/dashboard/StatsCard.vue'
import StatusDistributionChart from '@/components/dashboard/StatusDistributionChart.vue'
import YearlyVolumeChart from '@/components/dashboard/YearlyVolumeChart.vue'
import SankeyChart from '@/components/SankeyChart.vue'
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import WorldClock from '@/components/common/WorldClock.vue'
import { containerService } from '@/services/container'
import { Clock, Refresh, TrendCharts } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'

const router = useRouter()
const loading = ref(false)

const dateRange = ref<[Date, Date]>([
  dayjs().subtract(90, 'day').startOf('day').toDate(),
  dayjs().endOf('day').toDate()
])

const stats = ref({
  totalContainers: 0,
  activeContainers: 0,
  completedContainers: 0,
  alertContainers: 0,
})

const alertDetails = ref({
  etaOverdue: 0,
  lastPickupOverdue: 0,
  lastReturnOverdue: 0,
  plannedPickupOverdue: 0,
})

const recentActivities = ref<any[]>([])
const statusDistribution = ref<any[]>([])
const statusData = ref<Record<string, number>>({
  not_shipped: 0,
  shipped: 0,
  in_transit: 0,
  arrived_at_transit: 0,
  at_port: 0,
  picked_up: 0,
  unloaded: 0,
  returned_empty: 0
})
const yearlyData = ref<any[]>([])

const loadData = async () => {
  loading.value = true
  try {
    const startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
    const endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')

    const [verifyResponse, statusResponse, yearlyResponse] = await Promise.all([
      containerService.getStatisticsVerification(startDate, endDate),
      containerService.getStatisticsDetailed(startDate, endDate),
      containerService.getYearlyShipmentVolume() // 年度出运量不受时间范围影响
    ])

    if (verifyResponse.success && verifyResponse.data) {
      const data = verifyResponse.data
      stats.value = {
        totalContainers: data.totalContainers,
        activeContainers: data.totalInTransit,
        completedContainers: 0,
        alertContainers: 0,
      }
    }

    if (statusResponse.success && statusResponse.data) {
      const dist = statusResponse.data.statusDistribution
      // 合并默认值和实际数据，确保即使部分字段缺失也有默认值
      statusData.value = {
        not_shipped: dist.not_shipped || 0,
        shipped: dist.shipped || 0,
        in_transit: dist.in_transit || 0,
        arrived_at_transit: dist.arrived_at_transit || 0,
        at_port: dist.at_port || 0,
        picked_up: dist.picked_up || 0,
        unloaded: dist.unloaded || 0,
        returned_empty: dist.returned_empty || 0
      }
      stats.value.completedContainers = dist.returned_empty || 0

      const arrivalDist = statusResponse.data.arrivalDistribution
      const lastPickupDist = statusResponse.data.lastPickupDistribution
      const returnDist = statusResponse.data.returnDistribution
      const pickupDist = statusResponse.data.pickupDistribution

      alertDetails.value = {
        etaOverdue: arrivalDist?.overdue || 0,
        lastPickupOverdue: lastPickupDist?.expired || 0,
        lastReturnOverdue: returnDist?.expired || 0,
        plannedPickupOverdue: pickupDist?.overdue || 0,
      }

      stats.value.alertContainers =
        alertDetails.value.etaOverdue +
        alertDetails.value.lastPickupOverdue +
        alertDetails.value.lastReturnOverdue +
        alertDetails.value.plannedPickupOverdue

      statusDistribution.value = [
        { name: '已出运', value: dist.shipped || 0, color: '#409eff' },
        { name: '在途', value: dist.in_transit || 0, color: '#e6a23c' },
        { name: '已到中转港', value: dist.arrived_at_transit || 0, color: '#909399' },
        { name: '已到目的港', value: dist.at_port || 0, color: '#67c23a' },
        { name: '已提柜', value: dist.picked_up || 0, color: '#f39c12' },
        { name: '已卸柜', value: dist.unloaded || 0, color: '#3498db' },
        { name: '已还箱', value: dist.returned_empty || 0, color: '#95a5a6' },
      ]
    }

    if (yearlyResponse.success && yearlyResponse.data) {
      yearlyData.value = yearlyResponse.data
    }
  } catch (error) {
    console.error('Failed to load dashboard data:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const goToShipments = () => {
  // 将当前选择的时间范围传递到Shipments页面
  const startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
  const endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')
  router.push({
    path: '/shipments',
    query: {
      startDate,
      endDate,
      timeDimension: 'shipped_date' // 使用出运时间作为筛选维度
    }
  })
}

const handleRefresh = () => {
  loadData()
}

const handleDateChange = (value: [Date, Date] | null) => {
  if (value) {
    dateRange.value = value
    loadData()
  }
}

onMounted(() => {
  loadData()
  const interval = setInterval(loadData, 30000)
  onUnmounted(() => clearInterval(interval))
})
</script>

<template>
  <div class="dashboard">
    <!-- 多国时区时钟 -->
    <div class="clock-section">
      <WorldClock />
    </div>

    <div class="dashboard-header">
      <h2>数据概览</h2>
      <div class="header-actions">
        <DateRangePicker v-model="dateRange" @update:modelValue="handleDateChange" />
        <el-button type="primary" :icon="Refresh" :loading="loading" @click="handleRefresh">
          刷新数据
        </el-button>
      </div>
    </div>

    <div class="stats-grid">
      <StatsCard
        type="total"
        :value="stats.totalContainers"
        label="总集装箱数"
        @click="goToShipments"
      />

      <StatsCard
        type="active"
        :value="stats.activeContainers"
        label="在途集装箱"
        @click="goToShipments"
      />

      <StatsCard
        type="alert"
        :value="stats.alertContainers"
        label="异常集装箱"
        :alert-details="alertDetails"
        @click="goToShipments"
      />

      <StatsCard
        type="completed"
        :value="stats.completedContainers"
        label="已还箱"
        @click="goToShipments"
      />
    </div>

    <div class="sankey-section">
      <el-card class="sankey-card">
        <template #header>
          <CardHeader title="货柜状态流转" :icon="TrendCharts" />
        </template>
        <SankeyChart :data="{ statusDistribution: statusData }" />
      </el-card>
    </div>

    <div class="yearly-section">
      <el-card class="yearly-card">
        <YearlyVolumeChart :data="yearlyData" />
      </el-card>
    </div>

    <div class="content-grid">
      <el-card class="chart-card">
        <template #header>
          <CardHeader title="集装箱状态分布" :icon="TrendCharts" />
        </template>
        <StatusDistributionChart :data="statusDistribution" />
      </el-card>

      <el-card class="activity-card">
        <template #header>
          <CardHeader title="最近活动" :icon="Clock" />
        </template>
        <RecentActivities :activities="recentActivities" />
      </el-card>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.dashboard {
  padding: 20px;
}

.clock-section {
  margin-bottom: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;

  h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: $text-primary;
  }

  .header-actions {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
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

.yearly-section {
  margin-top: 20px;

  .yearly-card {
    padding: 20px;
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

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
