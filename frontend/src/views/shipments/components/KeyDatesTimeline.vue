<script setup lang="ts">
import { computed } from 'vue'

/** 滞港费计算返回的日期（优先使用） */
interface CalculationDates {
  shipmentDate?: string | null
  ataDestPort?: string | null
  etaDestPort?: string | null
  dischargeDate?: string | null
  lastPickupDate?: string | null
  lastPickupDateComputed?: string | null
  pickupDateActual?: string | null
  lastReturnDate?: string | null
  lastReturnDateComputed?: string | null
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

  const shipmentDate =
    c.allOrders?.[0]?.actualShipDate ?? seaFreight?.shipmentDate ?? null
  const discharge =
    portOp?.destPortUnloadDate || portOp?.dischargedTime || portOp?.discharged_time
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
    opts?: { isComputed?: boolean; isFromDb?: boolean }
  ) => {
    const date = toDate(val)
    if (date) events.push({ label, fullLabel, date, icon, type, isComputed: opts?.isComputed, isFromDb: opts?.isFromDb })
  }

  add('出运', '出运日期', d.shipmentDate, '🚢', 'primary')
  add('ETA', '目的港 ETA', d.etaDestPort, '📅', 'primary')
  add('ATA', '目的港 ATA', d.ataDestPort, '📍', 'primary')
  add('卸船', '卸船日', d.dischargeDate, '🚢', 'info')
  add('最晚提柜', '最晚提柜日', d.lastPickupDateComputed ?? d.lastPickupDate, '⏰', 'danger', {
    isComputed: !!d.lastPickupDateComputed,
    isFromDb: !!d.lastPickupDate && !d.lastPickupDateComputed
  })
  add('实际提柜', '实际提柜日', d.pickupDateActual, '📦', 'success')
  add('最晚还箱', '最晚还箱日', d.lastReturnDateComputed ?? d.lastReturnDate, '📦', 'danger', {
    isComputed: !!d.lastReturnDateComputed,
    isFromDb: !!d.lastReturnDate && !d.lastReturnDateComputed
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

const getDateAlertColor = (date: Date): 'red' | 'orange' | 'green' => {
  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return 'red'
  if (diffDays <= 3) return 'orange'
  return 'green'
}

const getDotColor = (event: TimelineEvent): 'red' | 'orange' | 'green' => {
  if (event.label === '当前') return 'green'
  return getDateAlertColor(event.date)
}

const getDateStatusText = (date: Date): string => {
  const now = new Date()
  if (now > date) {
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return '今天到期'
    if (diffDays === 1) return '已历时1天'
    return `已历时${diffDays}天`
  } else {
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return '今天到期'
    if (diffDays === 1) return '剩余1天'
    return `剩余${diffDays}天`
  }
}
</script>

<template>
  <el-card class="key-dates-card" v-if="timelineEvents.length > 0">
    <template #header>
      <div class="card-header">
        <span class="title">关键日期</span>
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
            <span class="item-label">{{ event.label }}</span>
            <span v-if="event.isComputed" class="item-tag item-tag-computed">计算</span>
            <span v-else-if="event.isFromDb" class="item-tag item-tag-db">录入</span>
          </div>
          <div class="item-date">{{ formatDate(event.date) }}</div>
          <div
            v-if="event.type !== 'info'"
            class="item-status"
            :class="getDateAlertColor(event.date)"
          >
            {{ getDateStatusText(event.date) }}
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

  .card-header .title {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
  }

  .timeline-horizontal {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    gap: 0;
    overflow-x: auto;
    padding: $spacing-sm 0;
  }

  .timeline-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
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
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
    z-index: 1;

    &.red {
      background: $danger-color;
      box-shadow: 0 0 0 3px rgba($danger-color, 0.2);
    }

    &.orange {
      background: $warning-color;
      box-shadow: 0 0 0 3px rgba($warning-color, 0.2);
    }

    &.green {
      background: $success-color;
      box-shadow: 0 0 0 3px rgba($success-color, 0.2);
    }
  }

  .timeline-item.is-today .timeline-dot {
    background: $primary-color;
    box-shadow: 0 0 0 3px rgba($primary-color, 0.25);
  }

  .timeline-connector {
    flex: 1;
    height: 2px;
    background: $border-light;
    min-width: 8px;
  }

  .timeline-body {
    text-align: center;
    width: 100%;
  }

  .item-header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: $spacing-xs;
    margin-bottom: 2px;
    flex-wrap: wrap;
  }

  .item-label {
    font-size: $font-size-sm;
    font-weight: 600;
    color: $text-primary;
  }

  .item-tag {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: $radius-small;
    font-weight: 500;

    &.item-tag-computed {
      background: rgba($warning-color, 0.12);
      color: darken($warning-color, 8%);
    }

    &.item-tag-db {
      background: rgba($info-color, 0.12);
      color: darken($info-color, 8%);
    }
  }

  .item-date {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
    font-variant-numeric: tabular-nums;
    letter-spacing: 0.02em;
  }

  .item-status {
    font-size: $font-size-xs;
    margin-top: 2px;

    &.red {
      color: $danger-color;
      font-weight: 500;
    }

    &.orange {
      color: $warning-color;
      font-weight: 500;
    }

    &.green {
      color: $success-color;
    }
  }
}
</style>
