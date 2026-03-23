import { computed, Ref, ref } from 'vue'
import { SimplifiedStatus } from '@/utils/logisticsStatusMachine'

interface CountdownData {
  count: number
  urgent: number
  expired: number
  filterItems?: { label: string; count: number; color: string; days: string; level?: number; children?: any[] }[]
}

// 倒计时计算逻辑
// 参数：statisticsData (Ref) - 从后端API获取的统计数据，而不是完整货柜列表
export function useContainerCountdown(statisticsData: Ref<{
  statusDistribution?: Record<string, number>
  arrivalDistribution?: Record<string, number>
  pickupDistribution?: Record<string, number>
  lastPickupDistribution?: Record<string, number>
  returnDistribution?: Record<string, number>
} | null>) {
  const currentTime = ref(new Date())
  let timer: number | null = null

  // 计算按到港倒计时的货柜数量（使用后端统计数据）
  // 修正版：按三个主分组统计，已到中转港按ETA细分
  // ├── 已到目的港
  // │   ├── 今日到港
  // │   ├── 今日之前到港未提柜
  // │   └── 今日之前到港已提柜
  // ├── 已到中转港（有中转港记录，目的港无ATA，按ETA细分）
  // │   ├── 已逾期
  // │   ├── 3日内预计到港
  // │   ├── 7日内预计到港
  // │   ├── 7日后预计到港
  // │   └── 无ETA记录
  // └── 预计到港
  //     ├── 已逾期未到港
  //     ├── 3日内预计到港
  //     ├── 7日内预计到港
  //     ├── 7日后预计到港
  //     └── 其他记录 (无ETA)
  const countdownByArrival = computed<CountdownData>(() => {
    const dist = statisticsData.value?.arrivalDistribution
    if (!dist) return { count: 0, urgent: 0, expired: 0, filterItems: [] }

    // 使用后端返回的camelCase字段名（修正版）
    const today = dist.today || 0
    const arrivedBeforeTodayNotPickedUp = dist.arrivedBeforeTodayNotPickedUp || 0
    const arrivedBeforeTodayPickedUp = dist.arrivedBeforeTodayPickedUp || 0
    const arrivedAtTransit = dist.arrivedAtTransit || 0
    const transitOverdue = dist.transitOverdue || 0
    const transitWithin3Days = dist.transitWithin3Days || 0
    const transitWithin7Days = dist.transitWithin7Days || 0
    const transitOver7Days = dist.transitOver7Days || 0
    const transitNoETA = dist.transitNoETA || 0
    const overdue = dist.overdue || 0
    const within3Days = dist.within3Days || 0
    const within7Days = dist.within7Days || 0
    const over7Days = dist.over7Days || 0
    const other = dist.other || 0
    const arrivedBeforeTodayNoATA = dist.arrivedBeforeTodayNoATA || 0

    // 总数 = 四个主分组之和（含到港数据缺失）
    const count = (today + arrivedBeforeTodayNotPickedUp + arrivedBeforeTodayPickedUp) + arrivedAtTransit +
                 (overdue + within3Days + within7Days + over7Days + other) + arrivedBeforeTodayNoATA
    const urgent = overdue + within3Days + transitOverdue + transitWithin3Days
    const expired = overdue + transitOverdue

    // 按三个主分组组织筛选项（树形结构）
    // 注意：days值直接使用后端filterCondition，无需映射
    const filterItems = [
      // 已到目的港分组
      {
        label: '已到目的港',
        count: today + arrivedBeforeTodayNotPickedUp + arrivedBeforeTodayPickedUp,
        color: '#67c23a',
        days: 'arrivedAtDestination',
        level: 0,
        children: [
          { label: '今日到港', count: today, color: '#67c23a', days: 'arrivalToday', level: 1 },
          { label: '之前未提柜', count: arrivedBeforeTodayNotPickedUp, color: '#909399', days: 'arrivedBeforeTodayNotPickedUp', level: 1 },
          { label: '之前已提柜', count: arrivedBeforeTodayPickedUp, color: '#67c23a', days: 'arrivedBeforeTodayPickedUp', level: 1 }
        ]
      },
      // 已到中转港分组（按ETA细分）
      {
        label: '已到中转港',
        count: arrivedAtTransit,
        color: '#e6a23c',
        days: 'arrivedAtTransit',
        level: 0,
        children: [
          { label: '已逾期', count: transitOverdue, color: '#f56c6c', days: 'transitOverdue', level: 1 },
          { label: '3日内', count: transitWithin3Days, color: '#e6a23c', days: 'transitWithin3Days', level: 1 },
          { label: '7日内', count: transitWithin7Days, color: '#409eff', days: 'transitWithin7Days', level: 1 },
          { label: '7日后', count: transitOver7Days, color: '#67c23a', days: 'transitOver7Days', level: 1 },
          { label: '无ETA', count: transitNoETA, color: '#909399', days: 'transitNoETA', level: 1 }
        ]
      },
      // ETA分组（主数=子项之和，保证一致）
      {
        label: 'ETA',
        count: overdue + within3Days + within7Days + over7Days + other,
        color: '#409eff',
        days: 'expectedArrival',
        level: 0,
        children: [
          { label: '已逾期', count: overdue, color: '#f56c6c', days: 'overdue', level: 1 },
          { label: '3天内', count: within3Days, color: '#e6a23c', days: 'within3Days', level: 1 },
          { label: '7天内', count: within7Days, color: '#409eff', days: 'within7Days', level: 1 },
          { label: '7天后', count: over7Days, color: '#67c23a', days: 'over7Days', level: 1 },
          { label: '其他', count: other, color: '#c0c4cc', days: 'otherRecords', level: 1 }
        ]
      },
      // 到港数据缺失（目的港无ATA无ETA但状态显示已到港，修复漏失）
      {
        label: '到港数据缺失',
        count: arrivedBeforeTodayNoATA,
        color: '#909399',
        days: 'arrivedBeforeTodayNoATA',
        level: 0
      }
    ]

    return { count, urgent, expired, filterItems }
  })

  // 计算按提柜倒计时的货柜数量（使用后端统计数据）
  // 按最新方案：
  // 按提柜计划总计 (实际已到目的港但未提柜)
  // ├── ① 有安排拖车计划
  // │   ├── 逾期未提柜
  // │   ├── 今日计划提柜
  // │   ├── 3天内计划提柜
  // │   └── 7天内计划提柜
  // └── ② 没有安排拖车计划
  //     └── 待安排提柜
  const countdownByPickup = computed<CountdownData>(() => {
    const dist = statisticsData.value?.pickupDistribution
    if (!dist) return { count: 0, urgent: 0, expired: 0, filterItems: [] }

    // 使用后端返回的camelCase字段名
    const overdue = dist.overdue || 0
    const todayPlanned = dist.todayPlanned || 0
    const pending = dist.pending || 0
    const within3Days = dist.within3Days || 0
    const within7Days = dist.within7Days || 0
    const withPlan = dist.withPlan || 0
    const withoutPlan = dist.withoutPlan || 0
    const total = dist.total || 0

    const count = total
    const urgent = overdue + todayPlanned + within3Days
    const expired = overdue

    // 按提柜计划筛选项 - days值直接使用后端filterCondition
    const filterItems = [
      { label: '逾期未提柜', count: overdue, color: '#f56c6c', days: 'overduePlanned', level: 0 },
      { label: '今日计划提柜', count: todayPlanned, color: '#e6a23c', days: 'todayPlanned', level: 0 },
      { label: '3天内计划提柜', count: within3Days, color: '#409eff', days: 'plannedWithin3Days', level: 0 },
      { label: '7天内计划提柜', count: within7Days, color: '#67c23a', days: 'plannedWithin7Days', level: 0 },
      { label: '待安排提柜', count: pending, color: '#909399', days: 'pendingArrangement', level: 0 }
    ]

    return { count, urgent, expired, filterItems }
  })

  // 计算按最晚提柜倒计时的货柜数量（使用后端统计数据）
  const countdownByLastPickup = computed<CountdownData>(() => {
    const dist = statisticsData.value?.lastPickupDistribution
    if (!dist) return { count: 0, urgent: 0, expired: 0, filterItems: [] }

    // 使用后端返回的camelCase字段名
    const expired = dist.expired || 0
    const urgent = dist.urgent || 0
    const warning = dist.warning || 0
    const normal = dist.normal || 0
    const noLastFreeDate = dist.noLastFreeDate || 0

    const count = expired + urgent + warning + normal + noLastFreeDate

    const filterItems = [
      { label: '已超时', count: expired, color: '#f56c6c', days: 'expired', level: 0 },
      { label: '即将超时(1-3天)', count: urgent, color: '#e6a23c', days: 'urgent', level: 0 },
      { label: '预警(4-7天)', count: warning, color: '#409eff', days: 'warning', level: 0 },
      { label: '时间充裕(7天以上)', count: normal, color: '#67c23a', days: 'normal', level: 0 },
      { label: '最晚提柜日为空', count: noLastFreeDate, color: '#909399', days: 'noLastFreeDate', level: 0 }
    ]

    return { count, urgent: urgent + expired, expired, filterItems }
  })

  // 计算按最晚还箱倒计时的货柜数量（使用后端统计数据）
  // 按最新方案：
  // 按最晚还箱 (有实际提柜或有拖卡记录，且未还箱) - 这是唯一的基础条件
  // ├── ① 有最晚还箱日
  // │   ├── 已逾期未还箱
  // │   ├── 紧急：倒计时3天内
  // │   ├── 警告：倒计时7天内
  // │   └── 正常
  // └── ② 最后还箱日为空
  const countdownByReturn = computed<CountdownData>(() => {
    const dist = statisticsData.value?.returnDistribution
    if (!dist) return { count: 0, urgent: 0, expired: 0, filterItems: [] }

    // 使用后端返回的camelCase字段名
    const expired = dist.expired || 0
    const urgent = dist.urgent || 0
    const warning = dist.warning || 0
    const normal = dist.normal || 0
    const noLastReturnDate = dist.noLastReturnDate || 0
    const withLastReturnDate = dist.withLastReturnDate || 0
    const withoutLastReturnDate = dist.withoutLastReturnDate || 0
    const total = dist.total || 0

    const count = total
    const urgentCount = expired + urgent
    const expiredCount = expired

    // 按最晚还箱筛选项 - days值直接使用后端filterCondition
    const filterItems = [
      { label: '已逾期未还箱', count: expired, color: '#f56c6c', days: 'returnExpired', level: 0 },
      { label: '紧急：倒计时3天内', count: urgent, color: '#e6a23c', days: 'returnUrgent', level: 0 },
      { label: '警告：倒计时7天内', count: warning, color: '#409eff', days: 'returnWarning', level: 0 },
      { label: '正常', count: normal, color: '#67c23a', days: 'returnNormal', level: 0 },
      { label: '最后还箱日为空', count: noLastReturnDate, color: '#909399', days: 'noLastReturnDate', level: 0 }
    ]

    return { count, urgent: urgentCount, expired: expiredCount, filterItems }
  })

  // 按状态：按状态机优先级顺序展示（SimplifiedStatus 流转顺序）
  const STATUS_DISPLAY_ORDER: (keyof typeof SimplifiedStatus)[] = [
    'NOT_SHIPPED',
    'SHIPPED',
    'IN_TRANSIT',
    'AT_PORT',
    'PICKED_UP',
    'UNLOADED',
    'RETURNED_EMPTY'
  ]

  // 计算按物流状态分类的货柜数量（使用后端统计数据）
  // 业务口径：未到目的港 = 在途（含「已到中转港」）；已到目的港 = 已到港。总数 = 7 个顶级项之和，子项不重复计入。
  const countdownByStatus = computed<CountdownData>(() => {
    const dist = statisticsData.value?.statusDistribution
    if (!dist) return { count: 0, urgent: 0, expired: 0, filterItems: [] }

    const inTransit = dist.in_transit || 0
    const arrivedAtTransit = dist.arrived_at_transit || 0
    const arrivedAtDestination = dist.arrived_at_destination || 0

    const itemConfig: Record<string, { label: string; count: number; color: string; days: string }> = {
      [SimplifiedStatus.NOT_SHIPPED]: { label: '未出运', count: dist.not_shipped || 0, color: '#909399', days: SimplifiedStatus.NOT_SHIPPED },
      [SimplifiedStatus.SHIPPED]: { label: '已出运', count: dist.shipped || 0, color: '#409eff', days: SimplifiedStatus.SHIPPED },
      [SimplifiedStatus.AT_PORT]: { label: '已到目的港', count: arrivedAtDestination, color: '#67c23a', days: 'arrived_at_destination' },
      [SimplifiedStatus.PICKED_UP]: { label: '已提柜', count: dist.picked_up || 0, color: '#f39c12', days: SimplifiedStatus.PICKED_UP },
      [SimplifiedStatus.UNLOADED]: { label: '已卸柜', count: dist.unloaded || 0, color: '#3498db', days: SimplifiedStatus.UNLOADED },
      [SimplifiedStatus.RETURNED_EMPTY]: { label: '已还箱', count: dist.returned_empty || 0, color: '#95a5a6', days: SimplifiedStatus.RETURNED_EMPTY }
    }

    // IN_TRANSIT 不显示「在途」父级，只显示两个子细分：未到港、已到中转港
    const inTransitItems = [
      { label: '未到港', count: inTransit, color: '#e6a23c', days: SimplifiedStatus.IN_TRANSIT, level: 0 },
      { label: '已到中转港', count: arrivedAtTransit, color: '#909399', days: 'arrived_at_transit', level: 0 }
    ]

    const filterItems = STATUS_DISPLAY_ORDER.flatMap(key => {
      if (key === 'IN_TRANSIT') return inTransitItems
      const config = itemConfig[SimplifiedStatus[key]]
      if (!config) return []
      return [{ ...config, level: 0 }]
    }) as CountdownData['filterItems']

    const count =
      (dist.not_shipped || 0) + (dist.shipped || 0) + (inTransit + arrivedAtTransit) + arrivedAtDestination +
      (dist.picked_up || 0) + (dist.unloaded || 0) + (dist.returned_empty || 0)

    return {
      count,
      urgent: 0,
      expired: 0,
      filterItems: filterItems || []
    }
  })

  // 启动定时器
  // 性能优化：从 1 秒改为 10 秒，减少计算频率
  const startTimer = () => {
    timer = window.setInterval(() => {
      currentTime.value = new Date()
    }, 10000) // 每 10 秒更新一次，而不是每秒
  }

  // 停止定时器
  const stopTimer = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  return {
    countdownByArrival,
    countdownByPickup,
    countdownByLastPickup,
    countdownByReturn,
    countdownByStatus,
    startTimer,
    stopTimer
  }
}
