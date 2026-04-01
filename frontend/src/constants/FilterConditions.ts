/**
 * 筛选条件常量定义
 * 注意：此文件仅保留CONDITION_TO_SERVICE_MAP用于后端路由
 * 前端不再需要FILTER_CONDITION_MAP，直接使用后端filterCondition
 */

/**
 * 筛选条件 → 所属服务映射
 * 用于后端路由：根据filterCondition找到对应的子服务
 */
export const CONDITION_TO_SERVICE_MAP: Record<string, string> = {
  // 按到港维度
  arrivedAtDestination: 'arrival',
  arrivedAtTransit: 'arrival',
  expectedArrival: 'arrival',
  arrivalToday: 'arrival',
  arrivedBeforeTodayNotPickedUp: 'arrival',
  arrivedBeforeTodayPickedUp: 'arrival',
  arrivedBeforeTodayNoATA: 'arrival',
  transitOverdue: 'arrival',
  transitWithin3Days: 'arrival',
  transitWithin7Days: 'arrival',
  transitOver7Days: 'arrival',
  transitNoETA: 'arrival',

  // 按ETA维度
  overdue: 'eta',
  within3Days: 'eta',
  within7Days: 'eta',
  over7Days: 'eta',
  otherRecords: 'eta',

  // 按提柜计划维度
  overduePlanned: 'plannedPickup',
  todayPlanned: 'plannedPickup',
  plannedWithin3Days: 'plannedPickup',
  plannedWithin7Days: 'plannedPickup',
  pendingArrangement: 'plannedPickup',

  // 按最晚提柜维度
  expired: 'lastPickup',
  urgent: 'lastPickup',
  warning: 'lastPickup',
  normal: 'lastPickup',
  noLastFreeDate: 'lastPickup',

  // 按最晚还箱维度
  returnExpired: 'lastReturn',
  returnUrgent: 'lastReturn',
  returnWarning: 'lastReturn',
  returnNormal: 'lastReturn',
  noLastReturnDate: 'lastReturn',
}
