<script setup lang="ts">
/**
 * 历时/倒计时/超期显示组件
 * 统一时间显示逻辑：倒计时、历时、超期
 */
import { computed } from 'vue'

interface Props {
  /** 目标日期 */
  date: Date | string | null
  /** 节点标签（用于判断是否为关键节点） */
  label?: string
  /** 是否为关键节点（最晚提柜/最晚还箱等） */
  isKeyNode?: boolean
  /** 标准耗时（小时，用于判断是否超期） */
  standardHours?: number
  /** 是否显示图标 */
  showIcon?: boolean
  /** 显示模式：auto（自动判断）、countdown（倒计时）、elapsed（历时）、overdue（超期） */
  mode?: 'auto' | 'countdown' | 'elapsed' | 'overdue'
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: true,
  mode: 'auto',
})

// 转换为Date对象
const dateObj = computed(() => {
  if (!props.date) return null
  const date = typeof props.date === 'string' ? new Date(props.date) : props.date
  return isNaN(date.getTime()) ? null : date
})

// 判断是否为关键节点
const isKeyNode = computed(() => {
  if (props.isKeyNode !== undefined) return props.isKeyNode
  return props.label === '最晚提柜' || props.label === '最晚还箱'
})

// 判断日期相对于当前时间
const dateStatus = computed(() => {
  const date = dateObj.value
  if (!date) return 'none'

  const now = new Date()
  const diffTime = date.getTime() - now.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays > 0) return 'future' // 未来：倒计时
  if (diffDays === 0) return 'today' // 今天
  return 'past' // 过去：历时或超期
})

// 判断是否超期
const isOverdue = computed(() => {
  if (dateStatus.value !== 'past' || !isKeyNode.value) return false
  if (!props.standardHours || props.standardHours <= 0) return false

  const date = dateObj.value
  if (!date) return false

  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  const standardDays = props.standardHours / 24

  return diffDays > standardDays
})

// 超期天数
const overdueDays = computed(() => {
  if (!isOverdue.value) return 0

  const date = dateObj.value
  if (!date || !props.standardHours) return 0

  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  const standardDays = props.standardHours / 24

  return Math.max(0, diffDays - standardDays)
})

// 获取显示的文本
const displayText = computed(() => {
  const date = dateObj.value
  if (!date) return ''

  // 显式指定模式
  if (props.mode !== 'auto') {
    if (props.mode === 'countdown') return getCountdownText()
    if (props.mode === 'elapsed') return getElapsedText()
    if (props.mode === 'overdue') return getOverdueText()
  }

  // 自动判断模式
  if (dateStatus.value === 'future') {
    return getCountdownText()
  } else if (dateStatus.value === 'past') {
    if (isOverdue.value) {
      return getOverdueText()
    } else {
      return getElapsedText()
    }
  }

  return ''
})

// 倒计时文本
const getCountdownText = (): string => {
  const date = dateObj.value
  if (!date) return ''

  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天到期'
  if (diffDays === 1) return '倒计时1天'
  return `倒计时${diffDays}天`
}

// 历时文本
const getElapsedText = (): string => {
  const date = dateObj.value
  if (!date) return ''

  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '历时1天'
  return `历时${diffDays}天`
}

// 超期文本
const getOverdueText = (): string => {
  const days = overdueDays.value
  if (days === 0) return ''
  if (days === 1) return '超期1天'
  return `超期${days}天`
}

// 获取显示的类型
const displayType = computed((): 'countdown' | 'elapsed' | 'overdue' => {
  if (props.mode !== 'auto') {
    return props.mode as 'countdown' | 'elapsed' | 'overdue'
  }

  if (dateStatus.value === 'future') return 'countdown'
  if (isOverdue.value) return 'overdue'
  return 'elapsed'
})

// 获取颜色类型
const colorType = computed((): 'danger' | 'warning' | 'success' | 'info' | '' => {
  const type = displayType.value

  if (type === 'overdue') return 'danger'
  if (type === 'countdown') {
    const date = dateObj.value
    if (!date) return ''

    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 3) return 'warning'
    return 'success'
  }
  return 'info'
})

// 获取图标
const icon = computed(() => {
  if (!props.showIcon) return ''

  if (displayType.value === 'overdue') return '⚠️'
  if (displayType.value === 'countdown') {
    const date = dateObj.value
    if (!date) return ''

    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 3) return '⏰'
    return '✅'
  }
  return '⏱️'
})

// 标签样式类
const tagClass = computed(() => {
  const classes: string[] = ['duration-tag']

  if (colorType.value) {
    classes.push(`duration-tag--${colorType.value}`)
  }

  return classes
})
</script>

<template>
  <span v-if="displayText" :class="tagClass">
    <span v-if="icon" class="duration-icon">{{ icon }}</span>
    <span class="duration-text">{{ displayText }}</span>
  </span>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.duration-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: $radius-base;
  font-size: $font-size-xs;
  font-weight: 500;
  white-space: nowrap;

  .duration-icon {
    font-size: 14px;
  }

  .duration-text {
    line-height: 1.2;
  }

  // 倒计时：绿色（安全）或橙色（即将到期）
  &--success {
    color: $success-color;
    background: rgba($success-color, 0.12);
  }

  &--warning {
    color: $warning-color;
    background: rgba($warning-color, 0.12);
  }

  // 历时：蓝色（中性）
  &--info {
    color: $info-color;
    background: rgba($info-color, 0.12);
  }

  // 超期：红色（风险）
  &--danger {
    color: $danger-color;
    background: rgba($danger-color, 0.12);
  }
}
</style>
