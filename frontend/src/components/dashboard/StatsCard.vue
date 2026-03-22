<script setup lang="ts">
import { Box, Ship, Check, Warning } from '@element-plus/icons-vue'

interface StatsCardProps {
  type: 'total' | 'active' | 'alert' | 'completed' | 'danger'
  value: number
  /** 自定义显示值（如滞港费合计的 "USD 12,345.00"），优先于 value */
  displayValue?: string
  icon?: any
  label: string
  alertDetails?: {
    etaOverdue: number
    lastPickupOverdue: number
    lastReturnOverdue: number
    plannedPickupOverdue: number
  }
  /** 滞港费子分组（参考 alertDetails 方式，展开时显示） */
  demurrageDetails?: {
    containerCount: number
    avgPerContainer: string
    alertStatus: string
  }
}

const props = defineProps<StatsCardProps>()

const icons = {
  total: Box,
  active: Ship,
  alert: Warning,
  completed: Check,
  danger: Warning
}

const emit = defineEmits<{
  click: []
}>()

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <div
    class="stats-card"
    :class="{ 'alert-card': type === 'alert', 'details-card': demurrageDetails }"
    @click="handleClick"
  >
    <div class="stat-content">
      <div class="stat-icon" :class="type">
        <component :is="icon ?? icons[type]" class="icon" />
      </div>
      <div class="stat-info" :class="{ 'alert-info': type === 'alert', 'details-info': demurrageDetails }">
        <div class="stat-value">{{ displayValue ?? value }}</div>
        <div class="stat-label">{{ label }}</div>
        <div v-if="demurrageDetails" class="sub-details">
          <div class="detail-item">
            <span class="detail-label">柜数</span>
            <span class="detail-value">{{ demurrageDetails.containerCount }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">单柜</span>
            <span class="detail-value">{{ demurrageDetails.avgPerContainer }}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">预警</span>
            <span
              class="detail-value alert-badge"
              :class="demurrageDetails.alertStatus === '需关注' ? 'alert-urgent' : 'alert-normal'"
            >
              <span class="alert-dot" />
              {{ demurrageDetails.alertStatus }}
            </span>
          </div>
        </div>
        <div v-else-if="type === 'alert' && alertDetails" class="alert-details">
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
  background: $bg-color;
  border-radius: $radius-large;
  padding: $spacing-lg;
  cursor: pointer;
  border: 1px solid $border-lighter;
  transition: $transition-base;
  box-shadow: $shadow-light;

  &:hover {
    transform: translateY(-3px);
    box-shadow: $shadow-base;
    border-color: $border-light;
  }

  .stat-content {
    display: flex;
    align-items: center;
    gap: $spacing-md;

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: $radius-large;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
      transition: $transition-base;

      .icon {
        font-size: 24px;
      }

      &.total {
        background: linear-gradient(135deg, $primary-color 0%, $primary-dark 100%);
      }
      &.active {
        background: linear-gradient(135deg, $success-color 0%, $success-light 100%);
      }
      &.alert {
        background: linear-gradient(135deg, $warning-color 0%, $warning-light 100%);
      }
      &.completed {
        background: linear-gradient(135deg, $info-color 0%, $info-light 100%);
      }
      &.danger {
        background: linear-gradient(135deg, $danger-color 0%, $danger-light 100%);
      }
    }

    .stat-info {
      flex: 1;
      min-width: 0;

      .stat-value {
        font-size: $font-size-xxl;
        font-weight: 700;
        color: $text-primary;
        margin-bottom: $spacing-xs;
        letter-spacing: -0.02em;
        line-height: 1.2;
      }

      .stat-label {
        color: $text-secondary;
        font-size: $font-size-sm;
        font-weight: 500;
      }
    }
  }

  &.details-card {
    .stat-content {
      align-items: flex-start;
      gap: $spacing-md;
    }

    .stat-info.details-info {
      flex: 1;

      .stat-value {
        font-size: $font-size-xl;
      }

      .stat-label {
        font-size: $font-size-xs;
      }

      .sub-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: $spacing-xs $spacing-md;
        margin-top: $spacing-sm;
        padding-top: $spacing-sm;
        border-top: 1px solid rgba($info-color, 0.25);

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: $font-size-xs;
          gap: $spacing-sm;

          .detail-label {
            color: $text-secondary;
            font-weight: 500;
          }

          .detail-value {
            font-weight: 600;
            color: $text-primary;

            &.alert-badge {
              display: inline-flex;
              align-items: center;
              gap: $spacing-xs;

              .alert-dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                flex-shrink: 0;
              }

              &.alert-urgent {
                color: $warning-color;

                .alert-dot {
                  background: $warning-color;
                  box-shadow: 0 0 6px rgba($warning-color, 0.6);
                }
              }

              &.alert-normal {
                color: $success-color;

                .alert-dot {
                  background: $success-color;
                  box-shadow: 0 0 6px rgba($success-color, 0.5);
                }
              }
            }
          }
        }
      }
    }
  }

  &.alert-card {
    .stat-content {
      align-items: flex-start;
      gap: $spacing-md;
    }

    .stat-info.alert-info {
      flex: 1;

      .stat-value {
        font-size: $font-size-xl;
      }

      .stat-label {
        font-size: $font-size-xs;
      }

      .alert-details {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: $spacing-xs $spacing-md;
        margin-top: $spacing-sm;
        padding-top: $spacing-sm;
        border-top: 1px solid rgba($warning-color, 0.25);

        .alert-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: $font-size-xs;
          gap: $spacing-sm;

          .alert-label {
            color: $text-secondary;
            font-weight: 500;
          }

          .alert-count {
            font-weight: 600;
            color: $warning-color;
          }
        }
      }
    }
  }
}
</style>
