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
  /** 是否为当前正在进行的节点 */
  isCurrentNode?: boolean
  /** 上一个节点日期（用于计算历时，当无 nextDate 时） */
  prevDate?: Date | string | null
  /** 后一节点日期（用于计算历时 = 后一节点 - 当前节点，优先于 prevDate） */
  nextDate?: Date | string | null
  /** 是否有后一节点（用于判断显示历时/倒计时/超期） */
  hasNextNode?: boolean
  /** 超期时提示的下一业务环节名称（如「还空箱」），格式：已超期X天→xxx */
  nextMilestoneLabel?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  showIcon: true,
  mode: 'auto',
  isCurrentNode: false,
  hasNextNode: false,
  nextMilestoneLabel: null,
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

// 获取上一个节点日期对象
const prevDateObj = computed(() => {
  if (!props.prevDate) return null
  const date = typeof props.prevDate === 'string' ? new Date(props.prevDate) : props.prevDate
  return isNaN(date.getTime()) ? null : date
})

// 获取后一节点日期对象（历时 = 后一节点 - 当前节点）
const nextDateObj = computed(() => {
  if (!props.nextDate) return null
  const date = typeof props.nextDate === 'string' ? new Date(props.nextDate) : props.nextDate
  return isNaN(date.getTime()) ? null : date
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

// 计算超期时间（当前时间 - 当前节点时间）
const overdueTime = computed(() => {
  const date = dateObj.value
  if (!date) return null

  const now = new Date()
  return now.getTime() - date.getTime()
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
  // 优先判断：如果有后一节点（且后一节点已发生），显示历时（后一节点 - 当前节点）
  if (props.hasNextNode) {
    return getElapsedText()
  }

  // 如果是当前正在进行的节点，显示超期/倒计时
  if (props.isCurrentNode) {
    const time = overdueTime.value
    if (!time) return ''
    return time < 0 ? getCountdownTextFromTime(time) : getOverdueTextFromTime(time)
  }

  // 无后一节点（如最晚提柜有后续节点但实际提柜未发生）：显示倒计时/超期/历时
  const time = overdueTime.value
  if (!time) return ''
  if (time < 0) return getCountdownText() // 未来：倒计时
  // 实际还箱为业务闭环终点：历时 = 本节点 - 上一节点，非「今天 - 还箱日」的超期
  if (props.label === '实际还箱' && prevDateObj.value) {
    return getElapsedText()
  }
  // 过去：显示超期（关键节点等）
  return getOverdueText() // 已超期：超期
})

// 从超期时间计算倒计时文本
const getCountdownTextFromTime = (time: number): string => {
  const diffDays = Math.ceil(Math.abs(time) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '倒计时1天'
  return `倒计时${diffDays}天`
}

function formatOverdueCore(days: number): string {
  if (days === 0) return ''
  const base = days === 1 ? '超期1天' : `超期${days}天`
  if (props.nextMilestoneLabel) {
    return `已${base}→${props.nextMilestoneLabel}`
  }
  return base
}

// 从超期时间计算超期文本
const getOverdueTextFromTime = (time: number): string => {
  const diffDays = Math.floor(time / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '今天'
  return formatOverdueCore(diffDays)
}

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

// 历时文本：有 nextDate 时为 后一节点 - 当前节点（区分超期/提前）
const getElapsedText = (): string => {
  const date = dateObj.value
  if (!date) return ''

  const nextDate = nextDateObj.value
  if (nextDate) {
    const diffDays = Math.floor((nextDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    // ✅ 计划节点 vs 实际节点：区分超期/提前
    if (diffDays > 0) {
      // 实际晚于计划 → 实际超期
      if (diffDays === 1) return '实际超期 1 天'
      return `实际超期${diffDays}天`
    } else if (diffDays < 0) {
      // 实际早于计划 → 实际提前
      const absDiff = Math.abs(diffDays)
      if (absDiff === 1) return '实际提前 1 天'
      return `实际提前${absDiff}天`
    } else {
      // diffDays === 0，当天完成
      return '按时完成'
    }
  }

  // 无 nextDate：使用 prevDate 计算普通历时
  const prevDate = prevDateObj.value
  if (!prevDate) return ''
  const diffDays = Math.floor((date.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) return ''
  if (diffDays === 1) return '历时 1 天'
  return `历时${diffDays}天`
}

// 超期文本（当前时间 - 当前节点时间）
const getOverdueText = (): string => {
  const days = overdueDays.value
  if (days === 0) return ''
  return formatOverdueCore(days)
}

// 历时文本（今天 - 当前节点，用于无后一节点且未超标准时）
const getElapsedTextFromToday = (timeMs: number): string => {
  const days = Math.floor(timeMs / (1000 * 60 * 60 * 24))
  if (days <= 0) return ''
  if (days === 1) return '历时1天'
  return `历时${days}天`
}

// 超期天数
const overdueDays = computed(() => {
  const time = overdueTime.value
  if (!time) return 0

  const diffDays = Math.floor(time / (1000 * 60 * 60 * 24))
  return diffDays
})

// 获取显示的类型
const displayType = computed((): 'countdown' | 'elapsed' | 'overdue' => {
  // 显式指定模式
  if (props.mode !== 'auto') {
    return props.mode as 'countdown' | 'elapsed' | 'overdue'
  }

  // ✅ 实际业务节点：总是显示历时（因为业务已真实发生）
  const actualEventLabels = ['出运', 'ATA', '卸船', '实际提柜', '实际还箱']
  if (actualEventLabels.includes(props.label || '')) {
    return 'elapsed'
  }

  // ✅ 计划与预警节点：根据后一节点和时间判断

  // 有后一节点：显示历时（实际 - 计划）
  if (props.hasNextNode) {
    return 'elapsed'
  }

  // 无后一节点：根据时间判断
  const time = overdueTime.value
  if (!time) return 'elapsed'
  if (time < 0) return 'countdown'

  // 日期在过去：显示超期
  return 'overdue'
})

// 获取颜色类型
const colorType = computed((): 'danger' | 'warning' | 'success' | 'info' | '' => {
  const type = displayType.value

  if (type === 'overdue') {
    // 关键节点：相对「节点日」已过去的天数 vs 标准免费天数
    if (isKeyNode.value && props.standardHours && props.standardHours > 0) {
      const time = overdueTime.value
      if (time) {
        const standardDays = props.standardHours / 24
        const days = Math.floor(time / (1000 * 60 * 60 * 24))
        if (days > standardDays) return 'danger'
        if (days > 0) return 'warning'
      }
    }
    // 非关键节点超期（如实际提柜后长期未还箱）：用 warning，避免与「历时」info 同色
    if (!isKeyNode.value) {
      return 'warning'
    }
    return 'info'
  }
  if (type === 'countdown') {
    const date = dateObj.value
    if (!date) return 'info'

    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 3) return 'warning'
    return 'success'
  }
  // ✅ 历时：区分实际超期/实际提前
  if (type === 'elapsed') {
    // 检查是否是计划节点 vs 实际节点的对比
    const planWarningLabels = ['ETA', '修正 ETA', '最晚提柜', '最晚还箱']

    // 如果当前是计划节点，且有 nextDate（实际节点），根据差值正负判断颜色
    if (planWarningLabels.includes(props.label || '') && nextDateObj.value) {
      const date = dateObj.value
      const nextDate = nextDateObj.value
      if (!date) return 'info' // 安全检查
      const diffDays = Math.floor((nextDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

      if (diffDays > 0) {
        // 实际超期 → 橙色警告
        return 'warning'
      } else if (diffDays < 0) {
        // 实际提前 → 绿色成功
        return 'success'
      } else {
        // 按时完成 → 蓝色信息
        return 'info'
      }
    }
    // 普通历时 → 蓝色信息
    return 'info'
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
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px 8px;
  border-radius: $radius-base;
  font-size: $font-size-xs;
  font-weight: 500;
  max-width: 100%;
  text-align: center;

  .duration-icon {
    font-size: 14px;
    flex-shrink: 0;
  }

  .duration-text {
    line-height: 1.2;
    word-break: break-word;
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
