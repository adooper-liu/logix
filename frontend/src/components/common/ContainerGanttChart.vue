<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'
dayjs.extend(isBetween)

import type { LaneConfig, ContainerItem } from './types/ganttChart'
import {
  createAllLanes,
  laneNameToDimension,
  useDateRange,
  useDateArray,
  useTimeGroups,
  type GanttStatisticsData
} from './composables/useGanttData'
import {
  formatDateLabel,
  formatFullDate,
  extractDateFromContainer
} from './composables/useGanttHelpers'
import {
  getGroupContainersSubset,
  getGroupContainers
} from './composables/useGanttFilters'

interface ContainerGanttChartProps {
  containers: ContainerItem[]
  /** 与 Shipments 统计卡片同源：有则泳道行数量用此数据，圆点仍用 containers */
  statistics?: GanttStatisticsData | null
  startDate: Date
  endDate: Date
}

const props = defineProps<ContainerGanttChartProps>()

// 定义 emit
const emit = defineEmits<{
  laneChange: [dimension: string]
}>()

// 所有泳道配置
const allLanes = ref<LaneConfig[]>(createAllLanes())

// 从 localStorage 恢复或使用默认值
const storedLaneName = localStorage.getItem('ganttSelectedLaneName')
const selectedLaneName = ref<string>(storedLaneName || '按到港')

// 计算当前选中的泳道对象
const selectedLane = computed<LaneConfig>(() => {
  return allLanes.value.find(lane => lane.name === selectedLaneName.value) || allLanes.value[0]
})

// 监听泳道变化，通知父组件更新显示范围
watch(selectedLaneName, (newName) => {
  // 持久化到 localStorage
  localStorage.setItem('ganttSelectedLaneName', newName)
  const dimension = laneNameToDimension[newName]
  if (dimension) {
    emit('laneChange', dimension)
  }
})

// 滚动同步
const headerTimelineRef = ref<HTMLElement | null>(null)
const laneTimelines = ref<HTMLElement[]>([])
let isSyncing = false

// 日期头滚动时同步所有泳道
const onHeaderScroll = (e: Event) => {
  if (isSyncing) return
  isSyncing = true
  const target = e.target as HTMLElement
  laneTimelines.value.forEach(timeline => {
    timeline.scrollLeft = target.scrollLeft
  })
  requestAnimationFrame(() => {
    isSyncing = false
  })
}

// 泳道滚动时同步日期头和其他泳道
const onLaneScroll = (e: Event) => {
  if (isSyncing) return
  isSyncing = true
  const target = e.target as HTMLElement

  // 同步日期头
  if (headerTimelineRef.value) {
    headerTimelineRef.value.scrollLeft = target.scrollLeft
  }

  // 同步其他泳道
  laneTimelines.value.forEach(timeline => {
    if (timeline !== target) {
      timeline.scrollLeft = target.scrollLeft
    }
  })

  requestAnimationFrame(() => {
    isSyncing = false
  })
}

// 收集所有泳道的 timeline ref
const collectLaneTimelines = () => {
  nextTick(() => {
    const elements = document.querySelectorAll('.lane-timeline')
    laneTimelines.value = Array.from(elements) as HTMLElement[]
  })
}

// 计算日期范围
const dateRange = useDateRange(props.startDate, props.endDate)

// 生成日期数组
const dateArray = useDateArray(dateRange)

// 生成时间分组（行数量优先用 statistics，圆点仍用 containers）
const timeGroups = useTimeGroups(
  props.containers,
  props.startDate,
  props.endDate,
  selectedLane,
  props.statistics ?? null
)

// 调试：打印时间分组信息
console.log('ContainerGanttChart - props.containers:', props.containers.length)
console.log('ContainerGanttChart - props.startDate:', props.startDate)
console.log('ContainerGanttChart - props.endDate:', props.endDate)
console.log('ContainerGanttChart - dateRange:', dateRange)
console.log('ContainerGanttChart - dateArray:', dateArray.value)
console.log('ContainerGanttChart - dateArray length:', dateArray.value.length)
console.log('ContainerGanttChart - selectedLane:', selectedLane.value)
console.log('ContainerGanttChart - timeGroups:', timeGroups.value)

