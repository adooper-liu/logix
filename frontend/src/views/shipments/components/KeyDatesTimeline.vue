<script setup lang="ts">
import { QuestionFilled } from '@element-plus/icons-vue'
import { computed } from 'vue'
import { useRouter } from 'vue-router'

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

  return events.sort((a, b) => a.date.getTime() - b.date.getTime())
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

/**
 * 获取日期颜色
 * 1. 未来日期：倒计时
 *    - 今天到期：橙色
 *    - 剩余1-3天：橙色
 *    - 剩余>3天：绿色
 * 2. 过去日期：
 *    - 关键节点超期：红色
 *    - 关键节点未超期或普通节点：蓝色
 */
const getDateAlertColor = (date: Date, label?: string): 'red' | 'orange' | 'green' | 'blue' => {
  const now = new Date()

  // 未来日期：倒计时
  if (date > now) {
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

const getDotColor = (event: TimelineEvent): 'red' | 'orange' | 'green' | 'blue' => {
  if (event.label === '当前') return 'green'
  return getDateAlertColor(event.date, event.label)
}

/** 关键日期标准耗时配置（小时）- 用于判断是否超期
 * TODO: 后续可从后端配置或字典表读取
 */
const STANDARD_DURATIONS: Record<string, number> = {
  最晚提柜: 24 * 7, // 最晚提柜：标准7天
  最晚还箱: 24 * 7, // 最晚还箱：标准7天
}

/**
 * 获取日期状态文字
 * 1. 未来日期：显示"倒计时"
 * 2. 过去日期：
 *    - 普通节点：显示"历时"
 *    - 关键节点（最晚提柜/最晚还箱）：判断是否超期
 *      - 未超期：显示"历时"
 *      - 已超期：显示"超期"
 */
const getDateStatusText = (date: Date, label?: string): string => {
  const now = new Date()

  // 1. 未来日期：显示倒计时
  if (date > now) {
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return '今天到期'
    if (diffDays === 1) return '倒计时1天'
    return `倒计时${diffDays}天`
  }

  // 2. 过去日期
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '今天到期'

  // 2.1 关键节点（最晚提柜/最晚还箱）：判断是否超期
  if (label && (label === '最晚提柜' || label === '最晚还箱')) {
    const standardHours = STANDARD_DURATIONS[label] ?? 0
    if (standardHours > 0) {
      const standardDays = standardHours / 24
      // 如果已超过标准时间，显示"超期"
      if (diffDays > standardDays) {
        const overdueDays = diffDays - standardDays
        if (overdueDays === 1) return '超期1天'
        return `超期${overdueDays}天`
      }
    }
  }

  // 2.2 普通节点或未超期：显示"历时"
  if (diffDays === 1) return '历时1天'
  return `历时${diffDays}天`
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
 * 获取状态图标
 * @param date 日期
 * @param label 标签
 */
const getStatusIcon = (date: Date, label?: string): string => {
  const now = new Date()
  const alertColor = getDateAlertColor(date, label)

  // 超期状态：红色警告图标
  if (alertColor === 'red') return '⚠️'

  // 即将到期：橙色时钟图标
  if (alertColor === 'orange') return '⏰'

  // 安全/当前：绿色对勾图标
  if (alertColor === 'green') return '✅'

  // 历时：蓝色时钟图标
  return '⏱️'
}
</script>

<template>
  <el-card class="key-dates-card" v-if="timelineEvents.length > 0">
    <template #header>
      <div class="card-header">
        <span class="title">关键日期</span>
        <router-link
          :to="{
            path: '/docs/help/时间概念说明-历时倒计时超期.md',
            query: { from: router.currentRoute.value.fullPath }
          }"
          class="help-link"
        >
          <el-icon><QuestionFilled /></el-icon>
          <span class="help-text">历时/倒计时/超期说明</span>
        </router-link>
      </div>
    </template>

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
          <div class="timeline-dot" :class="getDotColor(event)" />
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
          <div
            v-if="event.type !== 'info'"
            class="item-status"
            :class="getDateAlertColor(event.date)"
          >
            <span class="status-icon">{{ getStatusIcon(event.date, event.label) }}</span>
            <span class="status-text">{{ getDateStatusText(event.date, event.label) }}</span>
          </div>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.key-dates-card {
  border-radius: $radius-large;
  border: 1px solid $border-lighter;
  box-shadow: $shadow-light;

  :deep(.el-card__header) {
    padding: $spacing-md $spacing-lg;
    border-bottom: 1px solid $border-lighter;
    background: $bg-page;
  }

  :deep(.el-card__body) {
    padding: $spacing-lg;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      font-size: $font-size-base;
      font-weight: 700;
      color: $text-primary;
      letter-spacing: 0.02em;
      position: relative;
      padding-left: 12px;

      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 4px;
        height: 16px;
        background: linear-gradient(180deg, $primary-color, darken($primary-color, 10%));
        border-radius: 2px;
      }
    }
  }

  .help-link {
    display: flex;
    align-items: center;
    gap: 6px;
    color: $primary-color;
    text-decoration: none;
    font-size: $font-size-sm;
    padding: 6px 12px;
    border-radius: $radius-base;
    background: rgba($primary-color, 0.08);
    transition: all $transition-base;
    font-weight: 500;

    &:hover {
      background: rgba($primary-color, 0.15);
      transform: translateY(-1px);
      box-shadow: 0 2px 8px rgba($primary-color, 0.2);
    }

    .help-text {
      font-size: 12px;
    }
  }

  .timeline-horizontal {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 12px;
    overflow-x: auto;
    padding: $spacing-sm 0;
  }

  .timeline-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 0 0 auto;
    min-width: 100px;
    max-width: 140px;

    &.is-expired .item-date,
    &.is-expired .item-status {
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
    margin-bottom: $spacing-sm;
    position: relative;
  }

  .timeline-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
    z-index: 1;
    transition: all $transition-base;

    &.red {
      background: $danger-color;
      box-shadow: 0 0 0 4px rgba($danger-color, 0.25);
      animation: pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    &.orange {
      background: $warning-color;
      box-shadow: 0 0 0 4px rgba($warning-color, 0.25);
    }

    &.green {
      background: $success-color;
      box-shadow: 0 0 0 4px rgba($success-color, 0.25);
    }

    &.blue {
      background: $info-color;
      box-shadow: 0 0 0 4px rgba($info-color, 0.25);
    }
  }

  .timeline-item.is-today .timeline-dot {
    background: $primary-color;
    box-shadow: 0 0 0 4px rgba($primary-color, 0.3);
    width: 14px;
    height: 14px;
  }

  @keyframes pulse-dot {
    0%,
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 4px rgba($danger-color, 0.25);
    }
    50% {
      transform: scale(1.1);
      box-shadow: 0 0 0 6px rgba($danger-color, 0.15);
    }
  }

  .timeline-connector {
    flex: 1;
    height: 2px;
    background: linear-gradient(90deg, $border-light, $border-lighter);
    min-width: 8px;
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
    gap: $spacing-xs;
    margin-bottom: 8px;
  }

  .item-label-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .item-icon {
    font-size: 14px;
    line-height: 1;
    filter: grayscale(0.3);
  }

  .item-label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
    letter-spacing: 0.02em;
  }

  .item-tags {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    flex-wrap: wrap;
  }

  .item-tag {
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 10px;
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
        font-size: 9px;
      }
    }

    &.item-tag-db {
      background: linear-gradient(135deg, rgba($info-color, 0.15), rgba($info-color, 0.08));
      color: darken($info-color, 10%);
      border: 1px solid rgba($info-color, 0.2);

      &::before {
        content: '📝';
        font-size: 9px;
      }
    }
  }

  .item-date-wrapper {
    padding: 6px 10px;
    margin-bottom: 6px;
    transition: all $transition-base;

    &:hover {
      background: rgba($primary-color, 0.05);
      border-radius: $radius-base;
    }
  }

  .item-date {
    font-size: $font-size-base;
    font-weight: 700;
    color: $text-primary;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  .item-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-size: $font-size-xs;
    padding: 4px 10px;
    border-radius: 12px;
    font-weight: 500;
    transition: all $transition-base;

    .status-icon {
      font-size: 11px;
      line-height: 1;
    }

    .status-text {
      font-weight: 600;
    }

    &.red {
      background: linear-gradient(135deg, rgba($danger-color, 0.12), rgba($danger-color, 0.06));
      color: darken($danger-color, 5%);
      border: 1px solid rgba($danger-color, 0.2);
      animation: pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    &.orange {
      background: linear-gradient(135deg, rgba($warning-color, 0.12), rgba($warning-color, 0.06));
      color: darken($warning-color, 5%);
      border: 1px solid rgba($warning-color, 0.2);
    }

    &.green {
      background: linear-gradient(135deg, rgba($success-color, 0.12), rgba($success-color, 0.06));
      color: darken($success-color, 5%);
      border: 1px solid rgba($success-color, 0.2);
    }

    &.blue {
      background: linear-gradient(135deg, rgba($info-color, 0.12), rgba($info-color, 0.06));
      color: darken($info-color, 5%);
      border: 1px solid rgba($info-color, 0.2);
    }
  }

  @keyframes pulse-red {
    0%,
    100% {
      opacity: 1;
      box-shadow: 0 0 0 0 rgba($danger-color, 0.4);
    }
    50% {
      opacity: 0.85;
      box-shadow: 0 0 0 4px rgba($danger-color, 0);
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
}
</style>
