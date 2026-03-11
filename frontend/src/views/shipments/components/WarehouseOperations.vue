<script setup lang="ts">
interface WarehouseOperation {
  id?: string
  operationType?: string
  warehouseId?: string
  plannedWarehouse?: string
  plannedUnloadDate?: Date | string
  unloadDate?: Date | string
  warehouseArrivalDate?: Date | string
  unloadGate?: string
  unloadCompany?: string
  unloadModeActual?: string
  notificationPickupDate?: Date | string
  pickupTime?: Date | string
  wmsStatus?: string
  ebsStatus?: string
  wmsConfirmDate?: Date | string
  isUnboxing?: boolean
  unboxingTime?: Date | string
  cargoReceivedBy?: string
  cargoDeliveredTo?: string
  remarks?: string
  warehouseRemarks?: string
}

interface Props {
  warehouseOperations?: WarehouseOperation[]
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
  <div class="warehouse-section">
    <div v-if="warehouseOperations && warehouseOperations.length > 0" class="info-cards">
      <div
        v-for="(wo, index) in warehouseOperations"
        :key="index"
        class="info-card"
        style="--accent-color: #909399"
      >
        <div class="info-card-header">
          <span class="info-card-icon">🏭</span>
          <span class="info-card-title">仓库操作 #{{ index + 1 }}</span>
          <el-tag v-if="wo.operationType" size="small" type="info" effect="plain">
            {{ wo.operationType }}
          </el-tag>
        </div>
        <div class="info-card-fields">
          <div class="field-item">
            <span class="field-label">操作单号</span>
            <span class="field-value">{{ wo.id || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">仓库ID</span>
            <span class="field-value">{{ wo.warehouseId || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">计划仓库</span>
            <span class="field-value">{{ wo.plannedWarehouse || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">计划卸货</span>
            <span class="field-value">{{ formatDateOnly(wo.plannedUnloadDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">实际卸货</span>
            <span class="field-value">{{ formatDate(wo.unloadDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">仓库到达</span>
            <span class="field-value">{{ formatDateOnly(wo.warehouseArrivalDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">闸口</span>
            <span class="field-value">{{ wo.unloadGate || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">卸货公司</span>
            <span class="field-value">{{ wo.unloadCompany || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">卸货方式</span>
            <span class="field-value">{{ wo.unloadModeActual || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">提货通知</span>
            <span class="field-value">{{ formatDateOnly(wo.notificationPickupDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">提货时间</span>
            <span class="field-value">{{ formatDate(wo.pickupTime) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">WMS状态</span>
            <el-tag v-if="wo.wmsStatus" :type="wo.wmsStatus === 'COMPLETED' ? 'success' : 'warning'" size="small">
              {{ wo.wmsStatus }}
            </el-tag>
            <span v-else class="field-value">-</span>
          </div>
          <div class="field-item">
            <span class="field-label">EBS状态</span>
            <el-tag v-if="wo.ebsStatus" :type="wo.ebsStatus === 'COMPLETED' ? 'success' : 'warning'" size="small">
              {{ wo.ebsStatus }}
            </el-tag>
            <span v-else class="field-value">-</span>
          </div>
          <div class="field-item">
            <span class="field-label">WMS确认</span>
            <span class="field-value">{{ formatDateOnly(wo.wmsConfirmDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">开箱</span>
            <el-tag v-if="wo.isUnboxing != null" :type="wo.isUnboxing ? 'warning' : 'info'" size="small">
              {{ wo.isUnboxing ? '是' : '否' }}
            </el-tag>
            <span v-else class="field-value">-</span>
          </div>
          <div class="field-item">
            <span class="field-label">开箱时间</span>
            <span class="field-value">{{ formatDate(wo.unboxingTime) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">货物接收人</span>
            <span class="field-value">{{ wo.cargoReceivedBy || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">货物交付给</span>
            <span class="field-value">{{ wo.cargoDeliveredTo || '-' }}</span>
          </div>
          <div class="field-item field-item-full">
            <span class="field-label">备注</span>
            <span class="field-value">{{ wo.remarks || wo.warehouseRemarks || '-' }}</span>
          </div>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无仓库操作信息" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.warehouse-section {
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
  }
}

@media (max-width: 768px) {
  .info-card-fields {
    grid-template-columns: 1fr;
  }
}
</style>
