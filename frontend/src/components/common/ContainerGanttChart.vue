<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useRoute } from 'vue-router'
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
  type GanttStatisticsData,
} from './composables/useGanttData'
import {
  formatDateLabel,
  formatFullDate,
  extractDateFromContainer,
} from './composables/useGanttHelpers'
import { getGroupContainersSubset, getGroupContainers } from './composables/useGanttFilters'

const route = useRoute()

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

// 根据 filterCondition 确定初始泳道
const getInitialLaneName = (): string => {
  const filterCondition = route.query.filterCondition as string
  if (!filterCondition) {
    // 从 localStorage 恢复或使用默认值
    const storedLaneName = localStorage.getItem('ganttSelectedLaneName')
    return storedLaneName || '按到港'
  }

  // 根据 filterCondition 映射到泳道名称
  const arrivalFilters = [
    'arrivalToday',
    'arrivedBeforeNotPickedUp',
    'arrivedBeforePickedUp',
    'arrivedAtTransit',
    'transitOverdue',
    'transitWithin3Days',
    'transitWithin7Days',
    'transitOver7Days',
    'transitNoEta',
    'arrivedTodayNoAta',
    'etaOverdue',
    'etaWithin3Days',
    'etaWithin7Days',
    'etaOver7Days',
    'etaNoRecord',
  ]
  if (arrivalFilters.includes(filterCondition)) return '按到港'

  const pickupFilters = [
    'overduePlanned',
    'todayPlanned',
    'plannedWithin3Days',
    'plannedWithin7Days',
    'pendingArrangement',
  ]
  if (pickupFilters.includes(filterCondition)) return '按提柜计划'

  const lastPickupFilters = [
    'lastPickupExpired',
    'lastPickupUrgent',
    'lastPickupWarning',
    'lastPickupNormal',
    'lastPickupNoDate',
  ]
  if (lastPickupFilters.includes(filterCondition)) return '按最晚提柜'

  const returnFilters = [
    'returnExpired',
    'returnUrgent',
    'returnWarning',
    'returnNormal',
    'returnNoDate',
  ]
  if (returnFilters.includes(filterCondition)) return '按最晚还箱'

  return '按到港'
}

// 根据 filterCondition 过滤可用的泳道
const filteredLanes = computed<LaneConfig[]>(() => {
  const filterCondition = route.query.filterCondition as string
  if (!filterCondition) {
    // 没有 filterCondition 时显示所有泳道
    return allLanes.value
  }

  const initialLaneName = getInitialLaneName()
  // 有 filterCondition 时只显示对应的泳道
  return allLanes.value.filter(lane => lane.name === initialLaneName)
})

// 根据 filterCondition 获取对应的子维度标签
const getFilteredTimeGroups = computed(() => {
  const filterCondition = route.query.filterCondition as string
  console.log(`[Gantt Debug] filterCondition = "${filterCondition}"`)

  if (!filterCondition) {
    console.log(`[Gantt Debug] No filterCondition, showing all timeGroups`)
    // 没有 filterCondition 时显示所有时间分组
    return timeGroups.value
  }

  // 创建 filterCondition 到子维度标签的映射
  // 注意：标签必须与 useGanttFilters.ts 中的 groupLabel 完全一致
  const filterToSubDimensionMap: Record<string, string> = {
    // 按到港子维度（与 useGanttFilters.ts 的 getArrivalSubset 一致）
    arrivalToday: '今日到港',
    arrivedBeforeNotPickedUp: '今日之前到港未提柜',
    arrivedBeforePickedUp: '今日之前到港已提柜',
    arrivedAtTransit: '已到中转港',
    transitOverdue: '中转港已逾期',
    transitWithin3Days: '中转港3日内到港',
    transitWithin7Days: '中转港7日内到港',
    transitOver7Days: '中转港7日后到港',
    transitNoEta: '中转港无ETA',
    arrivedTodayNoAta: '今日之前到港但无ATA',
    etaOverdue: '已逾期到港',
    etaWithin3Days: '3日内预计到港',
    etaWithin7Days: '7日内预计到港',
    etaOver7Days: '7日后预计到港',
    etaNoRecord: '无ETA记录',

    // 按提柜计划子维度（与 useGanttFilters.ts 的 getPickupSubset 一致）
    overduePlanned: '逾期未提柜',
    todayPlanned: '今日计划提柜',
    plannedWithin3Days: '3天内预计提柜',
    plannedWithin7Days: '7天内预计提柜',
    pendingArrangement: '待安排提柜',

    // 按最晚提柜子维度（与 useGanttFilters.ts 的 getLastPickupSubset 一致）
    lastPickupExpired: '已逾期',
    lastPickupUrgent: '紧急',
    lastPickupWarning: '警告',
    lastPickupNormal: '正常',
    lastPickupNoDate: '最晚提柜日为空',

    // 按最晚还箱子维度（与 useGanttFilters.ts 的 getReturnSubset 一致）
    returnExpired: '已逾期',
    returnUrgent: '紧急',
    returnWarning: '警告',
    returnNormal: '正常',
    returnNoDate: '最后还箱日为空',
  }

  const targetLabel = filterToSubDimensionMap[filterCondition]
  console.log(`[Gantt Debug] targetLabel = "${targetLabel}"`)

  if (!targetLabel) {
    console.warn(
      `[Gantt Debug] filterCondition "${filterCondition}" not found in map, showing all timeGroups`
    )
    return timeGroups.value
  }

  // 只显示匹配的子维度
  const filtered = timeGroups.value.filter(group => group.label === targetLabel)
  console.log(`[Gantt Debug] Filtered to ${filtered.length} timeGroups with label "${targetLabel}"`)
  return filtered
})

