/** * 成本趋势图组件 * Cost Trend Chart Component * * 展示卸柜日附近 7 天的成本变化趋势 */

<template>
  <div class="cost-trend-chart">
    <v-chart
      v-if="chartOption"
      :option="chartOption"
      autoresize
      :style="{ height: '100%', width: '100%' }"
    />
  </div>
</template>

<script setup lang="ts">
import * as echarts from 'echarts'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  MarkPointComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { computed } from 'vue'
import VChart from 'vue-echarts'

// ============================================================================
// 类型定义（遵循 SKILL：通用接口支持多种数据源）
// ============================================================================

/**
 * 成本优化方案图表数据接口
 * 通用设计，支持来自不同源的 Alternative 数据
 */
interface ChartAlternative {
  pickupDate: string // 提柜日期
  totalCost: number // 总成本
  strategy?: string // 策略（可选）
  savings?: number // 节省金额（可选）
  breakdown?: {
    // 费用明细（可选）
    demurrageCost?: number
    detentionCost?: number
    storageCost?: number
    transportationCost?: number
    [key: string]: any // 允许扩展其他费用字段
  }
  [key: string]: any // 允许扩展其他字段
}

// ✅ 注册必需的组件
use([
  CanvasRenderer,
  LineChart,
  TitleComponent,
  TooltipComponent,
  MarkPointComponent,
  GridComponent,
])

interface Props {
  alternatives?: ChartAlternative[] // 成本优化方案列表
  containerNumber?: string // 柜号（用于标题显示）
}

const props = withDefaults(defineProps<Props>(), {
  alternatives: () => [],
  containerNumber: '',
})

// ✅ 生成图表配置
const chartOption = computed(() => {
  if (!props.alternatives || props.alternatives.length === 0) {
    return null
  }

  // ✅ 关键修复：过滤掉无效数据
  const validAlternatives = props.alternatives.filter(
    alt => alt.pickupDate && alt.totalCost !== undefined && alt.totalCost !== null
  )

  if (validAlternatives.length === 0) {
    console.warn('[CostTrendChart] No valid alternatives found')
    return null
  }

  // 提取数据
  const dates = validAlternatives.map(alt => alt.pickupDate)
  const totalCosts = validAlternatives.map(alt => alt.totalCost)

  // ✅ 关键修复：确保所有值都是数字
  const sanitizedCosts = totalCosts.map(cost => {
    const num = Number(cost)
    return isNaN(num) ? 0 : num
  })

  // 找到最低成本点
  const minCostIndex = sanitizedCosts.indexOf(Math.min(...sanitizedCosts))
  const minCostDate = dates[minCostIndex]
  const minCostValue = sanitizedCosts[minCostIndex]

  // ✅ 关键修复：输出调试信息
  console.log('[CostTrendChart] Data:', {
    dates,
    costs: sanitizedCosts,
    minCostIndex,
    minCostDate,
    minCostValue,
  })

  return {
    title: {
      text: '成本趋势分析',
      left: 'center',
      top: '10',
      textStyle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#303133',
      },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e4e7ed',
      borderWidth: 1,
      textStyle: {
        fontSize: 12,
        color: '#606266',
      },
      formatter: (params: any) => {
        const date = params[0].name
        const cost = params[0].value

        let content = `<div style="font-weight: 600; margin-bottom: 8px; color: #303133">${date}</div>`
        content += `<div style="font-size: 14px; color: #409EFF; font-weight: 600;">总成本：$${cost.toFixed(2)}</div>`

        return content
      },
    },
    xAxis: {
      type: 'category',
      data: dates,
      name: '提柜日期',
      nameLocation: 'middle',
      nameGap: 30,
      axisLine: {
        lineStyle: {
          color: '#dcdfe6',
          width: 1,
        },
      },
      axisLabel: {
        rotate: 45,
        formatter: (value: string) => {
          // 格式化日期显示：YYYY-MM-DD → MM-DD
          const parts = value.split('-')
          return `${parts[1]}-${parts[2]}`
        },
        fontSize: 11,
        color: '#606266',
        margin: 8,
      },
    },
    yAxis: {
      type: 'value',
      name: '成本 ($)',
      min: 'dataMin',
      axisLine: {
        show: false,
      },
      axisTick: {
        show: false,
      },
      axisLabel: {
        // ✅ 优化：使用简洁的美元符号格式
        formatter: (value: number) => {
          return `$${value.toLocaleString()}`
        },
        fontSize: 11,
        color: '#606266',
        margin: 8,
      },
    },
    series: [
      {
        name: '总成本',
        type: 'line',
        data: sanitizedCosts.map((cost, index) => ({
          value: cost,
          itemStyle: {
            color: index === minCostIndex ? '#67C23A' : '#409EFF',
          },
          symbol: 'circle',
          symbolSize: 8,
        })),
        smooth: 0.3, // ✅ 优化：减小平滑度，使曲线更自然
        markPoint: {
          symbol: 'pin',
          symbolSize: 50,
          itemStyle: {
            color: '#67C23A',
          },
          label: {
            color: '#fff',
            fontSize: 11,
            fontWeight: '600',
          },
          data: [
            {
              type: 'min',
              name: '最低成本',
              value: `$${minCostValue.toFixed(2)}`,
              label: {
                formatter: (params: any) => {
                  return `最低\n$${Number(params.value).toFixed(2)}`
                },
              },
            },
          ],
          animationDuration: 1500,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 0.5, color: 'rgba(64, 158, 255, 0.1)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.02)' },
          ]),
        },
        lineStyle: {
          width: 3,
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#409EFF' },
            { offset: 1, color: '#67C23A' },
          ]),
          shadowColor: 'rgba(64, 158, 255, 0.3)',
          shadowBlur: 10,
          shadowOffsetY: 2,
        },
        itemStyle: {
          borderWidth: 3,
          borderColor: '#fff',
          shadowColor: 'rgba(0, 0, 0, 0.1)',
          shadowBlur: 5,
          shadowOffsetY: 2,
        },
      },
    ],
    grid: {
      left: '5%',
      right: '3%',
      bottom: '8%',
      top: '12%',
      containLabel: true,
    },
  }
})
</script>

<style scoped>
.cost-trend-chart {
  width: 100%;
  height: 100%; /* ✅ 关键修复：使用 100% 高度，自适应父容器 */
  padding: 0; /* ✅ 移除 padding，让图表占满容器 */
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}
</style>
