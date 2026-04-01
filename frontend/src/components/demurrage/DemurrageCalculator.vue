<script setup lang="ts">
/**
 * 滞港费计算组件（可复用）
 * 支持传入货柜数据或显式参数，用于单柜滞港费计算与展示
 */
import { computed } from 'vue'
import {
  calculateDemurrage,
  parseContainerForDemurrage,
  type DemurrageCalculationInput,
  type DemurrageCalculationResult,
  type DemurrageTier,
} from '@/composables/useDemurrageCalculation'
const props = withDefaults(
  defineProps<{
    /** 货柜数据（可选，用于解析起算日、截止日） */
    containerData?: Record<string, unknown> | null
    /** 起算日（覆盖 containerData 解析结果） */
    startDate?: Date | string | null
    /** 截止日（覆盖 containerData 解析结果，null 表示今天） */
    endDate?: Date | string | null
    /** 免费天数 */
    freeDays?: number
    /** 单日费率 */
    ratePerDay?: number
    /** 阶梯费率 */
    tiers?: DemurrageTier[]
    /** 币种 */
    currency?: string
    /** 展示模式：full 完整明细，compact 紧凑 */
    mode?: 'full' | 'compact'
  }>(),
  {
    freeDays: 0,
    ratePerDay: 0,
    currency: 'USD',
    mode: 'full',
  }
)

/** 从 containerData 或 props 合并得到计算入参 */
const calculationInput = computed<DemurrageCalculationInput | null>(() => {
  let start: Date | string | null = null
  let end: Date | string | null | undefined = undefined
  let freeDays = props.freeDays

  if (props.containerData) {
    const parsed = parseContainerForDemurrage(props.containerData as any)
    start = parsed.startDate
    end = parsed.endDate
    if (parsed.freeDays !== undefined) freeDays = parsed.freeDays
  }

  if (props.startDate !== undefined && props.startDate !== null) start = props.startDate
  if (props.endDate !== undefined) end = props.endDate

  if (!start || freeDays < 0) return null

  return {
    startDate: start,
    endDate: end ?? undefined,
    freeDays,
    ratePerDay: props.ratePerDay,
    tiers: props.tiers,
    currency: props.currency,
  }
})

/** 计算结果 */
const result = computed<DemurrageCalculationResult | null>(() => {
  const input = calculationInput.value
  if (!input) return null
  return calculateDemurrage(input)
})

/** 格式化日期 */
function formatDate(d: Date | string | null): string {
  if (!d) return '-'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
</script>

<template>
  <div class="demurrage-calculator" :class="[mode]">
    <template v-if="!calculationInput">
      <div class="demurrage-empty">
        <span class="empty-text">缺少起算日或免费天数，无法计算滞港费</span>
      </div>
    </template>

    <template v-else-if="result">
      <!-- 紧凑模式 -->
      <div v-if="mode === 'compact'" class="demurrage-compact">
        <span class="amount" :class="{ 'within-free': result.isWithinFreePeriod }">
          {{ result.isWithinFreePeriod ? '0' : result.totalAmount.toFixed(2) }}
        </span>
        <span class="currency">{{ result.currency }}</span>
        <span v-if="!result.isWithinFreePeriod" class="charge-days">
          （{{ result.chargeDays }} 天）
        </span>
      </div>

      <!-- 完整模式 -->
      <div v-else class="demurrage-full">
        <div class="summary-row">
          <span class="label">免费期截止日</span>
          <span class="value">{{ formatDate(result.lastFreeDate) }}</span>
        </div>
        <div class="summary-row">
          <span class="label">计费天数</span>
          <span class="value" :class="{ 'has-charge': !result.isWithinFreePeriod }">
            {{ result.chargeDays }} 天
          </span>
        </div>
        <div class="summary-row total-row">
          <span class="label">滞港费合计</span>
          <span class="value total-amount" :class="{ 'within-free': result.isWithinFreePeriod }">
            {{ result.isWithinFreePeriod ? '0' : result.totalAmount.toFixed(2) }}
            {{ result.currency }}
          </span>
        </div>

        <div v-if="result.tierBreakdown?.length" class="tier-breakdown">
          <div class="tier-title">阶梯明细</div>
          <div v-for="(tier, idx) in result.tierBreakdown" :key="idx" class="tier-row">
            <span>第 {{ tier.fromDay }}-{{ tier.toDay }} 天</span>
            <span>{{ tier.days }} 天 × {{ tier.ratePerDay }} {{ result.currency }}/天</span>
            <span class="tier-subtotal">{{ tier.subtotal.toFixed(2) }} {{ result.currency }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.demurrage-calculator {
  &.compact {
    display: inline-flex;
    align-items: baseline;
    gap: 4px;
  }
}

.demurrage-empty {
  padding: $spacing-md;
  color: $text-secondary;
  font-size: $font-size-sm;

  .empty-text {
    font-style: italic;
  }
}

.demurrage-compact {
  .amount {
    font-weight: 600;
    color: $text-primary;

    &.within-free {
      color: $success-color;
    }
  }

  .currency {
    margin-left: 2px;
    font-size: $font-size-xs;
    color: $text-secondary;
  }

  .charge-days {
    margin-left: 4px;
    font-size: $font-size-xs;
    color: $text-secondary;
  }
}

.demurrage-full {
  .summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: $spacing-sm 0;
    font-size: $font-size-sm;

    .label {
      color: $text-secondary;
    }

    .value {
      color: $text-primary;

      &.has-charge {
        color: $warning-color;
        font-weight: 500;
      }

      &.total-amount {
        font-weight: 600;
        font-size: $font-size-base;

        &.within-free {
          color: $success-color;
        }
      }
    }
  }

  .total-row {
    margin-top: $spacing-sm;
    padding-top: $spacing-sm;
    border-top: 1px solid $border-light;
  }

  .tier-breakdown {
    margin-top: $spacing-md;
    padding-top: $spacing-md;
    border-top: 1px solid $border-lighter;

    .tier-title {
      font-size: $font-size-xs;
      color: $text-secondary;
      margin-bottom: $spacing-sm;
    }

    .tier-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: $spacing-xs 0;
      font-size: $font-size-xs;

      .tier-subtotal {
        font-weight: 500;
        color: $text-primary;
      }
    }
  }
}
</style>
