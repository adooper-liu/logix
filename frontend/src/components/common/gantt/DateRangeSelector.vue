<template>
  <div class="date-range-selector">
    <span>日期范围：</span>
    <el-radio-group
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      @change="$emit('change')"
      size="small"
    >
      <el-radio-button :value="0">动态</el-radio-button>
      <el-radio-button :value="7">7 天</el-radio-button>
      <el-radio-button :value="15">15 天</el-radio-button>
      <el-radio-button :value="30">30 天</el-radio-button>
      <el-radio-button :value="9999">自定义</el-radio-button>
    </el-radio-group>
    <span class="date-display">
      {{ formatDate(displayRange[0]) }} ~ {{ formatDate(displayRange[1]) }}
    </span>
    <el-date-picker
      v-if="modelValue === 9999"
      v-model="customDateRange"
      type="daterange"
      range-separator="至"
      start-placeholder="开始日期"
      end-placeholder="结束日期"
      size="small"
      @change="$emit('customChange', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { ref, watch } from 'vue'

const props = defineProps<{
  modelValue: number
  displayRange: [Date, Date]
}>()

defineEmits<{
  change: []
  customChange: [value: [Date, Date] | null]
  'update:modelValue': [value: number]
}>()

const customDateRange = ref<[Date, Date] | null>(null)

watch(
  () => props.displayRange,
  newRange => {
    if (props.modelValue === 9999) {
      customDateRange.value = newRange
    }
  },
  { immediate: true }
)

const formatDate = (date?: string | Date): string => {
  if (!date) return '-'
  return dayjs(date).format('YYYY-MM-DD')
}
</script>

<style scoped>
.date-range-selector {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.date-display {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
}
</style>
