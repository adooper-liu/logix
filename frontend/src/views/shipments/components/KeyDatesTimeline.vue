<script setup lang="ts">
import { QuestionFilled } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import DurationDisplay from '@/components/common/DurationDisplay.vue'

const router = useRouter()

/** 滞港费计算返回的日期（优先使用） */
interface CalculationDates {
  shipmentDate?: string | null
  ataDestPort?: string | null
  etaDestPort?: string | null
  revisedEtaDestPort?: string | null
  dischargeDate?: string | null
  lastPickupDate?: string | null
  lastPickupDateComputed?: string | null
  lastPickupDateMode?: 'actual' | 'forecast' | null
  pickupDateActual?: string | null
  lastReturnDate?: string | null
  lastReturnDateComputed?: string | null
  lastReturnDateMode?: 'actual' | 'forecast' | null
  returnTime?: string | null
  today?: string | null
}

interface TimelineEvent {
  label: string
  fullLabel: string
  date: Date
  icon: string
  type: 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /** 是否计算得出（最晚提柜/最晚还箱） */
  isComputed?: boolean
  /** 是否来自录入（非计算），用于显示来源 */
  isFromDb?: boolean
  /** 计算模式标注（用于最晚提柜/最晚还箱） */
  calculationMode?: 'actual' | 'forecast' | null
  /** 计算来源标注（用于最晚提柜/最晚还箱） */
  calculationSource?: string | null
}

const props = defineProps<{
  containerData: any
  /** 滞港费计算日期（优先于 containerData 派生） */
  calculationDates?: CalculationDates | null
}>()

// 从 containerData 派生日期
const derivedDates = computed(() => {
  const c = props.containerData
  if (!c) return null

  const portOp = c.portOperations?.find((po: any) => po.portType === 'destination')
  const seaFreight = Array.isArray(c.seaFreight) ? c.seaFreight[0] : c.seaFreight
  const trucking = c.truckingTransports?.[0]
  const emptyReturn = Array.isArray(c.emptyReturns) ? c.emptyReturns[0] : c.emptyReturn

  const shipmentDate = c.allOrders?.[0]?.actualShipDate ?? seaFreight?.shipmentDate ?? null
  const discharge = portOp?.destPortUnloadDate || portOp?.dischargedTime || portOp?.discharged_time
  const lastPickup = portOp?.lastFreeDate || trucking?.lastPickupDate
  const pickupActual = trucking?.pickupDate || trucking?.pickup_date
  const lastReturn = emptyReturn?.lastReturnDate
  const returnTime = emptyReturn?.returnTime || emptyReturn?.return_time

  return {
    shipmentDate: shipmentDate ?? null,
    ataDestPort: portOp?.ataDestPort ?? c.ataDestPort ?? null,
    etaDestPort: portOp?.etaDestPort ?? seaFreight?.eta ?? c.etaDestPort ?? null,
    dischargeDate: discharge ?? null,
    lastPickupDate: lastPickup ?? null,
    lastPickupDateComputed: null,
    pickupDateActual: pickupActual ?? null,
    lastReturnDate: lastReturn ?? null,
    lastReturnDateComputed: null,
    returnTime: returnTime ?? null,
    today: new Date().toISOString().slice(0, 10),
  }
})

// 使用 calculationDates 或派生；出运日期始终从 containerData 取（滞港费接口可能不返回）
const dates = computed(() => {
  const base = props.calculationDates ? { ...props.calculationDates } : derivedDates.value
  if (!base) return null
  const shipmentDate = base.shipmentDate ?? derivedDates.value?.shipmentDate ?? null
  return { ...base, shipmentDate }
})

