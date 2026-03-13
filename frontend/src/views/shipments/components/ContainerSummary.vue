<script setup lang="ts">
import type { DemurrageCalculationResponse } from '@/services/demurrage'
import { computed } from 'vue'

const emit = defineEmits<{
  openDemurrageTab: []
}>()

const props = defineProps<{
  containerData: any
  demurrageCalculation?: DemurrageCalculationResponse['data'] | null
}>()

const orderNumber = computed(
  () =>
    (props.containerData?.orderNumber ??
      props.containerData?.order?.orderNumber ??
      props.containerData?.allOrders?.[0]?.orderNumber) ||
    '-'
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

// 滞港费汇总（从计算结果中提取）
const demurrageSummary = computed(() => {
  console.log('[ContainerSummary] demurrageCalculation:', props.demurrageCalculation)

  if (!props.demurrageCalculation?.items) {
    console.log('[ContainerSummary] No items, returning null')
    return null
  }

  console.log('[ContainerSummary] Items:', props.demurrageCalculation.items)

  // 按费用类型分组汇总
  const chargeTypeMap = new Map<
    string,
    {
      chargeType: string
      chargeName: string
      totalAmount: number
    }
  >()

  for (const item of props.demurrageCalculation.items) {
    const type = item.chargeTypeCode || 'UNKNOWN'
    if (!chargeTypeMap.has(type)) {
      chargeTypeMap.set(type, {
        chargeType: type,
        chargeName: item.chargeName || type,
        totalAmount: 0,
      })
    }
    const typeSummary = chargeTypeMap.get(type)!
    typeSummary.totalAmount += item.amount
  }

  const chargeTypes = Array.from(chargeTypeMap.values())

  // 只要有费用项就显示，即使金额为0
  return {
    totalAmount: props.demurrageCalculation.totalAmount,
    currency: props.demurrageCalculation.currency,
    chargeTypes,
  }
})
</script>

<template>
  <el-card class="summary-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <span class="card-icon">📦</span>
        <span class="card-title">基本信息</span>
      </div>
    </template>
    <div class="info-row">
      <div class="info-item highlight">
        <span class="label">集装箱号</span>
        <span class="value mono">{{ containerData.containerNumber }}</span>
      </div>
      <div class="info-item">
        <span class="label">备货单号</span>
        <span class="value link">{{ orderNumber }}</span>
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
      <!-- 滞港费汇总 -->
      <div v-if="demurrageSummary" class="demurrage-inline" @click="emit('openDemurrageTab')">
        <span class="demurrage-icon">💰</span>
        <span class="demurrage-title">滞港费汇总</span>
        <span class="demurrage-total">
          {{ demurrageSummary.currency }} {{ demurrageSummary.totalAmount.toFixed(2) }}
        </span>
      </div>
    </div>

    <!-- 滞港费详细 -->
    <div
      v-if="demurrageSummary && demurrageSummary.chargeTypes.length > 0"
      class="demurrage-details"
    >
      <div
        v-for="chargeType in demurrageSummary.chargeTypes"
        :key="chargeType.chargeType"
        class="demurrage-type-item"
      >
        <span class="charge-type-name">{{ chargeType.chargeName || chargeType.chargeType }}</span>
        <span class="charge-type-amount">
          {{ demurrageSummary.currency }} {{ chargeType.totalAmount.toFixed(2) }}
        </span>
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
  margin-bottom: 0;

  &:hover {
    box-shadow: $shadow-base;
  }

  :deep(.el-card__header) {
    padding: $spacing-sm $spacing-md;
    border-bottom: 1px solid $border-lighter;
    background: $bg-page;
  }

  :deep(.el-card__body) {
    padding: $spacing-md;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: $spacing-xs;

    .card-icon {
      font-size: $font-size-base;
      line-height: 1;
    }

    .card-title {
      font-size: $font-size-sm;
      font-weight: 600;
      color: $text-primary;
    }
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    flex-wrap: wrap;
    white-space: nowrap;
  }

  .info-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;

    &.highlight .value {
      font-size: $font-size-base;
      font-weight: 600;
    }

    .label {
      font-size: 10px;
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

  .demurrage-inline {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: linear-gradient(135deg, #fff7e6 0%, #ffe8cc 100%);
    border-radius: $radius-base;
    border: 1px solid #e6a23c;
    flex-shrink: 0;
    cursor: pointer;
    transition: $transition-base;

    &:hover {
      box-shadow: $shadow-light;
      transform: translateY(-1px);
      border-color: $warning-color;
    }

    &:active {
      transform: translateY(0);
    }

    .demurrage-icon {
      font-size: $font-size-sm;
    }

    .demurrage-title {
      font-size: 11px;
      font-weight: 600;
      color: #e6a23c;
    }

    .demurrage-total {
      font-size: $font-size-sm;
      font-weight: 700;
      color: $danger-color;
    }
  }

  .demurrage-details {
    display: grid;
    gap: 4px;
    margin-top: $spacing-sm;
    padding: $spacing-sm $spacing-md;
    background: linear-gradient(135deg, #fff7e6 0%, #ffe8cc 100%);
    border-radius: $radius-base;
    border: 1px solid #e6a23c;
  }

  .demurrage-type-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.6);
    border-radius: $radius-small;
    font-size: 11px;

    .charge-type-name {
      color: $text-secondary;
    }

    .charge-type-amount {
      font-weight: 600;
      color: $text-primary;
    }
  }
}
</style>
