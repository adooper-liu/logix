<template>
  <div class="gantt-chart">
    <el-card shadow="hover">
      <template #header>
        <div class="chart-header">
          <span>📊 排产甘特图</span>
          <div class="header-actions">
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button value="day">按日</el-radio-button>
              <el-radio-button value="week">按周</el-radio-button>
            </el-radio-group>
            <el-button size="small" @click="zoomIn"> 🔍 放大 </el-button>
            <el-button size="small" @click="zoomOut"> 🔎 缩小 </el-button>
          </div>
        </div>
      </template>

      <!-- 甘特图主体 -->
      <div class="gantt-container" ref="ganttRef">
        <!-- 时间轴头部 -->
        <div class="gantt-header">
          <div class="resource-column">资源</div>
          <div class="timeline-header" :style="{ width: timelineWidth + 'px' }">
            <div
              v-for="date in visibleDates"
              :key="date.dateStr"
              class="date-cell"
              :class="{ 'is-weekend': date.isWeekend, 'is-today': date.isToday }"
            >
              <div class="date-label">{{ date.dayLabel }}</div>
            </div>
          </div>
        </div>

        <!-- 资源行 -->
        <div
          v-for="resource in resources"
          :key="resource.id"
          class="resource-row"
        >
          <div class="resource-column">
            <div class="resource-info">
              <span class="resource-icon">{{ resource.icon }}</span>
              <span class="resource-name">{{ resource.name }}</span>
            </div>
          </div>

          <div class="timeline-body" :style="{ width: timelineWidth + 'px' }">
            <!-- 日期背景 -->
            <div class="date-backgrounds">
              <div
                v-for="date in visibleDates"
                :key="date.dateStr"
                class="date-cell-bg"
                :class="{ 'is-weekend': date.isWeekend }"
              ></div>
            </div>

            <!-- 任务条 -->
            <div
              v-for="task in getTasksForResource(resource.id)"
              :key="task.id"
              class="task-bar"
              :class="'task-' + task.type"
              :style="getTaskStyle(task)"
              @click="selectTask(task)"
            >
              <div class="task-content">
                <span class="task-icon">{{ getTaskIcon(task.type) }}</span>
                <span class="task-label">{{ task.label }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 图例 -->
      <div class="legend">
        <div class="legend-item">
          <span class="legend-color task-pickup"></span>
          <span>提柜</span>
        </div>
        <div class="legend-item">
          <span class="legend-color task-delivery"></span>
          <span>送仓</span>
        </div>
        <div class="legend-item">
          <span class="legend-color task-unload"></span>
          <span>卸柜</span>
        </div>
        <div class="legend-item">
          <span class="legend-color task-return"></span>
          <span>还箱</span>
        </div>
      </div>
    </el-card>

    <!-- 任务详情对话框 -->
    <el-dialog v-model="taskDetailVisible" title="任务详情" width="500px">
      <div v-if="selectedTask" class="task-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="任务类型">
            <el-tag :type="getTaskTypeTag(selectedTask.type)">
              {{ getTaskTypeName(selectedTask.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="集装箱号">
            {{ selectedTask.containerNumber }}
          </el-descriptions-item>
          <el-descriptions-item label="计划日期">
            {{ selectedTask.date }}
          </el-descriptions-item>
          <el-descriptions-item label="资源">
            {{ selectedTask.resourceName }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTag(selectedTask.status)">
              {{ getStatusText(selectedTask.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { computed, onMounted, ref, watch } from 'vue'

interface Task {
  id: string
  type: 'pickup' | 'delivery' | 'unload' | 'return'
  containerNumber: string
  date: string
  resourceName: string
  status: 'pending' | 'completed' | 'delayed'
  label: string
}

interface Resource {
  id: string
  name: string
  type: 'warehouse' | 'trucking'
  icon: string
}

interface VisibleDate {
  dateStr: string
  dayLabel: string
  isWeekend: boolean
  isToday: boolean
}

// Props
const props = defineProps<{
  tasks?: Task[]
  resources?: Resource[]
}>()

// 数据状态
const ganttRef = ref<HTMLElement | null>(null)
const viewMode = ref<'day' | 'week'>('day')
const zoomLevel = ref(60) // 每天像素宽度
const visibleDates = ref<VisibleDate[]>([])
const selectedTask = ref<Task | null>(null)
const taskDetailVisible = ref(false)

// 计算属性
const timelineWidth = computed(() => {
  return visibleDates.value.length * zoomLevel.value
})

// 初始化可见日期
const initVisibleDates = () => {
  const dates: VisibleDate[] = []
  const today = dayjs()
  const start = viewMode.value === 'day' ? today.subtract(2, 'day') : today.subtract(7, 'day')
  const end = viewMode.value === 'day' ? today.add(30, 'day') : today.add(60, 'day')

  for (let d = start; d.isBefore(end); d = d.add(1, 'day')) {
    dates.push({
      dateStr: d.format('YYYY-MM-DD'),
      dayLabel: d.format('MM/DD ddd'),
      isWeekend: d.day() === 0 || d.day() === 6,
      isToday: d.isSame(today, 'day')
    })
  }

  visibleDates.value = dates
}

// 获取资源的任务
const getTasksForResource = (resourceId: string) => {
  if (!props.tasks) return []
  return props.tasks.filter(task => task.resourceName === resourceId)
}

// 获取任务条样式
const getTaskStyle = (task: Task) => {
  const dateIndex = visibleDates.value.findIndex(d => d.dateStr === task.date)
  if (dateIndex === -1) return { display: 'none' }

  const left = dateIndex * zoomLevel.value
  const width = zoomLevel.value - 4

  return {
    left: `${left}px`,
    width: `${width}px`
  }
}

// 获取任务图标
const getTaskIcon = (type: string) => {
  const icons: Record<string, string> = {
    pickup: '🚛',
    delivery: '📦',
    unload: '🏭',
    return: '♻️'
  }
  return icons[type] || '📍'
}

// 获取任务类型标签
const getTaskTypeTag = (type: string) => {
  const tagMap: Record<string, any> = {
    pickup: 'info',
    delivery: 'success',
    unload: 'warning',
    return: 'danger'
  }
  return tagMap[type] || 'info'
}

// 获取任务类型名称
const getTaskTypeName = (type: string) => {
  const names: Record<string, string> = {
    pickup: '提柜',
    delivery: '送仓',
    unload: '卸柜',
    return: '还箱'
  }
  return names[type] || '未知'
}

// 获取状态标签
const getStatusTag = (status: string) => {
  const tagMap: Record<string, any> = {
    pending: 'info',
    completed: 'success',
    delayed: 'danger'
  }
  return tagMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    pending: '待处理',
    completed: '已完成',
    delayed: '已延迟'
  }
  return texts[status] || '未知'
}

// 选择任务
const selectTask = (task: Task) => {
  selectedTask.value = task
  taskDetailVisible.value = true
}

// 缩放操作
const zoomIn = () => {
  zoomLevel.value = Math.min(zoomLevel.value + 20, 120)
}

const zoomOut = () => {
  zoomLevel.value = Math.max(zoomLevel.value - 20, 30)
}

// 监听视图模式变化
watch(viewMode, () => {
  initVisibleDates()
})

// 生命周期
onMounted(() => {
  initVisibleDates()
})
</script>

<style scoped lang="scss">
.gantt-chart {
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .header-actions {
      display: flex;
      gap: 8px;
    }
  }

  .gantt-container {
    overflow-x: auto;
    max-height: 600px;

    .gantt-header {
      display: flex;
      position: sticky;
      top: 0;
      z-index: 10;
      background: #f5f7fa;
      border-bottom: 1px solid #e4e7ed;

      .resource-column {
        width: 200px;
        min-width: 200px;
        padding: 12px;
        font-weight: bold;
        border-right: 1px solid #e4e7ed;
      }

      .timeline-header {
        display: flex;

        .date-cell {
          width: v-bind('zoomLevel + "px"');
          min-width: v-bind('zoomLevel + "px"');
          padding: 8px 4px;
          text-align: center;
          border-right: 1px solid #ebeef5;

          &.is-weekend {
            background: rgba(245, 108, 108, 0.1);
          }

          &.is-today {
            background: rgba(64, 158, 255, 0.1);
          }

          .date-label {
            font-size: 11px;
            transform: rotate(-45deg);
          }
        }
      }
    }

    .resource-row {
      display: flex;
      border-bottom: 1px solid #ebeef5;

      &:hover {
        background: #f5f7fa;
      }

      .resource-column {
        width: 200px;
        min-width: 200px;
        padding: 12px;
        border-right: 1px solid #e4e7ed;

        .resource-info {
          display: flex;
          align-items: center;
          gap: 8px;

          .resource-icon {
            font-size: 18px;
          }

          .resource-name {
            font-weight: bold;
          }
        }
      }

      .timeline-body {
        position: relative;

        .date-backgrounds {
          display: flex;

          .date-cell-bg {
            width: v-bind('zoomLevel + "px"');
            min-width: v-bind('zoomLevel + "px"');
            height: 60px;
            border-right: 1px solid #f0f0f0;

            &.is-weekend {
              background: rgba(245, 108, 108, 0.03);
            }
          }
        }

        .task-bar {
          position: absolute;
          top: 10px;
          height: 40px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

          &:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
          }

          .task-content {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: white;
            font-size: 12px;
            gap: 4px;

            .task-icon {
              font-size: 14px;
            }
          }

          &.task-pickup {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }

          &.task-delivery {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          }

          &.task-unload {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          }

          &.task-return {
            background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          }
        }
      }
    }
  }

  .legend {
    display: flex;
    gap: 16px;
    margin-top: 16px;
    padding: 12px;
    background: #fafafa;
    border-radius: 4px;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;

      .legend-color {
        width: 20px;
        height: 20px;
        border-radius: 3px;

        &.task-pickup {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        &.task-delivery {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }

        &.task-unload {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }

        &.task-return {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }
      }
    }
  }
}
</style>
