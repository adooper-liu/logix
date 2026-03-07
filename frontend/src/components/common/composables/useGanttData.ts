import { computed } from 'vue'
import dayjs from 'dayjs'
import type { ContainerItem, TimeGroup, LaneConfig } from '../types/ganttChart'
import { getGroupContainersSubset } from './useGanttFilters'
import {
  LANE_CONFIGS,
  LANE_NAME_TO_DIMENSION,
  LANE_GROUP_LABELS,
  ARRIVAL_DIMENSIONS,
  PICKUP_DIMENSIONS,
  LAST_PICKUP_DIMENSIONS,
  RETURN_DIMENSIONS
} from '@/config/containerDimensions'

// 泳道配置
export const createAllLanes = (): LaneConfig[] => LANE_CONFIGS.map(lane => ({
  name: lane.name,
  dateField: lane.dateField,
  color: lane.color
}))

// 泳道名称到维度的映射
export const laneNameToDimension = LANE_NAME_TO_DIMENSION

// 泳道名称到时间分组标签的映射
export const laneGroupLabels = LANE_GROUP_LABELS

// 计算日期范围
export const useDateRange = (startDate: Date, endDate: Date) => {
  return computed(() => {
    const start = dayjs(startDate)
    const end = dayjs(endDate)
    const days = end.diff(start, 'day') + 1
    return {
      start,
      end,
      days
    }
  })
}

// 生成日期数组
export const useDateArray = (dateRange: any) => {
  return computed(() => {
    const dates = []
    const rangeValue = dateRange.value || dateRange
    for (let i = 0; i < rangeValue.days; i++) {
      dates.push(rangeValue.start.add(i, 'day').toDate())
    }
    return dates
  })
}

/** 统计卡片接口返回的分布数据，用于驱动泳道行数量（与 Shipments 一致） */
export interface GanttStatisticsData {
  arrivalDistribution: Record<string, number>
  pickupDistribution: Record<string, number>
  lastPickupDistribution: Record<string, number>
  returnDistribution: Record<string, number>
}

