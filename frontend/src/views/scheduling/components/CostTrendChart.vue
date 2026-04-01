<template>
  <div class="cost-trend-chart">
    <el-card shadow="hover">
      <template #header>
        <div class="chart-header">
          <span>📈 成本趋势分析</span>
          <el-radio-group v-model="chartType" size="small">
            <el-radio-button value="line">折线图</el-radio-button>
            <el-radio-button value="bar">柱状图</el-radio-button>
          </el-radio-group>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            size="small"
            @change="loadCostData"
          />
        </div>
      </template>

      <!-- ECharts 图表 -->
      <div ref="chartRef" class="chart-container"></div>

      <!-- 数据摘要 -->
      <div class="data-summary">
        <el-descriptions :column="4" border size="small">
          <el-descriptions-item label="平均成本">
            ${{ avgCost.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="最高成本">
            ${{ maxCost.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="最低成本">
            ${{ minCost.toFixed(2) }}
          </el-descriptions-item>
          <el-descriptions-item label="总节省">
            <span :class="['total-saving', totalSaving > 0 ? 'positive' : 'negative']">
              ${{ totalSaving.toFixed(2) }}
            </span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import api from '@/services/api'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import { onMounted, onUnmounted, ref, watch } from 'vue'

// Props
const props = defineProps<{
  containerNumbers?: string[]
  schedulingId?: string
}>()

// 数据状态
const chartRef = ref<HTMLElement | null>(null)
const chartType = ref<'line' | 'bar'>('line')
const dateRange = ref<[Date, Date]>([
  dayjs().subtract(30, 'day').toDate(),
  dayjs().toDate()
])

let chartInstance: echarts.ECharts | null = null
const costData = ref<any[]>([])

// 计算属性
const avgCost = ref(0)
const maxCost = ref(0)
const minCost = ref(0)
const totalSaving = ref(0)

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['总成本', '滞港费', '滞箱费', '运输费'],
      top: 10
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: [] as string[]
    },
    yAxis: {
      type: 'value',
      name: '金额 ($)',
      axisLabel: {
        formatter: '${value}'
      }
    },
    series: [
      {
        name: '总成本',
        type: chartType.value === 'line' ? 'line' : 'bar',
        smooth: true,
        areaStyle: {
          opacity: 0.3
        },
        data: [] as number[]
      },
      {
        name: '滞港费',
        type: chartType.value === 'line' ? 'line' : 'bar',
        smooth: true,
        data: [] as number[]
      },
      {
        name: '滞箱费',
        type: chartType.value === 'line' ? 'line' : 'bar',
        smooth: true,
        data: [] as number[]
      },
      {
        name: '运输费',
        type: chartType.value === 'line' ? 'line' : 'bar',
        smooth: true,
        data: [] as number[]
      }
    ]
  }

  chartInstance.setOption(option)

  // 响应式调整
  window.addEventListener('resize', handleResize)
}

// 加载成本数据
const loadCostData = async () => {
  try {
    const [start, end] = dateRange.value
    const startDate = dayjs(start).format('YYYY-MM-DD')
    const endDate = dayjs(end).format('YYYY-MM-DD')

    const params: any = {
      startDate,
      endDate
    }

    if (props.containerNumbers && props.containerNumbers.length > 0) {
      params.containerNumbers = props.containerNumbers.join(',')
    }

    const response = await api.get('/cost/summary', { params })

    if (response.data.success) {
      costData.value = response.data.data
      updateChart()
      calculateSummary()
    }
  } catch (error: any) {
    console.error('加载成本数据失败:', error)
  }
}

// 更新图表
const updateChart = () => {
  if (!chartInstance) return

  const dates = costData.value.map((item: any) => item.date)
  const totalCosts = costData.value.map((item: any) => item.totalCost || 0)
  const demurrageCosts = costData.value.map((item: any) => item.demurrageCost || 0)
  const detentionCosts = costData.value.map((item: any) => item.detentionCost || 0)
  const transportationCosts = costData.value.map((item: any) => item.transportationCost || 0)

  chartInstance.setOption({
    xAxis: {
      data: dates
    },
    series: [
      {
        name: '总成本',
        data: totalCosts,
        type: chartType.value === 'line' ? 'line' : 'bar'
      },
      {
        name: '滞港费',
        data: demurrageCosts,
        type: chartType.value === 'line' ? 'line' : 'bar'
      },
      {
        name: '滞箱费',
        data: detentionCosts,
        type: chartType.value === 'line' ? 'line' : 'bar'
      },
      {
        name: '运输费',
        data: transportationCosts,
        type: chartType.value === 'line' ? 'line' : 'bar'
      }
    ]
  })
}

// 计算摘要数据
const calculateSummary = () => {
  if (costData.value.length === 0) {
    avgCost.value = 0
    maxCost.value = 0
    minCost.value = 0
    totalSaving.value = 0
    return
  }

  const totalCosts = costData.value.map((item: any) => item.totalCost || 0)
  
  avgCost.value = totalCosts.reduce((sum: number, cost: number) => sum + cost, 0) / totalCosts.length
  maxCost.value = Math.max(...totalCosts)
  minCost.value = Math.min(...totalCosts)
  
  // 计算总节省（假设原始成本为最高值）
  totalSaving.value = totalCosts.reduce((sum: number, cost: number) => {
    return sum + (maxCost.value - cost)
  }, 0)
}

// 窗口大小变化处理
const handleResize = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// 监听图表类型变化
watch(chartType, () => {
  updateChart()
})

// 生命周期
onMounted(() => {
  initChart()
  loadCostData()
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
  }
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
.cost-trend-chart {
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
  }

  .chart-container {
    width: 100%;
    height: 400px;
  }

  .data-summary {
    margin-top: 16px;

    .total-saving {
      font-weight: bold;

      &.positive {
        color: #67c23a;
      }

      &.negative {
        color: #f56c6c;
      }
    }
  }
}
</style>
