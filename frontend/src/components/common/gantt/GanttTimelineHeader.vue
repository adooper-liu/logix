<template>
  <div class="timeline-header">
    <div class="port-group-header">目的港</div>
    <div
      v-for="date in dates"
      :key="date.getTime()"
      class="date-cell"
      :class="{
        'is-weekend': isWeekend(date),
        'is-today': isToday(date),
      }"
    >
      <div class="date-day">{{ formatDateShort(date) }}</div>
      <div class="date-weekday">{{ getWeekday(date) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'

defineProps<{
  dates: Date[]
}>()

const formatDateShort = (date: Date): string => {
  return dayjs(date).format('MM-DD')
}

const getWeekday = (date: Date): string => {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `周${weekdays[date.getDay()]}`
}

const isWeekend = (date: Date): boolean => {
  const day = date.getDay()
  return day === 0 || day === 6
}

const isToday = (date: Date): boolean => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const compareDate = new Date(date)
  compareDate.setHours(0, 0, 0, 0)
  return today.getTime() === compareDate.getTime()
}
</script>

<style scoped>
.timeline-header {
  display: flex;
  min-width: 100%;
  position: sticky;
  top: 0;
  z-index: 10;
  background: #fff;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.port-group-header {
  width: 120px;
  min-width: 120px;
  max-width: 120px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: #303133;
  border-right: 1px solid #e4e7ed;
  background: #f5f7fa;
  position: sticky;
  left: 0;
  z-index: 20;
  box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
  flex-shrink: 0;
}

.date-cell {
  flex: 0 0 150px;
  border-right: 1px solid #e4e7ed;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  position: relative;
  min-width: 150px;
  height: 60px;
  flex-shrink: 0;
}

.date-cell.is-weekend {
  background-color: #fef0f0;
}

.date-cell.is-today {
  background-color: #ecf5ff;
}

.date-day {
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
}

.date-weekday {
  color: #909399;
}
</style>
