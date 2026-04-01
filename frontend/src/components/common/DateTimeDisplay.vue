<template>
  <span class="date-time-display" :class="className">
    {{ formattedDate }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDateToLocal, parseLocalDate } from '@/utils/dateTimeUtils'

// Props
const props = defineProps({
  value: {
    type: [Date, String],
    required: true,
  },
  format: {
    type: String,
    default: 'datetime',
  },
  className: {
    type: String,
    default: '',
  },
  emptyText: {
    type: String,
    default: '-',
  },
})

// 计算属性：格式化日期
const formattedDate = computed(() => {
  if (!props.value) {
    return props.emptyText
  }

  try {
    return formatDateToLocal(props.value, props.format as any)
  } catch (error) {
    console.error('日期格式化错误:', error)
    return props.emptyText
  }
})
</script>

<style scoped lang="scss">
.date-time-display {
  font-size: 14px;
  color: #606266;

  &.text-primary {
    color: #409eff;
  }

  &.text-success {
    color: #67c23a;
  }

  &.text-warning {
    color: #e6a23c;
  }

  &.text-danger {
    color: #f56c6c;
  }

  &.text-muted {
    color: #909399;
  }

  &.text-large {
    font-size: 16px;
  }

  &.text-small {
    font-size: 12px;
  }
}
</style>
