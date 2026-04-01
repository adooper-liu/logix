<template>
  <div class="date-range-selector">
    <span class="range-label">日期：</span>
    <el-radio-group
      :model-value="modelValue"
      @update:model-value="$emit('update:modelValue', $event)"
      @change="$emit('change')"
      size="small"
    >
      <el-radio-button :value="0">动态</el-radio-button>
      <el-radio-button :value="7">7天</el-radio-button>
      <el-radio-button :value="15">15天</el-radio-button>
      <el-radio-button :value="30">30天</el-radio-button>
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
      start-placeholder="开始"
      end-placeholder="结束"
      size="small"
      style="width: 200px"
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
  return dayjs(date).format('MM-DD')
}
</script>

<style scoped>
.date-range-selector {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.range-label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  white-space: nowrap;
}

.date-display {
  font-size: 12px;
  color: #909399;
  white-space: nowrap;
}
</style>