// 调试：检查每个时间分组的货柜数据
timeGroups.value.forEach(group => {
  const subset = getGroupContainersSubset(props.containers, selectedLane.value.name, group.label)
  console.log(`Group "${group.label}":`, {
    subsetLength: subset.length,
    subset: subset.slice(0, 3).map(c => ({
      containerNumber: c.containerNumber,
      extractedDate: c.extractedDate,
      logisticsStatus: c.logisticsStatus,
      ataDestPort: c.ataDestPort,
      etaDestPort: c.etaDestPort
    }))
  })
})

// 为tooltip获取完整的容器日期
const getContainerTooltipDate = (container: ContainerItem, lane: LaneConfig): string => {
  const date = extractDateFromContainer(container, lane.dateField)
  if (!date) return '-'
  return formatFullDate(date)
}

// 监听 timeGroups 变化，重新收集 ref
watch(() => timeGroups, () => {
  collectLaneTimelines()
}, { deep: true, immediate: true })
</script>

<template>
  <div class="container-gantt-chart">
    <!-- 泳道选择器和图例 -->
    <div class="gantt-header-controls">
      <div class="lane-selector">
        <span class="selector-label">选择泳道：</span>
        <div class="lane-radio-group">
          <div
            v-for="lane in allLanes"
            :key="lane.name"
            class="lane-radio-item"
            :class="{ active: selectedLaneName === lane.name }"
            @click="selectedLaneName = lane.name"
          >
            <span class="lane-radio-dot" :style="{ backgroundColor: lane.color }"></span>
            <span class="lane-radio-label">
              {{ lane.name }}
              <span class="lane-radio-subtitle" v-if="lane.subtitle">{{ lane.subtitle }}</span>
            </span>
          </div>
        </div>
      </div>
      <div class="legend-divider"></div>
      <div class="legend-item">
        <span class="legend-label">当前：</span>
        <div class="legend-dot" :style="{ backgroundColor: selectedLane.color }"></div>
        <span class="legend-label">
          {{ selectedLane.name }}
          <span class="legend-subtitle" v-if="selectedLane.subtitle">{{ selectedLane.subtitle }}</span>
        </span>
      </div>
    </div>

    <div class="gantt-header">
      <div class="lane-header">泳道</div>
      <div class="timeline-header" ref="headerTimelineRef" @scroll="onHeaderScroll">
        <div
          v-for="date in dateArray"
          :key="date.getTime()"
          class="date-cell"
          :class="{ 'weekend': dayjs(date).day() === 0 || dayjs(date).day() === 6 }"
        >
          {{ formatDateLabel(date) }}
        </div>
      </div>
    </div>

    <div class="gantt-body">
      <!-- 时间分组泳道 -->
      <div v-for="group in timeGroups" :key="group.label" class="gantt-lane time-group-lane">
        <div class="lane-label" :style="{ borderLeftColor: group.color }">
          <div class="lane-label-content">
            <span class="lane-label-text">{{ group.label }}</span>
            <span class="lane-label-count">({{ group.count }})</span>
          </div>
        </div>
        <div class="lane-timeline" @scroll="onLaneScroll">
          <!-- 统一使用 dateArray 作为日期基准，确保与日期头对齐 -->
          <div
            v-for="date in dateArray"
            :key="date.getTime()"
            class="timeline-cell"
            :class="{ 'weekend': dayjs(date).day() === 0 || dayjs(date).day() === 6 }"
          >
            <el-tooltip
              v-for="container in getGroupContainers(getGroupContainersSubset(props.containers, selectedLane.name, group.label), date)"
              :key="container.containerNumber"
              :content="`${container.containerNumber} - ${getContainerTooltipDate(container, selectedLane)}`"
              placement="top"
              effect="dark"
            >
              <div
                class="container-dot"
                :style="{ backgroundColor: group.color }"
              ></div>
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.container-gantt-chart {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);

  .gantt-header-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 16px;
    background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
    border-radius: 12px;
    border: 1px solid #e9ecef;
    flex-wrap: wrap;
  }

  .lane-selector {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-shrink: 0;

    .selector-label {
      font-size: 15px;
      font-weight: 600;
      color: $text-primary;
      white-space: nowrap;
    }

    .lane-radio-group {
      display: flex;
      align-items: center;
      gap: 8px;
      background: white;
      padding: 4px;
      border-radius: 10px;
      border: 2px solid #e9ecef;
    }

    .lane-radio-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      user-select: none;

      .lane-radio-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        flex-shrink: 0;
        transition: transform 0.2s ease;
      }

      .lane-radio-label {
        font-size: 13px;
        font-weight: 600;
        color: $text-secondary;
        transition: color 0.2s ease;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;

        .lane-radio-subtitle {
          font-size: 11px;
          font-weight: 400;
          color: $text-hint;
        }
      }

      &:hover {
        background: #f8f9fa;
      }

      &.active {
        background: $primary-color;
        box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);

        .lane-radio-dot {
          transform: scale(1.2);
        }

        .lane-radio-label {
          color: white;
        }
      }
    }
  }

  .legend-divider {
    width: 2px;
    height: 32px;
    background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.1), transparent);
    flex-shrink: 0;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;

    .legend-label {
      font-size: 14px;
      font-weight: 500;
      color: $text-secondary;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 2px;

      .legend-subtitle {
        font-size: 11px;
        font-weight: 400;
        color: $text-hint;
      }
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }
  }
}

