<script setup lang="ts">
import * as echarts from 'echarts'

interface StatusDistributionChartProps {
  data: Array<{
    name: string
    value: number
    color: string
  }>
}

const props = defineProps<StatusDistributionChartProps>()

let chartInstance: echarts.ECharts | null = null

const updateChart = () => {
  if (!chartInstance) return

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
          show: true,
          position: 'outside',
          formatter: (params: any) => {
            return `${params.name}\n${params.value} (${params.percent}%)`
          },
          fontSize: 12,
          color: 'rgba(0,0,0,0.7)',
          fontWeight: 'normal',
        },
        labelLine: {
          show: true,
          length: 8,
          length2: 5,
        },
        emphasis: {
          label: {
            show: true,
            fontSize: '14',
            fontWeight: 'bold',
          },
        },
        data: props.data,
      },
    ],
  }

  chartInstance.setOption(option)
}

import { onMounted, onUnmounted, watch } from 'vue'

watch(
  () => props.data,
  () => {
    updateChart()
  },
  { deep: true }
)

onMounted(() => {
  const chartDom = document.getElementById('status-chart')
  if (chartDom) {
    chartInstance = echarts.init(chartDom)
    updateChart()
  }

  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  chartInstance?.resize()
}
</script>

<template>
  <div id="status-chart" style="height: 300px"></div>
</template>

<style scoped lang="scss">
#status-chart {
  width: 100%;
  height: 300px;
}
</style>
