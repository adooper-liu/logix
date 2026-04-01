<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import * as echarts from 'echarts'

interface Props {
  data: {
    statusDistribution: Record<string, number>
  }
}

const props = defineProps<Props>()

let chartInstance: echarts.ECharts | null = null

// 节点展示值（与状态机一致），formatter 从此读取，避免 ECharts 异步布局后 params.data 被覆盖
const nodeDisplayValues = ref<Record<string, number>>({})

// 已到目的港 流出：未提柜(46)、已提柜(173)；在途拆为 未到港、已到中转港
const nodes = [
  { name: '已出运' },
  { name: '在途' },
  { name: '未到港' },
  { name: '已到中转港' },
  { name: '已到目的港' },
  { name: '未提柜' },
  { name: '已提柜' },
  { name: '已卸柜' },
  { name: '已还箱' },
  { name: '未还箱' },
  { name: '未卸柜' },
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

  // 调试：若「已到目的港」只显示 173、未提柜 0，多为 arrived_at_destination 未传入或为 0
  const DEBUG_SANKEY = import.meta.env?.DEV
  if (DEBUG_SANKEY) {
    console.log(
      '[SankeyChart] statusDistribution keys:',
      Object.keys(dist),
      '; arrived_at_destination=',
      dist.arrived_at_destination,
      '; arrivedAtDestination=',
      (dist as Record<string, number>).arrivedAtDestination
    )
  }

  // 在途 = 未到港(85) + 已到中转港(46) = shipped+in_transit + arrived_at_transit
  const shipped = dist.shipped || 0
  const inTransit = dist.in_transit || 0
  const atPort = dist.at_port || 0
  const arrivedTransit = dist.arrived_at_transit || 0
  const arrivedDest =
    (dist.arrived_at_destination ?? (dist as Record<string, number>).arrivedAtDestination) || 0
  const pickedUp = dist.picked_up || 0
  const unloaded = dist.unloaded || 0
  const returnedEmpty = dist.returned_empty || 0

  const notArrivedAnyPort = shipped + inTransit // 未到港 85
  const atTransitPort = arrivedTransit // 已到中转港 46
  const atDestNotPickedUp = arrivedDest // 未提柜 46（已到目的港但未提柜）
  const pickedUpAndLater = pickedUp + unloaded + returnedEmpty // 已提柜 173

  const nodeValues = {
    已出运: shipped + inTransit + atPort + pickedUp + unloaded + returnedEmpty,
    在途: notArrivedAnyPort + atTransitPort,
    未到港: notArrivedAnyPort,
    已到中转港: atTransitPort,
    已到目的港: atDestNotPickedUp + pickedUpAndLater,
    未提柜: atDestNotPickedUp,
    已提柜: pickedUpAndLater,
    已卸柜: unloaded + returnedEmpty,
    未卸柜: pickedUp,
    未还箱: unloaded,
    已还箱: returnedEmpty,
  }

  nodeDisplayValues.value = { ...nodeValues }

  // 节点数据：value 供布局用
  const dataWithValues = nodes.map(node => ({
    name: node.name,
    value: nodeValues[node.name] ?? 0,
  }))

  // 链接：已到目的港 流出 未提柜(46)、已提柜(173)
  const links = [
    { source: '已出运', target: '在途', value: nodeValues['在途'] },
    { source: '已出运', target: '已到目的港', value: nodeValues['已到目的港'] },
    { source: '在途', target: '未到港', value: notArrivedAnyPort },
    { source: '在途', target: '已到中转港', value: atTransitPort },
    { source: '已到目的港', target: '未提柜', value: atDestNotPickedUp },
    { source: '已到目的港', target: '已提柜', value: pickedUpAndLater },
    { source: '已提柜', target: '已卸柜', value: nodeValues['已卸柜'] },
    { source: '已提柜', target: '未卸柜', value: nodeValues['未卸柜'] },
    { source: '已卸柜', target: '未还箱', value: nodeValues['未还箱'] },
    { source: '已卸柜', target: '已还箱', value: nodeValues['已还箱'] },
  ].filter(l => l.value > 0)

  const option = {
    title: {
      text: '货柜状态流转',
      left: 'center',
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
      },
    },
    series: [
      {
        type: 'sankey',
        layout: 'none',
        emphasis: {
          focus: 'adjacency',
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
            const name = params.name ?? params.data?.name
            const v = name != null ? nodeDisplayValues.value[name] : (params.data?.value ?? 0)
            return `${name ?? ''}\n${v ?? 0}`
          },
        },
        lineStyle: {
          color: 'source',
          curveness: 0.5,
          opacity: 0.5,
        },
      },
    ],
  }

  chartInstance.setOption(option, true)
}

// 获取状态键名映射（与后端 statusDistribution 一致）
const getStatusKey = (nodeName: string): string => {
  const map: Record<string, string> = {
    已出运: 'shipped',
    在途: 'in_transit',
    未到港: 'shipped', // shipped+in_transit 汇总
    已到中转港: 'arrived_at_transit',
    已到目的港: 'arrived_at_destination',
    未提柜: 'arrived_at_destination',
    已提柜: 'picked_up',
    已卸柜: 'unloaded',
    未卸柜: 'picked_up',
    未还箱: 'unloaded',
    已还箱: 'returned_empty',
  }
  return map[nodeName] || nodeName
}

// 监听数据变化
watch(
  () => props.data.statusDistribution,
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
  <div class="sankey-chart-container">
    <div id="sankey-chart" style="width: 100%; height: 400px"></div>
  </div>
</template>

<style scoped lang="scss">
.sankey-chart-container {
  width: 100%;
  height: 100%;
}
</style>
