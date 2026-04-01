<script setup lang="ts">
import DateRangePicker from '@/components/common/DateRangePicker.vue'
import WorldClock from '@/components/common/WorldClock.vue'
import CardHeader from '@/components/dashboard/CardHeader.vue'
import RecentActivities from '@/components/dashboard/RecentActivities.vue'
import StatsCard from '@/components/dashboard/StatsCard.vue'
import StatusDistributionChart from '@/components/dashboard/StatusDistributionChart.vue'
import YearlyVolumeChart from '@/components/dashboard/YearlyVolumeChart.vue'
import DemurrageSummarySection from '@/components/demurrage/DemurrageSummarySection.vue'
import SankeyChart from '@/components/SankeyChart.vue'
import { containerService } from '@/services/container'
import { demurrageService } from '@/services/demurrage'
import { formatCurrency } from '@/utils/currency'
import { Clock, Money, Refresh, TrendCharts } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const loading = ref(false)

// 顶部时间窗口默认为本年
const dateRange = ref<[Date, Date]>([
  dayjs().startOf('year').toDate(),
  dayjs().endOf('year').toDate(),
])

const stats = ref({
  totalContainers: 0,
  activeContainers: 0,
  completedContainers: 0,
  alertContainers: 0,
  dumpedContainers: 0,
})
const demurrageSummary = ref<{
  totalAmount: number
  currency: string
  containerCountWithCharge: number
  avgPerContainer: number
} | null>(null)
const showDemurrageSection = ref(false)

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
  returned_empty: 0,
})
const yearlyData = ref<any[]>([])

type DashboardCache = {
  lastLoaded: number
  cacheDuration: number
  statusData: Record<string, number> | null
  yearlyData: any[] | null
  demurrageSummary: {
    totalAmount: number
    currency: string
    containerCountWithCharge: number
    avgPerContainer: number
  } | null
  stats: {
    totalContainers: number
    activeContainers: number
    completedContainers: number
    alertContainers: number
    dumpedContainers: number
  } | null
  alertDetails: {
    etaOverdue: number
    lastPickupOverdue: number
    lastReturnOverdue: number
    plannedPickupOverdue: number
  } | null
  statusDistribution: any[] | null
}

// 与 Shipments 页一致：仅用 getStatisticsDetailed，同一出运日期范围、同一口径
const MAIN_STATUS_KEYS = [
  'not_shipped',
  'shipped',
  'in_transit',
  'at_port',
  'picked_up',
  'unloaded',
  'returned_empty',
] as const

// 数据缓存
const dataCache = ref<DashboardCache>({
  lastLoaded: 0,
  cacheDuration: 60000, // 缓存1分钟
  statusData: null,
  yearlyData: null,
  demurrageSummary: null,
  stats: null,
  alertDetails: null,
  statusDistribution: null,
})

