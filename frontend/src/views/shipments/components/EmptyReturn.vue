<script setup lang="ts">
interface EmptyReturn {
  id?: string
  returnTerminalName?: string
  returnTerminalCode?: string
  plannedReturnDate?: Date | string
  returnTime?: Date | string
  lastReturnDate?: Date | string
  containerCondition?: string
  remarks?: string
  returnRemarks?: string
}

interface Props {
  emptyReturns?: EmptyReturn[]
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
  <div class="empty-return-section">
    <div v-if="emptyReturns && emptyReturns.length > 0" class="info-cards">
      <div
        v-for="(er, index) in emptyReturns"
        :key="index"
        class="info-card"
        style="--accent-color: #67C23A"
      >
        <div class="info-card-header">
          <span class="info-card-icon">📦</span>
          <span class="info-card-title">还空箱 #{{ index + 1 }}</span>
        </div>
        <div class="info-card-fields">
          <div class="field-item">
            <span class="field-label">还箱单号</span>
            <span class="field-value">{{ er.id || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">还箱地点</span>
            <span class="field-value">{{ er.returnTerminalName || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">终端编码</span>
            <span class="field-value">{{ er.returnTerminalCode || '-' }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">计划还箱</span>
            <span class="field-value">{{ formatDateOnly(er.plannedReturnDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">实际还箱</span>
            <span class="field-value highlight">{{ formatDate(er.returnTime) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">最晚还箱日</span>
            <span class="field-value">{{ formatDateOnly(er.lastReturnDate) }}</span>
          </div>
          <div class="field-item">
            <span class="field-label">箱况</span>
            <span class="field-value">{{ er.containerCondition || '-' }}</span>
          </div>
          <div class="field-item field-item-full">
            <span class="field-label">备注</span>
            <span class="field-value">{{ er.remarks || er.returnRemarks || '-' }}</span>
          </div>
        </div>
      </div>
    </div>
    <el-empty v-else description="暂无还空箱信息" />
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.empty-return-section {
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
