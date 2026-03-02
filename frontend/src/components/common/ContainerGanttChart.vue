<script setup lang="ts">
import { ref, computed } from 'vue'
import dayjs from 'dayjs'

interface LaneConfig {
  name: string
  dateField: string
  color: string
}

interface ContainerItem {
  containerNumber: string
  [key: string]: any
}

interface ContainerGanttChartProps {
  containers: ContainerItem[]
  startDate: Date
  endDate: Date
}

const props = defineProps<ContainerGanttChartProps>()

// 所有泳道配置
const allLanes = ref<LaneConfig[]>([
  {
    name: '按到港',
    dateField: 'ataDestPort',
    color: '#67c23a'
  },
  {
    name: '按计划提柜',
    dateField: 'plannedPickupDate',
    color: '#e6a23c'
  },
  {
    name: '按最晚提柜',
    dateField: 'lastFreeDate',
    color: '#f56c6c'
  },
  {
    name: '按最晚还箱',
    dateField: 'lastReturnDate',
    color: '#909399'
  }
])

// 当前选中的泳道
const selectedLane = ref<LaneConfig>(allLanes.value[0])

// 当前显示的泳道（下拉选择用）
const lanes = computed(() => [selectedLane.value])

// 计算日期范围
const dateRange = computed(() => {
  const start = dayjs(props.startDate)
  const end = dayjs(props.endDate)
  const days = end.diff(start, 'day') + 1
  return {
    start,
    end,
    days
  }
})

// 生成日期数组
const dateArray = computed(() => {
  const dates = []
  for (let i = 0; i < dateRange.value.days; i++) {
    dates.push(dateRange.value.start.add(i, 'day').toDate())
  }
  return dates
})

// 判断是否逾期
const isOverdue = (dateStr: string | Date | null | undefined): boolean => {
  if (!dateStr) return false
  return dayjs(dateStr).isBefore(dayjs(), 'day')
}

// 判断是否即将到期（3天内）
const isUrgent = (dateStr: string | Date | null | undefined): boolean => {
  if (!dateStr) return false
  const days = dayjs(dateStr).diff(dayjs(), 'day')
  return days >= 0 && days <= 3
}

// 从容器中提取日期字段
const extractDateFromContainer = (container: any, lane: LaneConfig): Date | null => {
  const fieldName = lane.dateField

  // 直接字段
  if (container[fieldName]) {
    return new Date(container[fieldName])
  }

  // 从portOperations中提取
  if (container.portOperations && container.portOperations.length > 0) {
    const destPortOp = container.portOperations.find((op: any) => op.portType === 'destination')
    if (destPortOp && destPortOp[fieldName]) {
      return new Date(destPortOp[fieldName])
    }
  }

  // 从truckingTransports中提取计划提柜
  if (fieldName === 'plannedPickupDate' && container.truckingTransports && container.truckingTransports.length > 0) {
    const trucking = container.truckingTransports[0]
    if (trucking.plannedPickupDate) {
      return new Date(trucking.plannedPickupDate)
    }
  }

  // 从emptyReturns中提取最晚还箱
  if (fieldName === 'lastReturnDate' && container.emptyReturns && container.emptyReturns.length > 0) {
    const emptyReturn = container.emptyReturns[0]
    if (emptyReturn.lastReturnDate) {
      return new Date(emptyReturn.lastReturnDate)
    }
  }

  return null
}

// 获取日期的容器
const getContainersByDate = (date: Date, lane: LaneConfig) => {
  return props.containers
    .map(container => ({
      ...container,
      extractedDate: extractDateFromContainer(container, lane)
    }))
    .filter(item => {
      if (!item.extractedDate) return false
      return dayjs(item.extractedDate).isSame(dayjs(date), 'day')
    })
}

// 获取容器的状态
const getContainerStatus = (container: ContainerItem, lane: LaneConfig): string => {
  const date = extractDateFromContainer(container, lane)
  if (!date) return 'normal'

  if (isOverdue(date)) return 'overdue'
  if (isUrgent(date)) return 'urgent'
  return 'normal'
}

// 获取状态颜色
const getStatusColor = (container: ContainerItem, lane: LaneConfig): string => {
  const status = getContainerStatus(container, lane)
  switch (status) {
    case 'overdue':
      return '#f56c6c' // 红色
    case 'urgent':
      return '#e6a23c' // 橙色
    default:
      return lane.color // 默认颜色
  }
}

// 格式化日期显示
const formatDateLabel = (date: Date): string => {
  return dayjs(date).format('MM-DD')
}