// 生成时间分组的日期范围
// statistics: 可选，来自 getStatisticsDetailed；有则行数量用该数据（与 Shipments 卡片一致），圆点仍用 containers
export const useTimeGroups = (
  containers: ContainerItem[],
  startDate: Date,
  endDate: Date,
  selectedLane: any,
  statistics?: GanttStatisticsData | null
) => {
  return computed<TimeGroup[]>(() => {
    const groups: TimeGroup[] = []
    const today = dayjs().startOf('day')
    const laneName = selectedLane.value.name

    // 根据当前泳道生成对应的时间分组
    if (laneName === '按到港') {
      ARRIVAL_DIMENSIONS.forEach(dimension => {
        let groupStartDate: Date = dayjs(startDate).toDate()
        let groupEndDate: Date = dayjs(endDate).toDate()

        if (dimension.key === 'overdue') {
          groupStartDate = dayjs(startDate).toDate()
          groupEndDate = today.subtract(1, 'day').toDate()
        } else if (dimension.key === 'today') {
          groupStartDate = today.toDate()
          groupEndDate = today.toDate()
        } else if (dimension.key === 'arrivedBeforeTodayNotPickedUp' || dimension.key === 'arrivedBeforeTodayPickedUp') {
          groupStartDate = dayjs(startDate).toDate()
          groupEndDate = today.subtract(1, 'day').toDate()
        } else if (dimension.key === 'within3Days') {
          groupStartDate = today.add(1, 'day').toDate()
          groupEndDate = today.add(3, 'day').toDate()
        } else if (dimension.key === 'within7Days') {
          groupStartDate = today.add(4, 'day').toDate()
          groupEndDate = today.add(7, 'day').toDate()
        } else if (dimension.key === 'over7Days') {
          groupStartDate = today.add(8, 'day').toDate()
          groupEndDate = dayjs(endDate).toDate()
        } else if (dimension.key === 'other') {
          groupStartDate = dayjs(startDate).toDate()
          groupEndDate = dayjs(endDate).toDate()
        }

        groups.push({
          label: dimension.label,
          key: dimension.key,
          startDate: groupStartDate,
          endDate: groupEndDate,
          count: 0,
          color: dimension.color
        })
      })
    } else if (laneName === '按提柜计划') {
      PICKUP_DIMENSIONS.forEach(dimension => {
        let groupStartDate: Date = dayjs(startDate).toDate()
        let groupEndDate: Date = dayjs(endDate).toDate()

        if (dimension.key === 'overdue') {
          groupStartDate = dayjs(startDate).toDate()
          groupEndDate = today.subtract(1, 'day').toDate()
        } else if (dimension.key === 'pending') {
          groupStartDate = dayjs(startDate).toDate()
          groupEndDate = today.subtract(1, 'day').toDate()
        } else if (dimension.key === 'todayPlanned') {
          groupStartDate = today.toDate()
          groupEndDate = today.toDate()
        } else if (dimension.key === 'within3Days') {
          groupStartDate = today.add(1, 'day').toDate()
          groupEndDate = today.add(3, 'day').toDate()
        } else if (dimension.key === 'within7Days') {
          groupStartDate = today.add(4, 'day').toDate()
          groupEndDate = today.add(7, 'day').toDate()
        }

        groups.push({
          label: dimension.label,
          key: dimension.key,
          startDate: groupStartDate,
          endDate: groupEndDate,
          count: 0,
          color: dimension.color
        })
      })
    } else if (laneName === '按最晚提柜') {
      LAST_PICKUP_DIMENSIONS.forEach(dimension => {
        let groupStartDate: Date = dayjs(startDate).toDate()
        let groupEndDate: Date = dayjs(endDate).toDate()

        if (dimension.key === 'expired') {
          groupStartDate = dayjs(startDate).toDate()
          groupEndDate = today.subtract(1, 'day').toDate()
        } else if (dimension.key === 'noLastFreeDate') {
          groupStartDate = dayjs(startDate).toDate()
          groupEndDate = today.subtract(1, 'day').toDate()
        } else if (dimension.key === 'urgent') {
          groupStartDate = today.toDate()
          groupEndDate = today.add(3, 'day').toDate()
        } else if (dimension.key === 'warning') {
          groupStartDate = today.add(4, 'day').toDate()
          groupEndDate = today.add(7, 'day').toDate()
        } else if (dimension.key === 'normal') {
          groupStartDate = today.add(8, 'day').toDate()
          groupEndDate = dayjs(endDate).toDate()
        }

        groups.push({
          label: dimension.label,
          key: dimension.key,
          startDate: groupStartDate,
          endDate: groupEndDate,
          count: 0,
          color: dimension.color
        })
      })
    } else if (laneName === '按最晚还箱') {
      RETURN_DIMENSIONS.forEach(dimension => {
        let groupStartDate: Date = dayjs(startDate).toDate()
        let groupEndDate: Date = dayjs(endDate).toDate()

        if (dimension.key === 'expired') {
          groupStartDate = dayjs(startDate).toDate()
          groupEndDate = today.subtract(1, 'day').toDate()
        } else if (dimension.key === 'noLastReturnDate') {
          groupStartDate = dayjs(startDate).toDate()
          groupEndDate = today.subtract(1, 'day').toDate()
        } else if (dimension.key === 'urgent') {
          groupStartDate = today.toDate()
          groupEndDate = today.add(3, 'day').toDate()
        } else if (dimension.key === 'warning') {
          groupStartDate = today.add(4, 'day').toDate()
          groupEndDate = today.add(7, 'day').toDate()
        } else if (dimension.key === 'normal') {
          groupStartDate = today.add(8, 'day').toDate()
          groupEndDate = dayjs(endDate).toDate()
        }

        groups.push({
          label: dimension.label,
          key: dimension.key,
          startDate: groupStartDate,
          endDate: groupEndDate,
          count: 0,
          color: dimension.color
        })
      })
    }

    // 行数量：优先用统计卡片接口数据（与 Shipments 一致），否则用已加载货柜列表前端分组计数
    const distByLane: Record<string, Record<string, number> | undefined> = {
      '按到港': statistics?.arrivalDistribution,
      '按提柜计划': statistics?.pickupDistribution,
      '按最晚提柜': statistics?.lastPickupDistribution,
      '按最晚还箱': statistics?.returnDistribution
    }
    const distribution = distByLane[laneName]
    groups.forEach(group => {
      if (distribution && group.key != null) {
        group.count = distribution[group.key] ?? 0
      } else {
        group.count = getGroupContainersSubset(containers, laneName, group.label).length
      }
    })

    return groups
  })
}
