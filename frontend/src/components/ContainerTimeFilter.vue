<script setup lang="ts">
import { ref } from 'vue'
import dayjs, { type Dayjs } from 'dayjs'

interface TimeFilterData {
  timeDimension: string
  dateRange?: [Date, Date] | null
}

const emit = defineEmits<{
  filter: [data: TimeFilterData]
}>()

const timeDimension = ref('all')
const quickSelect = ref<string | null>(null)
const dateRange = ref<[Date, Date] | null>(null)

const handleDimensionChange = () => {
  quickSelect.value = null
  dateRange.value = null
  emitFilter()
}

const handleQuickSelect = (value: string) => {
  const now = dayjs()
  let startDate: dayjs.Dayjs

  switch (value) {
    case 'today':
      startDate = now.startOf('day')
      break
    case 'yesterday':
      startDate = now.subtract(1, 'day').startOf('day')
      break
    case 'last_7_days':
      startDate = now.subtract(7, 'day').startOf('day')
      break
    case 'last_30_days':
      startDate = now.subtract(30, 'day').startOf('day')
      break
    case 'this_month':
      startDate = now.startOf('month')
      break
    case 'last_month':
      startDate = now.subtract(1, 'month').startOf('month')
      break
    case 'this_quarter':
      startDate = now.startOf('quarter')
      break
    case 'this_year':
      startDate = now.startOf('year')
      break
  }

  dateRange.value = [startDate.toDate(), now.toDate()]
  emitFilter()
}

const emitFilter = () => {
  emit('filter', {
    timeDimension: timeDimension.value,
    dateRange: dateRange.value,
  })
}
</script>

<template>
  <div class="time-filter">
    <el-space wrap>
      <!-- 时间维度 -->
      <el-select
        v-model="timeDimension"
        placeholder="时间维度"
        style="width: 120px"
        @change="handleDimensionChange"
      >
        <el-option label="全部时间" value="all" />
        <el-option label="按日" value="day" />
        <el-option label="按周" value="week" />
        <el-option label="按月" value="month" />
        <el-option label="按年" value="year" />
      </el-select>

      <!-- 快速选择 -->
      <el-select
        v-if="timeDimension !== 'all'"
        v-model="quickSelect"
        placeholder="快速选择"
        style="width: 140px"
        clearable
        @change="handleQuickSelect"
      >
        <el-option label="今天" value="today" />
        <el-option label="昨天" value="yesterday" />
        <el-option label="最近 7 天" value="last_7_days" />
        <el-option label="最近 30 天" value="last_30_days" />
        <el-option label="本月" value="this_month" />
        <el-option label="上月" value="last_month" />
        <el-option label="本季度" value="this_quarter" />
        <el-option label="本年" value="this_year" />
      </el-select>

      <!-- 自定义日期范围 -->
      <el-date-picker
        v-if="timeDimension === 'day'"
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        @change="emitFilter"
      />
    </el-space>
  </div>
</template>

<style scoped>
.time-filter {
  margin-bottom: 16px;
}
</style>
