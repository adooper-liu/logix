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

// 为 tooltip 生成完整文案（柜号、日期、状态、目的港）
const getContainerTooltipContent = (container: ContainerItem, lane: LaneConfig): string => {
  const date = extractDateFromContainer(container, lane.dateField)
  const dateStr = date ? formatFullDate(date) : '-'
  const status = (container as any).logisticsStatus ?? (container as any).logistics_status ?? '-'
  const destPort = getDestPortFromContainer(container)
  return `${container.containerNumber} · 日期：${dateStr} · 状态：${status} · 目的港：${destPort}`
}

// 当前泳道对应的「日期」含义（tooltip 中日期行的标签）
const DATE_LABEL_BY_LANE_NAME: Record<string, string> = {
  '按到港': '到港日期',
  '按提柜计划': '计划提柜日',
  '按最晚提柜': '最晚提柜日',
  '按最晚还箱': '最晚还箱日'
}
function getDateLabelForLane(lane: LaneConfig): string {
  return DATE_LABEL_BY_LANE_NAME[lane.name] ?? '日期'
}

// 目的港：列表接口返回 destinationPort，也可能在 portOperations[destination].portName
function getDestPortFromContainer(container: ContainerItem): string {
  const c = container as any
  if (c.destinationPort) return c.destinationPort
  if (c.destPort) return c.destPort
  if (c.dest_port) return c.dest_port
  const destOp = c.portOperations?.find((op: any) => op.portType === 'destination')
  if (destOp?.portName) return destOp.portName
  if (destOp?.port_name) return destOp.port_name
  return '-'
}

// 返回结构化数据供卡片 tooltip 使用
const getContainerTooltipData = (container: ContainerItem, lane: LaneConfig) => {
  const date = extractDateFromContainer(container, lane.dateField)
  return {
    containerNumber: container.containerNumber,
    dateLabel: getDateLabelForLane(lane),
    dateStr: date ? formatFullDate(date) : '-',
    status: (container as any).logisticsStatus ?? (container as any).logistics_status ?? '-',
    destPort: getDestPortFromContainer(container)
  }
}

const isToday = (d: Date) => dayjs(d).isSame(dayjs(), 'day')

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
          :class="{
            'weekend': dayjs(date).day() === 0 || dayjs(date).day() === 6,
            'today': isToday(date)
          }"
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
            :class="{
              'weekend': dayjs(date).day() === 0 || dayjs(date).day() === 6,
              'today': isToday(date)
            }"
          >
            <el-tooltip
              v-for="container in getGroupContainers(getGroupContainersSubset(props.containers, selectedLane.name, group.label), date)"
              :key="container.containerNumber"
              placement="top"
              effect="dark"
              popper-class="gantt-dot-tooltip-card-popper"
            >
              <template #content>
                <div class="gantt-dot-tooltip-card">
                  <div class="tooltip-card-title">{{ getContainerTooltipData(container, selectedLane).containerNumber }}</div>
                  <div class="tooltip-card-body">
                    <div class="tooltip-card-row">
                      <span class="tooltip-card-label">{{ getContainerTooltipData(container, selectedLane).dateLabel }}</span>
                      <span class="tooltip-card-value">{{ getContainerTooltipData(container, selectedLane).dateStr }}</span>
                    </div>
                    <div class="tooltip-card-row">
                      <span class="tooltip-card-label">状态</span>
                      <span class="tooltip-card-value">{{ getContainerTooltipData(container, selectedLane).status }}</span>
                    </div>
                    <div class="tooltip-card-row">
                      <span class="tooltip-card-label">目的港</span>
                      <span class="tooltip-card-value">{{ getContainerTooltipData(container, selectedLane).destPort }}</span>
                    </div>
                  </div>
                </div>
              </template>
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

  .gantt-header {
    display: flex;
    align-items: center;
    border-bottom: 1px solid #e9ecef;
    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);

    .lane-header {
      min-width: 150px;
      max-width: 150px;
      height: 68px;
      min-height: 68px;
      padding: 0 16px;
      display: flex;
      align-items: center;
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
      scrollbar-color: rgba(0, 0, 0, 0.18) transparent;
      -webkit-overflow-scrolling: touch;

      &::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.18);
        border-radius: 2px;

        &:hover {
          background: rgba(0, 0, 0, 0.28);
        }
      }

      .date-cell {
        min-width: 50px;
        width: max-content;
        height: 68px;
        min-height: 68px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 13px;
        font-weight: 600;
        color: $text-secondary;
        border-right: 1px solid #e9ecef;
        background: white;
        flex-shrink: 0;
        padding: 0 8px;

        &.weekend {
          background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
          color: #f56c6c;
        }

        &.today {
          background: linear-gradient(135deg, #ecf5ff 0%, #d9ecff 100%);
          color: $primary-color;
          font-weight: 700;
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
    height: 68px;
    min-height: 68px;
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
      height: 68px;
      min-height: 68px;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: thin;
      scrollbar-color: rgba(0, 0, 0, 0.18) transparent;
      -webkit-overflow-scrolling: touch;

      &::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(0, 0, 0, 0.18);
        border-radius: 2px;

        &:hover {
          background: rgba(0, 0, 0, 0.28);
        }
      }

      .timeline-cell {
        min-width: 50px;
        width: max-content;
        height: 68px;
        min-height: 68px;
        display: flex;
        flex-direction: column;
        flex-wrap: wrap;
        align-content: flex-start;
        align-items: flex-start;
        justify-content: flex-start;
        gap: 4px;
        padding: 6px 8px;
        border-right: 1px solid #e9ecef;
        background: white;
        flex-shrink: 0;
        position: relative;
        box-sizing: border-box;

        &.weekend {
          background: linear-gradient(135deg, #fff5f5 0%, #ffe8e8 100%);
        }

        &.today {
          background: linear-gradient(135deg, #ecf5ff 0%, #d9ecff 100%);
        }

        .container-dot {
          width: 10px;
          height: 10px;
          min-width: 10px;
          min-height: 10px;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          flex-shrink: 0;
          border: 1.5px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);

          &:hover {
            transform: scale(1.4);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
          }
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
    width: max-content;
  }

  .gantt-lane {
    height: 56px;
    min-height: 56px;

    .lane-timeline {
      height: 56px;
      min-height: 56px;
    }
  }

  .timeline-header .date-cell {
    height: 56px;
    font-size: 11px;
  }

  .lane-timeline .timeline-cell {
    height: 56px;
    min-height: 56px;
  }

  .lane-timeline .timeline-cell .container-dot {
    width: 8px;
    height: 8px;
    min-width: 8px;
    min-height: 8px;
    border-width: 1px;
  }
}
</style>

<style lang="scss">
/* 圆点 tooltip 卡片（内容 teleport 到 body，需全局） */
.gantt-dot-tooltip-card-popper {
  padding: 4px;
  max-width: 320px;
}

.gantt-dot-tooltip-card {
  background: var(--el-bg-color-overlay);
  border-radius: 8px;
  box-shadow: var(--el-box-shadow-light);
  padding: 0;
  min-width: 160px;
  overflow: hidden;

  .tooltip-card-title {
    font-weight: 600;
    font-size: 13px;
    padding: 10px 12px 8px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    color: #000;
  }

  .tooltip-card-body {
    padding: 8px 12px 10px;
  }

  .tooltip-card-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 12px;
    padding: 2px 0;
  }

  .tooltip-card-label {
    color: var(--el-text-color-secondary);
  }

  .tooltip-card-value {
    color: var(--el-text-color-primary);
    font-weight: 500;
  }
}
</style>
