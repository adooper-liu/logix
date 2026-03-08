<script setup lang="ts">
import * as echarts from 'echarts'
import { ref, onMounted, onUnmounted, watch } from 'vue'

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

// 与 variables 一致：柱状图渐变、折线图多色
const BAR_GRADIENT = [
  { offset: 0, color: '#409EFF' },
  { offset: 1, color: '#67C23A' }
]
const LINE_COLORS = ['#409EFF', '#E6A23C', '#67C23A', '#909399', '#F56C6C', '#00d4ff']

const updateChart = () => {
  if (!chartInstance) return

  const option: echarts.ComposeOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255,255,255,0.96)',
      borderColor: '#E4E7ED',
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: '#303133', fontSize: 13 },
      axisPointer: {
        type: viewType.value === 'yearly' ? 'shadow' : 'cross',
        shadowStyle: { color: 'rgba(0,0,0,0.06)' },
        crossStyle: { color: '#909399' }
      },
      formatter: (params: any) => {
        if (viewType.value === 'yearly') {
          const data = params[0]
          return `${data.name}年<br/><span style="color:#606266">出运货柜：</span><strong>${data.value}</strong> 柜`
        }
        let result = ''
        ;(params as any[]).forEach((param: any) => {
          result += `${param.seriesName}：<strong>${param.value}</strong> 柜<br/>`
        })
        return result
      }
    },
    legend: {
      data: viewType.value === 'yearly' ? ['出运货柜'] : props.data.map((item: any) => item.year + '年'),
      top: 8,
      left: 'center',
      textStyle: { color: '#606266', fontSize: 12 }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '14%',
      top: 44,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      axisLine: { lineStyle: { color: '#E4E7ED' } },
      axisTick: { show: false },
      axisLabel: {
        color: '#606266',
        fontSize: 12,
        rotate: viewType.value === 'monthly' ? 45 : 0
      }
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#EBEEF5', type: 'dashed' } },
      axisLabel: {
        color: '#606266',
        fontSize: 12,
        formatter: '{value}'
      }
    },
    series: [] as any[]
  }

  if (viewType.value === 'yearly') {
    const years = props.data.map((item: any) => item.year.toString())
    const volumes = props.data.map((item: any) => item.volume)

    ;(option as any).xAxis.data = years
    ;(option as any).series = [
      {
        name: '出运货柜',
        type: 'bar',
        data: volumes,
        barWidth: '42%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: BAR_GRADIENT
          },
          borderRadius: [6, 6, 0, 0]
        },
        emphasis: {
          itemStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: '#79bbff' },
                { offset: 1, color: '#95d475' }
              ]
            }
          }
        },
        label: {
          show: true,
          position: 'top',
          formatter: '{c} 柜',
          fontSize: 13,
          fontWeight: 600,
          color: '#303133'
        }
      }
    ]
  } else {
    const months = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
    ;(option as any).xAxis.data = months
    ;(option as any).tooltip.axisPointer.type = 'cross'

    ;(option as any).series = props.data.map((item: any, idx: number) => ({
      name: item.year + '年',
      type: 'line',
      data: item.months.map((m: any) => m.volume),
      smooth: true,
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: {
        width: 2.5,
        color: LINE_COLORS[idx % LINE_COLORS.length]
      },
      itemStyle: {
        color: LINE_COLORS[idx % LINE_COLORS.length],
        borderWidth: 2,
        borderColor: '#fff'
      },
      emphasis: { scale: true, scaleSize: 10 }
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
      <span class="chart-title">出运货柜统计</span>
      <el-radio-group v-model="viewType" size="small" class="view-switch">
        <el-radio-button value="monthly">按月</el-radio-button>
        <el-radio-button value="yearly">按年</el-radio-button>
      </el-radio-group>
    </div>
    <div id="yearly-chart" class="chart-body"></div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.chart-container {
  width: 100%;
  padding: $spacing-md;
  background: $bg-color;
  border-radius: 8px;
  border: 1px solid $border-light;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);

  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-md;
    padding: 0 $spacing-xs;

    .chart-title {
      font-size: 17px;
      font-weight: 600;
      color: $text-primary;
      letter-spacing: 0.02em;
    }

    .view-switch {
      :deep(.el-radio-button__inner) {
        font-size: 12px;
      }
    }
  }

  .chart-body {
    width: 100%;
    height: 320px;
  }
}
</style>
