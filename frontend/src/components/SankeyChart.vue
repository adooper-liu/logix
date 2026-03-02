<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import * as echarts from 'echarts'

interface Props {
  data: {
    statusDistribution: Record<string, number>
  }
}

const props = defineProps<Props>()

let chartInstance: echarts.ECharts | null = null

// 状态流转节点（顺序决定垂直排列，从上到下）
const nodes = [
  { name: '已出运' },
  { name: '在途' },
  { name: '已到中转港' },
  { name: '已到目的港' },
  { name: '已提柜' },
  { name: '已卸柜' },
  { name: '已还箱' },
  { name: '未还箱' },
  { name: '未卸柜' }
] as const

// 初始化图表
const initChart = () => {
  const chartDom = document.getElementById('sankey-chart')
  if (chartDom) {
    chartInstance = echarts.init(chartDom)
    updateChart()
  }
}

// 更新图表数据
const updateChart = () => {
  if (!chartInstance) return

  const dist = props.data.statusDistribution

  // 检查数据是否有效
  if (!dist || Object.keys(dist).length === 0) {
    console.warn('SankeyChart: statusDistribution is empty')
    return
  }

  // 桑基图节点值计算（当前状态分解图）：
  // 核心原则：每个货柜只出现在最终状态节点，不重复统计
  //
  // 节点层次结构：
  // 第一层：已出运（根节点）= 所有已出运的货柜
  // 第二层：在途（运输中）→ 已到中转港（从在途流转）
  // 第三层：已到目的港
  // 第四层：已提柜（从目的港流转）
  // 第五层：已卸柜 + 未卸柜（从已提柜流转）
  // 第六层：未还箱 + 已还箱（从已卸柜流转）
  //
  // 状态归类：
  // shipped, in_transit → 在途（运输中）
  // arrived_at_transit → 已到中转港（从在途流转的列示）
  // at_port → 已到目的港
  // picked_up → 已提柜
  // unloaded → 已卸柜
  // returned_empty → 已还箱
  // 未卸柜 = picked_up（停留在picked_up状态）
  // 未还箱 = unloaded（停留在unloaded状态）
  const nodeValues = {
    // 第一层：所有已出运的货柜（不含已到中转港）
    '已出运': (dist.shipped || 0) + (dist.in_transit || 0) +
              (dist.at_port || 0) + (dist.picked_up || 0) + (dist.unloaded || 0) + (dist.returned_empty || 0),

    // 第二层：按状态分解
    '在途': (dist.shipped || 0) + (dist.in_transit || 0),
    '已到中转港': (dist.arrived_at_transit || 0), // 从在途流转的列示
    '已到目的港': (dist.at_port || 0) + (dist.picked_up || 0) + (dist.unloaded || 0) + (dist.returned_empty || 0),

    // 第三层：已到目的港分解
    '已提柜': (dist.picked_up || 0) + (dist.unloaded || 0) + (dist.returned_empty || 0),

    // 第四层：已提柜分解为两个分支
    '已卸柜': (dist.unloaded || 0) + (dist.returned_empty || 0),
    '未卸柜': (dist.picked_up || 0), // 已提柜但未卸柜的货柜

    // 第五层：已卸柜分解为两个分支
    '未还箱': (dist.unloaded || 0), // 已卸柜但未还箱的货柜
    '已还箱': (dist.returned_empty || 0) // 已还箱的货柜
  }

  // 更新节点的 value（用于显示节点大小）
  const dataWithValues = nodes.map((node) => ({
    name: node.name,
    value: nodeValues[node.name]
  }))

  // 创建桑基图链接数据
  const links = [
    // 第一层 -> 第二层：已出运分解
    {
      source: '已出运',
      target: '在途',
      value: nodeValues['在途']
    },
    {
      source: '已出运',
      target: '已到目的港',
      value: nodeValues['已到目的港']
    },

    // 第二层 -> 第三层：在途流转到已到中转港
    {
      source: '在途',
      target: '已到中转港',
      value: nodeValues['已到中转港']
    },

    // 第三层 -> 第四层：已到目的港分解
    {
      source: '已到目的港',
      target: '已提柜',
      value: nodeValues['已提柜']
    },

    // 第四层 -> 第五层：已提柜分解为两个分支
    {
      source: '已提柜',
      target: '已卸柜',
      value: nodeValues['已卸柜']
    },
    {
      source: '已提柜',
      target: '未卸柜',
      value: nodeValues['未卸柜']
    },

    // 第五层 -> 第六层：已卸柜分解为两个分支
    {
      source: '已卸柜',
      target: '未还箱',
      value: nodeValues['未还箱']
    },
    {
      source: '已卸柜',
      target: '已还箱',
      value: nodeValues['已还箱']
    }
  ]

  const option = {
    title: {
      text: '货柜状态流转',
      left: 'center'
    },
    tooltip: {
      trigger: 'item',
      triggerOn: 'mousemove',
      formatter: (params: any) => {
        if (params.dataType === 'edge') {
          return `${params.data.source} → ${params.data.target}<br/>流转数量: ${params.data.value}`
        } else {
          return `${params.name}<br/>当前状态: ${dist[getStatusKey(params.name)] || 0}<br/>累计总量: ${params.data.value}`
        }
      }
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: {
          focus: 'adjacency'
        },
        data: dataWithValues,
        links: links,
        top: '10%',
        bottom: '10%',
        left: '8%',
        right: '8%',
        nodeWidth: 20,
        nodeGap: 8,
        layoutIterations: 0,
        label: {
          color: 'rgba(0,0,0,0.7)',
          fontFamily: 'Arial',
          fontSize: 12,
          formatter: (params: any) => {
            return `${params.name}\n${params.data.value}`
          }
        },
        lineStyle: {
          color: 'source',
          curveness: 0.5,
          opacity: 0.5
        }
      }
    ]
  }

  chartInstance.setOption(option, true)
}

// 获取状态键名映射
const getStatusKey = (nodeName: string): string => {
  const map: Record<string, string> = {
    '已出运': 'shipped',
    '在途': 'in_transit',
    '已到中转港': 'arrived_at_transit',
    '已到目的港': 'at_port',
    '已提柜': 'picked_up',
    '已卸柜': 'unloaded',
    '未卸柜': 'picked_up', // 计算状态：picked_up - unloaded
    '未还箱': 'unloaded', // 计算状态：unloaded - returned_empty
    '已还箱': 'returned_empty'
  }
  return map[nodeName] || nodeName
}

// 监听数据变化
watch(() => props.data.statusDistribution, () => {
  if (chartInstance) {
    updateChart()
  }
}, { deep: true })

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
  <div class="sankey-chart-container">
    <div id="sankey-chart" style="width: 100%; height: 400px;"></div>
  </div>
</template>

<style scoped lang="scss">
.sankey-chart-container {
  width: 100%;
  height: 100%;
}
</style>
