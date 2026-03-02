<script setup lang="ts">
import { Box, Ship, Check, Warning } from '@element-plus/icons-vue'

interface StatsCardProps {
  type: 'total' | 'active' | 'alert' | 'completed'
  value: number
  icon?: any
  label: string
  alertDetails?: {
    etaOverdue: number
    lastPickupOverdue: number
    lastReturnOverdue: number
    plannedPickupOverdue: number
  }
}

const props = defineProps<StatsCardProps>()

const icons = {
  total: Box,
  active: Ship,
  alert: Warning,
  completed: Check
}

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <div class="stats-card" :class="{ 'alert-card': type === 'alert' }" @click="handleClick">
    <div class="stat-content">
      <div class="stat-icon" :class="type">
        <component :is="icons[type]" class="icon" />
      </div>
      <div class="stat-info" :class="{ 'alert-info': type === 'alert' }">
        <div class="stat-value">{{ value }}</div>
        <div class="stat-label">{{ label }}</div>
        <div v-if="type === 'alert' && alertDetails" class="alert-details">
          <div class="alert-item">
            <span class="alert-label">ETA</span>
            <span class="alert-count">{{ alertDetails.etaOverdue }}</span>
          </div>
          <div class="alert-item">
            <span class="alert-label">最晚提柜</span>
            <span class="alert-count">{{ alertDetails.lastPickupOverdue }}</span>
          </div>
          <div class="alert-item">
            <span class="alert-label">最晚还箱</span>
            <span class="alert-count">{{ alertDetails.lastReturnOverdue }}</span>
          </div>
          <div class="alert-item">
            <span class="alert-label">计划提柜</span>
            <span class="alert-count">{{ alertDetails.plannedPickupOverdue }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.stats-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .stat-content {
    display: flex;
    align-items: center;
    gap: 20px;

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;

      .icon {
        font-size: 24px;
      }

      &.total {
        background: #409eff;
      }
      &.active {
        background: #67c23a;
      }
      &.alert {
        background: #e6a23c;
      }
      &.completed {
        background: #909399;
      }
    }

    .stat-info {
      flex: 1;

      .stat-value {
        font-size: 28px;
        font-weight: bold;
        color: $text-primary;
        margin-bottom: 5px;
      }

      .stat-label {
        color: $text-secondary;
        font-size: 14px;
      }
    }
  }

  &.alert-card {
    .stat-content {
      align-items: flex-start;
      gap: 12px;
    }

    .stat-info.alert-info {
      flex: 1;

      .stat-value {
        font-size: 24px;
      }

      .stat-label {
        font-size: 13px;
      }

      .alert-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px 12px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(224, 162, 60, 0.2);

        .alert-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;

          .alert-label {
            color: $text-secondary;
            font-weight: 500;
          }

          .alert-count {
            font-weight: 600;
            color: #e6a23c;
          }
        }
      }
    }
  }
}
</style>
