<script setup lang="ts">
/**
 * 节点时长显示组件（物流路径节点）
 * 显示：历时（所有节点）、超期（当前节点或最后节点）
 */
import { computed } from 'vue'

interface Props {
  /** 当前节点开始时间 */
  timestamp: Date | string | null
  /** 上一节点结束时间（用于计算历时） */
  prevTimestamp?: Date | string | null
  /** 下一节点开始时间（用于判断是否显示倒计时/超期） */
  nextTimestamp?: Date | string | null
  /** 当前节点的全局索引 */
  index?: number
  /** 节点总数（用于判断是否为最后一个节点） */
  totalCount?: number
  /** 路径节点状态码（如 RETURNED_EMPTY），与关键日期「实际还箱」对齐 */
  nodeStatus?: string
  /** 标准耗时（小时） */
  standardHours?: number
  /** 是否为当前正在进行的节点 */
  isInProgress?: boolean
  /** 是否显示历时标签 */
  showElapsed?: boolean
  /** 是否显示超期标签 */
  showOverdue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showElapsed: true,
  showOverdue: true,
})

// 转换为时间戳
const toTimestamp = (date: Date | string | null | undefined): number | null => {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  return isNaN(d.getTime()) ? null : d.getTime()
}

// 判断是否有后一节点
const hasNextNode = computed(() => {
  const next = toTimestamp(props.nextTimestamp)
  return next !== null
})

/** 还空完成节点：与关键日期时间线「实际还箱」一致，历时=本节点−上一节点（非相对今天的超期） */
const isTerminalReturnedEmpty = computed(() => props.nodeStatus === 'RETURNED_EMPTY')

function buildElapsedFromPrev(current: number, prev: number, index: number) {
  if (!current || !prev || index === 0) return null
  const diffMs = current - prev
  if (diffMs < 0) return null
  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  if (days === 0 && remainingHours === 0) return null
  return {
    days,
    hours: remainingHours,
    text: days === 0
      ? `${remainingHours}小时`
      : remainingHours === 0
        ? `${days}天`
        : `${days}天${remainingHours}小时`
  }
}

/** 无下一节点时的还空节点：只显示与上一节点的历时（与 DurationDisplay 实际还箱 行为一致） */
const terminalReturnElapsedInfo = computed(() => {
  if (!props.showElapsed) return null
  if (!isTerminalReturnedEmpty.value) return null
  if (hasNextNode.value) return null
  const current = toTimestamp(props.timestamp)
  const prev = toTimestamp(props.prevTimestamp)
  if (current === null || prev === null) return null
  return buildElapsedFromPrev(current, prev, props.index ?? 0)
})

// 计算历时（从上一节点到当前节点）- 只在有后一节点时显示
const elapsedInfo = computed(() => {
  if (!props.showElapsed) return null
  // 统一标准：只有有后一节点时才显示历时
  if (!hasNextNode.value) return null

  const current = toTimestamp(props.timestamp)
  const prev = toTimestamp(props.prevTimestamp)

  if (current === null || prev === null) return null
  return buildElapsedFromPrev(current, prev, props.index ?? 0)
})

// 计算倒计时/超期 - 只在没有后一节点时显示
const countdownOrOverdueInfo = computed(() => {
  if (!props.showOverdue) return null
  // 统一标准：只有没有后一节点时才显示倒计时/超期
  if (hasNextNode.value) return null

  // 实际还箱（还空）终点：历时由 terminalReturnElapsedInfo 展示，不对「今天」算超期/倒计时
  if (isTerminalReturnedEmpty.value && toTimestamp(props.prevTimestamp)) return null

  const current = toTimestamp(props.timestamp)
  if (!current) return null

  const now = Date.now()
  const diffMs = now - current
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = Math.floor(diffHours / 24)

  // 未来日期：倒计时
  if (diffHours < 0) {
    const remainingHours = Math.abs(diffHours)
    const days = Math.floor(remainingHours / 24)
    const hours = Math.round(remainingHours % 24)

    if (days === 0 && hours === 0) return null

    return {
      type: 'countdown' as const,
      days,
      hours,
      text: days === 0
        ? `${hours}小时`
        : hours === 0
          ? `${days}天`
          : `${days}天${hours}小时`
    }
  }

  // 过去日期：判断是否超期
  if (!props.standardHours || props.standardHours <= 0) return null

  // 已过时间未超过标准，不显示超期
  if (diffHours <= props.standardHours) {
    // 显示为"历时"（蓝色），不是超期
    const hours = Math.floor(diffHours)
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24

    if (days === 0 && remainingHours === 0) return null

    return {
      type: 'elapsed' as const,
      days,
      hours: remainingHours,
      text: days === 0
        ? `${remainingHours}小时`
        : remainingHours === 0
          ? `${days}天`
          : `${days}天${remainingHours}小时`
    }
  }

  // 已超过标准时间，显示超期
  const overdueHours = diffHours - props.standardHours
  const days = Math.floor(overdueHours / 24)
  const hours = Math.round(overdueHours % 24)

  if (days === 0 && hours === 0) return null

  return {
    type: 'overdue' as const,
    days,
    hours,
    text: days === 0
      ? `${hours}小时`
      : hours === 0
        ? `${days}天`
        : `${days}天${hours}小时`
  }
})
</script>

<template>
  <div class="node-duration-display">
    <!-- 还空终点：与关键日期一致，历时=本节点−上一节点 -->
    <span v-if="terminalReturnElapsedInfo" class="duration-tag duration-tag--elapsed">
      历时 {{ terminalReturnElapsedInfo.text }}
    </span>

    <!-- 历时：有后一节点时显示 -->
    <span v-else-if="elapsedInfo" class="duration-tag duration-tag--elapsed">
      历时 {{ elapsedInfo.text }}
    </span>

    <!-- 倒计时：无后一节点 + 未来日期时显示 -->
    <span v-if="countdownOrOverdueInfo?.type === 'countdown'" class="duration-tag duration-tag--countdown">
      倒计时 {{ countdownOrOverdueInfo.text }}
    </span>

    <!-- 超期：无后一节点 + 过去日期 + 已超过标准时显示 -->
    <span v-if="countdownOrOverdueInfo?.type === 'overdue'" class="duration-tag duration-tag--overdue">
      超期 {{ countdownOrOverdueInfo.text }}
    </span>

    <!-- 普通历时（未超过标准）：无后一节点 + 过去日期 + 未超过标准时显示 -->
    <span v-if="countdownOrOverdueInfo?.type === 'elapsed'" class="duration-tag duration-tag--elapsed">
      历时 {{ countdownOrOverdueInfo.text }}
    </span>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.node-duration-display {
  display: inline-flex;
  gap: $spacing-xs;
  align-items: center;
  flex-wrap: wrap;
}

.duration-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: $radius-base;
  font-size: $font-size-xs;
  font-weight: 500;
  white-space: nowrap;

  // 历时：蓝色（中性指标，用于分析）
  &--elapsed {
    color: $info-color;
    background: rgba($info-color, 0.12);
  }

  // 倒计时：绿色（安全）或橙色（即将到期）
  &--countdown {
    color: $success-color;
    background: rgba($success-color, 0.12);
  }

  // 超期：红色（负面指标，用于干预）
  &--overdue {
    color: $danger-color;
    background: rgba($danger-color, 0.12);
    animation: pulse 2s ease-in-out infinite;
  }
}

// 超期脉冲动画
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
</style>
