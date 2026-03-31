<script setup lang="ts">
import type { DemurrageCalculationResponse } from '@/services/demurrage'
import {
  getLogisticsStatusText,
  getLogisticsStatusType,
  type PortType,
} from '@/utils/logisticsStatusMachine'
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

/** 与列表/状态机一致（at_port + currentPortType → 已到中转港/已到目的港） */
const logisticsStatusTag = computed(() => {
  const c = props.containerData
  if (!c?.logisticsStatus) {
    return { text: '—', type: 'info' as const }
  }
  const portType =
    (c.currentPortType as PortType | undefined) ||
    (c.latestPortOperation?.portType as PortType | undefined) ||
    null
  const text = getLogisticsStatusText(c.logisticsStatus, portType)
  let tagType = getLogisticsStatusType(c.logisticsStatus)
  if (tagType === 'primary') {
    tagType = 'success'
  }
  return {
    text,
    type: tagType as 'success' | 'warning' | 'danger' | 'info',
  }
})

// 滞港费汇总（从计算结果中提取）
const demurrageSummary = computed(() => {
  if (!props.demurrageCalculation?.items) {
    return null
  }

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
  <el-card class="summary-card" shadow="never">
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
        <el-tag :type="logisticsStatusTag.type" size="small" effect="light">
          {{ logisticsStatusTag.text }}
        </el-tag>
      </div>
      <!-- 滞港费汇总与详细（同一行） -->
      <div v-if="demurrageSummary" class="demurrage-container">
        <div class="demurrage-inline" title="滞港费" @click="emit('openDemurrageTab')">
          <span class="demurrage-total">
            {{ demurrageSummary.currency }} {{ demurrageSummary.totalAmount.toFixed(2) }}
          </span>
        </div>
        <!-- 滞港费详细（小标签样式） -->
        <div v-if="demurrageSummary.chargeTypes.length > 0" class="demurrage-tags">
          <el-tag
            v-for="chargeType in demurrageSummary.chargeTypes"
            :key="chargeType.chargeType"
            class="demurrage-tag-item"
            size="small"
          >
            <span class="charge-type-name">{{
              chargeType.chargeName || chargeType.chargeType
            }}</span>
            <span class="charge-type-amount">
              {{ demurrageSummary.currency }} {{ chargeType.totalAmount.toFixed(2) }}
            </span>
          </el-tag>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.summary-card {
  border-radius: 0;
  border: none;
  margin-bottom: 0;

  :deep(.el-card__body) {
    padding: 0;
  }

  .info-row {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    flex-wrap: wrap;
    white-space: nowrap;
  }

  .demurrage-container {
    display: flex;
    align-items: center;
    gap: $spacing-md;
    margin-left: auto; // 靠右显示
    flex-shrink: 0;
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
    padding: 6px 10px;
    background: rgba($warning-color, 0.08);
    border-radius: $radius-base;
    border: none;
    flex-shrink: 0;
    cursor: pointer;
    transition:
      border-color $transition-base,
      background $transition-base;

    &:hover {
      background: rgba($warning-color, 0.12);
    }

    .demurrage-icon {
      font-size: $font-size-sm;
    }

    .demurrage-total {
      font-size: $font-size-sm;
      font-weight: 700;
      color: $text-primary;
    }
  }

  .demurrage-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .demurrage-tag-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    background: rgba($warning-color, 0.08);
    border: none;
    border-radius: $radius-base;
    font-size: $font-size-xs;
    transition: background $transition-base;

    &:hover {
      background: rgba($warning-color, 0.12);
    }

    .charge-type-name {
      color: $text-secondary;
      font-weight: 500;
    }

    .charge-type-amount {
      color: $text-primary;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>