const loadData = async () => {
  // 检查缓存是否有效
  const now = Date.now()
  if (now - dataCache.value.lastLoaded < dataCache.value.cacheDuration && dataCache.value.stats) {
    // 使用缓存数据
    stats.value = dataCache.value.stats
    statusData.value = dataCache.value.statusData
    yearlyData.value = dataCache.value.yearlyData
    demurrageSummary.value = dataCache.value.demurrageSummary
    alertDetails.value = dataCache.value.alertDetails
    statusDistribution.value = dataCache.value.statusDistribution
    return
  }

  loading.value = true
  try {
    const startDate = dayjs(dateRange.value[0]).format('YYYY-MM-DD')
    const endDate = dayjs(dateRange.value[1]).format('YYYY-MM-DD')

    // 优先加载核心数据，滞港费数据后台加载
    const [statusResult, yearlyResult] = await Promise.allSettled([
      containerService.getStatisticsDetailed(startDate, endDate),
      containerService.getYearlyShipmentVolume(), // 年度出运量不受时间范围影响
    ])

    // 后台加载滞港费数据
    demurrageService
      .getSummary({ startDate, endDate, limit: 500 })
      .then(summaryRes => {
        if (summaryRes?.success && summaryRes?.data) {
          demurrageSummary.value = {
            totalAmount: summaryRes.data.totalAmount ?? 0,
            currency: summaryRes.data.currency ?? 'USD',
            containerCountWithCharge: summaryRes.data.containerCountWithCharge ?? 0,
            avgPerContainer: summaryRes.data.avgPerContainer ?? 0,
          }
          dataCache.value.demurrageSummary = demurrageSummary.value
        }
      })
      .catch(error => {
        console.error('Failed to load demurrage summary:', error)
      })

    const statusResponse = statusResult.status === 'fulfilled' ? statusResult.value : null
    const yearlyResponse = yearlyResult.status === 'fulfilled' ? yearlyResult.value : null

    if (statusResponse?.success && statusResponse?.data) {
      const res = statusResponse
      const dist = res.data.statusDistribution

      // 总柜数：与 Shipments/statistics-verify 一致，仅 7 个主状态之和（不含 arrived_at_transit/arrived_at_destination 子维度）
      const totalContainers = MAIN_STATUS_KEYS.reduce((sum, key) => sum + (dist[key] ?? 0), 0)
      // 在途货柜 = 未到港 + 已到中转港（与桑基图/按状态口径一致）
      const activeContainers =
        (dist.shipped ?? 0) + (dist.in_transit ?? 0) + (dist.arrived_at_transit ?? 0)

      statusData.value = {
        not_shipped: dist.not_shipped ?? 0,
        shipped: dist.shipped ?? 0,
        in_transit: dist.in_transit ?? 0,
        arrived_at_transit: dist.arrived_at_transit ?? 0,
        arrived_at_destination: dist.arrived_at_destination ?? 0,
        at_port: dist.at_port ?? 0,
        picked_up: dist.picked_up ?? 0,
        unloaded: dist.unloaded ?? 0,
        returned_empty: dist.returned_empty ?? 0,
      }

      const arrivalDist = res.data.arrivalDistribution ?? {}
      const lastPickupDist = res.data.lastPickupDistribution ?? {}
      const returnDist = res.data.returnDistribution ?? {}
      const pickupDist = res.data.pickupDistribution ?? {}

      alertDetails.value = {
        etaOverdue: arrivalDist.overdue ?? 0,
        lastPickupOverdue: lastPickupDist.expired ?? 0,
        lastReturnOverdue: returnDist.expired ?? 0,
        plannedPickupOverdue: pickupDist.overdue ?? 0,
      }

      // 模拟甩柜预警数量（实际应从后端API获取）
      const dumpedContainers = 5 // 假设当前有5个甩柜预警

      stats.value = {
        totalContainers,
        activeContainers,
        completedContainers: dist.returned_empty ?? 0,
        alertContainers:
          alertDetails.value.etaOverdue +
          alertDetails.value.lastPickupOverdue +
          alertDetails.value.lastReturnOverdue +
          alertDetails.value.plannedPickupOverdue,
        dumpedContainers,
      }

      statusDistribution.value = [
        { name: '已出运', value: dist.shipped ?? 0, color: '#409eff' },
        { name: '在途', value: dist.in_transit ?? 0, color: '#e6a23c' },
        { name: '已到中转港', value: dist.arrived_at_transit ?? 0, color: '#909399' },
        { name: '已到目的港', value: dist.at_port ?? 0, color: '#67c23a' },
        { name: '已提柜', value: dist.picked_up ?? 0, color: '#f39c12' },
        { name: '已卸柜', value: dist.unloaded ?? 0, color: '#3498db' },
        { name: '已还箱', value: dist.returned_empty ?? 0, color: '#95a5a6' },
      ]
    } else {
      stats.value = {
        totalContainers: 0,
        activeContainers: 0,
        completedContainers: 0,
        alertContainers: 0,
      }
    }

    const yearlyRes = yearlyResponse?.success && yearlyResponse?.data ? yearlyResponse : null
    if (yearlyRes) {
      yearlyData.value = yearlyRes.data
    }

    // 更新缓存
    dataCache.value = {
      lastLoaded: now,
      cacheDuration: 60000,
      statusData: statusData.value,
      yearlyData: yearlyData.value,
      demurrageSummary: demurrageSummary.value,
      stats: stats.value,
      alertDetails: alertDetails.value,
      statusDistribution: statusDistribution.value,
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
      timeDimension: 'shipped_date', // 使用出运时间作为筛选维度
    },
  })
}

const demurrageSummaryRef = ref<InstanceType<typeof DemurrageSummarySection>>()
const handleRefresh = () => {
  loadData()
  demurrageSummaryRef.value?.reload?.()
}

const formatDemurrageAmount = (amount: number, currency: string) =>
  formatCurrency(amount, currency, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    showSymbol: false,
    showCode: true,
  })

