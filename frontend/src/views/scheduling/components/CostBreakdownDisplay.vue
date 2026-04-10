<template>
  <div class="cost-breakdown-display">
    <el-descriptions :column="2" border size="small">
      <el-descriptions-item label="滞港费">
        <span :class="getAmountClass(data.demurrageCost || 0)">
          ${{ (data.demurrageCost || 0).toFixed(2) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="滞箱费">
        <span :class="getAmountClass(data.detentionCost || 0)">
          ${{ (data.detentionCost || 0).toFixed(2) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="港口存储费">
        <span :class="getAmountClass(data.storageCost || 0)">
          ${{ (data.storageCost || 0).toFixed(2) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="运输费">
        <span :class="getAmountClass(data.transportationCost || 0)">
          ${{ (data.transportationCost || 0).toFixed(2) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item v-if="data.yardStorageCost" label="外部堆场费">
        <span :class="getAmountClass(data.yardStorageCost || 0)">
          ${{ (data.yardStorageCost || 0).toFixed(2) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="操作费">
        <span :class="getAmountClass(data.handlingCost || 0)">
          ${{ (data.handlingCost || 0).toFixed(2) }}
        </span>
      </el-descriptions-item>
      <el-descriptions-item label="总成本" label-class-name="total-label" :span="2">
        <span :class="['total-amount', getAmountClass(data.totalCost || 0)]">
          ${{ (data.totalCost || 0).toFixed(2) }}
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
