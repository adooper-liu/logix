<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  containerData: any
}>()

// 备货单号：优先顶层，否则从 order/allOrders 取
const orderNumber = computed(() =>
  (props.containerData?.orderNumber ??
   props.containerData?.order?.orderNumber ??
   props.containerData?.allOrders?.[0]?.orderNumber) || '-'
)

// 货物汇总：优先 summary 合计，否则用容器自身
const grossWeight = computed(() =>
  props.containerData?.summary?.totalGrossWeight ??
  props.containerData?.grossWeight
)
const cbm = computed(() =>
  props.containerData?.summary?.totalCbm ??
  props.containerData?.cbm
)
const packages = computed(() =>
  props.containerData?.summary?.totalBoxes ??
  props.containerData?.packages
)
const shipmentTotalValue = computed(() =>
  props.containerData?.shipmentTotalValue ??
  props.containerData?.summary?.shipmentTotalValue
)
</script>

<template>
  <div class="container-info-section">
    <div v-if="containerData" class="info-cards">
      <!-- 货柜信息卡片 -->
      <div class="info-card" style="--accent-color: #409EFF">
        <div class="info-card-header">
          <span class="info-card-icon">📦</span>
          <span class="info-card-title">货柜信息</span>
        </div>
        <div class="info-card-fields">
          <div class="field-item">
            <span class="field-label">集装箱号</span>
            <span class="field-value">{{ containerData.containerNumber || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">备货单号</span>
            <span class="field-value">{{ orderNumber }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">柜型</span>
            <span class="field-value">{{ containerData.containerTypeCode || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">危险品等级</span>
            <span class="field-value">{{ containerData.dangerClass || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">箱皮重</span>
            <span class="field-value">{{ containerData.tareWeight != null ? containerData.tareWeight + ' KG' : '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">箱总重</span>
            <span class="field-value">{{ containerData.totalWeight != null ? containerData.totalWeight + ' KG' : '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">超限长度</span>
            <span class="field-value">{{ containerData.overLength != null ? containerData.overLength + ' m' : '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">超高</span>
            <span class="field-value">{{ containerData.overHeight != null ? containerData.overHeight + ' m' : '-' }}</span>
          </div>
          <div class="field-item field-item-full">
            <span class="field-label">备注</span>
            <span class="field-value">{{ containerData.remarks || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 货物汇总卡片 -->
      <div class="info-card" style="--accent-color: #67C23A">
        <div class="info-card-header">
          <span class="info-card-icon">📊</span>
          <span class="info-card-title">货物汇总</span>
        </div>
        <div class="info-card-fields">
          <div class="field-item">
            <span class="field-label">毛重合计</span>
            <span class="field-value">{{ grossWeight != null ? grossWeight + ' KG' : '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">体积合计</span>
            <span class="field-value">{{ cbm != null ? cbm + ' CBM' : '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">箱数合计</span>
            <span class="field-value">{{ packages ?? '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">出运总价</span>
            <span class="field-value">{{ shipmentTotalValue != null ? '$' + shipmentTotalValue : '-' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.container-info-section {
  padding: $spacing-sm 0;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-md;
}

.info-card {
  min-width: 0;

  &:only-child {
    grid-column: 1 / -1;
  }
  background: $bg-color;
  border: 1px solid $border-light;
  border-radius: $radius-large;
  padding: $spacing-md;
  padding-left: calc(#{$spacing-md} + 3px);
  box-shadow: $shadow-light;
  transition: $transition-base;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 3px;
    background: var(--accent-color);
    opacity: 0.6;
  }

  &:hover {
    box-shadow: $shadow-base;
    border-color: $primary-lighter;
  }
}

.info-card-header {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  margin-bottom: $spacing-md;
  padding-bottom: $spacing-sm;
  border-bottom: 1px solid $border-lighter;

  .info-card-icon {
    font-size: 20px;
  }

  .info-card-title {
    font-size: $font-size-base;
    font-weight: 600;
    color: $text-primary;
  }
}

.info-card-fields {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: $spacing-xs $spacing-lg;

  .field-item-full {
    grid-column: 1 / -1;
  }
}

.field-item {
  display: flex;
  align-items: baseline;
  gap: $spacing-sm;
  font-size: $font-size-sm;

  .field-label {
    color: $text-secondary;
    flex-shrink: 0;
    font-size: $font-size-xs;
  }

.field-value {
  color: $text-regular;
  overflow: hidden;
  text-overflow: ellipsis;
}
}

@media (max-width: 768px) {
  .info-cards {
    grid-template-columns: 1fr;
  }

  .info-card-fields {
    grid-template-columns: 1fr;
  }
}
</style>
