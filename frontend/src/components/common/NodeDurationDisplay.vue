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
  /** 当前节点的全局索引 */
  index?: number
  /** 节点总数（用于判断是否为最后一个节点） */
  totalCount?: number
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

// 判断是否为当前节点或最后一个节点
const isCurrentOrLastNode = computed(() => {
  return props.isInProgress !== undefined
    ? props.isInProgress
    : props.index === (props.totalCount || 0) - 1
})

// 计算历时（从上一节点到当前节点）
const elapsedInfo = computed(() => {
  if (!props.showElapsed) return null

  const current = toTimestamp(props.timestamp)
  const prev = toTimestamp(props.prevTimestamp)

  if (!current || !prev || props.index === 0) return null

  const diffMs = current - prev
  if (diffMs < 0) return null // 时间顺序异常

  const hours = Math.floor(diffMs / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  if (days === 0 && remainingHours === 0) return null // 小于1小时不显示

  return {
    days,
    hours: remainingHours,
    text: days === 0
      ? `${remainingHours}小时`
      : remainingHours === 0
        ? `${days}天`
        : `${days}天${remainingHours}小时`
  }
})

// 计算超期（当前节点已停留时间 - 标准耗时）
const overdueInfo = computed(() => {
  if (!props.showOverdue) return null
  if (!isCurrentOrLastNode.value) return null
  if (!props.standardHours || props.standardHours <= 0) return null

  const current = toTimestamp(props.timestamp)
  if (!current) return null

  const now = Date.now()
  const elapsedMs = now - current
  const elapsedHours = elapsedMs / (1000 * 60 * 60)

  // 未达到标准时间，不显示超期
  if (elapsedHours <= props.standardHours) return null

  const overdueHours = elapsedHours - props.standardHours
  const days = Math.floor(overdueHours / 24)
  const hours = Math.round(overdueHours % 24)

  if (days === 0 && hours === 0) return null

  return {
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
    <!-- 历时：所有节点都显示 -->
    <span v-if="elapsedInfo" class="duration-tag duration-tag--elapsed">
      历时 {{ elapsedInfo.text }}
    </span>

    <!-- 超期：仅当前节点或最后一个节点显示 -->
    <span v-if="overdueInfo" class="duration-tag duration-tag--overdue">
      超期 {{ overdueInfo.text }}
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

  // 超期：红色（负面指标，用于干预）
  &--overdue {
    color: $danger-color;
    background: rgba($danger-color, 0.12);
  }
}
</style>
