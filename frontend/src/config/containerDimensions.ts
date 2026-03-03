/**
 * 货柜分类维度配置
 * Container Dimensions Configuration
 * 确保 Shipments 页面和甘特图使用相同的分类定义
 */

/**
 * 按到港分类维度
 */
export const ARRIVAL_DIMENSIONS = [
  {
    key: 'today',
    label: '今日到港',
    color: '#67c23a'
  },
  {
    key: 'arrivedBeforeToday',
    label: '今日之前到港',
    color: '#67c23a'
  },
  {
    key: 'overdue',
    label: '已逾期到港',
    color: '#f56c6c'
  },
  {
    key: 'within3Days',
    label: '3日内预计到港',
    color: '#e6a23c'
  },
  {
    key: 'within7Days',
    label: '7日内预计到港',
    color: '#409eff'
  },
  {
    key: 'over7Days',
    label: '7日后预计到港',
    color: '#909399'
  }
] as const

/**
 * 按计划提柜分类维度
 */
export const PICKUP_DIMENSIONS = [
  {
    key: 'overdue',
    label: '已逾期提柜',
    color: '#f56c6c'
  },
  {
    key: 'pending',
    label: '待安排提柜',
    color: '#909399'
  },
  {
    key: 'todayPlanned',
    label: '今日计划提柜',
    color: '#e6a23c'
  },
  {
    key: 'todayActual',
    label: '今日实际提柜',
    color: '#67c23a'
  },
  {
    key: 'within3Days',
    label: '3天内计划提柜',
    color: '#e6a23c'
  },
  {
    key: 'within7Days',
    label: '7天内计划提柜',
    color: '#409eff'
  }
] as const

/**
 * 按最晚提柜分类维度
 */
export const LAST_PICKUP_DIMENSIONS = [
  {
    key: 'expired',
    label: '已逾期',
    color: '#f56c6c'
  },
  {
    key: 'noLastFreeDate',
    label: '缺最后免费日',
    color: '#909399'
  },
  {
    key: 'urgent',
    label: '紧急',
    color: '#e6a23c'
  },
  {
    key: 'warning',
    label: '警告',
    color: '#409eff'
  },
  {
    key: 'normal',
    label: '正常',
    color: '#67c23a'
  }
] as const

/**
 * 按最晚还箱分类维度
 */
export const RETURN_DIMENSIONS = [
  {
    key: 'expired',
    label: '已逾期',
    color: '#f56c6c'
  },
  {
    key: 'noLastReturnDate',
    label: '缺最后还箱日',
    color: '#909399'
  },
  {
    key: 'urgent',
    label: '紧急',
    color: '#e6a23c'
  },
  {
    key: 'warning',
    label: '警告',
    color: '#409eff'
  },
  {
    key: 'normal',
    label: '正常',
    color: '#67c23a'
  }
] as const

/**
 * 泳道配置
 */
export const LANE_CONFIGS = [
  {
    name: '按到港',
    dimension: 'arrival' as const,
    dateField: 'ataDestPort',
    color: '#67c23a',
    dimensions: ARRIVAL_DIMENSIONS
  },
  {
    name: '按计划提柜',
    dimension: 'pickup' as const,
    dateField: 'plannedPickupDate',
    color: '#e6a23c',
    dimensions: PICKUP_DIMENSIONS
  },
  {
    name: '按最晚提柜',
    dimension: 'lastPickup' as const,
    dateField: 'lastFreeDate',
    color: '#f56c6c',
    dimensions: LAST_PICKUP_DIMENSIONS
  },
  {
    name: '按最晚还箱',
    dimension: 'return' as const,
    dateField: 'lastReturnDate',
    color: '#909399',
    dimensions: RETURN_DIMENSIONS
  }
] as const

/**
 * 泳道名称到维度的映射
 */
export const LANE_NAME_TO_DIMENSION: Record<string, string> = {
  '按到港': 'arrival',
  '按计划提柜': 'pickup',
  '按最晚提柜': 'lastPickup',
  '按最晚还箱': 'return'
}

/**
 * 泳道名称到维度标签的映射
 */
export const LANE_GROUP_LABELS: Record<string, string[]> = {
  '按到港': ARRIVAL_DIMENSIONS.map(d => d.label),
  '按计划提柜': PICKUP_DIMENSIONS.map(d => d.label),
  '按最晚提柜': LAST_PICKUP_DIMENSIONS.map(d => d.label),
  '按最晚还箱': RETURN_DIMENSIONS.map(d => d.label)
}

/**
 * 类型定义
 */
export type DimensionKey =
  | 'today'
  | 'arrivedBeforeToday'
  | 'overdue'
  | 'within3Days'
  | 'within7Days'
  | 'over7Days'
  | 'pending'
  | 'todayPlanned'
  | 'todayActual'
  | 'noLastFreeDate'
  | 'noLastReturnDate'
  | 'expired'
  | 'urgent'
  | 'warning'
  | 'normal'

export type LaneDimension = 'arrival' | 'pickup' | 'lastPickup' | 'return'
