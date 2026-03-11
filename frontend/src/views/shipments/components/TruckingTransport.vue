<script setup lang="ts">
import LastPickupDateDisplay from '@/components/common/LastPickupDateDisplay.vue'

interface TruckingTransport {
  id?: string
  truckingType?: string
  carrierCompany?: string
  driverName?: string
  driverPhone?: string
  truckPlate?: string
  plannedPickupDate?: Date | string
  lastPickupDate?: Date | string
  pickupDate?: Date | string
  pickupLocation?: string
  plannedDeliveryDate?: Date | string
  deliveryDate?: Date | string
  deliveryLocation?: string
  unloadModePlan?: string
  distanceKm?: number
  cost?: number
  remarks?: string
}

interface Props {
  truckingTransports?: TruckingTransport[]
}

defineProps<Props>()

const formatDate = (date: Date | string | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('zh-CN')
}

const formatDateOnly = (date: Date | string | undefined): string => {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('zh-CN')
}
</script>

<template>
  <div class="trucking-section">
    <div v-if="truckingTransports && truckingTransports.length > 0" class="info-cards">
      <div
        v-for="(tt, index) in truckingTransports"
        :key="index"
        class="info-card"
        style="--accent-color: #E6A23C"
      >
        <div class="info-card-header">
          <span class="info-card-icon">🚛</span>
          <span class="info-card-title">拖卡运输 #{{ index + 1 }}</span>
          <el-tag v-if="tt.truckingType" size="small" type="warning" effect="plain">
            {{ tt.truckingType }}
          </el-tag>
        </div>
        <div class="info-card-fields">
          <div class="field-item">
            <span class="field-label">拖卡单号</span>
            <span class="field-value">{{ tt.id || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">拖卡公司</span>
            <span class="field-value">{{ tt.carrierCompany || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">司机</span>
            <span class="field-value">{{ tt.driverName || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">司机电话</span>
            <span class="field-value">{{ tt.driverPhone || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">车牌号</span>
            <span class="field-value">{{ tt.truckPlate || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">计划提柜</span>
            <span class="field-value">{{ formatDateOnly(tt.plannedPickupDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">最晚提柜</span>
            <LastPickupDateDisplay
              :last-pickup-date="tt.lastPickupDate"
              :show-details="false"
              :show-status="false"
            />
          </div>
          <div class="field-item">
            <span class="field-label">实际提柜</span>
            <span class="field-value">{{ formatDate(tt.pickupDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">提柜地点</span>
            <span class="field-value">{{ tt.pickupLocation || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">计划送达</span>
            <span class="field-value">{{ formatDateOnly(tt.plannedDeliveryDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">实际送达</span>
            <span class="field-value">{{ formatDate(tt.deliveryDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">送达地点</span>
            <span class="field-value">{{ tt.deliveryLocation || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">卸柜方式</span>
            <span class="field-value">{{ tt.unloadModePlan || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">距离</span>
            <span class="field-value">{{ tt.distanceKm != null ? tt.distanceKm + ' KM' : '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">费用</span>
            <span class="field-value">{{ tt.cost != null ? '$' + tt.cost : '-' }}</span>
          </div>
          <div class="field-item field-item-full">
            <span class="field-label">备注</span>
            <span class="field-value">{{ tt.remarks || '-' }}</span>
          </div>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无拖卡运输信息" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.trucking-section {
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
