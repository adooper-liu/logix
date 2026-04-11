<template>
  <div class="table-expand-detail">
    <div class="expand-row">
      <span class="expand-label">到港日期</span>
      <span>
        {{ row.etaDestPort ? formatDate(row.etaDestPort) : '-' }} eta /
        {{
          (row.etaCorrection ?? getEtaCorrection(row))
            ? formatDate((row.etaCorrection ?? getEtaCorrection(row)) as string | Date)
            : '-'
        }}
        rev / {{ row.ataDestPort ? formatDate(row.ataDestPort) : '-' }} ata
      </span>
      <span class="expand-label">提柜日期</span>
      <span>
        {{ row.lastFreeDate ? formatDate(row.lastFreeDate) : '-' }} lfd /
        {{ row.plannedPickupDate ? formatDate(row.plannedPickupDate) : '-' }} plan /
        {{ row.pickupDate ? formatDate(row.pickupDate) : '-' }} act
      </span>
      <span class="expand-label">还箱日期</span>
      <span>
        {{ row.lastReturnDate ? formatDate(row.lastReturnDate) : '-' }} lrd /
        {{ row.plannedReturnDate ? formatDate(row.plannedReturnDate) : '-' }} plan /
        {{ row.returnTime ? formatDate(row.returnTime) : '-' }} act
      </span>
    </div>
    <div class="expand-row">
      <span class="expand-label">货物描述</span>
      <span>{{ row.cargoDescription || '-' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getEtaCorrection } from '@/utils/containerDisplay'

defineProps<{
  row: any
  formatDate: (date: string | Date) => string
}>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.table-expand-detail {
  padding: $spacing-md;
  background-color: var(--el-fill-color-lighter);
}

.expand-row {
  display: flex;
  gap: $spacing-lg;
  margin-bottom: $spacing-sm;
  font-size: $font-size-sm;

  &:last-child {
    margin-bottom: 0;
  }
}

.expand-label {
  font-weight: 600;
  color: var(--el-text-color-regular);
  min-width: 80px;
}
</style>
