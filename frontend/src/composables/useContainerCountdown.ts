import { computed, Ref, ref } from 'vue'
import { SimplifiedStatus } from '@/utils/logisticsStatusMachine'

interface CountdownData {
  count: number
  urgent: number
  expired: number
  filterItems?: { label: string; count: number; color: string; days: string }[]
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
  const countdownByArrival = computed<CountdownData>(() => {
    const dist = statisticsData.value?.arrivalDistribution
    if (!dist) return { count: 0, urgent: 0, expired: 0, filterItems: [] }

    // 使用后端返回的camelCase字段名
    const overdue = dist.overdue || 0
    const today = dist.today || 0
    const arrivedBeforeToday = dist.arrivedBeforeToday || 0
    const within3Days = dist.within3Days || 0
    const within7Days = dist.within7Days || 0
    const over7Days = dist.over7Days || 0
    const other = dist.other || 0

    // 倒计时关注：逾期未到港 + 3日内预计到港 + 7日内预计到港 + 7天以上预计到港
    const count = overdue + within3Days + within7Days + over7Days
    const urgent = overdue + within3Days
    const expired = overdue

    const filterItems = [
      { label: '已逾期未到港', count: overdue, color: '#f56c6c', days: 'overdue' },
      { label: '今日到港', count: today, color: '#67c23a', days: 'today' },
      { label: '今日之前到港', count: arrivedBeforeToday, color: '#909399', days: 'arrivedBeforeToday' },
      { label: '3天内预计到港', count: within3Days, color: '#e6a23c', days: 'within3Days' },
      { label: '7天内预计到港', count: within7Days, color: '#409eff', days: 'within7Days' },
      { label: '>7天预计到港', count: over7Days, color: '#67c23a', days: 'over7Days' },
      { label: '其他记录', count: other, color: '#c0c4cc', days: 'other' }
    ]

    return { count, urgent, expired, filterItems }
  })

  // 计算按提柜倒计时的货柜数量（使用后端统计数据）
  const countdownByPickup = computed<CountdownData>(() => {
    const dist = statisticsData.value?.pickupDistribution
    if (!dist) return { count: 0, urgent: 0, expired: 0, filterItems: [] }

    // 使用后端返回的camelCase字段名
    const overdue = dist.overdue || 0
    const todayPlanned = dist.todayPlanned || 0
    const todayActual = dist.todayActual || 0
    const pending = dist.pending || 0
    const within3Days = dist.within3Days || 0
    const within7Days = dist.within7Days || 0

    const count = overdue + todayPlanned + pending + within3Days + within7Days
    const urgent = overdue + todayPlanned + within3Days
    const expired = overdue

    const filterItems = [
      { label: '计划提柜逾期', count: overdue, color: '#f56c6c', days: 'overdue' },
      { label: '今日计划提柜', count: todayPlanned, color: '#e6a23c', days: 'todayPlanned' },
      { label: '今日实际提柜', count: todayActual, color: '#67c23a', days: 'todayActual' },
      { label: '待安排提柜', count: pending, color: '#909399', days: 'pending' },
      { label: '3天内预计提柜', count: within3Days, color: '#409eff', days: 'within3Days' },
      { label: '7天内预计提柜', count: within7Days, color: '#67c23a', days: 'within7Days' }
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
      { label: '已超时', count: expired, color: '#f56c6c', days: 'expired' },
      { label: '即将超时(1-3天)', count: urgent, color: '#e6a23c', days: 'urgent' },
      { label: '预警(4-7天)', count: warning, color: '#409eff', days: 'warning' },
      { label: '时间充裕(7天以上)', count: normal, color: '#67c23a', days: 'normal' },
      { label: '缺最后免费日', count: noLastFreeDate, color: '#909399', days: 'noLastFreeDate' }
    ]

    return { count, urgent: urgent + expired, expired, filterItems }
  })

  // 计算按最晚还箱倒计时的货柜数量（使用后端统计数据）
  const countdownByReturn = computed<CountdownData>(() => {
    const dist = statisticsData.value?.returnDistribution
    if (!dist) return { count: 0, urgent: 0, expired: 0, filterItems: [] }

    // 使用后端返回的camelCase字段名
    const expired = dist.expired || 0
    const urgent = dist.urgent || 0
    const warning = dist.warning || 0
    const normal = dist.normal || 0
    const noLastReturnDate = dist.noLastReturnDate || 0

    const count = expired + urgent + warning + normal + noLastReturnDate

    const filterItems = [
      { label: '已超时', count: expired, color: '#f56c6c', days: 'expired' },
      { label: '即将超时(1-3天)', count: urgent, color: '#e6a23c', days: 'urgent' },
      { label: '预警(4-7天)', count: warning, color: '#409eff', days: 'warning' },
      { label: '还箱日倒计时>7天', count: normal, color: '#67c23a', days: 'normal' },
      { label: '缺最后还箱日', count: noLastReturnDate, color: '#909399', days: 'noLastReturnDate' }
    ]

    return { count, urgent: urgent + expired, expired, filterItems }
  })

  // 计算按物流状态分类的货柜数量（使用后端统计数据）
  const countdownByStatus = computed<CountdownData>(() => {
    const dist = statisticsData.value?.statusDistribution
    if (!dist) return { count: 0, urgent: 0, expired: 0, filterItems: [] }

    // 状态分布使用snake_case（数据库字段名）
    const filterItems = [
      { label: '未出运', count: dist.not_shipped || 0, color: '#909399', days: SimplifiedStatus.NOT_SHIPPED },
      { label: '已出运', count: dist.shipped || 0, color: '#409eff', days: SimplifiedStatus.SHIPPED },
      { label: '在途', count: dist.in_transit || 0, color: '#e6a23c', days: SimplifiedStatus.IN_TRANSIT },
      { label: '已到中转港', count: dist.arrived_at_transit || 0, color: '#909399', days: 'arrived_at_transit' },
      { label: '已到目的港', count: dist.at_port || 0, color: '#67c23a', days: SimplifiedStatus.AT_PORT },
      { label: '已提柜', count: dist.picked_up || 0, color: '#f39c12', days: SimplifiedStatus.PICKED_UP },
      { label: '已卸柜', count: dist.unloaded || 0, color: '#3498db', days: SimplifiedStatus.UNLOADED },
      { label: '已还箱', count: dist.returned_empty || 0, color: '#95a5a6', days: SimplifiedStatus.RETURNED_EMPTY }
    ]

    // 计算总数时排除 arrived_at_transit，因为它只是对已有状态的一个子集统计
    const { arrived_at_transit, ...statusOnly } = dist
    const count = Object.values(statusOnly).reduce((sum, val) => sum + (val || 0), 0)

    return {
      count,
      urgent: 0,
      expired: 0,
      filterItems
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
