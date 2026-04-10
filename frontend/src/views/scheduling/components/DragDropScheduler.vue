<template>
  <div class="drag-drop-scheduler">
    <!-- 时间轴视图 -->
    <div class="timeline-view">
      <div class="timeline-header">
        <span>📅 排产时间轴</span>
        <el-radio-group v-model="viewMode" size="small">
          <el-radio-button value="day">按日</el-radio-button>
          <el-radio-button value="week">按周</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 货柜列表 -->
      <div class="container-timeline">
        <div
          v-for="container in containers"
          :key="container.containerNumber"
          class="container-row"
        >
          <!-- 货柜信息 -->
          <div class="container-info">
            <div class="container-number">{{ container.containerNumber }}</div>
            <div class="container-destination">{{ container.destination }}</div>
          </div>

          <!-- 时间轴轨道 -->
          <div class="timeline-track" @dragover="onDragOver" @drop="onDrop($event, container)">
            <!-- 日期格子 -->
            <div
              v-for="date in visibleDates"
              :key="date.dateStr"
              class="date-cell"
              :class="{
                'is-weekend': date.isWeekend,
                'is-holiday': date.isHoliday,
                'is-drop-target': dragTarget === date.dateStr,
              }"
              @click="selectDate(container, date.dateStr)"
            >
              <div class="date-label">{{ date.dayLabel }}</div>
            </div>

            <!-- 已安排的节点 -->
            <div
              v-for="node in getContainerNodes(container)"
              :key="node.type"
              class="schedule-node"
              :class="['node-' + node.type, { 'is-dragging': draggingNode === node }]"
              :style="getNodeStyle(node)"
              draggable
              @dragstart="onNodeDragStart($event, container, node)"
              @dragend="onNodeDragEnd"
            >
              <div class="node-content">
                <span class="node-icon">{{ getNodeIcon(node.type) }}</span>
                <span class="node-date">{{ formatDate(node.date) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 成本实时计算面板 -->
    <div class="realtime-cost-panel">
      <el-card shadow="hover">
        <template #header>
          <div class="cost-header">
            <span>💰 实时成本计算</span>
            <el-tag v-if="hasChanges" type="warning" size="small">未保存</el-tag>
          </div>
        </template>

        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="当前总成本">
            <span :class="['cost-value', costLevelClass]">
              ${{ totalCost.toFixed(2) }}
            </span>
          </el-descriptions-item>

          <el-descriptions-item label="原始成本">
            ${{ originalCost.toFixed(2) }}
          </el-descriptions-item>

          <el-descriptions-item label="节省金额">
            <span :class="['saving-amount', savingLevelClass]">
              ${{ savings.toFixed(2) }}
            </span>
          </el-descriptions-item>

          <el-descriptions-item label="优化比例">
            <el-progress
              :percentage="optimizationPercentage"
              :color="progressColor"
              :format="(val: number) => `${val.toFixed(1)}%`"
            />
          </el-descriptions-item>
        </el-descriptions>

        <!-- 成本明细 -->
        <el-divider content-position="left">成本明细</el-divider>
        <div class="cost-breakdown">
          <div class="breakdown-item">
            <span class="breakdown-label">滞港费:</span>
            <span class="breakdown-value">${{ costBreakdown.demurrage.toFixed(2) }}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">滞箱费:</span>
            <span class="breakdown-value">${{ costBreakdown.detention.toFixed(2) }}</span>
          </div>
          <div class="breakdown-item">
            <span class="breakdown-label">运输费:</span>
            <span class="breakdown-value">${{ costBreakdown.transportation.toFixed(2) }}</span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="cost-actions">
          <el-button type="primary" @click="saveChanges" :disabled="!hasChanges">
            💾 确认保存
          </el-button>
          <el-button @click="resetChanges" :disabled="!hasChanges"> ↩️ 撤销修改 </el-button>
          <el-button type="success" @click="applyOptimization" :disabled="!hasOptimizationSuggestion">
            ✨ 应用优化建议
          </el-button>
        </div>

        <!-- 优化建议提示 -->
        <el-alert
          v-if="hasOptimizationSuggestion"
          type="success"
          :closable="false"
          show-icon
          class="optimization-tip"
        >
          <strong>优化建议：</strong>
          {{ optimizationSuggestion }}
          <br />
          <span class="tip-detail">预计可节省 ${{ potentialSavings.toFixed(2) }}</span>
        </el-alert>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import api from '@/services/api'
import dayjs from 'dayjs'
import { ElMessage } from 'element-plus'
import { computed, ref } from 'vue'

interface Container {
  containerNumber: string
  destination: string
  nodes: ScheduleNode[]
}

interface ScheduleNode {
  type: 'pickup' | 'delivery' | 'unload' | 'return'
  date: string
  originalDate?: string
}

interface VisibleDate {
  dateStr: string
  dayLabel: string
  isWeekend: boolean
  isHoliday: boolean
}

// Props
const props = defineProps<{
  schedulingId: string
  initialContainers?: Container[]
}>()

const emit = defineEmits<{
  (e: 'change', containers: Container[]): void
  (e: 'save', containers: Container[]): void
}>()

// 数据状态
const viewMode = ref<'day' | 'week'>('day')
const containers = ref<Container[]>(props.initialContainers || [])
const visibleDates = ref<VisibleDate[]>([])
const dragTarget = ref<string>('')
const draggingNode = ref<ScheduleNode | null>(null)

// 成本计算相关
const originalCost = ref(0)
const totalCost = ref(0)
const costBreakdown = ref({
  demurrage: 0,
  detention: 0,
  transportation: 0,
})
const optimizationSuggestion = ref('')
const potentialSavings = ref(0)

// 计算属性
const hasChanges = computed(() => {
  return containers.value.some((c) =>
    c.nodes.some((n) => n.originalDate && n.originalDate !== n.date)
  )
})

const savings = computed(() => originalCost.value - totalCost.value)

const optimizationPercentage = computed(() => {
  if (originalCost.value === 0) return 0
  return ((originalCost.value - totalCost.value) / originalCost.value) * 100
})

const hasOptimizationSuggestion = computed(() => {
  return optimizationSuggestion.value && potentialSavings.value > 0
})

const costLevelClass = computed(() => {
  if (totalCost.value < originalCost.value) return 'cost-saving'
  if (totalCost.value > originalCost.value) return 'cost-increasing'
  return ''
})

const savingLevelClass = computed(() => {
  if (savings.value > 0) return 'saving-positive'
  if (savings.value < 0) return 'saving-negative'
  return ''
})

const progressColor = computed(() => {
  if (savings.value > 0) return '#67c23a'
  if (savings.value < 0) return '#f56c6c'
  return '#909399'
})

// 初始化
const initVisibleDates = () => {
  const dates: VisibleDate[] = []
  const start = dayjs().subtract(2, 'day')
  const end = dayjs().add(30, 'day')

  for (let d = start; d.isBefore(end); d = d.add(1, 'day')) {
    dates.push({
      dateStr: d.format('YYYY-MM-DD'),
      dayLabel: d.format('MM/DD ddd'),
      isWeekend: d.day() === 0 || d.day() === 6,
      isHoliday: false, // TODO: 从后端加载节假日
    })
  }

  visibleDates.value = dates
}

// 拖拽处理
const onNodeDragStart = (event: DragEvent, container: Container, node: ScheduleNode) => {
  draggingNode.value = node
  event.dataTransfer?.setData('text/plain', JSON.stringify({ container, node }))
  event.dataTransfer!.effectAllowed = 'move'
}

const onNodeDragEnd = () => {
  draggingNode.value = null
}

const onDragOver = (event: DragEvent) => {
  event.preventDefault()
  const cell = (event.target as HTMLElement).closest('.date-cell')
  if (cell) {
    const dateStr = cell.getAttribute('data-date')
    dragTarget.value = dateStr || ''
  }
}

const onDrop = (event: DragEvent, container: Container) => {
  event.preventDefault()
  const data = event.dataTransfer?.getData('text/plain')
  if (!data || !draggingNode.value) return

  try {
    const parsed = JSON.parse(data)
    const { node } = parsed as { node: ScheduleNode }

    // 更新节点日期
    const containerIndex = containers.value.findIndex((c) => c.containerNumber === container.containerNumber)
    if (containerIndex === -1) return

    const nodeIndex = containers.value[containerIndex].nodes.findIndex(
      (n) => n.type === node.type
    )
    if (nodeIndex === -1) return

    containers.value[containerIndex].nodes[nodeIndex].date = dragTarget.value

    // 重新计算成本
    recalculateCost()

    // 触发变更事件
    emit('change', containers.value)

    ElMessage.success(`已调整${getNodeName(node.type)}至 ${dragTarget.value}`)
  } catch (error) {
    ElMessage.error('拖拽失败')
  } finally {
    dragTarget.value = ''
    draggingNode.value = null
  }
}

// 成本计算
const recalculateCost = async () => {
  try {
    // 调用后端 API 重新计算成本
    const response = await api.post('/scheduling/cost/recalculate', {
      containers: containers.value,
    })

    if (response.data.success) {
      totalCost.value = response.data.data.totalCost
      costBreakdown.value = response.data.data.breakdown

      // 检查是否有优化建议
      if (response.data.data.optimization) {
        optimizationSuggestion.value = response.data.data.optimization.suggestion
        potentialSavings.value = response.data.data.optimization.potentialSavings
      }
    }
  } catch (error: any) {
    console.error('重新计算成本失败:', error)
  }
}

// 辅助方法
const getContainerNodes = (container: Container) => container.nodes

const getNodeStyle = (node: ScheduleNode) => {
  const index = visibleDates.value.findIndex((d) => d.dateStr === node.date)
  if (index === -1) return { display: 'none' }

  const left = index * 60 // 每个日期格子 60px 宽
  return {
    left: `${left}px`,
  }
}

const getNodeIcon = (type: string) => {
  const icons: Record<string, string> = {
    pickup: '🚛',
    delivery: '📦',
    unload: '🏭',
    return: '♻️',
  }
  return icons[type] || '📍'
}

const getNodeName = (type: string) => {
  const names: Record<string, string> = {
    pickup: '提柜',
    delivery: '送仓',
    unload: '卸柜',
    return: '还箱',
  }
  return names[type] || '节点'
}

const formatDate = (date: string) => dayjs(date).format('MM/DD')

const selectDate = (container: Container, dateStr: string) => {
  // 可以在这里添加点击后的操作，如显示详情菜单
  console.log('Selected:', container.containerNumber, dateStr)
}

// 保存和撤销
const saveChanges = async () => {
  try {
    await api.post('/scheduling/save', {
      schedulingId: props.schedulingId,
      containers: containers.value,
    })

    ElMessage.success('保存成功')
    emit('save', containers.value)

    // 重置原始日期标记
    containers.value.forEach((c) => {
      c.nodes.forEach((n) => {
        n.originalDate = undefined
      })
    })
  } catch (error: any) {
    ElMessage.error('保存失败：' + error.message)
  }
}

const resetChanges = () => {
  containers.value.forEach((c) => {
    c.nodes.forEach((n) => {
      if (n.originalDate) {
        n.date = n.originalDate
      }
    })
  })
  recalculateCost()
  ElMessage.info('已撤销所有修改')
}

const applyOptimization = () => {
  // TODO: 应用优化建议
  ElMessage.info('优化建议应用功能开发中')
}

// 生命周期
initVisibleDates()
recalculateCost()
</script>

<style scoped lang="scss">
.drag-drop-scheduler {
  display: flex;
  gap: 20px;
  padding: 20px;

  .timeline-view {
    flex: 1;

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      font-size: 16px;
      font-weight: bold;
    }

    .container-timeline {
      .container-row {
        display: flex;
        margin-bottom: 12px;
        border: 1px solid #e4e7ed;
        border-radius: 4px;
        overflow: hidden;

        .container-info {
          width: 200px;
          padding: 12px;
          background: #f5f7fa;
          border-right: 1px solid #e4e7ed;

          .container-number {
            font-weight: bold;
            margin-bottom: 4px;
          }

          .container-destination {
            font-size: 12px;
            color: #909399;
          }
        }

        .timeline-track {
          flex: 1;
          position: relative;
          height: 80px;
          background: #fff;

          .date-cell {
            float: left;
            width: 60px;
            height: 80px;
            border-right: 1px solid #ebeef5;
            text-align: center;
            cursor: pointer;

            &:hover {
              background: #f5f7fa;
            }

            &.is-weekend {
              background: rgba(245, 108, 108, 0.05);
            }

            &.is-holiday {
              background: rgba(230, 162, 60, 0.1);
            }

            &.is-drop-target {
              background: rgba(64, 158, 255, 0.2);
            }

            .date-label {
              font-size: 11px;
              padding-top: 8px;
              transform: rotate(-45deg);
            }
          }

          .schedule-node {
            position: absolute;
            top: 20px;
            width: 50px;
            height: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 4px;
            cursor: move;
            transition: all 0.3s;

            &.is-dragging {
              opacity: 0.5;
              transform: scale(1.1);
            }

            .node-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100%;
              color: white;
              font-size: 10px;

              .node-icon {
                font-size: 14px;
                margin-bottom: 2px;
              }
            }
          }
        }
      }
    }
  }

  .realtime-cost-panel {
    width: 320px;

    .cost-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .cost-value {
        font-weight: bold;
        font-size: 18px;

        &.cost-saving {
          color: #67c23a;
        }

        &.cost-increasing {
          color: #f56c6c;
        }
      }
    }

    .saving-amount {
      font-weight: bold;

      &.saving-positive {
        color: #67c23a;
      }

      &.saving-negative {
        color: #f56c6c;
      }
    }

    .cost-breakdown {
      padding: 8px 0;

      .breakdown-item {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;

        .breakdown-label {
          color: #606266;
        }

        .breakdown-value {
          font-weight: bold;
        }
      }
    }

    .cost-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
    }

    .optimization-tip {
      margin-top: 12px;

      .tip-detail {
        font-size: 12px;
        color: #909399;
      }
    }
  }
}
</style>
