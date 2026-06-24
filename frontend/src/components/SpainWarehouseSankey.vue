<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

interface Props {
  data: {
    warehouses: string[]
    provinces: Array<{
      name: string
      nameEs: string
      orderPercentage: number
      population: number
      distances: Record<string, string> // warehouse -> distance (近/中/远)
    }>
  }
}

const props = defineProps<Props>()

let chartInstance: echarts.ECharts | null = null

// 距离权重映射（用于估算订单量）
const DISTANCE_WEIGHTS: Record<string, number> = {
  近: 0.7,
  中: 0.25,
  远: 0.05,
}

// 初始化图表
const initChart = () => {
  const chartDom = document.getElementById('spain-warehouse-sankey')
  if (chartDom) {
    chartInstance = echarts.init(chartDom)
    updateChart()
  }
}

// 更新图表数据
const updateChart = () => {
  if (!chartInstance || !props.data) return

  const { warehouses, provinces } = props.data

  // 构建节点
  const nodes: Array<{ name: string; value?: number }> = [
    ...warehouses.map((w) => ({ name: w })),
    ...provinces.map((p) => ({ name: p.name, value: p.orderPercentage })),
  ]

  // 构建链接：根据距离权重分配订单占比
  const links: Array<{ source: string; target: string; value: number }> = []

  provinces.forEach((province) => {
    let totalWeight = 0
    const weights: Record<string, number> = {}

    // 计算每个仓库的权重
    warehouses.forEach((warehouse) => {
      const distance = province.distances[warehouse] || '中'
      const weight = DISTANCE_WEIGHTS[distance] || 0.25
      weights[warehouse] = weight
      totalWeight += weight
    })

    // 归一化并分配订单占比
    warehouses.forEach((warehouse) => {
      const normalizedWeight = weights[warehouse] / totalWeight
      const orderValue = province.orderPercentage * normalizedWeight

      if (orderValue > 0.1) {
        // 只显示占比大于 0.1% 的链接，避免过于杂乱
        links.push({
          source: warehouse,
          target: province.name,
          value: parseFloat(orderValue.toFixed(2)),
        })
      }
    })
  })

  const option = {
    title: {
      text: '西班牙仓库到省份物流分布',
      subtext: '连接线粗细表示订单占比',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'bold',
      },
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (params: any) => {
        if (params.dataType === 'edge') {
          return `${params.data.source} → ${params.data.target}<br/>订单占比: ${params.data.value}%`
        } else {
          const province = provinces.find((p) => p.name === params.name)
          if (province) {
            return `${province.name} (${province.nameEs})<br/>订单占比: ${province.orderPercentage}%<br/>人口: ${province.population.toLocaleString()}K`
          }
          return `${params.name}<br/>仓库`
        }
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: {
          focus: 'adjacency',
        },
        data: nodes,
        links: links,
        top: '15%',
        bottom: '10%',
        left: '10%',
        right: '15%',
        nodeWidth: 25,
        nodeGap: 10,
        layoutIterations: 32,
        label: {
          color: 'rgba(0,0,0,0.7)',
          fontFamily: 'Arial',
          fontSize: 11,
          formatter: (params: any) => {
            const province = provinces.find((p) => p.name === params.name)
            if (province) {
              return `${province.name}\n${province.orderPercentage}%`
            }
            return params.name
          },
        },
        lineStyle: {
          color: 'source',
          curveness: 0.5,
          opacity: 0.4,
        },
        itemStyle: {
          color: (params: any) => {
            // 仓库节点使用不同颜色
            if (warehouses.includes(params.name)) {
              const colors: Record<string, string> = {
                巴塞罗那: '#5470c6',
                马德里: '#91cc75',
                瓦伦西亚: '#fac858',
                里斯本: '#ee6666',
              }
              return colors[params.name] || '#73c0de'
            }
            // 省份节点使用渐变色
            return undefined
          },
          borderWidth: 1,
          borderColor: '#aaa',
        },
      },
    ],
  }

  chartInstance.setOption(option, true)
}

// 监听数据变化
watch(
  () => props.data,
  () => {
    if (chartInstance) {
      updateChart()
    }
  },
  { deep: true }
)

onMounted(() => {
  initChart()

  // 响应式调整
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
  <div class="spain-warehouse-sankey-container">
    <div id="spain-warehouse-sankey" style="width: 100%; height: 600px"></div>
  </div>
</template>

<style scoped lang="scss">
.spain-warehouse-sankey-container {
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>