// 格式化日期用于tooltip
const formatFullDate = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm')
}

// 为tooltip获取完整的容器日期
const getContainerTooltipDate = (container: ContainerItem, lane: LaneConfig): string => {
  const date = extractDateFromContainer(container, lane)
  if (!date) return '-'
  return formatFullDate(date)
}
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
            :class="{ active: selectedLane.name === lane.name }"
            @click="selectedLane = lane"
          >
            <span class="lane-radio-dot" :style="{ backgroundColor: lane.color }"></span>
            <span class="lane-radio-label">{{ lane.name }}</span>
          </div>
        </div>
      </div>

      <div class="gantt-legend">
        <div class="legend-item">
          <div class="legend-dot overdue"></div>
          <span class="legend-label">已逾期</span>
        </div>
        <div class="legend-item">
          <div class="legend-dot urgent"></div>
          <span class="legend-label">即将到期(3天)</span>
        </div>
        <div class="legend-divider"></div>
        <div class="legend-item">
          <span class="legend-label">当前：</span>
          <div class="legend-dot" :style="{ backgroundColor: selectedLane.color }"></div>
          <span class="legend-label">{{ selectedLane.name }}</span>
        </div>
      </div>
    </div>

    <div class="gantt-header">
      <div class="lane-header">泳道</div>
      <div class="timeline-header">
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
      <div v-for="lane in lanes" :key="lane.name" class="gantt-lane">
        <div class="lane-label" :style="{ borderLeftColor: lane.color }">
          {{ lane.name }}
        </div>
        <div class="lane-timeline">
          <div
            v-for="date in dateArray"
            :key="date.getTime()"
            class="timeline-cell"
            :class="{ 'weekend': dayjs(date).day() === 0 || dayjs(date).day() === 6 }"
          >
            <el-tooltip
              v-for="container in getContainersByDate(date, lane)"
              :key="container.containerNumber"
              :content="`${container.containerNumber} - ${getContainerTooltipDate(container, lane)}`"
              placement="top"
              effect="dark"
            >
              <div
                class="container-dot"
                :style="{ backgroundColor: getStatusColor(container, lane) }"
                :class="{
                  'overdue': getContainerStatus(container, lane) === 'overdue',
                  'urgent': getContainerStatus(container, lane) === 'urgent'
                }"
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
      gap: 12px;

      .lane-radio-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 8px;
        background-color: white;
        border: 2px solid #e9ecef;
        cursor: pointer;
        transition: all 0.3s ease;
        user-select: none;

        &:hover {
          border-color: #dee2e6;
          background-color: #f8f9fa;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        &.active {
          border-color: #409eff;
          background: linear-gradient(135deg, #ecf5ff 0%, #d9ecff 100%);
          box-shadow: 0 2px 8px rgba(64, 158, 255, 0.25);
        }

        .lane-radio-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
          position: relative;
          flex-shrink: 0;

          &::before {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            width: 5px;
            height: 5px;
            background: rgba(255, 255, 255, 0.4);
            border-radius: 50%;
          }
        }

        .lane-radio-label {
          font-size: 13px;
          font-weight: 500;
          color: $text-primary;
        }
      }
    }
  }

  .gantt-legend {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    padding: 0;

    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;

      .legend-dot {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
        position: relative;

        &::before {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 5px;
          height: 5px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 50%;
        }

        &.overdue {
          background: linear-gradient(135deg, #f56c6c 0%, #e53e3e 100%);
          animation: overduePulse 1.5s ease-in-out infinite;
        }

        &.urgent {
          background: linear-gradient(135deg, #e6a23c 0%, #dd6b20 100%);
          animation: urgentPulse 1.5s ease-in-out infinite;
        }
      }

      .legend-label {
        font-size: 13px;
        font-weight: 500;
        color: $text-primary;
      }
    }

    .legend-divider {
      width: 1px;
      height: 24px;
      background: linear-gradient(180deg, transparent, #dee2e6, transparent);
    }
  }

  .gantt-header {
    display: flex;
    border-bottom: 2px solid #e9ecef;
    padding-bottom: 16px;
    margin-bottom: 4px;

    .lane-header {
      width: 130px;
      flex-shrink: 0;
      font-weight: 700;
      color: $text-primary;
      font-size: 15px;
      padding-top: 8px;
    }

    .timeline-header {
      display: flex;
      flex: 1;
      gap: 6px;
      min-width: 0;
      overflow-x: auto;
      padding-right: 8px;

      &::-webkit-scrollbar {
        height: 8px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f3f5;
        border-radius: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background: #dee2e6;
        border-radius: 4px;

        &:hover {
          background: #ced4da;
        }
      }

      .date-cell {
        flex: 0 0 65px;
        text-align: center;
        font-size: 12px;
        font-weight: 600;
        color: $text-secondary;
        padding: 8px 4px;
        border-radius: 8px;
        background-color: #f8f9fa;
        transition: all 0.2s ease;

        &.weekend {
          background: linear-gradient(135deg, #fce4ec 0%, #f3e5f5 100%);
          color: #7b1fa2;
        }

        &:hover {
          background-color: #e9ecef;
          transform: translateY(-2px);
        }
      }
    }
  }

  .gantt-body {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .gantt-lane {
      display: flex;
      align-items: stretch;
      gap: 12px;

      .lane-label {
        width: 130px;
        flex-shrink: 0;
        padding: 16px;
        font-size: 14px;
        font-weight: 600;
        color: $text-primary;
        background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f5 100%);
        border-radius: 12px;
        border-left: 5px solid;
        display: flex;
        align-items: center;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        transition: all 0.3s ease;

        &:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      }

      .lane-timeline {
        display: flex;
        flex: 1;
        gap: 6px;
        overflow-x: auto;
        min-width: 0;
        padding-right: 8px;

        &::-webkit-scrollbar {
          height: 8px;
        }

        &::-webkit-scrollbar-track {
          background: #f1f3f5;
          border-radius: 4px;
        }

        &::-webkit-scrollbar-thumb {
          background: #dee2e6;
          border-radius: 4px;

          &:hover {
            background: #ced4da;
          }
        }

        .timeline-cell {
          flex: 0 0 65px;
          min-height: 60px;
          background-color: #f8f9fa;
          border-radius: 10px;
          display: flex;
          flex-wrap: wrap;
          align-content: flex-start;
          padding: 10px;
          gap: 6px;
          flex-shrink: 0;
          transition: all 0.2s ease;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);

          &.weekend {
            background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          }

          &:hover {
            background-color: #e9ecef;
            transform: scale(1.02);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          .container-dot {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
            position: relative;

            &::before {
              content: '';
              position: absolute;
              top: 2px;
              left: 2px;
              width: 6px;
              height: 6px;
              background: rgba(255, 255, 255, 0.4);
              border-radius: 50%;
            }

            &:hover {
              transform: scale(1.4) translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
              z-index: 10;
            }

            &.overdue {
              animation: overduePulse 1.5s ease-in-out infinite;
            }

            &.urgent {
              animation: urgentPulse 1.5s ease-in-out infinite;
            }
          }
        }
      }
    }
  }
}

.lane-option {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;

  .lane-color {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    position: relative;

    &::before {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 6px;
      height: 6px;
      background: rgba(255, 255, 255, 0.4);
      border-radius: 50%;
    }
  }
}

@keyframes overduePulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 2px 6px rgba(245, 108, 108, 0.4);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(245, 108, 108, 0.6);
  }
}

