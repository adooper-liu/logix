<script setup lang="ts">
import * as echarts from 'echarts'
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'

interface YearlyVolumeChartProps {
  data: Array<{
    year: number
    volume: number
    months: Array<{ month: number; volume: number }>
  }>
}

const props = defineProps<YearlyVolumeChartProps>()

const viewType = ref<'yearly' | 'monthly'>('monthly')

let chartInstance: echarts.ECharts | null = null

const formatMonth = (month: number, year: number) => {
  return `${year}-${month.toString().padStart(2, '0')}`
}

const updateChart = () => {
  if (!chartInstance) return

  let option: any = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: viewType.value === 'yearly' ? 'shadow' : 'cross'
      },
      formatter: (params: any) => {
        if (viewType.value === 'yearly') {
          const data = params[0]
          return `${data.name}年<br/>出运量: ${data.value}个`
        } else {
          let result = ''
          params.forEach((param: any) => {
            result += `${param.seriesName}<br/>${param.name}: ${param.value}个<br/>`
          })
          return result
        }
      }
    },
    legend: {
      data: viewType.value === 'yearly' ? ['出运量'] : props.data.map((item: any) => item.year + '年'),
      top: 10,
      left: 'center'
    },
    grid: {
      left: '5%',
      right: '5%',
      bottom: '15%',
      top: '50px'
    },
    xAxis: {
      type: 'category',
      axisLabel: {
        fontSize: 12,
        rotate: viewType.value === 'monthly' ? 45 : 0
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value}个'
      }
    },
    series: []
  }

  if (viewType.value === 'yearly') {
    const years = props.data.map((item: any) => item.year.toString())
    const volumes = props.data.map((item: any) => item.volume)

    option.xAxis.data = years
    option.series = [
      {
        name: '出运量',
        type: 'bar',
        data: volumes,
        barWidth: '40%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#409eff' },
              { offset: 1, color: '#67c23a' }
            ]
          },
          borderRadius: [8, 8, 0, 0]
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c}',
          fontSize: 14,
          fontWeight: 'bold',
          color: '#333'
        }
      }
    ]
  } else {
    const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
    option.xAxis.data = months
    option.tooltip.axisPointer.type = 'cross'

    option.series = props.data.map((item: any) => ({
      name: item.year + '年',
      type: 'line',
      data: item.months.map((m: any) => m.volume),
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: {
        width: 3
      },
      itemStyle: {
        borderWidth: 2,
        borderColor: '#fff'
      }
    }))
  }

  chartInstance.setOption(option, true)
}

watch(() => props.data, () => {
  updateChart()
}, { deep: true })

watch(() => viewType.value, () => {
  updateChart()
})

onMounted(() => {
  const chartDom = document.getElementById('yearly-chart')
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
  <div class="chart-container">
    <div class="chart-header">
      <div class="chart-title">出运量统计</div>
      <el-radio-group v-model="viewType" size="small">
        <el-radio-button value="monthly">按月（线状图）</el-radio-button>
        <el-radio-button value="yearly">按年（柱形图）</el-radio-button>
      </el-radio-group>
    </div>
    <div id="yearly-chart" style="height: 300px"></div>
  </div>
</template>

<style scoped lang="scss">
.chart-container {
  width: 100%;

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding: 0 5px;

    .chart-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
  }

  #yearly-chart {
    width: 100%;
    height: 300px;
  }
}
</style>
