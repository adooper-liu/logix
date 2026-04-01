<script setup lang="ts">
import { ref, watch } from 'vue'
import dayjs from 'dayjs'

interface DateRangePickerProps {
  modelValue?: [Date, Date] | null
  label?: string
}

// 全项目统一：顶部时间窗口默认为本年（不可用局部变量，defineProps 会提升）
const props = withDefaults(defineProps<DateRangePickerProps>(), {
  modelValue: () => [dayjs().startOf('year').toDate(), dayjs().endOf('year').toDate()],
  label: '按出运时间筛选',
})

const emit = defineEmits<{
  'update:modelValue': [value: [Date, Date] | null]
}>()

const dateRange = ref<[Date, Date] | null>(props.modelValue)

const shortcuts = [
  {
    text: '本年',
    value: () => {
      return [dayjs().startOf('year').toDate(), dayjs().endOf('year').toDate()]
    },
  },
  {
    text: '最近7天',
    value: () => {
      const end = dayjs().endOf('day').toDate()
      const start = dayjs().subtract(7, 'day').startOf('day').toDate()
      return [start, end]
    },
  },
  {
    text: '最近30天',
    value: () => {
      const end = dayjs().endOf('day').toDate()
      const start = dayjs().subtract(30, 'day').startOf('day').toDate()
      return [start, end]
    },
  },
  {
    text: '最近90天',
    value: () => {
      const end = dayjs().endOf('day').toDate()
      const start = dayjs().subtract(90, 'day').startOf('day').toDate()
      return [start, end]
    },
  },
  {
    text: '最近半年',
    value: () => {
      const end = dayjs().endOf('day').toDate()
      const start = dayjs().subtract(6, 'month').startOf('day').toDate()
      return [start, end]
    },
  },
  {
    text: '最近一年',
    value: () => {
      const end = dayjs().endOf('day').toDate()
      const start = dayjs().subtract(1, 'year').startOf('day').toDate()
      return [start, end]
    },
  },
]

const handleChange = (value: any) => {
  emit('update:modelValue', value)
}

const handleClear = () => {
  // 清除后恢复默认：本年
  const defaultValue: [Date, Date] = [
    dayjs().startOf('year').toDate(),
    dayjs().endOf('year').toDate(),
  ]
  dateRange.value = defaultValue
  emit('update:modelValue', defaultValue)
}

// 监听外部modelValue变化
watch(
  () => props.modelValue,
  newValue => {
    if (newValue) {
      dateRange.value = newValue
    }
  }
)
</script>

<template>
  <div class="date-range-picker">
    <el-date-picker
      v-model="dateRange"
      type="daterange"
      range-separator="至"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      :shortcuts="shortcuts"
      clearable
      @change="handleChange"
      @clear="handleClear"
      size="default"
      style="width: 280px"
    />
    <span v-if="label" class="filter-label">{{ label }}</span>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.date-range-picker {
  display: flex;
  align-items: center;
  gap: 8px;

  .filter-label {
    font-size: 13px;
    color: $text-secondary;
    white-space: nowrap;
  }
}
</style>