@keyframes urgentPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
    box-shadow: 0 2px 6px rgba(230, 162, 60, 0.4);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(230, 162, 60, 0.6);
  }
}

@media (max-width: 768px) {
  .container-gantt-chart {
    padding: 16px;
    gap: 16px;
    border-radius: 12px;

    .gantt-header-controls {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
    }

    .lane-selector {
      width: 100%;

      .selector-label {
        font-size: 13px;
      }

      :deep(.el-select) {
        width: 100%;
      }
    }

    .gantt-legend {
      width: 100%;
      padding: 0;
      gap: 12px;
    }

    .gantt-header {
      padding-bottom: 12px;

      .lane-header {
        width: 90px;
        font-size: 13px;
        padding-top: 6px;
      }

      .timeline-header {
        gap: 4px;

        .date-cell {
          flex: 0 0 50px;
          font-size: 11px;
          padding: 6px 2px;
          border-radius: 6px;
        }
      }
    }

    .gantt-body {
      gap: 12px;

      .gantt-lane {
        gap: 8px;

        .lane-label {
          width: 90px;
          padding: 12px;
          font-size: 12px;
          border-radius: 8px;
        }

        .lane-timeline {
          gap: 4px;

          .timeline-cell {
            flex: 0 0 50px;
            min-height: 45px;
            padding: 6px;
            border-radius: 6px;

            .container-dot {
              width: 14px;
              height: 14px;

              &::before {
                width: 4px;
                height: 4px;
                top: 2px;
                left: 2px;
              }
            }
          }
        }
      }
    }
  }
}
</style>
