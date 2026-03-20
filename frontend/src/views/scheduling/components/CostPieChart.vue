<template>
  <div class="cost-pie-chart">
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import * as echarts from 'echarts'
import type { CostBreakdown } from '@/types/scheduling'

const props = defineProps<{
  data: CostBreakdown
}>()

const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const initChart = () => {
  if (!chartRef.value) return

  chartInstance = echarts.init(chartRef.value)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ${c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['滞港费', '滞箱费', '堆存费', '运输费', '操作费']
    },
    series: [
      {
        name: '成本构成',
        type: 'pie',
        radius: '50%',
        data: [
          { value: props.data.demurrageCost, name: '滞港费' },
          { value: props.data.detentionCost, name: '滞箱费' },
          { value: props.data.storageCost, name: '堆存费' },
          { value: props.data.transportationCost, name: '运输费' },
          { value: props.data.handlingCost, name: '操作费' }
        ].filter(item => item.value > 0),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          formatter: '{b}: ${c}'
        }
      }
    ]
  }

  chartInstance.setOption(option)
}

onMounted(() => {
  initChart()

  window.addEventListener('resize', () => {
    chartInstance?.resize()
  })
})

watch(
  () => props.data,
  () => {
    if (chartInstance) {
      chartInstance.dispose()
      initChart()
    }
  },
  { deep: true }
)
</script>

<style scoped lang="scss">
.cost-pie-chart {
  .chart-container {
    width: 100%;
    height: 300px;
  }
}
</style>
