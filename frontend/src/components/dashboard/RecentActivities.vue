<script setup lang="ts">
import { Check, Warning, Ship } from '@element-plus/icons-vue'

interface ActivityItem {
  id: number
  container: string
  status: string
  time: string
  type: 'success' | 'warning' | 'info' | 'danger'
}

interface RecentActivitiesProps {
  activities: ActivityItem[]
}

const props = defineProps<RecentActivitiesProps>()

const typeIcons: Record<string, any> = {
  success: Check,
  warning: Warning,
  info: Ship,
}
</script>

<template>
  <div class="activity-list">
    <div
      v-for="activity in activities"
      :key="activity.id"
      class="activity-item"
      :class="`activity-${activity.type}`"
    >
      <div class="activity-content">
        <div class="activity-title">集装箱 {{ activity.container }} {{ activity.status }}</div>
        <div class="activity-time">{{ activity.time }}</div>
      </div>
      <div class="activity-status">
        <el-icon v-if="typeIcons[activity.type as string]">
          <component :is="typeIcons[activity.type as string]" />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.activity-list {
  .activity-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
      border-bottom: none;
    }

    .activity-content {
      .activity-title {
        font-weight: 500;
        margin-bottom: 5px;
        color: $text-primary;
      }

      .activity-time {
        font-size: 12px;
        color: $text-secondary;
      }
    }

    .activity-status {
      font-size: 18px;
      &.activity-success {
        color: $success-color;
      }
      &.activity-warning {
        color: $warning-color;
      }
      &.activity-info {
        color: $primary-color;
      }
      &.activity-danger {
        color: $danger-color;
      }
    }
  }
}
</style>