const demurrageSectionRef = ref<HTMLElement | null>(null)
const showDemurrage = async () => {
  const wasHidden = !showDemurrageSection.value
  showDemurrageSection.value = !showDemurrageSection.value
  if (showDemurrageSection.value) {
    if (wasHidden) demurrageSummaryRef.value?.reload?.()
    await nextTick()
    demurrageSectionRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const handleDateChange = (value: [Date, Date] | null) => {
  if (value) {
    dateRange.value = value
    loadData()
  }
}

onMounted(() => {
  loadData()
  const interval = setInterval(loadData, 300000) // 5分钟刷新一次
  onUnmounted(() => clearInterval(interval))
})
</script>

<template>
  <div class="dashboard">
    <!-- 多国时区时钟 -->
    <section class="clock-section">
      <WorldClock />
    </section>

    <header class="dashboard-header">
      <div class="header-main">
        <h1 class="page-title">数据概览</h1>
        <p class="page-subtitle">货柜与滞港费统计一览</p>
      </div>
      <div class="header-actions">
        <DateRangePicker v-model="dateRange" @update:modelValue="handleDateChange" />
        <el-button type="primary" :icon="Refresh" :loading="loading" @click="handleRefresh">
          刷新数据
        </el-button>
      </div>
    </header>

    <section class="stats-grid">
      <StatsCard
        type="active"
        :value="stats.activeContainers"
        label="在途货柜"
        @click="goToShipments"
      />

      <StatsCard
        type="alert"
        :value="stats.alertContainers"
        label="逾期货柜"
        :alert-details="alertDetails"
        @click="goToShipments"
      />

      <StatsCard
        type="danger"
        :value="stats.dumpedContainers"
        label="甩柜预警"
        @click="goToShipments"
      />

      <div class="demurrage-stats-group">
        <StatsCard
          type="completed"
          :icon="Money"
          :value="demurrageSummary?.totalAmount ?? 0"
          :display-value="
            demurrageSummary
              ? formatDemurrageAmount(demurrageSummary.totalAmount, demurrageSummary.currency)
              : '暂无数'
          "
          label="滞港费合计"
          :demurrage-details="
            demurrageSummary
              ? {
                  containerCount: demurrageSummary.containerCountWithCharge,
                  avgPerContainer: formatDemurrageAmount(
                    demurrageSummary.avgPerContainer,
                    demurrageSummary.currency
                  ),
                  alertStatus: demurrageSummary.containerCountWithCharge > 0 ? '需关注' : '正常',
                }
              : undefined
          "
          @click="showDemurrage"
        />
      </div>
    </section>

    <Transition name="demurrage-slide">
      <section v-if="showDemurrageSection" ref="demurrageSectionRef" class="demurrage-section">
        <DemurrageSummarySection
          ref="demurrageSummaryRef"
          :start-date="dateRange?.[0] ? dayjs(dateRange[0]).format('YYYY-MM-DD') : undefined"
          :end-date="dateRange?.[1] ? dayjs(dateRange[1]).format('YYYY-MM-DD') : undefined"
          @collapse="showDemurrageSection = false"
        />
      </section>
    </Transition>

    <section class="sankey-section">
      <el-card class="sankey-card">
        <template #header>
          <CardHeader title="货柜状态流转" :icon="TrendCharts" />
        </template>
        <SankeyChart :data="{ statusDistribution: statusData }" />
      </el-card>
    </section>

    <section class="yearly-section">
      <el-card class="yearly-card">
        <YearlyVolumeChart :data="yearlyData" />
      </el-card>
    </section>

    <section class="content-grid">
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
    </section>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.dashboard {
  padding: $spacing-lg;
  max-width: 1600px;
  margin: 0 auto;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: $spacing-md;
  }
}

.clock-section {
  margin-bottom: $spacing-lg;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: $spacing-lg;
  gap: $spacing-lg;
  flex-wrap: wrap;

  .header-main {
    min-width: 0;
  }

  .page-title {
    margin: 0 0 $spacing-xs 0;
    font-size: $font-size-xxl;
    font-weight: 600;
    color: $text-primary;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }

  .page-subtitle {
    margin: 0;
    font-size: $font-size-sm;
    color: $text-secondary;
  }

  .header-actions {
    display: flex;
    gap: $spacing-md;
    align-items: center;
    flex-shrink: 0;
  }
}

.demurrage-slide-enter-active,
.demurrage-slide-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.25s ease;
}

.demurrage-slide-enter-from,
.demurrage-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.demurrage-section {
  margin-bottom: $spacing-lg;
  margin-top: -$spacing-sm;
  padding-top: $spacing-md;
  border-top: 1px solid $border-lighter;

  :deep(.el-card) {
    border-radius: $radius-large;
    border: 1px solid $border-lighter;
    box-shadow: $shadow-light;
    transition: $transition-base;

    &:hover {
      box-shadow: $shadow-base;
    }

    .el-card__header {
      padding: $spacing-md $spacing-lg;
      border-bottom: 1px solid $border-lighter;
      background: $bg-page;
    }

    .el-card__body {
      padding: $spacing-lg;
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: $spacing-md;
  margin-bottom: $spacing-lg;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  .demurrage-stats-group {
    min-width: 0;
  }

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
}

.sankey-section,
.yearly-section {
  margin-bottom: $spacing-lg;

  :deep(.el-card) {
    border-radius: $radius-large;
    border: 1px solid $border-lighter;
    box-shadow: $shadow-light;
    transition: $transition-base;

    &:hover {
      box-shadow: $shadow-base;
    }

    .el-card__header {
      padding: $spacing-md $spacing-lg;
      border-bottom: 1px solid $border-lighter;
      background: $bg-page;
    }

    .el-card__body {
      padding: $spacing-lg;
    }
  }
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: $spacing-lg;

  :deep(.el-card) {
    border-radius: $radius-large;
    border: 1px solid $border-lighter;
    box-shadow: $shadow-light;
    transition: $transition-base;

    &:hover {
      box-shadow: $shadow-base;
    }

    .el-card__header {
      padding: $spacing-md $spacing-lg;
      border-bottom: 1px solid $border-lighter;
      background: $bg-page;
    }

    .el-card__body {
      padding: $spacing-lg;
    }
  }
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