const selectedLaneName = ref<string>(getInitialLaneName())

// 计算当前选中的泳道对象
const selectedLane = computed<LaneConfig>(() => {
  return allLanes.value.find(lane => lane.name === selectedLaneName.value) || allLanes.value[0]
})

// 监听泳道变化，通知父组件更新显示范围
watch(selectedLaneName, newName => {
  // 持久化到 localStorage
  localStorage.setItem('ganttSelectedLaneName', newName)
  const dimension = laneNameToDimension[newName]
  if (dimension) {
    emit('laneChange', dimension)
  }
})

// 组件挂载时，如果有 filterCondition，发出 laneChange 事件
onMounted(() => {
  const filterCondition = route.query.filterCondition as string
  if (filterCondition) {
    const initialLaneName = getInitialLaneName()
    const dimension = laneNameToDimension[initialLaneName]
    if (dimension) {
      emit('laneChange', dimension)
    }
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

// 调试日志：监控圆点渲染
watch(
  [() => props.containers, () => timeGroups.value],
  ([newContainers, newTimeGroups]) => {
    console.log('[Gantt Debug] Containers:', newContainers?.length || 0)
    console.log('[Gantt Debug] Time Groups:', newTimeGroups?.length || 0)
    console.log('[Gantt Debug] Filtered Time Groups:', getFilteredTimeGroups.value.length)
    console.log('[Gantt Debug] Selected Lane:', selectedLane.value.name)
    console.log('[Gantt Debug] filterCondition:', route.query.filterCondition)
    newTimeGroups?.forEach(group => {
      const subset = getGroupContainersSubset(
        props.containers,
        selectedLane.value.name,
        group.label
      )
      console.log(
        `[Gantt Debug] Group "${group.label}": count=${group.count}, subset.length=${subset.length}`
      )
      // 检查 subset 中的货柜是否有 extractedDate
      subset.slice(0, 3).forEach(container => {
        console.log(
          `[Gantt Debug]   Container ${container.containerNumber}: extractedDate=${container.extractedDate ? dayjs(container.extractedDate).format('YYYY-MM-DD') : 'null'}`
        )
      })
    })
  },
  { deep: true, immediate: true }
)

// 当前泳道对应的「日期」含义（tooltip 中日期行的标签）
const DATE_LABEL_BY_LANE_NAME: Record<string, string> = {
  按到港: '到港日期',
  按提柜计划: '计划提柜日',
  按最晚提柜: '最晚提柜日',
  按最晚还箱: '最晚还箱日',
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

const isToday = (d: Date) => dayjs(d).isSame(dayjs(), 'day')

// 监听 timeGroups 变化，重新收集 ref
watch(
  () => timeGroups,
  () => {
    collectLaneTimelines()
  },
  { deep: true, immediate: true }
)
</script>

<template>
  <div class="container-gantt-chart">
    <!-- 泳道选择器和图例 -->
    <div class="gantt-header-controls">
      <div class="lane-selector">
        <span class="selector-label">选择泳道：</span>
        <div class="lane-radio-group">
          <div
            v-for="lane in filteredLanes"
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
          <span class="legend-subtitle" v-if="selectedLane.subtitle">{{
            selectedLane.subtitle
          }}</span>
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
            weekend: dayjs(date).day() === 0 || dayjs(date).day() === 6,
            today: isToday(date),
          }"
        >
          {{ formatDateLabel(date) }}
        </div>
      </div>
    </div>

    <div class="gantt-body">
      <!-- 时间分组泳道 -->
      <div
        v-for="group in getFilteredTimeGroups"
        :key="group.label"
        class="gantt-lane time-group-lane"
      >
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
              weekend: dayjs(date).day() === 0 || dayjs(date).day() === 6,
              today: isToday(date),
            }"
          >
            <template
              v-for="container in getGroupContainers(
                getGroupContainersSubset(props.containers, selectedLane.name, group.label),
                date
              )"
              :key="container.containerNumber"
            >
              <el-tooltip
                placement="top"
                effect="dark"
                popper-class="gantt-dot-tooltip-card-popper"
              >
                <template #content>
                  <div class="gantt-dot-tooltip-card">
                    <div class="tooltip-card-title">{{ container.containerNumber }}</div>
                    <div class="tooltip-card-body">
                      <div class="tooltip-card-row">
                        <span class="tooltip-card-label">{{
                          getDateLabelForLane(selectedLane)
                        }}</span>
                        <span class="tooltip-card-value">{{
                          formatFullDate(
                            extractDateFromContainer(container, selectedLane.dateField)
                          )
                        }}</span>
                      </div>
                      <div class="tooltip-card-row">
                        <span class="tooltip-card-label">状态</span>
                        <span class="tooltip-card-value">{{
                          (container as any).logisticsStatus ??
                          (container as any).logistics_status ??
                          '-'
                        }}</span>
                      </div>
                      <div class="tooltip-card-row">
                        <span class="tooltip-card-label">目的港</span>
                        <span class="tooltip-card-value">{{
                          getDestPortFromContainer(container)
                        }}</span>
                      </div>
                    </div>
                  </div>
                </template>
                <div class="container-dot" :style="{ backgroundColor: group.color }"></div>
              </el-tooltip>
            </template>
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
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
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