// 构建时间线事件（按日期排序，仅包含有值的）
const timelineEvents = computed((): TimelineEvent[] => {
  const d = dates.value
  if (!d) return []

  const toDate = (v: string | Date | null | undefined): Date | null => {
    if (!v) return null
    const date = typeof v === 'string' ? new Date(v) : v
    return isNaN(date.getTime()) ? null : date
  }

  const events: TimelineEvent[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const add = (
    label: string,
    fullLabel: string,
    val: string | Date | null | undefined,
    icon: string,
    type: TimelineEvent['type'],
    opts?: {
      isComputed?: boolean
      isFromDb?: boolean
      calculationMode?: 'actual' | 'forecast' | null
      calculationSource?: string | null
    }
  ) => {
    const date = toDate(val)
    if (date)
      events.push({
        label,
        fullLabel,
        date,
        icon,
        type,
        isComputed: opts?.isComputed,
        isFromDb: opts?.isFromDb,
        calculationMode: opts?.calculationMode,
        calculationSource: opts?.calculationSource,
      })
  }

  add('出运', '出运日期', d.shipmentDate, '🚢', 'primary')
  add('ETA', '目的港 ETA', d.etaDestPort, '📅', 'primary')
  add('修正ETA', '修正 ETA', d.revisedEtaDestPort, '📝', 'primary')
  add('ATA', '目的港 ATA', d.ataDestPort, '📍', 'primary')
  add('卸船', '卸船日', d.dischargeDate, '🚢', 'info')

  // 最晚提柜日 - 添加计算来源标注
  const lastPickupDate = d.lastPickupDateComputed ?? d.lastPickupDate
  const isLastPickupComputed = !!d.lastPickupDateComputed
  const isLastPickupFromDb = !!d.lastPickupDate && !d.lastPickupDateComputed
  add('最晚提柜', '最晚提柜日', lastPickupDate, '⏰', 'danger', {
    isComputed: isLastPickupComputed,
    isFromDb: isLastPickupFromDb,
    calculationMode: isLastPickupComputed ? d.lastPickupDateMode : null,
    calculationSource: isLastPickupComputed
      ? getCalculationSourceText(
          d.lastPickupDateMode,
          d.ataDestPort,
          d.etaDestPort,
          d.revisedEtaDestPort,
          d.dischargeDate
        )
      : null,
  })

  add('实际提柜', '实际提柜日', d.pickupDateActual, '📦', 'success')

  // 最晚还箱日 - 添加计算来源标注
  const lastReturnDate = d.lastReturnDateComputed ?? d.lastReturnDate
  const isLastReturnComputed = !!d.lastReturnDateComputed
  const isLastReturnFromDb = !!d.lastReturnDate && !d.lastReturnDateComputed
  add('最晚还箱', '最晚还箱日', lastReturnDate, '📦', 'danger', {
    isComputed: isLastReturnComputed,
    isFromDb: isLastReturnFromDb,
    calculationMode: isLastReturnComputed ? d.lastReturnDateMode : null,
    calculationSource: isLastReturnComputed
      ? getCalculationSourceTextForReturn(d.pickupDateActual)
      : null,
  })

  add('实际还箱', '实际还箱日', d.returnTime, '✅', 'success')
  events.push({
    label: '当前',
    fullLabel: '当前日期',
    date: today,
    icon: '📆',
    type: 'info',
  })

  // 先按日期排序所有事件
  const sortedEvents = events.sort((a, b) => a.date.getTime() - b.date.getTime())
  
  // 确保"当前"节点在最后
  const currentEvent = sortedEvents.find(event => event.label === '当前')
  if (currentEvent) {
    // 移除"当前"节点
    const eventsWithoutCurrent = sortedEvents.filter(event => event.label !== '当前')
    // 将"当前"节点添加到最后
    eventsWithoutCurrent.push(currentEvent)
    return eventsWithoutCurrent
  }
  
  return sortedEvents
})

const formatDate = (d: string | Date | null | undefined): string => {
  if (!d) return '-'
  const date = typeof d === 'string' ? new Date(d) : d
  if (isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 定义时间线节点顺序（用于判断后一节点）
const TIMELINE_NODE_ORDER = [
  '出运',
  'ETA',
  '修正ETA',
  'ATA',
  '卸船',
  '最晚提柜',
  '实际提柜',
  '最晚还箱',
  '实际还箱',
] as const

/**
 * 根据时间线节点顺序和后一节点是否存在，判断颜色类型
 * 
 * 规则：
 * 1. 历时：当前节点和后一节点都存在 → 蓝色
 * 2. 倒计时：后一节点不存在 + 当前节点在未来 → 橙色/绿色
 * 3. 超期：后一节点不存在 + 当前节点在过去 + 已过天数超过标准 → 红色
 * 4. 历时（普通）：后一节点不存在 + 当前节点在过去 + 未超过标准 → 蓝色
 */
const getDateAlertColor = (
  date: Date,
  label?: string,
  hasNextNode = false
): 'red' | 'orange' | 'green' | 'blue' => {
  const now = new Date()

  // 有后一节点：显示历时（蓝色）
  if (hasNextNode) {
    return 'blue'
  }

  // 无后一节点：判断倒计时/超期
  if (date > now) {
    // 未来日期：倒计时
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 3) return 'orange'
    return 'green'
  }

  // 过去日期
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  // 关键节点（最晚提柜/最晚还箱）：判断是否超期
  if (label && (label === '最晚提柜' || label === '最晚还箱')) {
    const standardHours = STANDARD_DURATIONS[label] ?? 0
    if (standardHours > 0) {
      const standardDays = standardHours / 24
      // 已超期：红色
      if (diffDays > standardDays) return 'red'
    }
  }

  // 未超期或普通节点：蓝色（历时）
  return 'blue'
}

/**
 * 判断是否有「有效」后一节点（用于历时/倒计时/超期显示）
 * 
 * ✅ 业务规则：时间线节点分为两类
 * 
 * 1. 实际业务节点：出运、ATA、卸船、实际提柜、实际还箱
 *    - 总是显示历时（蓝色）
 *    - hasNextNode = true
 * 
 * 2. 计划与预警节点：ETA、修正 ETA、最晚提柜、最晚还箱
 *    - 如果后续实际节点已发生 → 显示历时（实际 - 计划 的天数差）
 *    - 如果后续实际节点未发生 → 显示倒计时/超期
 * 
 * 判断规则：
 * - 实际业务节点：总是 hasNextNode = true
 * - 最晚提柜：检查实际提柜是否已发生
 * - 最晚还箱：检查实际还箱是否已发生
 * - ETA/修正 ETA：检查所有后续实际业务节点是否有已发生的
 */
const getEffectiveHasNextNode = (
  event: TimelineEvent,
  index: number,
  allEvents: TimelineEvent[]
): boolean => {
  // ✅ 实际业务节点：总是显示历时
  const actualEventLabels = ['出运', 'ATA', '卸船', '实际提柜', '实际还箱']
  if (actualEventLabels.includes(event.label)) {
    return true
  }
  
  // ✅ 计划与预警节点：检查后续实际节点是否已发生
  
  // 1. 最晚提柜：检查实际提柜是否已发生
  if (event.label === '最晚提柜') {
    const pickupDate = dates.value?.pickupDateActual
    if (!pickupDate) return false
    // 检查实际提柜日期是否已发生（早于当前时间）
    const pickupDateObj = typeof pickupDate === 'string' ? new Date(pickupDate) : pickupDate
    return pickupDateObj < new Date()
  }
  
  // 2. 最晚还箱：检查实际还箱是否已发生
  if (event.label === '最晚还箱') {
    const returnTime = dates.value?.returnTime
    if (!returnTime) return false
    // 检查实际还箱日期是否已发生（早于当前时间）
    const returnTimeObj = typeof returnTime === 'string' ? new Date(returnTime) : returnTime
    return returnTimeObj < new Date()
  }
  
  // 3. ETA/修正 ETA：检查所有后续实际业务节点是否有已发生的
  if (event.label === 'ETA' || event.label === '修正 ETA') {
    for (let i = index + 1; i < allEvents.length; i++) {
      const nextEvent = allEvents[i]
      // 只检查实际业务节点
      if (actualEventLabels.includes(nextEvent.label)) {
        // 如果该节点日期已发生（早于当前时间）
        if (nextEvent.date < new Date()) {
          return true
        }
      }
    }
    return false
  }
  
  return false
}

const getDotColor = (
  event: TimelineEvent,
  index: number,
  allEvents: TimelineEvent[]
): 'red' | 'orange' | 'green' | 'blue' => {
  if (event.label === '当前') return 'green'

  const hasNextNode = getEffectiveHasNextNode(event, index, allEvents)
  return getDateAlertColor(event.date, event.label, hasNextNode)
}

/** 关键日期标准耗时配置（小时）- 用于判断是否超期
 * TODO: 后续可从后端配置或字典表读取
 */
const STANDARD_DURATIONS: Record<string, number> = {
  最晚提柜: 24 * 7, // 最晚提柜：标准7天
  最晚还箱: 24 * 7, // 最晚还箱：标准7天
}

/** 超期文案中「下一节点」展示名（与 TIMELINE_NODE_ORDER 业务顺序一致） */
const NEXT_MILESTONE_HINT: Record<string, string> = {
  出运: 'ETA',
  ETA: 'ATA',
  修正ETA: 'ATA',
  ATA: '卸船',
  卸船: '实际提柜',
  最晚提柜: '实际提柜',
  实际提柜: '还空箱',
  最晚还箱: '实际还箱',
}

function getNextMilestoneLabel(label: string): string | null {
  return NEXT_MILESTONE_HINT[label] ?? null
}

/**
 * 获取最晚提柜日的计算来源文字
 * @param mode 计算模式（actual/forecast）
 * @param ataDestPort 实际到港日期
 * @param etaDestPort 原始ETA
 * @param revisedEtaDestPort 修正ETA
 * @param dischargeDate 卸船日期
 */
const getCalculationSourceText = (
  mode: 'actual' | 'forecast' | null,
  ataDestPort?: string | null,
  etaDestPort?: string | null,
  revisedEtaDestPort?: string | null,
  dischargeDate?: string | null
): string | null => {
  if (!mode) return null

  if (mode === 'actual') {
    // 实际模式：基于实际到港日或实际卸船日
    if (ataDestPort) {
      return '按实际ATA计算'
    } else if (dischargeDate) {
      return '按实际卸船日计算'
    }
    return '按实际数据计算'
  } else {
    // 预测模式：基于ETA
    if (ataDestPort) {
      return '按实际ATA计算' // 如果有ATA，优先用ATA
    } else if (dischargeDate) {
      return '按实际卸船日计算' // 如果有实际卸船日，用实际卸船日
    } else if (revisedEtaDestPort) {
      return '按修正ETA计算'
    } else if (etaDestPort) {
      return '按ETA计算'
    }
    return '按ETA计算'
  }
}

/**
 * 获取最晚还箱日的计算来源文字
 * @param pickupDateActual 实际提柜日期
 */
const getCalculationSourceTextForReturn = (pickupDateActual?: string | null): string | null => {
  if (!pickupDateActual) return null
  return '按实际提柜日计算'
}

/**
 * 获取第一个非当前节点的后续业务节点日期
 * @param event 当前事件
 * @param index 当前事件索引
 * @param allEvents 所有事件
 */
const getNextBusinessNodeDate = (
  event: TimelineEvent,
  index: number,
  allEvents: TimelineEvent[]
): Date | null => {
  // 检查所有后续节点
  for (let i = index + 1; i < allEvents.length; i++) {
    const nextEvent = allEvents[i]
    // 排除当前日期节点，只考虑实际的业务节点
    if (nextEvent.label !== '当前') {
      return nextEvent.date
    }
  }
  return null
}
</script>

<template>
  <el-card class="key-dates-card" shadow="never" v-if="timelineEvents.length > 0">
    <div class="key-dates-help">
      <router-link
        :to="{
          path: '/docs/help/时间概念说明-历时倒计时超期.md',
          query: { from: router.currentRoute.value.fullPath }
        }"
        class="help-link"
        title="历时/倒计时/超期说明"
      >
        <el-icon><QuestionFilled /></el-icon>
      </router-link>
    </div>

    <div class="timeline-horizontal">
      <div
        v-for="(event, index) in timelineEvents"
        :key="index"
        class="timeline-item"
        :class="{
          'is-expired': new Date() > event.date,
          'is-today': event.label === '当前',
        }"
      >
        <div class="timeline-track">
          <div class="timeline-dot" :class="getDotColor(event, index, timelineEvents)" />
          <div class="timeline-connector" v-if="index < timelineEvents.length - 1" />
        </div>
        <div class="timeline-body">
          <div class="item-header">
            <div class="item-label-row">
              <span class="item-icon">{{ event.icon }}</span>
              <span class="item-label">{{ event.label }}</span>
            </div>
            <div class="item-tags">
              <span
                v-if="event.isComputed && event.calculationSource"
                class="item-tag item-tag-computed"
              >
                {{ event.calculationSource }}
              </span>
              <span v-else-if="event.isComputed" class="item-tag item-tag-computed">计算</span>
              <span v-else-if="event.isFromDb" class="item-tag item-tag-db">录入</span>
            </div>
          </div>
          <div class="item-date-wrapper">
            <span class="item-date">{{ formatDate(event.date) }}</span>
          </div>
          <!-- 使用 DurationDisplay 组件显示时间状态 -->
          <div v-if="event.type !== 'info'" class="item-status">
            <DurationDisplay
              :date="event.date"
              :label="event.label"
              :is-key-node="event.label === '最晚提柜' || event.label === '最晚还箱'"
              :standard-hours="STANDARD_DURATIONS[event.label] ?? 0"
              :is-current-node="index === timelineEvents.length - 1"
              :prev-date="index > 0 ? timelineEvents[index - 1].date : null"
              :next-date="getNextBusinessNodeDate(event, index, timelineEvents)"
              :has-next-node="getEffectiveHasNextNode(event, index, timelineEvents)"
              :next-milestone-label="getNextMilestoneLabel(event.label)"
              mode="auto"
            />
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.key-dates-card {
  border-radius: 0;
  border: none;
  box-shadow: none;
  margin-bottom: 0;

  :deep(.el-card__body) {
    padding: 0;
    position: relative;
  }

  .key-dates-help {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;
  }

  .help-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 4px;
    color: $text-secondary;
    text-decoration: none;
    border-radius: $radius-base;
    transition: color $transition-base, background $transition-base;

    &:hover {
      color: $primary-color;
      background: rgba($primary-color, 0.08);
    }
  }

  .timeline-horizontal {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    justify-content: center;
    gap: 8px;
    overflow-x: auto;
    width: 100%;
    box-sizing: border-box;
    padding: 4px 32px 8px 32px;
  }

  .timeline-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 0 0 auto;
    min-width: 90px;
    max-width: 120px;

    /* 仅淡化日期；历时/倒计时/超期由 DurationDisplay 自控色，勿对 .item-status 设 color，否则会盖住标签色 */
    &.is-expired .item-date {
      color: $text-secondary;
    }

    &.is-today .item-date {
      font-weight: 700;
      color: $primary-color;
    }
  }

  .timeline-track {
    display: flex;
    align-items: center;
    width: 100%;
    margin-bottom: 8px;
    position: relative;
  }

  .timeline-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    z-index: 1;
    transition: all $transition-base;

    &.red {
      background: $danger-color;
      box-shadow: 0 0 0 3px rgba($danger-color, 0.25);
      animation: pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    &.orange {
      background: $warning-color;
      box-shadow: 0 0 0 3px rgba($warning-color, 0.25);
    }

    &.green {
      background: $success-color;
      box-shadow: 0 0 0 3px rgba($success-color, 0.25);
    }

    &.blue {
      background: $info-color;
      box-shadow: 0 0 0 3px rgba($info-color, 0.25);
    }
  }

  .timeline-item.is-today .timeline-dot {
    background: $primary-color;
    box-shadow: 0 0 0 3px rgba($primary-color, 0.3);
    width: 12px;
    height: 12px;
  }

  @keyframes pulse-dot {
    0%,
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 3px rgba($danger-color, 0.25);
    }
    50% {
      transform: scale(1.1);
      box-shadow: 0 0 0 5px rgba($danger-color, 0.15);
    }
  }

  .timeline-connector {
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, $border-light, $border-lighter);
    min-width: 6px;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba($primary-color, 0.1), transparent);
      transform: translateY(-50%);
      opacity: 0.5;
    }
  }

  .timeline-body {
    text-align: center;
    width: 100%;
  }

  .item-header {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    margin-bottom: 6px;
  }

  .item-label-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
  }

  .item-icon {
    font-size: 12px;
    line-height: 1;
    filter: grayscale(0.3);
  }

  .item-label {
    font-size: 11px;
    font-weight: 600;
    color: $text-primary;
    letter-spacing: 0.02em;
  }

  .item-tags {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    flex-wrap: wrap;
  }

  .item-tag {
    font-size: 9px;
    padding: 1px 6px;
    border-radius: 8px;
    font-weight: 500;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 2px;

    &.item-tag-computed {
      background: linear-gradient(135deg, rgba($warning-color, 0.15), rgba($warning-color, 0.08));
      color: darken($warning-color, 10%);
      border: 1px solid rgba($warning-color, 0.2);

      &::before {
        content: '📊';
        font-size: 8px;
      }
    }

    &.item-tag-db {
      background: linear-gradient(135deg, rgba($info-color, 0.15), rgba($info-color, 0.08));
      color: darken($info-color, 10%);
      border: 1px solid rgba($info-color, 0.2);

      &::before {
        content: '📝';
        font-size: 8px;
      }
    }
  }

  .item-date-wrapper {
    text-align: center;
    padding: 4px 8px;
    margin-bottom: 4px;
    transition: all $transition-base;

    &:hover {
      background: rgba($primary-color, 0.05);
      border-radius: $radius-base;
    }
  }

  .item-date {
    font-size: $font-size-sm;
    font-weight: 700;
    color: $text-primary;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  .item-status {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
    font-size: 10px;
    padding: 0;
    font-weight: 500;
    color: inherit;
    transition: all $transition-base;

    :deep(.duration-tag) {
      max-width: 100%;
    }
  }
}

</style>
