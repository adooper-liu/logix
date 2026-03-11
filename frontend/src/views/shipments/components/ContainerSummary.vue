<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  containerData: any
}>()

const orderNumber = computed(() =>
  (props.containerData?.orderNumber ??
   props.containerData?.order?.orderNumber ??
   props.containerData?.allOrders?.[0]?.orderNumber) || '-'
)

// 物流状态映射
const statusMap: Record<
  string,
  { text: string; type: '' | 'success' | 'warning' | 'danger' | 'info' }
> = {
  not_shipped: { text: '未出运', type: 'info' },
  shipped: { text: '已装船', type: 'success' },
  in_transit: { text: '在途', type: 'success' },
  at_port: { text: '已到目的港', type: 'success' },
  picked_up: { text: '已提柜', type: 'warning' },
  unloaded: { text: '已卸柜', type: 'warning' },
  returned_empty: { text: '已还箱', type: 'success' },
  cancelled: { text: '已取消', type: 'danger' },
  hold: { text: '扣留', type: 'danger' },
  completed: { text: '已完成', type: 'success' },
  未出运: { text: '未出运', type: 'info' },
  已装船: { text: '已装船', type: 'success' },
  在途: { text: '在途', type: 'success' },
  已到中转港: { text: '已到中转港', type: 'success' },
  已到目的港: { text: '已到目的港', type: 'success' },
  已提柜: { text: '已提柜', type: 'warning' },
  已卸柜: { text: '已卸柜', type: 'warning' },
  已还箱: { text: '已还箱', type: 'success' },
  已取消: { text: '已取消', type: 'danger' },
}

const getLogisticsStatusText = (status: string): string => {
  return statusMap[status]?.text || status
}
</script>

<template>
  <el-card class="summary-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="card-icon">📦</span>
        <span class="card-title">货柜信息</span>
      </div>
    </template>
    <div class="info-grid">
      <div class="info-item highlight">
        <span class="label">集装箱号</span>
        <span class="value mono">{{ containerData.containerNumber }}</span>
      </div>
      <div class="info-item">
        <span class="label">备货单号</span>
        <span class="value link">{{ orderNumber }}</span>
      </div>
      <div class="info-item">
        <span class="label">柜型</span>
        <el-tag size="small" effect="plain">{{ containerData.containerTypeCode }}</el-tag>
      </div>
      <div class="info-item">
        <span class="label">物流状态</span>
        <el-tag
          :type="statusMap[containerData.logisticsStatus]?.type || 'info'"
          size="small"
          effect="light"
        >
          {{
            getLogisticsStatusText(containerData.logisticsStatus) || containerData.logisticsStatus
          }}
        </el-tag>
      </div>
      <div class="info-item">
        <span class="label">备货单数</span>
        <span class="value">{{ containerData.summary?.orderCount || 1 }} 个</span>
      </div>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.summary-card {
  border-radius: $radius-large;
  border: 1px solid $border-lighter;
  transition: $transition-base;

  &:hover {
    box-shadow: $shadow-base;
  }

  :deep(.el-card__header) {
    padding: $spacing-md $spacing-lg;
    border-bottom: 1px solid $border-lighter;
    background: $bg-page;
  }

  :deep(.el-card__body) {
    padding: $spacing-lg;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: $spacing-sm;

    .card-icon {
      font-size: $font-size-lg;
      line-height: 1;
    }

    .card-title {
      font-size: $font-size-base;
      font-weight: 600;
      color: $text-primary;
    }
  }

  .info-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: $spacing-lg;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: $spacing-xs;
    padding: $spacing-sm 0;

    &.highlight .value {
      font-size: $font-size-base;
      font-weight: 600;
    }

    .label {
      font-size: $font-size-xs;
      color: $text-secondary;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .value {
      font-size: $font-size-sm;
      color: $text-primary;
      font-weight: 500;

      &.mono {
        font-family: ui-monospace, monospace;
        letter-spacing: 0.05em;
      }

      &.link {
        color: $primary-color;
        cursor: pointer;
        transition: $transition-base;

        &:hover {
          color: $primary-dark;
          text-decoration: underline;
        }
      }
    }
  }
}
</style>
