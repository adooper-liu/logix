<script setup lang="ts">
interface SeaFreight {
  billOfLadingNumber?: string
  voyageNumber?: string
  vesselName?: string
  shippingCompany?: string
  portOfLoading?: string
  portOfDischarge?: string
  portOfTransit?: string
  shipmentDate?: Date | string
  eta?: Date | string
  ata?: Date | string
  freightForwarder?: string
  bookingNumber?: string
  mblNumber?: string
  hblNumber?: string
}

interface Props {
  seaFreights?: SeaFreight[]
  destinationPortOperation?: {
    eta?: Date | string
    ata?: Date | string
  }
}

defineProps<Props>()

const formatDateOnly = (date: Date | string | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('zh-CN')
}
</script>

<template>
  <div class="seafreight-section">
    <div v-if="seaFreights && seaFreights.length > 0" class="info-cards">
      <div
        v-for="(sf, index) in seaFreights"
        :key="index"
        class="info-card"
        style="--accent-color: #409eff"
      >
        <div class="info-card-header">
          <span class="info-card-icon">🚢</span>
          <span class="info-card-title">海运信息 #{{ index + 1 }}</span>
        </div>
        <div class="info-card-fields">
          <div class="field-item">
            <span class="field-label">MBL号</span>
            <span class="field-value">{{ sf.mblNumber || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">HBL号</span>
            <span class="field-value">{{ sf.hblNumber || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">提单号</span>
            <span class="field-value">{{ sf.mblNumber || sf.billOfLadingNumber || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">航次号</span>
            <span class="field-value">{{ sf.voyageNumber || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">船名</span>
            <span class="field-value">{{ sf.vesselName || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">船公司</span>
            <span class="field-value">{{ sf.shippingCompany || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">起运港</span>
            <span class="field-value">{{ sf.portOfLoading || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">目的港</span>
            <span class="field-value">{{ sf.portOfDischarge || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">中转港</span>
            <span class="field-value">{{ sf.portOfTransit || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">装船日期</span>
            <span class="field-value">{{ formatDateOnly(sf.shipmentDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">预计到港</span>
            <span class="field-value">{{
              formatDateOnly(sf.eta || destinationPortOperation?.eta)
            }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">实际到港</span>
            <span class="field-value highlight">{{
              formatDateOnly(sf.ata || destinationPortOperation?.ata)
            }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">货代公司</span>
            <span class="field-value">{{ sf.freightForwarder || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">订舱号</span>
            <span class="field-value">{{ sf.bookingNumber || '-' }}</span>
          </div>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无海运信息" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.seafreight-section {
  padding: $spacing-sm 0;
}

.info-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
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

    &.highlight {
      color: $primary-color;
      font-weight: 500;
    }
  }
}

@media (max-width: 768px) {
  .info-card-fields {
    grid-template-columns: 1fr;
  }
}
</style>
