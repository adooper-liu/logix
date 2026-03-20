<template>
  <div class="cost-breakdown-display">
    <el-descriptions :column="2" border size="small">
      <el-descriptions-item label="滞港费">
        <span :class="getAmountClass(data.demurrageCost)">
          ${{ data.demurrageCost.toFixed(2) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="滞箱费">
        <span :class="getAmountClass(data.detentionCost)">
          ${{ data.detentionCost.toFixed(2) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="堆存费">
        <span :class="getAmountClass(data.storageCost)">
          ${{ data.storageCost.toFixed(2) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="运输费">
        <span :class="getAmountClass(data.transportationCost)">
          ${{ data.transportationCost.toFixed(2) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="操作费">
        <span :class="getAmountClass(data.handlingCost)">
          ${{ data.handlingCost.toFixed(2) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="总成本" label-class-name="total-label">
        <span :class="['total-amount', getAmountClass(data.totalCost)]">
          ${{ data.totalCost.toFixed(2) }}
        </span>
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup lang="ts">
import type { CostBreakdown } from '@/types/scheduling'

defineProps<{
  data: CostBreakdown
}>()

const getAmountClass = (amount: number) => {
  if (amount === 0) return 'amount-zero'
  if (amount < 100) return 'amount-low'
  if (amount < 500) return 'amount-medium'
  return 'amount-high'
}
</script>

<style scoped lang="scss">
.cost-breakdown-display {
  .total-label {
    font-weight: bold;
    background-color: var(--el-fill-color-light);
  }

  .total-amount {
    font-weight: bold;
    font-size: 16px;
  }

  .amount-zero {
    color: $success-color;
  }

  .amount-low {
    color: $warning-color;
  }

  .amount-medium {
    color: $danger-color;
  }

  .amount-high {
    color: $danger-color;
    font-weight: bold;
  }
}
</style>
