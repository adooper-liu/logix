<script setup lang="ts">
/**
 * 最晚提柜日显示组件
 * 统一显示逻辑：倒计时/历时/超期、计算模式、来源标注
 */
import { computed } from 'vue'
import { QuestionFilled } from '@element-plus/icons-vue'

interface Props {
  /** 最晚提柜日期（数据库值） */
  lastPickupDate?: string | Date | null
  /** 最晚提柜日期（计算值，优先显示） */
  lastPickupDateComputed?: string | Date | null
  /** 计算模式（actual/forecast） */
  lastPickupDateMode?: 'actual' | 'forecast' | null
  /** 实际到港日期（用于计算来源） */
  ataDestPort?: string | Date | null
  /** 目的港ETA（用于计算来源） */
  etaDestPort?: string | Date | null
  /** 修正ETA（用于计算来源） */
  revisedEtaDestPort?: string | Date | null
  /** 是否显示完整信息（来源标注、计算模式） */
  showDetails?: boolean
  /** 是否显示状态标签（过期/紧急/正常） */
  showStatus?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true,
  showStatus: true,
})

// 格式化日期
const formatDate = (d: string | Date | null | undefined): string => {
  if (!d) return '-'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

// 获取显示的日期（优先计算值）
const displayDate = computed(() => {
  return props.lastPickupDateComputed ?? props.lastPickupDate
})

// 是否为计算值
const isComputed = computed(() => !!props.lastPickupDateComputed)

// 计算模式文字
const modeText = computed(() => {
  if (!isComputed.value || !props.lastPickupDateMode) return ''
  return props.lastPickupDateMode === 'actual' ? '（实际模式）' : '（预测模式）'
})

// 计算来源文字
const sourceText = computed(() => {
  if (!isComputed.value) return ''
  if (props.lastPickupDateMode === 'actual') {
    return '起算：实际到港（ATA）'
  } else {
    return '起算：ETA预测'
  }
})

// 状态判断（过期/紧急/正常）
const status = computed((): 'expired' | 'urgent' | 'warning' | 'normal' | 'none' => {
  const date = displayDate.value
  if (!date) return 'none'

  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return 'none'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d2 = new Date(d)
  d2.setHours(0, 0, 0, 0)

  const diffTime = d2.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'expired' // 已过期
  if (diffDays === 0) return 'expired' // 今天到期
  if (diffDays <= 3) return 'urgent' // 3天内
  if (diffDays <= 7) return 'warning' // 7天内
  return 'normal' // 正常
})

// 状态标签配置
const statusConfig = computed(() => {
  const configs = {
    expired: { label: '已过期', type: 'danger' as const, class: 'status-expired' },
    urgent: { label: '紧急', type: 'danger' as const, class: 'status-urgent' },
    warning: { label: '预警', type: 'warning' as const, class: 'status-warning' },
    normal: { label: '正常', type: 'success' as const, class: 'status-normal' },
    none: { label: '', type: 'info' as const, class: '' },
  }
  return configs[status.value]
})
</script>

<template>
  <div class="last-pickup-date-display">
    <!-- 日期显示 -->
    <span class="date-value" :class="statusConfig.class">
      {{ formatDate(displayDate) }}
    </span>

    <!-- 状态标签 -->
    <el-tag
      v-if="showStatus && statusConfig.label"
      :type="statusConfig.type"
      size="small"
      effect="plain"
      class="status-tag"
    >
      {{ statusConfig.label }}
    </el-tag>

    <!-- 计算模式标注 -->
    <span v-if="showDetails && isComputed" class="mode-text">
      {{ modeText }}
    </span>

    <!-- 详细信息（来源标注） -->
    <el-popover
      v-if="showDetails && isComputed && sourceText"
      placement="top"
      :width="240"
      trigger="hover"
    >
      <template #reference>
        <el-icon class="info-icon"><QuestionFilled /></el-icon>
      </template>
      <div class="info-content">
        <div class="info-item">
          <span class="info-label">计算来源：</span>
          <span class="info-value">{{ sourceText }}</span>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.last-pickup-date-display {
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  flex-wrap: wrap;

  .date-value {
    font-weight: 500;

    &.status-expired,
    &.status-urgent {
      color: $danger-color;
    }

    &.status-warning {
      color: $warning-color;
    }

    &.status-normal {
      color: $success-color;
    }
  }

  .status-tag {
    font-size: $font-size-xs;
  }

  .mode-text {
    font-size: $font-size-xs;
    color: $text-secondary;
  }

  .info-icon {
    font-size: 14px;
    color: $info-color;
    cursor: pointer;
    transition: $transition-base;

    &:hover {
      color: $primary-color;
    }
  }
}

.info-content {
  font-size: $font-size-sm;
  line-height: 1.6;

  .info-item {
    margin-bottom: $spacing-xs;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .info-label {
    color: $text-secondary;
    font-weight: 500;
  }

  .info-value {
    color: $text-primary;
  }
}
</style>
