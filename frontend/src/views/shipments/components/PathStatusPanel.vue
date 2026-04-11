<template>
  <div class="multi-container-section">
    <el-collapse>
      <el-collapse-item :title="t('container.logisticsPath.sameBillOfLading.title')" name="compare">
        <div class="compare-header">
          <div class="compare-hint">
            {{
              t('container.logisticsPath.sameBillOfLading.currentContainer', {
                containerNumber,
                billOfLadingNumber,
              })
            }}
          </div>
          <el-button type="primary" size="small" @click="$emit('loadSameBill')" :loading="loading">
            {{ t('container.logisticsPath.sameBillOfLading.loadButton') }}
          </el-button>
        </div>

        <div v-if="error" class="compare-error">
          {{ error }}
        </div>

        <div v-else-if="containers.length > 0" class="compare-list">
          <el-table :data="containers" border style="width: 100%">
            <el-table-column
              prop="containerNumber"
              :label="t('container.logisticsPath.sameBillOfLading.columns.containerNumber')"
              width="120"
            >
              <template #default="{ row }">
                <router-link :to="`/shipments/${row.containerNumber}`" class="container-link">
                  {{ row.containerNumber }}
                </router-link>
              </template>
            </el-table-column>
            <el-table-column
              prop="logisticsStatus"
              :label="t('container.logisticsPath.sameBillOfLading.columns.logisticsStatus')"
              width="120"
            />
            <el-table-column
              prop="actualShipDate"
              :label="t('container.logisticsPath.sameBillOfLading.columns.actualShipDate')"
              width="120"
            />
            <el-table-column
              prop="etaDestPort"
              :label="t('container.logisticsPath.sameBillOfLading.columns.etaDestPort')"
              width="120"
            />
            <el-table-column
              prop="ataDestPort"
              :label="t('container.logisticsPath.sameBillOfLading.columns.ataDestPort')"
              width="120"
            />
            <el-table-column
              prop="location"
              :label="t('container.logisticsPath.sameBillOfLading.columns.location')"
            />
          </el-table>
        </div>

        <div v-else-if="!loading" class="compare-empty">
          {{ t('container.logisticsPath.sameBillOfLading.emptyState') }}
        </div>
      </el-collapse-item>
    </el-collapse>
  </div>
</template>

<script setup lang="ts">
import type { ContainerListItem } from '@/types/container'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps<{
  containerNumber: string
  billOfLadingNumber: string
  containers: ContainerListItem[]
  loading: boolean
  error: string
}>()

defineEmits<{
  loadSameBill: []
}>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/variables' as *;

.multi-container-section {
  margin-top: $spacing-lg;
  padding: $spacing-md;
  background: var(--el-bg-color);
  border-radius: $radius-large;
  box-shadow: $shadow-light;
}

.compare-hint {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.compare-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-md;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.compare-error {
  color: var(--el-color-danger);
  font-size: 13px;
  margin: $spacing-sm 0;
}

.compare-list {
  margin-top: $spacing-sm;
}

.compare-empty {
  text-align: center;
  padding: $spacing-lg;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
  background: var(--el-fill-color-lighter);
  border-radius: $radius-base;
  margin-top: $spacing-sm;
}

.container-link {
  color: var(--el-color-primary);
  text-decoration: none;
  transition: color $transition-base;

  &:hover {
    color: var(--el-color-primary-light-3);
    text-decoration: underline;
  }
}
</style>
