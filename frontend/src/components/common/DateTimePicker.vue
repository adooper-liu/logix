<template>
  <div class="date-time-picker">
    <el-date-picker
      v-model="dateValue"
      :type="type"
      :format="format"
      :value-format="valueFormat"
      :placeholder="placeholder"
      :disabled="disabled"
      :clearable="clearable"
      :size="size"
      :style="style"
      @change="handleChange"
      @blur="handleBlur"
      @focus="handleFocus"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { parseLocalDate, formatDateToLocal } from '@/utils/dateTimeUtils'

// Props
const props = defineProps({
  modelValue: {
    type: [Date, String],
    default: null,
  },
  type: {
    type: String,
    default: 'datetime',
    validator: (value: string) =>
      ['date', 'datetime', 'datetimerange', 'daterange'].includes(value),
  },
  format: {
    type: String,
    default: 'YYYY-MM-DD HH:mm',
  },
  valueFormat: {
    type: String,
    default: 'YYYY-MM-DD HH:mm:ss',
  },
  placeholder: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  clearable: {
    type: Boolean,
    default: true,
  },
  size: {
    type: String,
    default: 'default',
    validator: (value: string) => ['large', 'default', 'small'].includes(value),
  },
  style: {
    type: Object,
    default: () => ({}),
  },
})

// Emits
const emit = defineEmits(['update:modelValue', 'change', 'blur', 'focus'])

// 响应式数据
const dateValue = ref<any>(null)

// 监听modelValue变化
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      dateValue.value = newValue
    } else {
      dateValue.value = null
    }
  },
  { immediate: true }
)

// 处理值变化
const handleChange = (value: any) => {
  emit('update:modelValue', value)
  emit('change', value)
}

// 处理失焦
const handleBlur = (event: Event) => {
  emit('blur', event)
}

// 处理聚焦
const handleFocus = (event: Event) => {
  emit('focus', event)
}
</script>

<style scoped lang="scss">
.date-time-picker {
  width: 100%;
}
</style>