.gantt-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #e9ecef;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);

  .lane-header {
    min-width: 150px;
    max-width: 150px;
    padding: 16px;
    font-size: 14px;
    font-weight: 700;
    color: $text-primary;
    text-align: left;
    background: #f8f9fa;
    border-right: 2px solid #e9ecef;
  }

  .timeline-header {
    flex: 1;
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;

      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }

    .date-cell {
      min-width: 50px;
      max-width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 600;
      color: $text-secondary;
      border-right: 1px solid #e9ecef;
      background: white;
      flex-shrink: 0;

      &.weekend {
        background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
        color: #f56c6c;
      }
    }
  }
}

.gantt-body {
  display: flex;
  flex-direction: column;
}

.gantt-lane {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid #e9ecef;
  transition: background 0.3s ease;

  &:hover {
    background: #f8f9fa;
  }

  .lane-label {
    min-width: 150px;
    max-width: 150px;
    padding: 16px;
    background: #f8f9fa;
    border-right: 2px solid #e9ecef;
    border-left: 4px solid;
    display: flex;
    flex-direction: column;
    justify-content: center;

    .lane-label-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;

      .lane-label-text {
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
      }

      .lane-label-count {
        font-size: 12px;
        font-weight: 700;
        color: $text-secondary;
        background: white;
        padding: 2px 8px;
        border-radius: 10px;
        border: 1px solid #e9ecef;
      }
    }
  }

  .lane-timeline {
    flex: 1;
    display: flex;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
    -webkit-overflow-scrolling: touch;

    &::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 3px;

      &:hover {
        background: rgba(0, 0, 0, 0.3);
      }
    }

    .timeline-cell {
      min-width: 50px;
      max-width: 50px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 8px;
      border-right: 1px solid #e9ecef;
      background: white;
      flex-shrink: 0;
      position: relative;
      flex-wrap: wrap;

      &.weekend {
        background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
      }

      .container-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        cursor: pointer;
        transition: all 0.2s ease;
        flex-shrink: 0;

        &:hover {
          transform: scale(1.5);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
      }
    }
  }
}

@media (max-width: 768px) {
  .container-gantt-chart {
    padding: 16px;
  }

  .gantt-header-controls {
    flex-direction: column;
    gap: 12px;

    .lane-selector {
      width: 100%;
      flex-direction: column;
      align-items: stretch;
    }

    .lane-radio-group {
      flex-direction: column;
    }

    .legend-divider {
      display: none;
    }
  }

  .gantt-header .lane-header,
  .gantt-lane .lane-label {
    min-width: 100px;
    max-width: 100px;
    padding: 12px;
  }

  .timeline-header .date-cell,
  .lane-timeline .timeline-cell {
    min-width: 40px;
    max-width: 40px;
  }

  .timeline-header .date-cell {
    height: 40px;
    font-size: 11px;
  }

  .lane-timeline .timeline-cell {
    height: 50px;
  }

  .lane-timeline .timeline-cell .container-dot {
    width: 6px;
    height: 6px;
  }
}
</style>
